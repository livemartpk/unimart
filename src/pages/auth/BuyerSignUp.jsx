// ============================================
// UniMart - Buyer Sign Up (Quick Registration)
// Logic: Sirf Email + Password se signup, baqi
// details pehle order ke waqt mangi jayengi.
// [Tailwind / Airbnb-inspired design system]
// ============================================

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { getCurrencyForCountry } from "../../utils/countries";
import CountryGenderFields from "../../components/CountryGenderFields";

export default function BuyerSignUp({ onSuccess, onSwitchToLogin, onBackToBrowsing }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const validate = () => {
    if (!email.includes("@")) return "Please enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!country) return "Please select your country.";
    if (!gender) return "Please select your gender.";
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await sendEmailVerification(user);

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "buyer",
        country,
        currency: getCurrencyForCountry(country),
        gender,
        emailVerified: false,
        profileComplete: false,
        status: "active",
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, "buyers", user.uid), {
        wishlist: [],
        followedStores: [],
        loyaltyPoints: 0,
        referredByAgentId: null,
        createdAt: serverTimestamp()
      });

      setLoading(false);
      setRegistered(true);

    } catch (err) {
      setLoading(false);
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

  if (registered) {
    return (
      <div className="min-h-screen bg-black/50 flex items-center justify-center p-5">
        <div className="bg-canvas rounded-card p-7 max-w-[400px] w-full shadow-elevation">
          <div className="text-5xl text-center mb-3">🎉</div>
          <h2 className="text-display-lg text-ink text-center mb-2.5">Congratulations!</h2>
          <p className="text-body-sm text-body text-center leading-relaxed mb-4">
            Your UniMart account has been created successfully. You're all set to start shopping.
          </p>
          <button
            onClick={() => onSuccess && onSuccess()}
            className="w-full h-12 rounded-btn bg-rausch hover:bg-rausch-active text-white text-title-sm font-semibold transition-colors"
          >
            Continue Shopping →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
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

        <h2 className="text-display-lg text-ink mb-2">Create your account</h2>
        <p className="text-body-sm text-muted mb-6 leading-relaxed">
          Browse and shop in seconds. We'll only ask for more details when you're ready to order.
        </p>

        <form onSubmit={handleSignUp}>
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

          <div className="mb-4">
            <label className="block text-title-sm text-ink mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
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

          <div className="mb-4">
            <label className="block text-title-sm text-ink mb-1.5">Confirm Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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

          <CountryGenderFields country={country} setCountry={setCountry} gender={gender} setGender={setGender} />

          {error && <p className="text-rausch text-body-sm mt-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 h-12 rounded-btn bg-rausch hover:bg-rausch-active disabled:bg-rausch-disabled text-white text-title-sm font-semibold transition-colors"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center mt-5 text-body-sm text-muted">
          Already have an account?{" "}
          <span onClick={onSwitchToLogin} className="text-ink font-semibold cursor-pointer hover:underline">
            Log in
          </span>
        </p>
      </div>
    </div>
  );
}
