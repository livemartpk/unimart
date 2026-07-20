// ============================================
// UniMart - Seller Registration
// ============================================

import { useState } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { getCurrencyForCountry } from "../../utils/countries";
import CountryGenderFields from "../../components/CountryGenderFields";
import "../../styles/theme.css";

const CATEGORY_DOCS = {
  Food: "PSQCA / Food Authority License",
  Medical: "DRAP Registration",
  Electronics: "Tax ID (NTN) / Business Registration",
  "General/Fashion": "National ID copy only"
};

export default function SellerSignUp({ onSuccess, onSwitchToLogin, onBackToBrowsing }) {
  const [form, setForm] = useState({
    storeName: "", ownerName: "", email: "", password: "", confirmPassword: "",
    phone: "", country: "", gender: "", nationalId: "", city: "",
    category: "", businessType: "Individual", monthlyVolume: "",
    paymentAccount: "", documentFile: null
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false); // show login popup after registration
  const [registeredEmail, setRegisteredEmail] = useState("");

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const validate = () => {
    const e = {};
    if (!form.storeName.trim()) e.storeName = "Store name is required.";
    if (!form.ownerName.trim()) e.ownerName = "Owner name is required.";
    if (!form.email.includes("@")) e.email = "Enter a valid email.";
    if (form.password.length < 6) e.password = "Password must be at least 6 characters.";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match.";
    if (!/^\d{10,15}$/.test(form.phone.replace(/\D/g, ""))) e.phone = "Enter a valid phone number.";
    if (!/^\d{13}$/.test(form.nationalId.replace(/\D/g, ""))) e.nationalId = "Enter a valid 13-digit National ID.";
    if (!form.city.trim()) e.city = "City is required.";
    if (!form.country) e.country = "Please select your country.";
    if (!form.gender) e.gender = "Please select your gender.";
    if (!form.category) e.category = "Select a business category.";
    if (!form.paymentAccount.trim()) e.paymentAccount = "Payment account is required for payouts.";
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
      method: "POST",
      body: data
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
      // Upload document to Cloudinary first (if selected)
      let documentUrl = null;
      if (form.documentFile) {
        try {
          documentUrl = await uploadToCloudinary(form.documentFile, "unimart/seller-documents");
        } catch (uploadErr) {
          console.warn("Document upload failed:", uploadErr.message);
          // Continue without document — admin can request resubmission via objection
        }
      }

      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = userCredential.user;
      await sendEmailVerification(user);

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "seller",
        fullName: form.ownerName,
        phone: form.phone,
        country: form.country,
        currency: getCurrencyForCountry(form.country),
        gender: form.gender,
        nationalId: form.nationalId,
        emailVerified: false,
        profileComplete: true,
        status: "pending", // requires Seller Manager approval
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, "sellers", user.uid), {
        storeName: form.storeName,
        businessCategory: form.category,
        businessType: form.businessType,
        monthlyVolume: form.monthlyVolume || null,
        city: form.city,
        country: form.country,
        documents: {
          type: CATEGORY_DOCS[form.category],
          url: documentUrl,
          status: documentUrl ? "uploaded" : "missing"
        },
        paymentDetails: { account: form.paymentAccount },
        storeStatus: "pending",
        rating: 0,
        verifiedMallBadge: false,
        taggedByAgentId: null,
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, "wallets_seller", user.uid), {
        totalBalance: 0, availableBalance: 0, pendingBalance: 0, createdAt: serverTimestamp()
      });

      setLoading(false);
      setRegisteredEmail(form.email);
      setRegistered(true); // show "login now" popup

    } catch (err) {
      setLoading(false);
      if (err.code === "auth/email-already-in-use") setError("This email is already registered.");
      else setError("Something went wrong. Please try again.");
    }
  };

  // Show "Login Now" popup after successful registration
  if (registered) {
    return (
      <div style={{ minHeight: "100vh", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={styles.popup}>
          <div style={{ fontSize: 48, textAlign: "center", marginBottom: 12 }}>🎉</div>
          <h2 style={styles.popupTitle}>Registration Successful!</h2>
          <p style={styles.popupText}>
            Your seller application has been submitted successfully.
          </p>
          <div style={styles.emailBox}>
            <div style={styles.emailLabel}>Your login email:</div>
            <div style={styles.emailValue}>{registeredEmail}</div>
          </div>
          <p style={styles.popupNote}>
            Use your email and password to log in. Your account will show "Under Review" until our Seller Manager approves your application.
          </p>
          <button className="btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={onSwitchToLogin}>
            Login with your email and password →
          </button>
          {onBackToBrowsing && (
            <div style={styles.backToHomeBtn} onClick={onBackToBrowsing}>
              🏠 Back to Shopping
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span> <span style={styles.sellerTag}>Seller</span></div>
      </div>

      <div className="container" style={styles.formWrap}>
        {onBackToBrowsing && <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"12px 20px",background:"#F0F5F0",border:"1.5px solid #eee0c0",borderRadius:12,fontSize:13.5,fontWeight:700,color:"#0B3D2E",cursor:"pointer",marginBottom:20}} onClick={onBackToBrowsing}>🏠 Back to Shopping</div>}
        <h2 style={styles.title}>Start selling on UniMart</h2>
        <p style={styles.subtitle}>Tell us about your store. Our team reviews every application within a few business days.</p>

        <form onSubmit={handleSubmit}>
          <Field label="Store Name" error={errors.storeName}>
            <input className="input-field" value={form.storeName} onChange={(e) => handleChange("storeName", e.target.value)} placeholder="e.g. Hasnain Electronics" />
          </Field>
          <Field label="Owner Full Name" error={errors.ownerName}>
            <input className="input-field" value={form.ownerName} onChange={(e) => handleChange("ownerName", e.target.value)} />
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

          <CountryGenderFields
            country={form.country}
            setCountry={(v) => handleChange("country", v)}
            gender={form.gender}
            setGender={(v) => handleChange("gender", v)}
            errors={errors}
          />

          <Field label="Business Category" error={errors.category}>
            <select className="input-field" value={form.category} onChange={(e) => handleChange("category", e.target.value)}>
              <option value="">Select category</option>
              <option value="Food">Food</option>
              <option value="Medical">Medical</option>
              <option value="Electronics">Electronics</option>
              <option value="General/Fashion">General / Fashion</option>
            </select>
          </Field>

          {form.category && (
            <div style={styles.docNote}>
              📄 Required document: <b>{CATEGORY_DOCS[form.category]}</b>
            </div>
          )}

          <Field label="Document Upload">
            <input type="file" className="input-field" onChange={(e) => handleChange("documentFile", e.target.files[0])} accept="image/*,application/pdf" />
          </Field>

          <Field label="Business Type">
            <select className="input-field" value={form.businessType} onChange={(e) => handleChange("businessType", e.target.value)}>
              <option value="Individual">Individual</option>
              <option value="Registered Company">Registered Company</option>
            </select>
          </Field>

          <Field label="Estimated Monthly Order Volume (Optional)">
            <input className="input-field" value={form.monthlyVolume} onChange={(e) => handleChange("monthlyVolume", e.target.value)} placeholder="e.g. 50-100 orders" />
          </Field>

          <Field label="Payment Account (Bank / Easypaisa / JazzCash)" error={errors.paymentAccount}>
            <input className="input-field" value={form.paymentAccount} onChange={(e) => handleChange("paymentAccount", e.target.value)} placeholder="Account number" />
          </Field>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={loading}>
            {loading ? "Submitting..." : "Submit application"}
          </button>
        </form>

        <p style={styles.switchText}>
          Already have a seller account?{" "}
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
  sellerTag: { fontSize: 11, background: "#D4AF37", color: "#0B3D2E", padding: "2px 8px", borderRadius: 6, fontWeight: 800, marginLeft: 4 },
  formWrap: { paddingTop: 28, paddingBottom: 40 },
  title: { fontSize: 21, marginBottom: 8 },

  // Registration success popup
  popup: { background: "#fff", borderRadius: 20, padding: 28, maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  popupTitle: { fontFamily: "Georgia, serif", fontSize: 20, color: "#0B3D2E", textAlign: "center", marginBottom: 10 },
  popupText: { fontSize: 13.5, color: "#444", textAlign: "center", lineHeight: 1.5, marginBottom: 16 },
  emailBox: { background: "#F0F5F0", border: "1.5px solid #D4AF37", borderRadius: 12, padding: "12px 16px", marginBottom: 12 },
  emailLabel: { fontSize: 10.5, color: "#888", marginBottom: 4 },
  emailValue: { fontSize: 14, fontWeight: 700, color: "#0B3D2E" },
  popupNote: { fontSize: 12, color: "#666", lineHeight: 1.5, textAlign: "center" },
  backToHomeBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", background: "#F0F5F0", border: "1.5px solid #eee0c0", borderRadius: 12, fontSize: 13.5, fontWeight: 700, color: "#0B3D2E", cursor: "pointer", marginTop: 10, textAlign: "center" },
  subtitle: { fontSize: 13.5, color: "#6b6b6b", marginBottom: 22, lineHeight: 1.5 },
  docNote: { background: "#FBF1DA", border: "1px solid #D4AF37", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#5a4419", marginBottom: 16 },
  switchText: { textAlign: "center", marginTop: 20, fontSize: 13, color: "#6b6b6b" },
  switchLink: { color: "#0B3D2E", fontWeight: 700, cursor: "pointer" }
};
