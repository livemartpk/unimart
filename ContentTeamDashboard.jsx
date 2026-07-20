// ============================================
// UniMart - Policy Engine (Super Admin)
// Controls: commission %, agent share %, website
// share %, tax %, withdrawal limits, points rules,
// vacation max days, dispute window, agent targets.
// Effective Date logic: only applies to NEW orders
// placed after the policy is saved (per our decision —
// Option A, not retroactive).
// ============================================

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, addDoc, getDocs, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function PolicyEngine({ user }) {
  const [form, setForm] = useState({
    commissionPercent: 0.5,
    agentSharePercent: 30,
    websiteSharePercent: 70,
    taxPercent: 10,
    withdrawalAutoApproveLimit: 5000,
    pointsPerSale: 10,
    monthlyTargetBonusPoints: 50,
    vacationMaxDays: 30,
    returnWindowDays: 7,
    disputeWindowDays: 5,
    autoReleaseDays: 7,
    effectiveDate: ""
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    setLoading(true);
    try {
      const policySnap = await getDoc(doc(db, "policies", "current"));
      if (policySnap.exists()) {
        setForm((f) => ({ ...f, ...policySnap.data() }));
      }

      const historySnap = await getDocs(query(collection(db, "policies", "current", "history"), orderBy("createdAt", "desc")));
      setHistory(historySnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error("Failed to load policy:", err);
    }
    setLoading(false);
  };

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.effectiveDate) {
      alert("Please set an effective date for this policy change.");
      return;
    }
    setSaving(true);
    try {
      // Save current policy
      await setDoc(doc(db, "policies", "current"), {
        ...form,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      });

      // Log to history for audit trail
      await addDoc(collection(db, "policies", "current", "history"), {
        ...form,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      // Log to adminLogs for accountability
      await addDoc(collection(db, "adminLogs"), {
        adminId: user.uid,
        adminRole: "super_admin",
        action: "updated_policy_engine",
        targetId: "policies/current",
        timestamp: serverTimestamp()
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      loadPolicy();

    } catch (err) {
      console.error("Failed to save policy:", err);
    }
    setSaving(false);
  };

  if (loading) return <div className="page-shell" style={styles.page}><p style={{ padding: 20 }}>Loading policy engine...</p></div>;

  const websiteShareDerived = 100 - Number(form.agentSharePercent || 0);

  return (
    <div className="page-shell" style={styles.page}>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
        <div style={styles.warningNote}>
          ⚠️ Changes apply only to <b>new orders</b> placed after this is saved. Past, already-processed orders are never recalculated (Option A — non-retroactive).
        </div>

        <h3 style={styles.sectionTitle}>Commission & Tax</h3>
        <Field label="Website Commission (%)">
          <input type="number" step="0.1" className="input-field" value={form.commissionPercent} onChange={(e) => handleChange("commissionPercent", e.target.value)} />
        </Field>
        <Field label="Tax on Commission (%)">
          <input type="number" step="0.1" className="input-field" value={form.taxPercent} onChange={(e) => handleChange("taxPercent", e.target.value)} />
        </Field>
        <Field label="Agent Share of Net Commission (%)">
          <input type="number" step="0.1" className="input-field" value={form.agentSharePercent} onChange={(e) => handleChange("agentSharePercent", e.target.value)} />
        </Field>
        <div style={styles.derivedNote}>Website share is automatically the remainder: <b>{websiteShareDerived}%</b></div>

        <h3 style={styles.sectionTitle}>Withdrawals & Limits</h3>
        <Field label="Auto-Approve Withdrawal Limit (Rs)">
          <input type="number" className="input-field" value={form.withdrawalAutoApproveLimit} onChange={(e) => handleChange("withdrawalAutoApproveLimit", e.target.value)} />
        </Field>

        <h3 style={styles.sectionTitle}>Points System</h3>
        <Field label="Points per Sale">
          <input type="number" className="input-field" value={form.pointsPerSale} onChange={(e) => handleChange("pointsPerSale", e.target.value)} />
        </Field>
        <Field label="Monthly Target Bonus Points">
          <input type="number" className="input-field" value={form.monthlyTargetBonusPoints} onChange={(e) => handleChange("monthlyTargetBonusPoints", e.target.value)} />
        </Field>

        <h3 style={styles.sectionTitle}>Operational Windows</h3>
        <Field label="Vacation Mode — Max Days">
          <input type="number" className="input-field" value={form.vacationMaxDays} onChange={(e) => handleChange("vacationMaxDays", e.target.value)} />
        </Field>
        <Field label="Return Window (days)">
          <input type="number" className="input-field" value={form.returnWindowDays} onChange={(e) => handleChange("returnWindowDays", e.target.value)} />
        </Field>
        <Field label="Dispute Filing Window (days after delivery)">
          <input type="number" className="input-field" value={form.disputeWindowDays} onChange={(e) => handleChange("disputeWindowDays", e.target.value)} />
        </Field>
        <Field label="Auto-Release Days (Gross → Net if buyer doesn't confirm)">
          <input type="number" className="input-field" value={form.autoReleaseDays} onChange={(e) => handleChange("autoReleaseDays", e.target.value)} />
        </Field>

        <h3 style={styles.sectionTitle}>Effective Date</h3>
        <Field label="This policy takes effect from">
          <input type="date" className="input-field" value={form.effectiveDate} onChange={(e) => handleChange("effectiveDate", e.target.value)} />
        </Field>

        {saved && <p style={styles.savedMsg}>✓ Policy saved. All affected users will be notified.</p>}

        <button className="btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Policy"}
        </button>

        <h3 style={{ ...styles.sectionTitle, marginTop: 28 }}>Policy Change History</h3>
        {history.length === 0 ? (
          <p style={styles.emptyText}>No history yet.</p>
        ) : (
          history.map((h) => (
            <div key={h.id} style={styles.historyRow}>
              <div style={styles.historyDate}>{h.createdAt?.toDate ? h.createdAt.toDate().toLocaleString() : "—"}</div>
              <div style={styles.historyDetail}>Commission: {h.commissionPercent}% · Tax: {h.taxPercent}% · Agent Share: {h.agentSharePercent}%</div>
            </div>
          ))
        )}
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

  warningNote: { background: "#FBF1DA", border: "1px solid #D4AF37", borderRadius: 10, padding: 12, fontSize: 11.5, color: "#5a4419", marginBottom: 20, lineHeight: 1.5 },
  sectionTitle: { fontSize: 15, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 12, marginTop: 20 },
  derivedNote: { fontSize: 11.5, color: "#0B3D2E", background: "#F0F5F0", borderRadius: 8, padding: 10, marginBottom: 8 },
  savedMsg: { color: "#2E7D32", fontSize: 12.5, fontWeight: 600, marginBottom: 8 },

  emptyText: { fontSize: 12.5, color: "#888" },
  historyRow: { background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 12, marginBottom: 8 },
  historyDate: { fontSize: 11, color: "#888" },
  historyDetail: { fontSize: 12, color: "#333", marginTop: 4 }
};
