const {
  onCall,
  HttpsError,
  onRequest,
} = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
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

    await admin
      .firestore()
      .collection("emailVerificationCodes")
      .doc(userId)
      .set({
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
    const doc = await admin
      .firestore()
      .collection("emailVerificationCodes")
      .doc(userId)
      .get();

    if (!doc.exists) {
      throw new HttpsError("not-found", "No verification code found");
    }

    const data = doc.data();

    if (Date.now() > data.expiresAt) {
      throw new HttpsError(
        "deadline-exceeded",
        "Verification code has expired",
      );
    }

    if (data.code !== code) {
      throw new HttpsError("invalid-argument", "Invalid verification code");
    }

    if (data.verified) {
      return { success: true, message: "Email already verified" };
    }

    await admin
      .firestore()
      .collection("emailVerificationCodes")
      .doc(userId)
      .update({
        verified: true,
        verifiedAt: Date.now(),
      });

    await admin
      .firestore()
      .collection("profiles")
      .doc(userId)
      .set({ emailVerified: true }, { merge: true });

    console.log(`Email verified for user ${userId}`);
    return { success: true, message: "Email verified successfully" };
  } catch (error) {
    console.error("Error verifying code:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to verify code");
  }
});

// ─── Scheduled Account Hard-Delete ────────────────────────────────────────────
// Runs daily at 3 AM UTC. Finds profiles marked `deleted: true` with a
// `deletedAt` older than the retention window and permanently removes them
// along with all related data (photos, chats, messages, etc.).
//
// This is the second half of the two-stage deletion flow. Stage 1 is the
// immediate client-side deletion in SettingsScreen.js, which marks the profile
// as deleted and cascade-cleans related collections. Stage 2 (this function)
// does the actual hard delete after the retention window expires.

const RETENTION_DAYS = 30;

