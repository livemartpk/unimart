// ============================================
// UniMart - Forgot Password
// ============================================

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../config/firebase";
import "../../styles/theme.css";

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.includes("@")) { setError("Enter a valid email."); return; }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      if (err.code === "auth/user-not-found") setError("No account found with this email.");
      else setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="auth-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span></div>
      </div>

      <div className="container" style={styles.formWrap}>
        {sent ? (
          <div style={styles.successBox}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <h2 style={styles.title}>Check your email</h2>
            <p style={styles.subtitle}>We've sent a password reset link to <b>{email}</b>.</p>
            <button className="btn-secondary" style={{ width: "100%", marginTop: 16 }} onClick={onBack}>Back to login</button>
          </div>
        ) : (
          <>
            <h2 style={styles.title}>Reset your password</h2>
            <p style={styles.subtitle}>Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleSubmit}>
              <label className="input-label">Email</label>
              <input type="email" className="input-field" style={{ marginBottom: 12 }} value={email} onChange={(e) => setEmail(e.target.value)} />
              {error && <p className="error-text">{error}</p>}
              <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
            <p style={styles.switchText} onClick={onBack}>← Back to login</p>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { background: "#0B3D2E", padding: "20px 16px", textAlign: "center" },
  logo: { fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, color: "#FBF9F4" },
  formWrap: { paddingTop: 32, paddingBottom: 40 },
  title: { fontSize: 21, marginBottom: 8 },
  subtitle: { fontSize: 13.5, color: "#6b6b6b", marginBottom: 22, lineHeight: 1.5 },
  successBox: { textAlign: "center", paddingTop: 20 },
  switchText: { textAlign: "center", marginTop: 18, fontSize: 12.5, color: "#0B3D2E", fontWeight: 700, cursor: "pointer" }
};
