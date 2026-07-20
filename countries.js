// ============================================
// UniMart - Send Password Reset OTP
// Vercel Serverless Function (runs server-side —
// this is the ONLY safe place to use the Resend
// API key and Firebase Admin credentials; they must
// never be exposed in the browser/client code).
// ============================================

import admin from "firebase-admin";
import { Resend } from "resend";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

const db = admin.firestore();
const resend = new Resend(process.env.RESEND_API_KEY);

const OTP_TTL_MINUTES = 10;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body || {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email is required." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Look up the account, but don't reveal to the caller whether it exists —
    // this prevents someone from using this endpoint to check which emails
    // are registered on UniMart.
    let userExists = true;
    try {
      await admin.auth().getUserByEmail(normalizedEmail);
    } catch (err) {
      if (err.code === "auth/user-not-found") userExists = false;
      else throw err;
    }

    if (userExists) {
      const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
      const expiresAt = Date.now() + OTP_TTL_MINUTES * 60 * 1000;

      await db.collection("passwordResets").doc(normalizedEmail).set({
        otp,
        expiresAt,
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await resend.emails.send({
        from: "UniMart <onboarding@resend.dev>", // Swap to a verified domain address once one is set up in Resend
        to: normalizedEmail,
        subject: "Your UniMart password reset code",
        html: `
          <div style="font-family: Georgia, serif; max-width: 420px; margin: 0 auto; padding: 24px; border: 1px solid #eee0c0; border-radius: 14px;">
            <h2 style="color:#0B3D2E; margin-bottom: 4px;">Uni<span style="color:#D4AF37;">Mart</span></h2>
            <p style="color:#333; font-size: 14px; font-family: sans-serif;">Use the code below to reset your password. It expires in ${OTP_TTL_MINUTES} minutes.</p>
            <div style="background:#F0F5F0; text-align:center; padding: 16px; border-radius: 10px; margin: 16px 0;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color:#0B3D2E;">${otp}</span>
            </div>
            <p style="color:#888; font-size: 12px; font-family: sans-serif;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    }

    // Always return the same generic response, whether or not the account exists
    return res.status(200).json({ success: true, message: "If an account exists for this email, a code has been sent." });

  } catch (err) {
    console.error("send-otp error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
