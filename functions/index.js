const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const express = require("express");

admin.initializeApp();

const app = express();
app.use(express.json());

// ─── Email Configuration ─────────────────────────────────────────────────────
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

// ─── Helper: Update Profile ──────────────────────────────────────────────────
async function updateProfileByCustomerId(customerId, data) {
  const snapshot = await admin.firestore()
    .collection("profiles")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.warn(`No profile found for Stripe customer: ${customerId}`);
    return;
  }

  await snapshot.docs[0].ref.set(data, { merge: true });
}

// ─── Email Callables ────────────────────────────────────────────────────────
exports.sendEmailVerificationCode = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be authenticated");
  const userId = request.auth.uid;
  const { email } = request.data;
  if (!email) throw new HttpsError("invalid-argument", "Email is required");

  try {
    const code = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    await admin.firestore().collection("emailVerificationCodes").doc(userId).set({
      code, email, expiresAt, verified: false, createdAt: Date.now(),
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Verification Code",
      html: `<h1>${code}</h1><p>Expires in 10 minutes.</p>`,
    });

    return { success: true, message: "Verification code sent" };
  } catch (error) {
    throw new HttpsError("internal", "Failed to send code");
  }
});

exports.verifyEmailCode = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be authenticated");
  const userId = request.auth.uid;
  const { code } = request.data;

  const doc = await admin.firestore().collection("emailVerificationCodes").doc(userId).get();
  if (!doc.exists || doc.data().code !== code || Date.now() > doc.data().expiresAt) {
    throw new HttpsError("invalid-argument", "Invalid or expired code");
  }

  await admin.firestore().collection("profiles").doc(userId).set({ emailVerified: true }, { merge: true });
  return { success: true, message: "Email verified" };
});

// ─── Stripe Webhook ──────────────────────────────────────────────────────────
// Note: This is a separate export to avoid Express middleware issues with rawBody
exports.stripeWebhook = onRequest(
  {
    region: "us-central1",
    secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  },
  async (req, res) => {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      // Stripe webhooks require the raw body to verify signatures
      event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error(`Webhook Signature Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const stripeObject = event.data.object;

    // Handle the events
    switch (event.type) {
      case "invoice.payment_succeeded":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        const status = stripeObject.status;
        await updateProfileByCustomerId(stripeObject.customer, {
          subscriptionStatus: status,
          stripeSubscriptionId: stripeObject.id || stripeObject.subscription,
          updatedAt: Date.now(),
        });
        break;
      
      case "payment_intent.succeeded":
        console.log(`PaymentIntent for ${stripeObject.amount} succeeded.`);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }
);

// ─── Express API (Payment Sheet) ─────────────────────────────────────────────
app.post("/payment-sheet", async (req, res) => {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  try {
    const { priceId, uid } = req.body;

    const customer = await stripe.customers.create({ metadata: { firebaseUid: uid } });

    const customerSession = await stripe.customerSessions.create({
      customer: customer.id,
      components: { mobile_payment_element: { enabled: true } },
    });

    // 1. Create the subscription with EXPAND
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
    });

    // 2. EXTRACTION WITH FALLBACK
    let piSecret = subscription.latest_invoice?.payment_intent?.client_secret;
    let siSecret = subscription.pending_setup_intent?.client_secret;

    // FALLBACK: If expansion failed, try to fetch the invoice manually
    if (!piSecret && !siSecret && subscription.latest_invoice) {
      const invoiceId = typeof subscription.latest_invoice === 'string' 
        ? subscription.latest_invoice 
        : subscription.latest_invoice.id;
        
      const invoice = await stripe.invoices.retrieve(invoiceId, {
        expand: ['payment_intent'],
      });
      piSecret = invoice.payment_intent?.client_secret;
    }

    console.log(`Secrets Found - PI: ${!!piSecret}, SI: ${!!siSecret}`);

    res.json({
      paymentIntent: piSecret || null,
      setupIntent: siSecret || null,
      customerSessionClientSecret: customerSession.client_secret,
      customer: customer.id,
    });
  } catch (err) {
    console.error("Stripe Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

exports.api = onRequest({ region: "us-central1", secrets: ["STRIPE_SECRET_KEY"] }, app);