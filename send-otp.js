// ============================================
// UniMart - Verify OTP & Update Password
// Vercel Serverless Function
// ============================================

import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

const db = admin.firestore();
const MAX_ATTEMPTS = 5;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, otp, newPassword } = req.body || {};

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: "Email, OTP, and new password are all required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const resetRef = db.collection("passwordResets").doc(normalizedEmail);

  try {
    const snap = await resetRef.get();
    if (!snap.exists) {
      return res.status(400).json({ error: "No reset request found. Please request a new code." });
    }

    const data = snap.data();

    if (Date.now() > data.expiresAt) {
      await resetRef.delete();
      return res.status(400).json({ error: "This code has expired. Please request a new one." });
    }

    if ((data.attempts || 0) >= MAX_ATTEMPTS) {
      await resetRef.delete();
      return res.status(400).json({ error: "Too many incorrect attempts. Please request a new code." });
    }

    if (String(otp).trim() !== String(data.otp)) {
      await resetRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
      return res.status(400).json({ error: "Incorrect code. Please try again." });
    }

    // OTP is correct — update the password
    const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
    await admin.auth().updateUser(userRecord.uid, { password: newPassword });

    // Invalidate the OTP so it can't be reused
    await resetRef.delete();

    return res.status(200).json({ success: true, message: "Password updated successfully." });

  } catch (err) {
    console.error("verify-otp error:", err);
    if (err.code === "auth/user-not-found") {
      return res.status(400).json({ error: "No account found with this email." });
    }
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
