// ============================================
// UniMart - Buyer Profile Completion
// Trigger: Pehli baar checkout try karne par.
// Requires: Email verified + full profile details.
// ============================================

import { useState, useEffect } from "react";
import { sendEmailVerification, reload } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import "../../styles/theme.css";

export default function BuyerProfileCompletion({ user, onComplete }) {
  const [emailVerified, setEmailVerified] = useState(user?.emailVerified || false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    dob: "",
    gender: "",
    country: "Pakistan",
    nationalId: "",
    city: "",
    address: ""
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Cooldown timer for "resend verification email"
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    try {
      await sendEmailVerification(auth.currentUser);
      setResendCooldown(45);
    } catch (err) {
      console.error("Failed to resend verification email", err);
    }
  };

  const handleCheckVerified = async () => {
    setCheckingVerification(true);
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        setEmailVerified(true);
        // Reflect verified status in Firestore too
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          emailVerified: true
        });
      }
    } catch (err) {
      console.error("Could not refresh verification status", err);
    }
    setCheckingVerification(false);
  };

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required.";
    if (!/^\d{10,15}$/.test(form.phone.replace(/\D/g, ""))) e.phone = "Enter a valid phone number.";
    if (!form.dob) e.dob = "Date of birth is required.";
    if (!form.gender) e.gender = "Please select a gender.";
    if (!/^\d{13}$/.test(form.nationalId.replace(/\D/g, ""))) e.nationalId = "Enter a valid 13-digit National ID (CNIC).";
    if (!form.city.trim()) e.city = "City is required.";
    if (!form.address.trim()) e.address = "Delivery address is required.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!emailVerified) {
      setSubmitError("Please verify your email before continuing.");
      return;
    }

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      // Update base user doc
      await updateDoc(doc(db, "users", user.uid), {
        fullName: form.fullName,
        phone: form.phone,
        country: form.country,
        nationalId: form.nationalId,
        profileComplete: true,
        updatedAt: serverTimestamp()
      });

      // Update buyer-specific doc
      await updateDoc(doc(db, "buyers", user.uid), {
        dob: form.dob,
        gender: form.gender,
        city: form.city,
        addresses: [
          {
            label: "Home",
            fullAddress: form.address,
            city: form.city,
            isDefault: false // default is set manually later by the buyer, per our decision
          }
        ],
        updatedAt: serverTimestamp()
      });

      setSubmitting(false);
      if (onComplete) onComplete();

    } catch (err) {
      setSubmitting(false);
      setSubmitError("Something went wrong saving your details. Please try again.");
    }
  };

  return (
    <div className="auth-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span></div>
      </div>

      <div className="container" style={styles.formWrap}>
        <h2 style={styles.title}>One last step</h2>
        <p style={styles.subtitle}>
          We need a few details to process your order — this only takes a minute, and you won't need to do it again.
        </p>

        {/* Email Verification Block */}
        {!emailVerified && (
          <div style={styles.verifyBox}>
            <p style={styles.verifyTitle}>Verify your email</p>
            <p style={styles.verifyText}>
              We've sent a verification link to <b>{user?.email}</b>. Tap the link, then come back here.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCheckVerified}
                disabled={checkingVerification}
              >
                {checkingVerification ? "Checking..." : "I've verified — Check now"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleResendEmail}
                disabled={resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend email"}
              </button>
            </div>
          </div>
        )}

        {emailVerified && (
          <form onSubmit={handleSubmit} style={{ opacity: emailVerified ? 1 : 0.4, pointerEvents: emailVerified ? "auto" : "none" }}>
            <Field label="Full Name" error={errors.fullName}>
              <input className="input-field" value={form.fullName} onChange={(e) => handleChange("fullName", e.target.value)} placeholder="Your full name" />
            </Field>

            <Field label="Phone Number" error={errors.phone}>
              <input className="input-field" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="+92 3XX XXXXXXX" />
            </Field>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label="Date of Birth" error={errors.dob}>
                  <input type="date" className="input-field" value={form.dob} onChange={(e) => handleChange("dob", e.target.value)} />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Gender" error={errors.gender}>
                  <select className="input-field" value={form.gender} onChange={(e) => handleChange("gender", e.target.value)}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
              </div>
            </div>

            <Field label="Country">
              <select className="input-field" value={form.country} onChange={(e) => handleChange("country", e.target.value)}>
                <option value="Pakistan">Pakistan</option>
              </select>
            </Field>

            <Field label="National ID" error={errors.nationalId}>
              <input className="input-field" value={form.nationalId} onChange={(e) => handleChange("nationalId", e.target.value)} placeholder="XXXXX-XXXXXXX-X" />
            </Field>

            <Field label="City" error={errors.city}>
              <input className="input-field" value={form.city} onChange={(e) => handleChange("city", e.target.value)} placeholder="e.g. Bahawalpur" />
            </Field>

            <Field label="Delivery Address" error={errors.address}>
              <textarea
                className="input-field"
                rows={3}
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="House #, street, area..."
                style={{ resize: "none", fontFamily: "inherit" }}
              />
            </Field>

            {submitError && <p className="error-text">{submitError}</p>}

            <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={submitting}>
              {submitting ? "Saving..." : "Continue to checkout"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="input-label">{label}</label>
      {children}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { background: "#0B3D2E", padding: "20px 16px", textAlign: "center" },
  logo: { fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, color: "#FBF9F4" },
  formWrap: { paddingTop: 28, paddingBottom: 40 },
  title: { fontSize: 22, marginBottom: 8 },
  subtitle: { fontSize: 13.5, color: "#6b6b6b", marginBottom: 22, lineHeight: 1.5 },
  verifyBox: { background: "#F0F5F0", border: "1px solid #eee0c0", borderRadius: 12, padding: 16, marginBottom: 24 },
  verifyTitle: { fontWeight: 700, color: "#0B3D2E", fontSize: 14, marginBottom: 6 },
  verifyText: { fontSize: 12.5, color: "#444", lineHeight: 1.5 }
};
