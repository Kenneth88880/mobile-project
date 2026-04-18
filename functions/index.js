const {onCall, HttpsError, onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const express = require("express");

admin.initializeApp();

const app = express();

// MUST be before express.json()
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

exports.sendEmailVerificationCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const {email} = request.data;

  if (!email) {
    throw new HttpsError("invalid-argument", "Email is required");
  }

  try {
    const code = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await admin.firestore().collection("emailVerificationCodes").doc(userId).set({
      code: code,
      email: email,
      expiresAt: expiresAt,
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
    return {success: true, message: "Verification code sent"};
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
  const {code} = request.data;

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
      return {success: true, message: "Email already verified"};
    }

    await admin.firestore().collection("emailVerificationCodes").doc(userId).update({
      verified: true,
      verifiedAt: Date.now(),
    });

    await admin.firestore().collection("profiles").doc(userId).set(
        {emailVerified: true},
        {merge: true},
    );

    console.log(`Email verified for user ${userId}`);
    return {success: true, message: "Email verified successfully"};
  } catch (error) {
    console.error("Error verifying code:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
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

    const customer = await stripe.customers.create();

    const customerSession = await stripe.customerSessions.create({
      customer: customer.id,
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
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      collection_method: "charge_automatically",
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card"],
      },
      expand: ["latest_invoice.payment_intent"],
    });

    const invoice = await stripe.invoices.retrieve(
      subscription.latest_invoice.id,
      { expand: ["payment_intent"] }
    );

    let clientSecret;
    if (invoice.payment_intent?.client_secret) {
      clientSecret = invoice.payment_intent.client_secret;
    } else {
      const paymentIntents = await stripe.paymentIntents.list({
        customer: customer.id,
        limit: 1,
      });
      const pi = paymentIntents.data[0];
      if (!pi) return res.status(500).json({ error: "No payment intent found" });
      clientSecret = pi.client_secret;
    }

    // Save to Firestore linked to Firebase user
    await admin.firestore().collection("profiles").doc(uid).set({
      stripeCustomerId: customer.id,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      priceId: priceId,
      updatedAt: Date.now(),
    }, { merge: true });

    res.json({
      paymentIntent: clientSecret,
      customerSessionClientSecret: customerSession.client_secret,
      customer: customer.id,
      subscriptionId: subscription.id,
    });
  } catch (err) {
    console.error(err);
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

  console.log("Webhook event:", event.type);

  try {
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      const customerId = invoice.customer;

      const snapshot = await admin.firestore()
        .collection("profiles")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        await snapshot.docs[0].ref.set({
          subscriptionStatus: "active",
          updatedAt: Date.now(),
        }, { merge: true });
        console.log("Subscription activated for customer:", customerId);
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      const customerId = invoice.customer;

      const snapshot = await admin.firestore()
        .collection("profiles")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        await snapshot.docs[0].ref.set({
          subscriptionStatus: "past_due",
          updatedAt: Date.now(),
        }, { merge: true });
        console.log("Payment failed for customer:", customerId);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const snapshot = await admin.firestore()
        .collection("profiles")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        await snapshot.docs[0].ref.set({
          subscriptionStatus: "canceled",
          updatedAt: Date.now(),
        }, { merge: true });
        console.log("Subscription canceled for customer:", customerId);
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
  }

  res.json({ received: true });
});