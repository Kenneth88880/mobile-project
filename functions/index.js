const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const express = require("express");

admin.initializeApp();

const app = express();

// Raw body for Stripe webhook verification, JSON for everything else
app.use((req, res, next) => {
  if (req.originalUrl === "/webhook") {
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Email Verification ───────────────────────────────────────────────────────

exports.sendEmailVerificationCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const { email } = request.data;

  if (!email) {
    throw new HttpsError("invalid-argument", "Email is required");
  }

  try {
    const code = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await admin.firestore().collection("emailVerificationCodes").doc(userId).set({
      code,
      email,
      expiresAt,
      verified: false,
      createdAt: Date.now(),
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B4A61;">Email Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #8B4A61; font-size: 48px; letter-spacing: 8px;">${code}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification code sent to ${email}`);
    return { success: true, message: "Verification code sent" };
  } catch (error) {
    console.error("Error sending verification code:", error);
    throw new HttpsError("internal", "Failed to send verification code");
  }
});

exports.verifyEmailCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const { code } = request.data;

  if (!code) {
    throw new HttpsError("invalid-argument", "Verification code is required");
  }

  try {
    const doc = await admin.firestore().collection("emailVerificationCodes").doc(userId).get();

    if (!doc.exists) {
      throw new HttpsError("not-found", "No verification code found");
    }

    const data = doc.data();

    if (Date.now() > data.expiresAt) {
      throw new HttpsError("deadline-exceeded", "Verification code has expired");
    }

    if (data.code !== code) {
      throw new HttpsError("invalid-argument", "Invalid verification code");
    }

    if (data.verified) {
      return { success: true, message: "Email already verified" };
    }

    await admin.firestore().collection("emailVerificationCodes").doc(userId).update({
      verified: true,
      verifiedAt: Date.now(),
    });

    await admin.firestore().collection("profiles").doc(userId).set(
      { emailVerified: true },
      { merge: true }
    );

    console.log(`Email verified for user ${userId}`);
    return { success: true, message: "Email verified successfully" };
  } catch (error) {
    console.error("Error verifying code:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to verify code");
  }
});

exports.api = onRequest(
  {
    region: "us-central1",
    secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    rawBody: true,
  },
  app
);

// ─── Payment Sheet ────────────────────────────────────────────────────────────

app.post("/payment-sheet", async (req, res) => {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  try {
    const { priceId, uid } = req.body;

    if (!priceId || !uid) {
      return res.status(400).json({ error: "priceId and uid are required" });
    }

    // Reuse existing Stripe customer if one already exists for this user
    let customerId;
    const profileDoc = await admin.firestore().collection("profiles").doc(uid).get();
    const profileData = profileDoc.exists ? profileDoc.data() : null;

    if (profileData?.stripeCustomerId) {
      customerId = profileData.stripeCustomerId;
      console.log("Reusing existing Stripe customer:", customerId);
    } else {
      const customer = await stripe.customers.create({
        metadata: { firebaseUid: uid },
      });
      customerId = customer.id;
      console.log("Created new Stripe customer:", customerId);
    }

    const customerSession = await stripe.customerSessions.create({
      customer: customerId,
      components: {
        mobile_payment_element: {
          enabled: true,
          features: {
            payment_method_save: "enabled",
            payment_method_redisplay: "enabled",
            payment_method_remove: "enabled",
          },
        },
      },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      collection_method: "charge_automatically",
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card"],
      },
      metadata: { firebaseUid: uid },
      expand: ["latest_invoice.payment_intent"],
    });

    console.log("Created subscription:", subscription.id, "with metadata:", JSON.stringify(subscription.metadata));

    const invoice = await stripe.invoices.retrieve(subscription.latest_invoice.id, {
      expand: ["payment_intent"],
    });

    let clientSecret;
    if (invoice.payment_intent?.client_secret) {
      clientSecret = invoice.payment_intent.client_secret;
    } else {
      const paymentIntents = await stripe.paymentIntents.list({
        customer: customerId,
        limit: 1,
      });
      const pi = paymentIntents.data[0];
      if (!pi) return res.status(500).json({ error: "No payment intent found" });
      clientSecret = pi.client_secret;
    }

    // Save Stripe IDs only — subscriptionStatus is never written here.
    // The webhook owns all status updates.
    await admin.firestore().collection("profiles").doc(uid).set({
      stripeCustomerId: customerId,
      subscriptionId: subscription.id,
      priceId,
      updatedAt: Date.now(),
    }, { merge: true });

    res.json({
      paymentIntent: clientSecret,
      customerSessionClientSecret: customerSession.client_secret,
      customer: customerId,
      subscriptionId: subscription.id,
    });
  } catch (err) {
    console.error("payment-sheet error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Webhook ──────────────────────────────────────────────────────────────────

app.post("/webhook", async (req, res) => {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("Webhook event received:", event.type);

  // Helper: get firebaseUid from a subscription ID
  const getUidFromSubscriptionId = async (subscriptionId) => {
    console.log("Fetching subscription:", subscriptionId);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log("Subscription metadata:", JSON.stringify(subscription.metadata));
    return subscription.metadata?.firebaseUid || null;
  };

  // Helper: update subscriptionStatus on the profile
  const updateStatus = async (uid, status) => {
    console.log(`Updating subscriptionStatus to "${status}" for uid: ${uid}`);
    await admin.firestore().collection("profiles").doc(uid).set({
      subscriptionStatus: status,
      updatedAt: Date.now(),
    }, { merge: true });
    console.log(`Successfully updated subscriptionStatus to "${status}" for uid: ${uid}`);
  };

  try {
    switch (event.type) {

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        console.log("invoice.payment_succeeded — subscription:", invoice.subscription);
        const uid = await getUidFromSubscriptionId(invoice.subscription);
        console.log("Resolved uid:", uid);
        if (uid) await updateStatus(uid, "active");
        else console.warn("No firebaseUid found for subscription:", invoice.subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.log("invoice.payment_failed — subscription:", invoice.subscription);
        const uid = await getUidFromSubscriptionId(invoice.subscription);
        console.log("Resolved uid:", uid);
        if (uid) await updateStatus(uid, "past_due");
        else console.warn("No firebaseUid found for subscription:", invoice.subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        console.log("customer.subscription.deleted — id:", subscription.id);
        console.log("Full metadata:", JSON.stringify(subscription.metadata));
        const uid = subscription.metadata?.firebaseUid;
        console.log("Extracted uid:", uid);
        if (uid) {
          await updateStatus(uid, "canceled");
        } else {
          // Metadata missing — fall back to querying Firestore by subscriptionId
          console.warn("No firebaseUid in metadata, falling back to Firestore query by subscriptionId");
          const snapshot = await admin.firestore()
            .collection("profiles")
            .where("subscriptionId", "==", subscription.id)
            .limit(1)
            .get();
          if (!snapshot.empty) {
            await snapshot.docs[0].ref.set({
              subscriptionStatus: "canceled",
              updatedAt: Date.now(),
            }, { merge: true });
            console.log("Fallback succeeded: canceled via subscriptionId:", subscription.id);
          } else {
            console.error("Fallback failed: no profile found for subscriptionId:", subscription.id);
          }
        }
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
  }

  res.json({ received: true });
});