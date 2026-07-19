// ============================================
// UniMart - Forgot Password (OTP-based)
// Step 1: enter email, request a code (sent via
//         email through our own serverless function)
// Step 2: popup — enter code + new password, submit
// [Tailwind / Airbnb-inspired design system]
// ============================================

import { useState } from "react";

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

  const inputClass = "w-full h-12 px-4 rounded-btn border border-hairline text-body-md text-ink placeholder:text-muted focus:outline-none focus:border-ink focus:shadow-elevation transition-shadow mb-3";

  return (
    <div className="min-h-screen bg-canvas">
      <div className="h-nav flex items-center justify-center border-b border-hairline">
        <div className="text-display-lg">
          Uni<span className="text-rausch">Mart</span>
        </div>
      </div>

      <div className="max-w-[400px] mx-auto px-4 pt-8 pb-10">
        {success ? (
          <div className="text-center pt-5">
            <div className="text-4xl mb-3">✓</div>
            <h2 className="text-display-lg text-ink mb-2">Password updated</h2>
            <p className="text-body-sm text-muted mb-5">You can now log in with your new password.</p>
            <button onClick={onBack} className="w-full h-12 rounded-btn bg-rausch hover:bg-rausch-active text-white text-title-sm font-semibold transition-colors">
              Back to login
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-display-lg text-ink mb-2">Reset your password</h2>
            <p className="text-body-sm text-muted mb-6 leading-relaxed">
              Enter your email — we'll send a 6-digit code to reset your password.
            </p>
            <form onSubmit={handleGetOtp}>
              <label className="block text-title-sm text-ink mb-1.5">Email</label>
              <input
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={otpSent}
              />
              {sendError && <p className="text-rausch text-body-sm mb-2">{sendError}</p>}
              {otpSent && !sendError && (
                <p className="text-body-sm text-green-700 font-semibold mb-2">✓ Code sent — check your email inbox.</p>
              )}
              <button
                type="submit"
                disabled={sendingOtp}
                className="w-full h-12 mt-2 rounded-btn bg-rausch hover:bg-rausch-active disabled:bg-rausch-disabled text-white text-title-sm font-semibold transition-colors"
              >
                {sendingOtp ? "Sending..." : otpSent ? "Resend Code" : "Get OTP"}
              </button>
              {otpSent && (
                <button
                  type="button"
                  onClick={() => setShowPopup(true)}
                  className="w-full h-12 mt-2.5 rounded-btn border border-hairline text-ink text-title-sm font-semibold hover:bg-surface-soft transition-colors"
                >
                  Enter Code
                </button>
              )}
            </form>
            <p onClick={onBack} className="text-center mt-4.5 text-body-sm text-ink font-semibold cursor-pointer hover:underline">
              ← Back to login
            </p>
          </>
        )}
      </div>

      {/* ===== OTP + New Password Popup ===== */}
      {showPopup && (
        <div
          onClick={() => setShowPopup(false)}
          className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-5"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-canvas rounded-card p-6 w-full max-w-[380px] shadow-elevation">
            <h3 className="text-title-md text-ink font-bold mb-1">Enter Reset Code</h3>
            <p className="text-body-sm text-muted mb-4.5">Sent to <b className="text-ink">{email}</b></p>

            <label className="block text-title-sm text-ink mb-1.5">6-Digit Code</label>
            <input
              className={`${inputClass} tracking-[4px] font-bold text-center`}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
            />

            <label className="block text-title-sm text-ink mb-1.5">New Password</label>
            <input
              type="password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
            />

            <label className="block text-title-sm text-ink mb-1.5">Re-enter New Password</label>
            <input
              type="password"
              className={`${inputClass} mb-3.5`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
            />

            {verifyError && <p className="text-rausch text-body-sm mb-2">{verifyError}</p>}

            <div className="flex gap-2.5 mt-1.5">
              <button
                onClick={handleSubmit}
                disabled={verifying}
                className="flex-1 h-12 rounded-btn bg-rausch hover:bg-rausch-active disabled:bg-rausch-disabled text-white text-title-sm font-semibold transition-colors"
              >
                {verifying ? "Updating..." : "Submit"}
              </button>
              <button
                onClick={resetPopupFields}
                disabled={verifying}
                className="flex-1 h-12 rounded-btn bg-surface-soft border border-hairline text-ink text-title-sm font-bold"
              >
                Clear
              </button>
            </div>
            <div onClick={() => setShowPopup(false)} className="text-center mt-2.5 text-body-sm text-muted cursor-pointer">
              Close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
