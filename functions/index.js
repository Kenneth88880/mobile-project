const {
  onCall,
  HttpsError,
  onRequest,
} = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const express = require("express");
const vision = require("@google-cloud/vision");

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

// ─── Photo Moderation ─────────────────────────────────────────────────────────
// Triggers on every upload to Firebase Storage. Calls Vision API SafeSearch.
//
// Decision matrix:
//   - VERY_LIKELY adult/violence -> auto-delete photo + remove from profile
//   - LIKELY adult/violence -> queue for human review (photo kept temporarily)
//   - LIKELY/VERY_LIKELY racy -> queue for human review
//   - Anything else -> approved silently
//
// To approve a queued photo: delete the doc from photoModerationQueue.
// To reject a queued photo: manually delete the photo from Storage + remove
// the URL from the profile's photos array, then delete the queue doc.

const visionClient = new vision.ImageAnnotatorClient();

// Likelihood ranking from Vision API:
// VERY_UNLIKELY < UNLIKELY < POSSIBLE < LIKELY < VERY_LIKELY < UNKNOWN
const LIKELIHOOD_LEVEL = {
  VERY_UNLIKELY: 0,
  UNLIKELY: 1,
  POSSIBLE: 2,
  LIKELY: 3,
  VERY_LIKELY: 4,
  UNKNOWN: -1,
};

function level(likelihood) {
  return LIKELIHOOD_LEVEL[likelihood] ?? -1;
}