exports.cleanupDeletedAccounts = onSchedule(
  {
    schedule: "every day 03:00",
    timeZone: "UTC",
    region: "us-central1",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async (event) => {
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const cutoff = admin.firestore.Timestamp.fromMillis(
      Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    console.log(
      `Running cleanup for profiles deleted before ${cutoff.toDate().toISOString()}`,
    );

    const snapshot = await db
      .collection("profiles")
      .where("deleted", "==", true)
      .where("deletedAt", "<=", cutoff)
      .get();

    if (snapshot.empty) {
      console.log("No expired deleted accounts to clean up");
      return;
    }

    console.log(`Found ${snapshot.size} expired deleted accounts`);

    let successCount = 0;
    let failureCount = 0;

    for (const doc of snapshot.docs) {
      const userId = doc.id;
      try {
        await hardDeleteUser(db, bucket, userId, doc.data());
        successCount++;
      } catch (err) {
        failureCount++;
        console.error(
          `Failed to hard-delete user ${userId}:`,
          err.message || err,
        );
      }
    }

    console.log(
      `Cleanup complete. Success: ${successCount}, Failed: ${failureCount}`,
    );
  },
);

// Permanently removes all data for a single deleted user.
// Best-effort — each step is wrapped so one failure doesn't block the rest.
async function hardDeleteUser(db, bucket, userId, profileData) {
  console.log(`Hard-deleting user ${userId}`);

  // 1. Delete photos from Firebase Storage
  try {
    const photos = Array.isArray(profileData?.photos) ? profileData.photos : [];
    for (const photoUrl of photos) {
      if (typeof photoUrl !== "string" || !photoUrl) continue;
      try {
        const filePath = extractStoragePath(photoUrl);
        if (filePath) {
          await bucket.file(filePath).delete();
        }
      } catch (err) {
        console.error(`Failed to delete photo ${photoUrl}:`, err.message);
      }
    }

    // Also delete the user's entire profile photos folder in case any
    // uploaded photos weren't tracked in the profile.photos array
    try {
      await bucket.deleteFiles({ prefix: `profile_pictures/${userId}/` });
    } catch (err) {
      console.error(
        `Failed to delete photos folder for ${userId}:`,
        err.message,
      );
    }
  } catch (err) {
    console.error(`Photos cleanup error for ${userId}:`, err.message);
  }

  // 2. Delete chat messages from chats this user was in, then delete/update chats
  try {
    const chatsSnap = await db
      .collection("chats")
      .where("participants", "array-contains", userId)
      .get();

    for (const chatDoc of chatsSnap.docs) {
      const chatData = chatDoc.data() || {};
      const participants = Array.isArray(chatData.participants)
        ? chatData.participants
        : [];
      const otherParticipants = participants.filter((p) => p !== userId);
      const allDeleted = participants.every((p) => {
        const deletedParticipants = Array.isArray(chatData.deletedParticipants)
          ? chatData.deletedParticipants
          : [];
        return deletedParticipants.includes(p) || p === userId;
      });

      if (otherParticipants.length === 0 || allDeleted) {
        // Every participant in this chat has deleted — hard-delete the chat
        // including all messages
        await deleteChatWithMessages(db, chatDoc.ref);
      } else {
        // Other active participants remain. Keep the chat visible to them
        // but confirm this user is marked deleted in participants array
        await chatDoc.ref.update({
          deletedParticipants: admin.firestore.FieldValue.arrayUnion(userId),
        });
      }
    }
  } catch (err) {
    console.error(`Chats cleanup error for ${userId}:`, err.message);
  }

  // 3. Hard-delete all duos involving this user
  try {
    const duosSnap = await db
      .collection("duos")
      .where("users", "array-contains", userId)
      .get();
    await batchDelete(db, duosSnap.docs);
  } catch (err) {
    console.error(`Duos cleanup error for ${userId}:`, err.message);
  }

  // 4. Delete any lingering likes, swipes, requests, matches, ratings
  for (const collection of [
    "duoLikes",
    "duoSwipes",
    "duoRequests",
    "duoMatches",
  ]) {
    for (const field of ["fromUserId", "toUserId"]) {
      try {
        const snap = await db
          .collection(collection)
          .where(field, "==", userId)
          .get();
        await batchDelete(db, snap.docs);
      } catch (err) {
        // Some collections don't have both fields — skip silently
      }
    }
  }

  try {
    const ratingsSnap = await db
      .collection("ratings")
      .where("fromUserId", "==", userId)
      .get();
    await batchDelete(db, ratingsSnap.docs);
    const ratingsToSnap = await db
      .collection("ratings")
      .where("toUserId", "==", userId)
      .get();
    await batchDelete(db, ratingsToSnap.docs);
  } catch (err) {
    console.error(`Ratings cleanup error for ${userId}:`, err.message);
  }

  // 5. Delete user's events subcollection
  try {
    const eventsSnap = await db
      .collection("userEvents")
      .doc(userId)
      .collection("events")
      .get();
    await batchDelete(db, eventsSnap.docs);
    // Delete the userEvents/{userId} parent doc if it exists
    await db
      .collection("userEvents")
      .doc(userId)
      .delete()
      .catch(() => {});
  } catch (err) {
    console.error(`Events cleanup error for ${userId}:`, err.message);
  }

  // 6. Delete email verification codes
  try {
    await db
      .collection("emailVerificationCodes")
      .doc(userId)
      .delete()
      .catch(() => {});
  } catch (err) {
    console.error(`Email code cleanup error for ${userId}:`, err.message);
  }

  // 7. Finally, delete the profile document itself
  try {
    await db.collection("profiles").doc(userId).delete();
  } catch (err) {
    console.error(`Profile document delete error for ${userId}:`, err.message);
  }

  // Note: We don't touch the Firebase Auth user here — it was already
  // deleted client-side when the user tapped "Delete Account". If the
  // auth delete failed at that time, re-running the client flow or
  // admin deletion is required separately.

  console.log(`Hard-delete complete for user ${userId}`);
}

// Extracts the Storage object path from either a gs:// URL or an
// https://firebasestorage.googleapis.com/... URL
function extractStoragePath(url) {
  try {
    if (url.startsWith("gs://")) {
      const withoutPrefix = url.substring(5);
      const slashIdx = withoutPrefix.indexOf("/");
      return slashIdx > -1 ? withoutPrefix.substring(slashIdx + 1) : null;
    }
    const match = url.match(/\/o\/([^?]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    return null;
  } catch (err) {
    return null;
  }
}

// Deletes docs in batches of 500 (Firestore batch limit)
async function batchDelete(db, docs) {
  if (!docs || docs.length === 0) return;
  for (let i = 0; i < docs.length; i += 500) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + 500);
    chunk.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

// Deletes a chat document and all messages in its subcollection
async function deleteChatWithMessages(db, chatRef) {
  try {
    const messagesSnap = await chatRef.collection("messages").get();
    await batchDelete(db, messagesSnap.docs);
    await chatRef.delete();
  } catch (err) {
    console.error(`Failed to delete chat ${chatRef.path}:`, err.message);
  }
}

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
    const profileDoc = await admin
      .firestore()
      .collection("profiles")
      .doc(uid)
      .get();
    const profileData = profileDoc.exists ? profileDoc.data() : null;

    if (profileData?.stripeCustomerId) {
      customerId = profileData.stripeCustomerId;
      console.log("Reusing existing Stripe customer:", customerId);
    } else {
      const customer = await stripe.customers.create({
        metadata: { firebaseUid: uid },
      });
      customerId = customer.id;
      await admin.firestore().collection("profiles").doc(uid).set(
        {
          stripeCustomerId: customerId,
        },
        { merge: true },
      );
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

    const profileDoc = await admin
      .firestore()
      .collection("profiles")
      .doc(uid)
      .get();
    if (!profileDoc.exists)
      return res.status(404).json({ error: "User not found" });

    const { stripeCustomerId } = profileDoc.data();
    if (!stripeCustomerId)
      return res.status(404).json({ error: "No Stripe customer found" });

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

    await admin.firestore().collection("profiles").doc(uid).set(
      {
        subscriptionId: subscription.id,
        priceId,
        autoRenew: true,
        updatedAt: Date.now(),
      },
      { merge: true },
    );

    console.log(
      "Subscription created:",
      subscription.id,
      "status:",
      subscription.status,
    );
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

    const profileDoc = await admin
      .firestore()
      .collection("profiles")
      .doc(uid)
      .get();
    if (!profileDoc.exists)
      return res.status(404).json({ error: "User not found" });

    const { subscriptionId } = profileDoc.data();
    if (!subscriptionId)
      return res.status(404).json({ error: "No subscription found" });

    // Remove the cancel_at_period_end flag — resumes auto-renew at period end, no charge
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    await admin.firestore().collection("profiles").doc(uid).set(
      {
        autoRenew: true,
        updatedAt: Date.now(),
      },
      { merge: true },
    );

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

    const profileDoc = await admin
      .firestore()
      .collection("profiles")
      .doc(uid)
      .get();
    if (!profileDoc.exists)
      return res.status(404).json({ error: "User not found" });

    const { subscriptionId } = profileDoc.data();
    if (!subscriptionId)
      return res.status(404).json({ error: "No subscription found" });

    // cancel_at_period_end keeps access until end of billing period,
    // then Stripe fires customer.subscription.deleted which the webhook handles.
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Mark auto-renew off — status stays "active" until period ends
    await admin.firestore().collection("profiles").doc(uid).set(
      {
        autoRenew: false,
        updatedAt: Date.now(),
      },
      { merge: true },
    );

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
      process.env.STRIPE_WEBHOOK_SECRET,
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
    console.log(
      "Subscription metadata:",
      JSON.stringify(subscription.metadata),
    );
    return subscription.metadata?.firebaseUid || null;
  };

  // Helper: update fields on the profile
  const updateProfile = async (uid, fields) => {
    await admin
      .firestore()
      .collection("profiles")
      .doc(uid)
      .set(
        {
          ...fields,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    console.log(`Profile updated for uid: ${uid}`, fields);
  };

  try {
    switch (event.type) {
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        console.log(
          "invoice.payment_succeeded — subscription:",
          invoice.subscription,
        );
        const uid = await getUidFromSubscriptionId(invoice.subscription);
        if (uid)
          await updateProfile(uid, {
            subscriptionStatus: "active",
            autoRenew: true,
          });
        else
          console.warn(
            "No firebaseUid found for subscription:",
            invoice.subscription,
          );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.log(
          "invoice.payment_failed — subscription:",
          invoice.subscription,
        );
        const uid = await getUidFromSubscriptionId(invoice.subscription);
        if (uid) await updateProfile(uid, { subscriptionStatus: "past_due" });
        else
          console.warn(
            "No firebaseUid found for subscription:",
            invoice.subscription,
          );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        console.log("customer.subscription.deleted — id:", subscription.id);
        console.log("Full metadata:", JSON.stringify(subscription.metadata));
        const uid = subscription.metadata?.firebaseUid;
        if (uid) {
          await updateProfile(uid, {
            subscriptionStatus: "canceled",
            autoRenew: false,
          });
        } else {
          // Metadata missing — fall back to querying Firestore by subscriptionId
          console.warn(
            "No firebaseUid in metadata, falling back to Firestore query",
          );
          const snapshot = await admin
            .firestore()
            .collection("profiles")
            .where("subscriptionId", "==", subscription.id)
            .limit(1)
            .get();
          if (!snapshot.empty) {
            await snapshot.docs[0].ref.set(
              {
                subscriptionStatus: "canceled",
                autoRenew: false,
                updatedAt: Date.now(),
              },
              { merge: true },
            );
            console.log(
              "Fallback succeeded: canceled via subscriptionId:",
              subscription.id,
            );
          } else {
            console.error(
              "Fallback failed: no profile found for subscriptionId:",
              subscription.id,
            );
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
  app,
);

app.get("/config", (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});
