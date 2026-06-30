// ============================================
// UniMart - Universal Login
// Sab roles (Buyer/Seller/Agent/Admin) isi page
// se login karte hain. Login ke baad role check
// karke sahi dashboard pe bhej diya jata hai.
// ============================================

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import "../../styles/theme.css";

export default function Login({ onLoginSuccess, onSwitchToSignUp, onForgotPassword, onBackToBrowsing, onSwitchToSellerSignUp, onSwitchToAgentSignUp }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Fetch role from Firestore "users" collection
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        setError("Account data not found. Please contact support.");
        setLoading(false);
        return;
      }

      const userData = userDoc.data();

      // 3. Check account status
      if (userData.status === "blocked") {
        setError("This account has been blocked. Contact support for help.");
        setLoading(false);
        return;
      }
      if (userData.status === "pending") {
        setError("Your account is still pending approval.");
        setLoading(false);
        return;
      }

      setLoading(false);

      // 4. Redirect based on role
      if (onLoginSuccess) {
        onLoginSuccess({ user, role: userData.role, userData });
      }

    } catch (err) {
      setLoading(false);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Incorrect email or password.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Check your internet connection and try again.");
      } else {
        setError(`Something went wrong (${err.code || err.message || "unknown error"}). Please try again.`);
      }
    }
  };

  return (
    <div className="auth-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span></div>
      </div>

      <div className="container" style={styles.formWrap}>
        {onBackToBrowsing && (
          <p style={styles.backLink} onClick={onBackToBrowsing}>← Back to browsing</p>
        )}
        <h2 style={styles.title}>Welcome back</h2>
        <p style={styles.subtitle}>Log in to continue to your account.</p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label className="input-label">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label className="input-label">Password</label>
            <div style={styles.passwordWrap}>
              <input
                type={showPassword ? "text" : "password"}
                className="input-field"
                style={{ paddingRight: 44 }}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span style={styles.eyeIcon} onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>
          </div>

          <p style={styles.forgotLink} onClick={onForgotPassword}>Forgot password?</p>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 16 }} disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p style={styles.switchText}>
          New to UniMart?{" "}
          <span style={styles.switchLink} onClick={onSwitchToSignUp}>Create an account</span>
        </p>

        <div style={styles.sellerAgentBox}>
          <p style={styles.sellerAgentText}>Want to sell on UniMart?</p>
          <div style={styles.sellerAgentLinks}>
            <span style={styles.sellerAgentLink} onClick={onSwitchToSellerSignUp}>Become a Seller</span>
            <span style={styles.sellerAgentDivider}>·</span>
            <span style={styles.sellerAgentLink} onClick={onSwitchToAgentSignUp}>Become an Agent</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { background: "#0B3D2E", padding: "20px 16px", textAlign: "center" },
  logo: { fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, color: "#FBF9F4" },
  formWrap: { paddingTop: 32, paddingBottom: 40 },
  title: { fontSize: 22, marginBottom: 8 },
  subtitle: { fontSize: 13.5, color: "#6b6b6b", marginBottom: 24 },
  forgotLink: { textAlign: "right", fontSize: 12.5, color: "#0B3D2E", fontWeight: 600, cursor: "pointer", marginBottom: 4 },
  switchText: { textAlign: "center", marginTop: 20, fontSize: 13, color: "#6b6b6b" },
  switchLink: { color: "#0B3D2E", fontWeight: 700, cursor: "pointer" },
  backLink: { fontSize: 12.5, color: "#0B3D2E", fontWeight: 600, cursor: "pointer", marginBottom: 16 },
  passwordWrap: { position: "relative" },
  eyeIcon: { position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: 16, userSelect: "none" },
  sellerAgentBox: { marginTop: 28, padding: 16, background: "#F0F5F0", borderRadius: 12, textAlign: "center" },
  sellerAgentText: { fontSize: 12, color: "#444", marginBottom: 8, fontWeight: 600 },
  sellerAgentLinks: { display: "flex", justifyContent: "center", alignItems: "center", gap: 10 },
  sellerAgentLink: { fontSize: 12.5, color: "#0B3D2E", fontWeight: 700, cursor: "pointer" },
  sellerAgentDivider: { color: "#aaa" }
};
