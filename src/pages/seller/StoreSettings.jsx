// ============================================
// UniMart - Store Settings (Seller)
// ============================================

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

export default function StoreSettings({ user, onNavigate }) {
  const [form, setForm] = useState({
    storeName: "", description: "", ownerName: "", phone: "", city: "",
    businessCategory: "", bankAccount: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const sellerSnap = await getDoc(doc(db, "sellers", user.uid));
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (sellerSnap.exists() && userSnap.exists()) {
        const s = sellerSnap.data();
        const u = userSnap.data();
        setForm({
          storeName: s.storeName || "",
          description: s.description || "",
          ownerName: u.fullName || "",
          phone: u.phone || "",
          city: s.city || "",
          businessCategory: s.businessCategory || "",
          bankAccount: s.paymentDetails?.account || ""
        });
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
    setLoading(false);
  };

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "sellers", user.uid), {
        storeName: form.storeName,
        description: form.description,
        city: form.city,
        paymentDetails: { account: form.bankAccount }
      });
      await updateDoc(doc(db, "users", user.uid), {
        fullName: form.ownerName,
        phone: form.phone
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
    setSaving(false);
  };

  if (loading) return <div className="page-shell" style={styles.page}><p style={{ padding: 20 }}>Loading settings...</p></div>;

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Store Settings</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
        <Field label="Store Name">
          <input className="input-field" value={form.storeName} onChange={(e) => handleChange("storeName", e.target.value)} />
        </Field>

        <Field label="Store Description">
          <textarea className="input-field" rows={3} value={form.description} onChange={(e) => handleChange("description", e.target.value)} style={{ resize: "none", fontFamily: "inherit" }} />
        </Field>

        <Field label="Owner Name">
          <input className="input-field" value={form.ownerName} onChange={(e) => handleChange("ownerName", e.target.value)} />
        </Field>

        <Field label="Phone Number">
          <input className="input-field" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
        </Field>

        <Field label="City">
          <input className="input-field" value={form.city} onChange={(e) => handleChange("city", e.target.value)} />
        </Field>

        <Field label="Business Category">
          <input className="input-field" value={form.businessCategory} disabled style={{ background: "#f5f5f5", color: "#888" }} />
        </Field>

        <Field label="Bank / Easypaisa / JazzCash Account">
          <input className="input-field" value={form.bankAccount} onChange={(e) => handleChange("bankAccount", e.target.value)} />
        </Field>

        {saved && <p style={styles.savedMsg}>✓ Settings saved</p>}

        <button className="btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="input-label">{label}</label>
      {children}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  savedMsg: { color: "#2E7D32", fontSize: 12.5, fontWeight: 600, marginBottom: 8 }
};
