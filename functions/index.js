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
      const customer = await stripe.customers.create({ metadata: { firebaseUid: uid } });
      customerId = customer.id;
      await admin.firestore().collection("profiles").doc(uid).set({
        stripeCustomerId: customerId,
      }, { merge: true });
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

    // SetupIntent — captures payment method WITHOUT creating a subscription or charge.
    // Nothing appears in Stripe logs as a transaction until /create-subscription is called.
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
      metadata: { firebaseUid: uid, priceId },
    });

    res.json({
      setupIntent: setupIntent.client_secret,
      customerSessionClientSecret: customerSession.client_secret,
      customer: customerId,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (err) {
    console.error("payment-sheet error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Create Subscription ──────────────────────────────────────────────────────
// Called only after the user confirms payment — this is what actually charges them.

app.post("/create-subscription", async (req, res) => {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  try {
    const { uid, priceId } = req.body;
    if (!uid || !priceId) {
      return res.status(400).json({ error: "uid and priceId are required" });
    }

    const profileDoc = await admin.firestore().collection("profiles").doc(uid).get();
    if (!profileDoc.exists) return res.status(404).json({ error: "User not found" });

    const { stripeCustomerId } = profileDoc.data();
    if (!stripeCustomerId) return res.status(404).json({ error: "No Stripe customer found" });

    // Get the default payment method just saved by the SetupIntent
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
      limit: 1,
    });

    if (!paymentMethods.data.length) {
      return res.status(400).json({ error: "No payment method found" });
    }

    const paymentMethodId = paymentMethods.data[0].id;

    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      metadata: { firebaseUid: uid },
    });

    await admin.firestore().collection("profiles").doc(uid).set({
      subscriptionId: subscription.id,
      priceId,
      autoRenew: true,
      updatedAt: Date.now(),
    }, { merge: true });

    console.log("Subscription created:", subscription.id, "status:", subscription.status);
    res.json({ success: true, subscriptionId: subscription.id });
  } catch (err) {
    console.error("create-subscription error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Reactivate Subscription ──────────────────────────────────────────────────
// Called when user is still active but had canceled (cancel_at_period_end: true).
// Flips auto-renew back on without charging them again — no new subscription needed.

app.post("/reactivate-subscription", async (req, res) => {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "uid is required" });

    const profileDoc = await admin.firestore().collection("profiles").doc(uid).get();
    if (!profileDoc.exists) return res.status(404).json({ error: "User not found" });

    const { subscriptionId } = profileDoc.data();
    if (!subscriptionId) return res.status(404).json({ error: "No subscription found" });

    // Remove the cancel_at_period_end flag — resumes auto-renew at period end, no charge
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    await admin.firestore().collection("profiles").doc(uid).set({
      autoRenew: true,
      updatedAt: Date.now(),
    }, { merge: true });

    console.log("Subscription reactivated:", subscriptionId);
    res.json({ success: true });
  } catch (err) {
    console.error("reactivate-subscription error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Cancel Subscription ──────────────────────────────────────────────────────

app.post("/cancel-subscription", async (req, res) => {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "uid is required" });

    const profileDoc = await admin.firestore().collection("profiles").doc(uid).get();
    if (!profileDoc.exists) return res.status(404).json({ error: "User not found" });

    const { subscriptionId } = profileDoc.data();
    if (!subscriptionId) return res.status(404).json({ error: "No subscription found" });

    // cancel_at_period_end keeps access until end of billing period,
    // then Stripe fires customer.subscription.deleted which the webhook handles.
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Mark auto-renew off — status stays "active" until period ends
    await admin.firestore().collection("profiles").doc(uid).set({
      autoRenew: false,
      updatedAt: Date.now(),
    }, { merge: true });

    console.log("Subscription set to cancel at period end:", subscriptionId);
    res.json({ success: true });
  } catch (err) {
    console.error("cancel-subscription error:", err);
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

  // Helper: update fields on the profile
  const updateProfile = async (uid, fields) => {
    await admin.firestore().collection("profiles").doc(uid).set({
      ...fields,
      updatedAt: Date.now(),
    }, { merge: true });
    console.log(`Profile updated for uid: ${uid}`, fields);
  };

  try {
    switch (event.type) {

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        console.log("invoice.payment_succeeded — subscription:", invoice.subscription);
        const uid = await getUidFromSubscriptionId(invoice.subscription);
        if (uid) await updateProfile(uid, { subscriptionStatus: "active", autoRenew: true });
        else console.warn("No firebaseUid found for subscription:", invoice.subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.log("invoice.payment_failed — subscription:", invoice.subscription);
        const uid = await getUidFromSubscriptionId(invoice.subscription);
        if (uid) await updateProfile(uid, { subscriptionStatus: "past_due" });
        else console.warn("No firebaseUid found for subscription:", invoice.subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        console.log("customer.subscription.deleted — id:", subscription.id);
        console.log("Full metadata:", JSON.stringify(subscription.metadata));
        const uid = subscription.metadata?.firebaseUid;
        if (uid) {
          await updateProfile(uid, { subscriptionStatus: "canceled", autoRenew: false });
        } else {
          // Metadata missing — fall back to querying Firestore by subscriptionId
          console.warn("No firebaseUid in metadata, falling back to Firestore query");
          const snapshot = await admin.firestore()
            .collection("profiles")
            .where("subscriptionId", "==", subscription.id)
            .limit(1)
            .get();
          if (!snapshot.empty) {
            await snapshot.docs[0].ref.set({
              subscriptionStatus: "canceled",
              autoRenew: false,
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

// ─── exports.api MUST be last — after all routes are registered ───────────────

exports.api = onRequest(
  {
    region: "us-central1",
    secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    rawBody: true,
  },
  app
);

app.get("/config", (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});