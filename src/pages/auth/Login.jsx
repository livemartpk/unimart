// ============================================
// UniMart - Universal Login
// Sab roles (Buyer/Seller/Agent/Admin) isi page
// se login karte hain. Login ke baad role check
// karke sahi dashboard pe bhej diya jata hai.
// [Tailwind / Airbnb-inspired design system]
// ============================================

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebase";

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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        setError("Account data not found. Please contact support.");
        setLoading(false);
        return;
      }

      const userData = userDoc.data();

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
    <div className="min-h-screen bg-canvas">
      {/* Top nav — clean white, hairline border, matches spec's top-nav component */}
      <div className="h-nav flex items-center justify-center border-b border-hairline">
        <div className="text-display-lg">
          Uni<span className="text-rausch">Mart</span>
        </div>
      </div>

      <div className="max-w-[400px] mx-auto px-4 pt-8 pb-10">
        {onBackToBrowsing && (
          <div
            onClick={onBackToBrowsing}
            className="flex items-center justify-center gap-2 py-3 px-5 mb-5 rounded-btn border border-hairline bg-surface-soft text-title-sm text-ink cursor-pointer hover:shadow-elevation transition-shadow"
          >
            🏠 Back to Shopping
          </div>
        )}

        <h2 className="text-display-lg text-ink mb-2">Welcome back</h2>
        <p className="text-body-sm text-muted mb-6">Log in to continue to your account.</p>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-title-sm text-ink mb-1.5">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 px-4 rounded-btn border border-hairline text-body-md text-ink placeholder:text-muted focus:outline-none focus:border-ink focus:shadow-elevation transition-shadow"
            />
          </div>

          <div className="mb-2">
            <label className="block text-title-sm text-ink mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-12 pl-4 pr-11 rounded-btn border border-hairline text-body-md text-ink placeholder:text-muted focus:outline-none focus:border-ink focus:shadow-elevation transition-shadow"
              />
              <span
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-base select-none"
              >
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>
          </div>

          <p onClick={onForgotPassword} className="text-right text-body-sm text-ink font-semibold cursor-pointer mb-1 hover:underline">
            Forgot password?
          </p>

          {error && <p className="text-rausch text-body-sm mt-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 h-12 rounded-btn bg-rausch hover:bg-rausch-active disabled:bg-rausch-disabled text-white text-title-sm font-semibold transition-colors"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-center mt-5 text-body-sm text-muted">
          New to UniMart?{" "}
          <span onClick={onSwitchToSignUp} className="text-ink font-semibold cursor-pointer hover:underline">
            Create an account
          </span>
        </p>

        <div className="mt-7 p-4 rounded-card bg-surface-soft text-center">
          <p className="text-body-sm font-semibold text-body mb-2">Want to sell on UniMart?</p>
          <div className="flex justify-center items-center gap-2.5">
            <span onClick={onSwitchToSellerSignUp} className="text-body-sm text-ink font-semibold cursor-pointer hover:underline">
              Become a Seller
            </span>
            <span className="text-muted">·</span>
            <span onClick={onSwitchToAgentSignUp} className="text-body-sm text-ink font-semibold cursor-pointer hover:underline">
              Become an Agent
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
