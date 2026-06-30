// ============================================
// UniMart - Disputes (Support Team)
// Final decision authority rests with Support Team
// (per our decision — no Super Admin approval needed
// for each case).
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function Disputes({ user }) {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState(null);

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "disputes"), where("status", "==", "open"));
      const snap = await getDocs(q);
      setDisputes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load disputes:", err);
    }
    setLoading(false);
  };

  const handleResolve = async (decision) => {
    try {
      await updateDoc(doc(db, "disputes", selectedDispute.id), {
        status: decision === "buyer" ? "resolved_buyer" : decision === "seller" ? "resolved_seller" : "partial",
        resolvedBy: user.uid,
        resolvedAt: serverTimestamp()
      });

      await addDoc(collection(db, "adminLogs"), {
        adminId: user.uid,
        adminRole: "support_team",
        action: `resolved_dispute_${decision}`,
        targetId: selectedDispute.id,
        timestamp: serverTimestamp()
      });

      // NOTE: In production, this is also where the refund (to Buyer Wallet,
      // per our decision — instant credit) or order release would be triggered.

      setDisputes((ds) => ds.filter((d) => d.id !== selectedDispute.id));
      setSelectedDispute(null);

    } catch (err) {
      console.error("Failed to resolve dispute:", err);
    }
  };

  const categoryLabels = {
    not_received: "Not Received",
    defective: "Defective Item",
    wrong_item: "Wrong Item",
    fake: "Fake / Counterfeit",
    other: "Other"
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Open Disputes</div>
        <div style={styles.headerSub}>{disputes.length} awaiting resolution</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading disputes...</p>
        ) : disputes.length === 0 ? (
          <p style={styles.emptyText}>No open disputes. Great job staying on top of things!</p>
        ) : (
          disputes.map((d) => (
            <div key={d.id} style={styles.disputeCard} onClick={() => setSelectedDispute(d)}>
              <div style={styles.disputeTop}>
                <div style={styles.orderId}>Order #{d.orderId?.slice(0, 8)}</div>
                <div style={styles.categoryTag}>{categoryLabels[d.category] || d.category}</div>
              </div>
              <div style={styles.disputeReason}>{d.buyerReason}</div>
            </div>
          ))
        )}
      </div>

      {selectedDispute && (
        <div style={styles.modalOverlay} onClick={() => setSelectedDispute(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Dispute — Order #{selectedDispute.orderId?.slice(0, 8)}</h3>

            <div style={styles.evidenceBox}>
              <div style={styles.evidenceLabel}>Buyer's Claim</div>
              <div style={styles.evidenceText}>{selectedDispute.buyerReason}</div>
              {selectedDispute.buyerProof?.length > 0 && (
                <div style={styles.proofRow}>{selectedDispute.buyerProof.length} photo(s)/video(s) attached</div>
              )}
            </div>

            <div style={styles.evidenceBox}>
              <div style={styles.evidenceLabel}>Seller's Response</div>
              <div style={styles.evidenceText}>{selectedDispute.sellerResponse || "No response yet."}</div>
            </div>

            <p style={styles.decisionPrompt}>Make a final decision:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn-primary" onClick={() => handleResolve("buyer")}>Refund Buyer (in favor of buyer)</button>
              <button className="btn-secondary" onClick={() => handleResolve("seller")}>Favor Seller (release payment)</button>
              <button className="btn-secondary" onClick={() => handleResolve("partial")}>Partial Refund</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  headerSub: { color: "#cfe0d4", fontSize: 12, marginTop: 2 },

  emptyText: { fontSize: 13, color: "#888", padding: "20px 0" },

  disputeCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 14, marginBottom: 10, cursor: "pointer" },
  disputeTop: { display: "flex", justifyContent: "space-between", marginBottom: 6 },
  orderId: { fontSize: 13, fontWeight: 700, color: "#1a1a1a" },
  categoryTag: { fontSize: 10, fontWeight: 700, background: "#FCEAEA", color: "#C0392B", padding: "4px 10px", borderRadius: 10 },
  disputeReason: { fontSize: 12, color: "#666" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 50 },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", margin: "0 auto", maxHeight: "80vh", overflowY: "auto" },
  modalTitle: { fontSize: 16, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 16 },

  evidenceBox: { background: "#F0F5F0", borderRadius: 10, padding: 12, marginBottom: 12 },
  evidenceLabel: { fontSize: 11, fontWeight: 700, color: "#0B3D2E", marginBottom: 6, textTransform: "uppercase" },
  evidenceText: { fontSize: 12.5, color: "#444", lineHeight: 1.5 },
  proofRow: { fontSize: 11, color: "#0B3D2E", marginTop: 8, fontWeight: 600 },

  decisionPrompt: { fontSize: 12.5, fontWeight: 700, color: "#0B3D2E", margin: "16px 0 10px" }
};
