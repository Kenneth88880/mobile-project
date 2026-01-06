const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configure your email transport
// You'll need to set up email credentials in Firebase config or use a service like SendGrid
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email service
  auth: {
    user: process.env.EMAIL_USER, // Set this in Firebase Functions config
    pass: process.env.EMAIL_PASS, // Set this in Firebase Functions config
  },
});

/**
 * Generate a random 6-digit verification code
 * @return {string} 6-digit code
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send email verification code
 * Callable function that sends a 6-digit code to user's email
 */
exports.sendEmailVerificationCode = onCall(async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const {email} = request.data;

  if (!email) {
    throw new HttpsError("invalid-argument", "Email is required");
  }

  try {
    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // Store code in Firestore
    await admin.firestore().collection("emailVerificationCodes").doc(userId).set({
      code: code,
      email: email,
      expiresAt: expiresAt,
      verified: false,
      createdAt: Date.now(),
    });

    // Send email
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

/**
 * Verify email code
 * Callable function that verifies the 6-digit code
 */
exports.verifyEmailCode = onCall(async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const {code} = request.data;

  if (!code) {
    throw new HttpsError("invalid-argument", "Verification code is required");
  }

  try {
    // Get stored code from Firestore
    const doc = await admin.firestore().collection("emailVerificationCodes").doc(userId).get();

    if (!doc.exists) {
      throw new HttpsError("not-found", "No verification code found");
    }

    const data = doc.data();

    // Check if code has expired
    if (Date.now() > data.expiresAt) {
      throw new HttpsError("deadline-exceeded", "Verification code has expired");
    }

    // Check if code matches
    if (data.code !== code) {
      throw new HttpsError("invalid-argument", "Invalid verification code");
    }

    // Check if already verified
    if (data.verified) {
      return {success: true, message: "Email already verified"};
    }

    // Mark as verified
    await admin.firestore().collection("emailVerificationCodes").doc(userId).update({
      verified: true,
      verifiedAt: Date.now(),
    });

    // Update user's custom claims or profile to indicate email is verified
    await admin.firestore().collection("profiles").doc(userId).set(
        {
          emailVerified: true,
        },
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
