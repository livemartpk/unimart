// ============================================
// UniMart - Forgot Password (OTP-based)
// Step 1: enter email, request a code (sent via
//         email through our own serverless function)
// Step 2: popup — enter code + new password, submit
// ============================================

import { useState } from "react";
import "../../styles/theme.css";

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [sendError, setSendError] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [showPopup, setShowPopup] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleGetOtp = async (e) => {
    e.preventDefault();
    setSendError("");
    if (!email.includes("@")) { setSendError("Enter a valid email."); return; }

    setSendingOtp(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      setOtpSent(true);
      setShowPopup(true);
    } catch (err) {
      setSendError(err.message);
    }
    setSendingOtp(false);
  };

  const resetPopupFields = () => {
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setVerifyError("");
  };

  const handleSubmit = async () => {
    setVerifyError("");
    if (!otp.trim()) { setVerifyError("Enter the code sent to your email."); return; }
    if (newPassword.length < 6) { setVerifyError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setVerifyError("Passwords don't match."); return; }

    setVerifying(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      setShowPopup(false);
      setSuccess(true);
    } catch (err) {
      setVerifyError(err.message);
    }
    setVerifying(false);
  };

  return (
    <div className="auth-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span></div>
      </div>

      <div className="container" style={styles.formWrap}>
        {success ? (
          <div style={styles.successBox}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <h2 style={styles.title}>Password updated</h2>
            <p style={styles.subtitle}>You can now log in with your new password.</p>
            <button className="btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={onBack}>Back to login</button>
          </div>
        ) : (
          <>
            <h2 style={styles.title}>Reset your password</h2>
            <p style={styles.subtitle}>Enter your email — we'll send a 6-digit code to reset your password.</p>
            <form onSubmit={handleGetOtp}>
              <label className="input-label">Email</label>
              <input
                type="email"
                className="input-field"
                style={{ marginBottom: 12 }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={otpSent}
              />
              {sendError && <p className="error-text">{sendError}</p>}
              {otpSent && !sendError && (
                <p style={styles.sentNote}>✓ Code sent — check your email inbox.</p>
              )}
              <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={sendingOtp}>
                {sendingOtp ? "Sending..." : otpSent ? "Resend Code" : "Get OTP"}
              </button>
              {otpSent && (
                <button type="button" className="btn-secondary" style={{ width: "100%", marginTop: 10 }} onClick={() => setShowPopup(true)}>
                  Enter Code
                </button>
              )}
            </form>
            <p style={styles.switchText} onClick={onBack}>← Back to login</p>
          </>
        )}
      </div>

      {/* ===== OTP + New Password Popup ===== */}
      {showPopup && (
        <div style={styles.overlay} onClick={() => setShowPopup(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Enter Reset Code</h3>
            <p style={styles.modalSubtitle}>Sent to <b>{email}</b></p>

            <label className="input-label">6-Digit Code</label>
            <input
              className="input-field"
              style={{ marginBottom: 12, letterSpacing: 4, fontWeight: 700, textAlign: "center" }}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
            />

            <label className="input-label">New Password</label>
            <input
              type="password"
              className="input-field"
              style={{ marginBottom: 12 }}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
            />

            <label className="input-label">Re-enter New Password</label>
            <input
              type="password"
              className="input-field"
              style={{ marginBottom: 14 }}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
            />

            {verifyError && <p className="error-text">{verifyError}</p>}

            <div style={styles.modalActions}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={verifying}>
                {verifying ? "Updating..." : "Submit"}
              </button>
              <button style={styles.clearBtn} onClick={resetPopupFields} disabled={verifying}>Clear</button>
            </div>
            <div style={styles.closeBtn} onClick={() => setShowPopup(false)}>Close</div>
          </div>
        </div>
      )}
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
  sentNote: { fontSize: 12.5, color: "#2E7D32", fontWeight: 600, marginBottom: 8 },
  successBox: { textAlign: "center", paddingTop: 20 },
  switchText: { textAlign: "center", marginTop: 18, fontSize: 12.5, color: "#0B3D2E", fontWeight: 700, cursor: "pointer" },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { background: "#fff", borderRadius: 18, padding: 24, width: "100%", maxWidth: 380 },
  modalTitle: { fontSize: 18, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 4, fontWeight: 700 },
  modalSubtitle: { fontSize: 12.5, color: "#888", marginBottom: 18 },
  modalActions: { display: "flex", gap: 10, marginTop: 6 },
  clearBtn: { flex: 1, background: "#F0F5F0", border: "1px solid #eee0c0", color: "#0B3D2E", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" },
  closeBtn: { textAlign: "center", fontSize: 12.5, color: "#888", cursor: "pointer", padding: "10px 0 0" }
};
