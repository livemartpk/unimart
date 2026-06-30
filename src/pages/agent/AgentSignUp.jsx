// ============================================
// UniMart - Agent Registration
// ============================================

import { useState } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import "../../styles/theme.css";

function generateReferralCode(name) {
  const base = (name || "AGENT").replace(/\s+/g, "").toUpperCase().slice(0, 6);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${base}${rand}`;
}

export default function AgentSignUp({ onSuccess, onSwitchToLogin, onBackToBrowsing }) {
  const [form, setForm] = useState({
    fullName: "", email: "", password: "", confirmPassword: "",
    phone: "", country: "Pakistan", nationalId: "", city: "",
    paymentAccount: "", experience: "", socialHandle: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
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
    if (!form.paymentAccount.trim()) e.paymentAccount = "Payment account is required for commission payouts.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = userCredential.user;
      await sendEmailVerification(user);

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "agent",
        fullName: form.fullName,
        phone: form.phone,
        country: form.country,
        nationalId: form.nationalId,
        emailVerified: false,
        profileComplete: true,
        status: "pending", // requires Marketing Manager approval
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, "agents", user.uid), {
        city: form.city,
        tier: "bronze",
        status: "pending",
        referralCode: generateReferralCode(form.fullName),
        monthlyTargets: { newStores: 0, salesAmount: 0, traffic: 0 }, // set later by Marketing Manager
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
      if (onSuccess) onSuccess(user);

    } catch (err) {
      setLoading(false);
      if (err.code === "auth/email-already-in-use") setError("This email is already registered.");
      else setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="auth-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span> <span style={styles.agentTag}>Agent</span></div>
      </div>

      <div className="container" style={styles.formWrap}>
        {onBackToBrowsing && <p style={{fontSize:12.5,color:"#0B3D2E",fontWeight:600,cursor:"pointer",marginBottom:16}} onClick={onBackToBrowsing}>← Back to browsing</p>}
        <h2 style={styles.title}>Become a UniMart Agent</h2>
        <p style={styles.subtitle}>Earn commission by bringing sellers onto the platform and sharing referral links.</p>

        <form onSubmit={handleSubmit}>
          <Field label="Full Name" error={errors.fullName}>
            <input className="input-field" value={form.fullName} onChange={(e) => handleChange("fullName", e.target.value)} />
          </Field>
          <Field label="Email" error={errors.email}>
            <input type="email" className="input-field" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
          </Field>
          <Field label="Password" error={errors.password}>
            <div style={{position:"relative"}}><input type={showPassword ? "text" : "password"} className="input-field" style={{paddingRight:44}} value={form.password} onChange={(e) => handleChange("password", e.target.value)} /><span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",cursor:"pointer",fontSize:16}} onClick={() => setShowPassword(s => !s)}>{showPassword ? "🙈" : "👁️"}</span></div>
          </Field>
          <Field label="Confirm Password" error={errors.confirmPassword}>
            <div style={{position:"relative"}}><input type={showPassword ? "text" : "password"} className="input-field" style={{paddingRight:44}} value={form.confirmPassword} onChange={(e) => handleChange("confirmPassword", e.target.value)} /><span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",cursor:"pointer",fontSize:16}} onClick={() => setShowPassword(s => !s)}>{showPassword ? "🙈" : "👁️"}</span></div>
          </Field>
          <Field label="Phone Number" error={errors.phone}>
            <input className="input-field" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="+92 3XX XXXXXXX" />
          </Field>
          <Field label="Country">
            <select className="input-field" value={form.country} onChange={(e) => handleChange("country", e.target.value)}>
              <option value="Pakistan">Pakistan</option>
            </select>
          </Field>
          <Field label="National ID" error={errors.nationalId}>
            <input className="input-field" value={form.nationalId} onChange={(e) => handleChange("nationalId", e.target.value)} placeholder="XXXXX-XXXXXXX-X" />
          </Field>
          <Field label="City" error={errors.city}>
            <input className="input-field" value={form.city} onChange={(e) => handleChange("city", e.target.value)} />
          </Field>
          <Field label="Payment Account (Easypaisa / JazzCash)" error={errors.paymentAccount}>
            <input className="input-field" value={form.paymentAccount} onChange={(e) => handleChange("paymentAccount", e.target.value)} />
          </Field>
          <Field label="Previous Sales/Marketing Experience (Optional)">
            <textarea className="input-field" rows={2} value={form.experience} onChange={(e) => handleChange("experience", e.target.value)} style={{ resize: "none", fontFamily: "inherit" }} />
          </Field>
          <Field label="Social Media Handle (Optional)">
            <input className="input-field" value={form.socialHandle} onChange={(e) => handleChange("socialHandle", e.target.value)} placeholder="@yourhandle" />
          </Field>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={loading}>
            {loading ? "Submitting..." : "Submit application"}
          </button>
        </form>

        <p style={styles.switchText}>
          Already an agent?{" "}
          <span style={styles.switchLink} onClick={onSwitchToLogin}>Log in</span>
        </p>
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
  logo: { fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: "#FBF9F4" },
  agentTag: { fontSize: 11, background: "#D4AF37", color: "#0B3D2E", padding: "2px 8px", borderRadius: 6, fontWeight: 800, marginLeft: 4 },
  formWrap: { paddingTop: 28, paddingBottom: 40 },
  title: { fontSize: 21, marginBottom: 8 },
  subtitle: { fontSize: 13.5, color: "#6b6b6b", marginBottom: 22, lineHeight: 1.5 },
  switchText: { textAlign: "center", marginTop: 20, fontSize: 13, color: "#6b6b6b" },
  switchLink: { color: "#0B3D2E", fontWeight: 700, cursor: "pointer" }
};
