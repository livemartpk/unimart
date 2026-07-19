// ============================================
// UniMart - Agent Registration
// [Tailwind / Airbnb-inspired design system]
// ============================================

import { useState } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { getCurrencyForCountry } from "../../utils/countries";
import CountryGenderFields from "../../components/CountryGenderFields";

function generateReferralCode(name) {
  const base = (name || "AGENT").replace(/\s+/g, "").toUpperCase().slice(0, 6);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${base}${rand}`;
}

export default function AgentSignUp({ onSuccess, onSwitchToLogin, onBackToBrowsing }) {
  const [form, setForm] = useState({
    fullName: "", email: "", password: "", confirmPassword: "",
    phone: "", country: "", gender: "", nationalId: "", city: "",
    paymentAccount: "", experience: "", socialHandle: "", cnicFile: null
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required.";
    if (!form.email.includes("@")) e.email = "Enter a valid email.";
    if (form.password.length < 6) e.password = "Password must be at least 6 characters.";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match.";
    if (!/^\d{10,15}$/.test(form.phone.replace(/\D/g, ""))) e.phone = "Enter a valid phone number.";
    if (!/^\d{13}$/.test(form.nationalId.replace(/\D/g, ""))) e.nationalId = "Enter a valid 13-digit National ID.";
    if (!form.city.trim()) e.city = "City is required.";
    if (!form.country) e.country = "Please select your country.";
    if (!form.gender) e.gender = "Please select your gender.";
    if (!form.paymentAccount.trim()) e.paymentAccount = "Payment account is required for commission payouts.";
    return e;
  };

  const CLOUD_NAME = "eez9oojf";
  const UPLOAD_PRESET = "unimart-products";

  const uploadToCloudinary = async (file, folder = "unimart/documents") => {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", UPLOAD_PRESET);
    data.append("folder", folder);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
      method: "POST", body: data
    });
    const json = await res.json();
    if (json.secure_url) return json.secure_url;
    throw new Error(json.error?.message || "Upload failed");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      // Upload CNIC to Cloudinary if selected
      let cnicUrl = null;
      if (form.cnicFile) {
        try {
          cnicUrl = await uploadToCloudinary(form.cnicFile, "unimart/agent-cnic");
        } catch (uploadErr) {
          console.warn("CNIC upload failed:", uploadErr.message);
        }
      }

      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = userCredential.user;
      await sendEmailVerification(user);

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "agent",
        fullName: form.fullName,
        phone: form.phone,
        country: form.country,
        currency: getCurrencyForCountry(form.country),
        gender: form.gender,
        nationalId: form.nationalId,
        emailVerified: false,
        profileComplete: true,
        status: "pending",
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, "agents", user.uid), {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        city: form.city,
        country: form.country,
        nationalId: form.nationalId,
        cnicUrl: cnicUrl,
        tier: "bronze",
        status: "pending",
        referralCode: generateReferralCode(form.fullName),
        monthlyTargets: { newStores: 0, salesAmount: 0, traffic: 0 },
        taggedStores: [],
        missedTargetCount: 0,
        experience: form.experience || null,
        socialHandle: form.socialHandle || null,
        paymentDetails: { account: form.paymentAccount },
        points: 0,
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, "wallets_agent", user.uid), {
        totalBalance: 0, availableBalance: 0, pendingBalance: 0, createdAt: serverTimestamp()
      });

      setLoading(false);
      setRegisteredEmail(form.email);
      setRegistered(true);

    } catch (err) {
      setLoading(false);
      if (err.code === "auth/email-already-in-use") setError("This email is already registered.");
      else setError("Something went wrong. Please try again.");
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-black/50 flex items-center justify-center p-5">
        <div className="bg-canvas rounded-card p-7 max-w-[400px] w-full shadow-elevation">
          <div className="text-5xl text-center mb-3">🎉</div>
          <h2 className="text-display-lg text-ink text-center mb-2.5">Registration Successful!</h2>
          <p className="text-body-sm text-body text-center leading-relaxed mb-4">
            Your agent application has been submitted successfully.
          </p>
          <div className="bg-surface-soft border border-hairline rounded-btn px-4 py-3 mb-3">
            <div className="text-[10.5px] text-muted mb-1">Your login email:</div>
            <div className="text-body-md font-bold text-ink">{registeredEmail}</div>
          </div>
          <p className="text-body-sm text-muted leading-relaxed text-center">
            Use your email and password to log in. Your account will show "Under Review" until our Marketing Manager approves your application.
          </p>
          <button
            onClick={onSwitchToLogin}
            className="w-full mt-4 h-12 rounded-btn bg-rausch hover:bg-rausch-active text-white text-title-sm font-semibold transition-colors"
          >
            Login with your email and password →
          </button>
          {onBackToBrowsing && (
            <div
              onClick={onBackToBrowsing}
              className="flex items-center justify-center gap-2 py-3 px-5 mt-2.5 rounded-btn border border-hairline bg-surface-soft text-title-sm text-ink cursor-pointer hover:shadow-elevation transition-shadow"
            >
              🏠 Back to Shopping
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="h-nav flex items-center justify-center border-b border-hairline">
        <div className="text-display-lg flex items-center gap-2">
          Uni<span className="text-rausch">Mart</span>
          <span className="text-[11px] bg-rausch text-white px-2 py-0.5 rounded font-extrabold">Agent</span>
        </div>
      </div>

      <div className="max-w-[400px] mx-auto px-4 pt-7 pb-10">
        {onBackToBrowsing && (
          <div
            onClick={onBackToBrowsing}
            className="flex items-center justify-center gap-2 py-3 px-5 mb-5 rounded-btn border border-hairline bg-surface-soft text-title-sm text-ink cursor-pointer hover:shadow-elevation transition-shadow"
          >
            🏠 Back to Shopping
          </div>
        )}
        <h2 className="text-display-lg text-ink mb-2">Become a UniMart Agent</h2>
        <p className="text-body-sm text-muted mb-6 leading-relaxed">
          Earn commission by bringing sellers onto the platform and sharing referral links.
        </p>

        <form onSubmit={handleSubmit}>
          <Field label="Full Name" error={errors.fullName}>
            <input className={inputClass} value={form.fullName} onChange={(e) => handleChange("fullName", e.target.value)} />
          </Field>
          <Field label="Email" error={errors.email}>
            <input type="email" className={inputClass} value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
          </Field>
          <Field label="Password" error={errors.password}>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} className={`${inputClass} pr-11`} value={form.password} onChange={(e) => handleChange("password", e.target.value)} />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-base select-none" onClick={() => setShowPassword(s => !s)}>{showPassword ? "🙈" : "👁️"}</span>
            </div>
          </Field>
          <Field label="Confirm Password" error={errors.confirmPassword}>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} className={`${inputClass} pr-11`} value={form.confirmPassword} onChange={(e) => handleChange("confirmPassword", e.target.value)} />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-base select-none" onClick={() => setShowPassword(s => !s)}>{showPassword ? "🙈" : "👁️"}</span>
            </div>
          </Field>
          <Field label="Phone Number" error={errors.phone}>
            <input className={inputClass} value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="+92 3XX XXXXXXX" />
          </Field>
          <CountryGenderFields
            country={form.country}
            setCountry={(v) => handleChange("country", v)}
            gender={form.gender}
            setGender={(v) => handleChange("gender", v)}
            errors={errors}
          />
          <Field label="National ID" error={errors.nationalId}>
            <input className={inputClass} value={form.nationalId} onChange={(e) => handleChange("nationalId", e.target.value)} placeholder="XXXXX-XXXXXXX-X" />
          </Field>

          <Field label="CNIC Photo Upload (optional but recommended)">
            <input
              type="file"
              className={inputClass}
              accept="image/*,application/pdf"
              onChange={(e) => handleChange("cnicFile", e.target.files[0])}
            />
            <div className="text-[11px] text-muted mt-1">Upload a clear photo of your CNIC (front side)</div>
          </Field>
          <Field label="City" error={errors.city}>
            <input className={inputClass} value={form.city} onChange={(e) => handleChange("city", e.target.value)} />
          </Field>
          <Field label="Payment Account (Easypaisa / JazzCash)" error={errors.paymentAccount}>
            <input className={inputClass} value={form.paymentAccount} onChange={(e) => handleChange("paymentAccount", e.target.value)} />
          </Field>
          <Field label="Previous Sales/Marketing Experience (Optional)">
            <textarea className={`${inputClass} h-auto py-3 resize-none font-inherit`} rows={2} value={form.experience} onChange={(e) => handleChange("experience", e.target.value)} />
          </Field>
          <Field label="Social Media Handle (Optional)">
            <input className={inputClass} value={form.socialHandle} onChange={(e) => handleChange("socialHandle", e.target.value)} placeholder="@yourhandle" />
          </Field>

          {error && <p className="text-rausch text-body-sm mb-2">{error}</p>}

          <button type="submit" disabled={loading} className="w-full mt-2 h-12 rounded-btn bg-rausch hover:bg-rausch-active disabled:bg-rausch-disabled text-white text-title-sm font-semibold transition-colors">
            {loading ? "Submitting..." : "Submit application"}
          </button>
        </form>

        <p className="text-center mt-5 text-body-sm text-muted">
          Already an agent?{" "}
          <span onClick={onSwitchToLogin} className="text-ink font-semibold cursor-pointer hover:underline">Log in</span>
        </p>
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
