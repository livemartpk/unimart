// ============================================
// UniMart - Buyer Sign Up (Quick Registration)
// Logic: Sirf Email + Password se signup, baqi
// details pehle order ke waqt mangi jayengi.
// ============================================

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import "../../styles/theme.css";

export default function BuyerSignUp({ onSuccess, onSwitchToLogin, onBackToBrowsing }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.includes("@")) return "Please enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return "";
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      // 1. Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Send email verification (verification happens later, not blocking signup)
      await sendEmailVerification(user);

      // 3. Create base user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "buyer",
        emailVerified: false,
        profileComplete: false,   // becomes true after first checkout details are filled
        status: "active",
        createdAt: serverTimestamp()
      });

      // 4. Create buyer-specific document (mostly empty, filled in later)
      await setDoc(doc(db, "buyers", user.uid), {
        wishlist: [],
        followedStores: [],
        loyaltyPoints: 0,
        referredByAgentId: null,
        createdAt: serverTimestamp()
      });

      setLoading(false);
      if (onSuccess) onSuccess(user);

    } catch (err) {
      setLoading(false);
      // Friendly error messages
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Try logging in instead.");
      } else if (err.code === "auth/invalid-email") {
        setError("That email address looks invalid.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Use at least 6 characters.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Check your internet connection and try again.");
      } else if (err.code === "auth/configuration-not-found" || err.code === "auth/operation-not-allowed") {
        setError("Email/Password sign-up isn't enabled yet. Please contact support.");
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
        <h2 style={styles.title}>Create your account</h2>
        <p style={styles.subtitle}>Browse and shop in seconds. We'll only ask for more details when you're ready to order.</p>

        <form onSubmit={handleSignUp}>
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

          <div style={{ marginBottom: 16 }}>
            <label className="input-label">Password</label>
            <div style={styles.passwordWrap}>
              <input
                type={showPassword ? "text" : "password"}
                className="input-field"
                style={{ paddingRight: 44 }}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span style={styles.eyeIcon} onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="input-label">Confirm Password</label>
            <div style={styles.passwordWrap}>
              <input
                type={showPassword ? "text" : "password"}
                className="input-field"
                style={{ paddingRight: 44 }}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <span style={styles.eyeIcon} onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p style={styles.switchText}>
          Already have an account?{" "}
          <span style={styles.switchLink} onClick={onSwitchToLogin}>Log in</span>
        </p>
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
  subtitle: { fontSize: 13.5, color: "#6b6b6b", marginBottom: 24, lineHeight: 1.5 },
  switchText: { textAlign: "center", marginTop: 20, fontSize: 13, color: "#6b6b6b" },
  switchLink: { color: "#0B3D2E", fontWeight: 700, cursor: "pointer" },
  backLink: { fontSize: 12.5, color: "#0B3D2E", fontWeight: 600, cursor: "pointer", marginBottom: 16 },
  passwordWrap: { position: "relative" },
  eyeIcon: { position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: 16, userSelect: "none" }
};
