// ============================================
// UniMart - Buyer Profile Completion
// Trigger: Pehli baar checkout try karne par.
// Requires: Email verified + full profile details.
// [Tailwind / Airbnb-inspired design system]
// ============================================

import { useState, useEffect } from "react";
import { sendEmailVerification, reload } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebase";

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
    <div className="min-h-screen bg-canvas">
      <div className="h-nav flex items-center justify-center border-b border-hairline">
        <div className="text-display-lg">
          Uni<span className="text-rausch">Mart</span>
        </div>
      </div>

      <div className="max-w-[400px] mx-auto px-4 pt-7 pb-10">
        <h2 className="text-display-lg text-ink mb-2">One last step</h2>
        <p className="text-body-sm text-muted mb-6 leading-relaxed">
          We need a few details to process your order — this only takes a minute, and you won't need to do it again.
        </p>

        {/* Email Verification Block */}
        {!emailVerified && (
          <div className="bg-surface-soft border border-hairline rounded-card p-4 mb-6">
            <p className="text-title-sm text-ink font-bold mb-1.5">Verify your email</p>
            <p className="text-body-sm text-body leading-relaxed">
              We've sent a verification link to <b className="text-ink">{user?.email}</b>. Tap the link, then come back here.
            </p>
            <div className="flex gap-2.5 mt-2.5">
              <button
                type="button"
                onClick={handleCheckVerified}
                disabled={checkingVerification}
                className="h-11 px-4 rounded-btn bg-rausch hover:bg-rausch-active disabled:bg-rausch-disabled text-white text-body-sm font-semibold transition-colors"
              >
                {checkingVerification ? "Checking..." : "I've verified — Check now"}
              </button>
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={resendCooldown > 0}
                className="h-11 px-4 rounded-btn border border-hairline text-ink text-body-sm font-semibold hover:bg-surface-soft transition-colors disabled:text-muted"
              >
                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend email"}
              </button>
            </div>
          </div>
        )}

        {emailVerified && (
          <form onSubmit={handleSubmit}>
            <Field label="Full Name" error={errors.fullName}>
              <input className={inputClass} value={form.fullName} onChange={(e) => handleChange("fullName", e.target.value)} placeholder="Your full name" />
            </Field>

            <Field label="Phone Number" error={errors.phone}>
              <input className={inputClass} value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="+92 3XX XXXXXXX" />
            </Field>

            <div className="flex gap-3">
              <div className="flex-1">
                <Field label="Date of Birth" error={errors.dob}>
                  <input type="date" className={inputClass} value={form.dob} onChange={(e) => handleChange("dob", e.target.value)} />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="Gender" error={errors.gender}>
                  <select className={inputClass} value={form.gender} onChange={(e) => handleChange("gender", e.target.value)}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
              </div>
            </div>

            <Field label="Country">
              <select className={inputClass} value={form.country} onChange={(e) => handleChange("country", e.target.value)}>
                <option value="Pakistan">Pakistan</option>
              </select>
            </Field>

            <Field label="National ID" error={errors.nationalId}>
              <input className={inputClass} value={form.nationalId} onChange={(e) => handleChange("nationalId", e.target.value)} placeholder="XXXXX-XXXXXXX-X" />
            </Field>

            <Field label="City" error={errors.city}>
              <input className={inputClass} value={form.city} onChange={(e) => handleChange("city", e.target.value)} placeholder="e.g. Bahawalpur" />
            </Field>

            <Field label="Delivery Address" error={errors.address}>
              <textarea
                className={`${inputClass} h-auto py-3 resize-none font-inherit`}
                rows={3}
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="House #, street, area..."
              />
            </Field>

            {submitError && <p className="text-rausch text-body-sm mb-2">{submitError}</p>}

            <button type="submit" disabled={submitting} className="w-full mt-2 h-12 rounded-btn bg-rausch hover:bg-rausch-active disabled:bg-rausch-disabled text-white text-title-sm font-semibold transition-colors">
              {submitting ? "Saving..." : "Continue to checkout"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const inputClass = "w-full h-12 px-4 rounded-btn border border-hairline text-body-md text-ink placeholder:text-muted focus:outline-none focus:border-ink focus:shadow-elevation transition-shadow bg-canvas";

function Field({ label, error, children }) {
  return (
    <div className="mb-4">
      <label className="block text-title-sm text-ink mb-1.5">{label}</label>
      {children}
      {error && <p className="text-rausch text-body-sm mt-1.5">{error}</p>}
    </div>
  );
}
