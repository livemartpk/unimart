// ============================================
// UniMart - Return/Refund Tracker (Support Team)
// Tracks the physical return process for disputes
// resolved in the buyer's favor.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

const STAGES = ["initiated", "processing", "completed"];

export default function ReturnRefundTracker() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "disputes"), where("status", "==", "resolved_buyer"));
      const snap = await getDocs(q);
      setReturns(snap.docs.map((d) => ({ id: d.id, refundStatus: d.data().refundStatus || "initiated", ...d.data() })));
    } catch (err) {
      console.error("Failed to load returns:", err);
    }
    setLoading(false);
  };

  const advanceStage = async (returnItem) => {
    const currentIdx = STAGES.indexOf(returnItem.refundStatus);
    if (currentIdx >= STAGES.length - 1) return;
    const nextStage = STAGES[currentIdx + 1];
    await updateDoc(doc(db, "disputes", returnItem.id), { refundStatus: nextStage });
    setReturns((rs) => rs.map((r) => (r.id === returnItem.id ? { ...r, refundStatus: nextStage } : r)));
  };

  return (
    <div className="page-shell" style={styles.page}>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading...</p>
        ) : returns.length === 0 ? (
          <p style={styles.emptyText}>No active returns.</p>
        ) : (
          returns.map((r) => (
            <div key={r.id} style={styles.returnCard}>
              <div style={styles.orderId}>Order #{r.orderId?.slice(0, 8)}</div>
              <div style={styles.stageRow}>
                {STAGES.map((stage, i) => (
                  <div key={stage} style={styles.stageItem}>
                    <div style={{ ...styles.stageDot, ...(STAGES.indexOf(r.refundStatus) >= i ? styles.stageDotActive : {}) }} />
                    <div style={styles.stageLabel}>{stage}</div>
                  </div>
                ))}
              </div>
              {r.refundStatus !== "completed" && (
                <button className="btn-secondary" style={{ marginTop: 10, fontSize: 11.5, padding: "8px 14px" }} onClick={() => advanceStage(r)}>
                  Advance to next stage
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  emptyText: { fontSize: 13, color: "#888", padding: "20px 0" },

  returnCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 14, marginBottom: 10 },
  orderId: { fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 10 },
  stageRow: { display: "flex", justifyContent: "space-between" },
  stageItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 },
  stageDot: { width: 12, height: 12, borderRadius: "50%", background: "#eee0c0" },
  stageDotActive: { background: "#0B3D2E" },
  stageLabel: { fontSize: 9.5, color: "#888", textTransform: "capitalize" }
};