exports.moderateProfilePhoto = onObjectFinalized(
  {
    region: "us-central1",
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (event) => {
    const filePath = event.data.name;
    const bucket = event.data.bucket;
    const contentType = event.data.contentType || "";

    // Only moderate uploads to profile_photos/{uid}/...
    if (!filePath || !filePath.startsWith("profile_photos/")) {
      console.log(`Skipping non-profile-photo upload: ${filePath}`);
      return;
    }

    // Skip non-image files (shouldn't happen but guard anyway)
    if (!contentType.startsWith("image/")) {
      console.log(`Skipping non-image file: ${filePath} (${contentType})`);
      return;
    }

    // Extract user ID from path
    const pathParts = filePath.split("/");
    if (pathParts.length < 2) {
      console.log(`Cannot extract userId from: ${filePath}`);
      return;
    }
    const userId = pathParts[1];

    console.log(`Moderating photo: ${filePath} for user ${userId}`);

    // Run SafeSearch
    let safeSearch;
    try {
      const [result] = await visionClient.safeSearchDetection(
        `gs://${bucket}/${filePath}`,
      );
      safeSearch = result.safeSearchAnnotation;
    } catch (err) {
      console.error(`Vision API error for ${filePath}:`, err.message || err);
      // Fail open: don't block uploads on API failure, but log it
      // Optionally queue these for review too — for now, leave the photo alone
      return;
    }

    if (!safeSearch) {
      console.log(`No SafeSearch result for ${filePath}`);
      return;
    }

    const { adult, violence, racy } = safeSearch;
    console.log(`SafeSearch result for ${filePath}:`, {
      adult,
      violence,
      racy,
    });

    const adultLevel = level(adult);
    const violenceLevel = level(violence);
    const racyLevel = level(racy);

    // STRICT: VERY_LIKELY adult or violence -> auto-delete
    const shouldAutoDelete =
      adultLevel >= LIKELIHOOD_LEVEL.VERY_LIKELY ||
      violenceLevel >= LIKELIHOOD_LEVEL.VERY_LIKELY;

    // QUEUE: LIKELY adult/violence, OR LIKELY/VERY_LIKELY racy -> human review
    const shouldQueue =
      adultLevel >= LIKELIHOOD_LEVEL.LIKELY ||
      violenceLevel >= LIKELIHOOD_LEVEL.LIKELY ||
      racyLevel >= LIKELIHOOD_LEVEL.LIKELY;

    if (shouldAutoDelete) {
      console.log(`AUTO-DELETING photo ${filePath} - clearly inappropriate`);
      await deletePhoto(bucket, filePath, userId, {
        reason: "auto_delete",
        scores: { adult, violence, racy },
      });
      return;
    }

    if (shouldQueue) {
      console.log(`QUEUEING photo ${filePath} for human review`);
      await queueForReview(bucket, filePath, userId, { adult, violence, racy });
      return;
    }

    console.log(`Photo ${filePath} APPROVED automatically (clean)`);
  },
);

// Delete a photo from Storage and remove its URL from the user's profile
async function deletePhoto(bucket, filePath, userId, metadata) {
  const db = admin.firestore();

  // 1. Delete from Storage
  try {
    await admin.storage().bucket(bucket).file(filePath).delete();
    console.log(`Deleted from Storage: ${filePath}`);
  } catch (err) {
    console.error(`Failed to delete from Storage:`, err.message);
  }

  // 2. Remove URL from profile.photos
  try {
    const profileRef = db.collection("profiles").doc(userId);
    const profileDoc = await profileRef.get();
    if (profileDoc.exists) {
      const photos = profileDoc.data()?.photos || [];
      const filteredPhotos = photos.filter((url) => {
        if (typeof url !== "string") return true;
        // Match by either the file path or the encoded URL pattern
        return (
          !url.includes(encodeURIComponent(filePath)) && !url.includes(filePath)
        );
      });
      if (filteredPhotos.length !== photos.length) {
        await profileRef.update({ photos: filteredPhotos });
        console.log(`Removed photo URL from profile ${userId}`);
      }
    }
  } catch (err) {
    console.error(`Failed to update profile photos:`, err.message);
  }

  // 3. Log the moderation action for audit
  try {
    await db.collection("moderationLog").add({
      userId,
      filePath,
      bucket,
      action: "auto_deleted",
      ...metadata,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error(`Failed to log moderation action:`, err.message);
  }
}

// Queue a photo for human review (photo stays in Storage for now)
async function queueForReview(bucket, filePath, userId, scores) {
  const db = admin.firestore();
  try {
    // Get a download URL for the photo so the reviewer can see it
    const file = admin.storage().bucket(bucket).file(filePath);
    let publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media`;

    await db.collection("photoModerationQueue").add({
      userId,
      filePath,
      bucket,
      publicUrl,
      scores,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Queued ${filePath} for review`);
  } catch (err) {
    console.error(`Failed to queue photo for review:`, err.message);
  }
}

// ─── Scheduled Account Hard-Delete ────────────────────────────────────────────

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

async function hardDeleteUser(db, bucket, userId, profileData) {
  console.log(`Hard-deleting user ${userId}`);

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

    try {
      await bucket.deleteFiles({ prefix: `profile_photos/${userId}/` });
    } catch (err) {
      console.error(
        `Failed to delete photos folder for ${userId}:`,
        err.message,
      );
    }
  } catch (err) {
    console.error(`Photos cleanup error for ${userId}:`, err.message);
  }

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
        await deleteChatWithMessages(db, chatDoc.ref);
      } else {
        await chatDoc.ref.update({
          deletedParticipants: admin.firestore.FieldValue.arrayUnion(userId),
        });
      }
    }
  } catch (err) {
    console.error(`Chats cleanup error for ${userId}:`, err.message);
  }

  try {
    const duosSnap = await db
      .collection("duos")
      .where("users", "array-contains", userId)
      .get();
    await batchDelete(db, duosSnap.docs);
  } catch (err) {
    console.error(`Duos cleanup error for ${userId}:`, err.message);
  }

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

  try {
    const eventsSnap = await db
      .collection("userEvents")
      .doc(userId)
      .collection("events")
      .get();
    await batchDelete(db, eventsSnap.docs);
    await db
      .collection("userEvents")
      .doc(userId)
      .delete()
      .catch(() => {});
  } catch (err) {
    console.error(`Events cleanup error for ${userId}:`, err.message);
  }

  try {
    await db
      .collection("emailVerificationCodes")
      .doc(userId)
      .delete()
      .catch(() => {});
  } catch (err) {
    console.error(`Email code cleanup error for ${userId}:`, err.message);
  }

  try {
    await db.collection("profiles").doc(userId).delete();
  } catch (err) {
    console.error(`Profile document delete error for ${userId}:`, err.message);
  }

  console.log(`Hard-delete complete for user ${userId}`);
}

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

async function batchDelete(db, docs) {
  if (!docs || docs.length === 0) return;
  for (let i = 0; i < docs.length; i += 500) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + 500);
    chunk.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

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

    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

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

  const getUidFromSubscriptionId = async (subscriptionId) => {
    console.log("Fetching subscription:", subscriptionId);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log(
      "Subscription metadata:",
      JSON.stringify(subscription.metadata),
    );
    return subscription.metadata?.firebaseUid || null;
  };

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
