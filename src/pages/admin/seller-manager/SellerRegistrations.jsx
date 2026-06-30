// ============================================
// UniMart - New Registrations (Seller Manager)
// Reviews seller applications + category documents.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function SellerRegistrations({ user }) {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadPendingSellers();
  }, []);

  const loadPendingSellers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "sellers"), where("storeStatus", "==", "pending"));
      const snap = await getDocs(q);
      setSellers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load pending sellers:", err);
    }
    setLoading(false);
  };

  const handleApprove = async (sellerId) => {
    try {
      await updateDoc(doc(db, "sellers", sellerId), {
        storeStatus: "approved",
        "documents.status": "verified"
      });
      await updateDoc(doc(db, "users", sellerId), { status: "active" });

      await addDoc(collection(db, "adminLogs"), {
        adminId: user.uid,
        adminRole: "seller_manager",
        action: "approved_seller",
        targetId: sellerId,
        timestamp: serverTimestamp()
      });

      setSellers((ss) => ss.filter((s) => s.id !== sellerId));
    } catch (err) {
      console.error("Failed to approve seller:", err);
    }
  };

  const openRejectModal = (seller) => {
    setSelectedSeller(seller);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    try {
      await updateDoc(doc(db, "sellers", selectedSeller.id), {
        storeStatus: "rejected",
        rejectionReason: rejectReason,
        "documents.status": "rejected"
      });

      await addDoc(collection(db, "adminLogs"), {
        adminId: user.uid,
        adminRole: "seller_manager",
        action: "rejected_seller",
        targetId: selectedSeller.id,
        timestamp: serverTimestamp()
      });

      setSellers((ss) => ss.filter((s) => s.id !== selectedSeller.id));
      setShowRejectModal(false);
    } catch (err) {
      console.error("Failed to reject seller:", err);
    }
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>New Seller Registrations</div>
        <div style={styles.headerSub}>{sellers.length} pending review</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading...</p>
        ) : sellers.length === 0 ? (
          <p style={styles.emptyText}>No pending registrations. All caught up!</p>
        ) : (
          sellers.map((s) => (
            <div key={s.id} style={styles.sellerCard}>
              <div style={styles.sellerTop}>
                <div style={styles.storeName}>{s.storeName}</div>
                <div style={styles.categoryTag}>{s.businessCategory}</div>
              </div>
              <div style={styles.metaRow}>City: {s.city} · Type: {s.businessType}</div>

              <div style={styles.docChecklist}>
                <div style={styles.docRow}>📄 Required document: <b>{s.documents?.type}</b></div>
                <div style={styles.docRow}>
                  Status: {s.documents?.url ? "✅ Uploaded" : "❌ Missing"}
                </div>
              </div>

              <div style={styles.actionsRow}>
                <button className="btn-secondary" style={styles.smallBtn} onClick={() => openRejectModal(s)}>Reject</button>
                <button className="btn-primary" style={styles.smallBtn} onClick={() => handleApprove(s.id)}>Approve</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showRejectModal && (
        <div style={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Reject Application</h3>
            <p style={{ fontSize: 12.5, color: "#666", marginBottom: 12 }}>{selectedSeller?.storeName}</p>
            <label className="input-label">Reason for rejection</label>
            <textarea
              className="input-field"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ resize: "none", fontFamily: "inherit", marginBottom: 16 }}
              placeholder="e.g. Document unclear, please re-upload a clearer copy"
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, background: "#C0392B" }} onClick={handleReject}>Reject</button>
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

  sellerCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 16, marginBottom: 12 },
  sellerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  storeName: { fontSize: 14.5, fontWeight: 700, color: "#1a1a1a" },
  categoryTag: { fontSize: 10, fontWeight: 700, background: "#F0F5F0", color: "#0B3D2E", padding: "4px 10px", borderRadius: 10 },
  metaRow: { fontSize: 11.5, color: "#888", marginBottom: 10 },

  docChecklist: { background: "#F0F5F0", borderRadius: 10, padding: 12, marginBottom: 12 },
  docRow: { fontSize: 12, color: "#444", marginBottom: 4 },

  actionsRow: { display: "flex", gap: 10 },
  smallBtn: { flex: 1, fontSize: 12.5, padding: "9px 0" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 50 },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", margin: "0 auto" },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 8 }
};
