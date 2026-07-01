// ============================================
// UniMart - Withdrawal Requests (Finance Team)
// View full details before marking as paid.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function WithdrawalRequests({ user }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "withdrawalRequests"), where("status", "==", "pending"));
      const snap = await getDocs(q);
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleMarkPaid = async (request) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "withdrawalRequests", request.id), { status: "paid", paidAt: serverTimestamp(), paidBy: user.uid });
      await addDoc(collection(db, "notifications"), { userId: request.userId, type: "withdrawal_status", message: `Your withdrawal of Rs ${request.amount} has been processed and paid.`, read: false, createdAt: serverTimestamp() });
      await addDoc(collection(db, "adminLogs"), { adminId: user.uid, adminRole: "finance_team", action: "marked_withdrawal_paid", targetId: request.id, timestamp: serverTimestamp() });
      setSelected(null);
      loadRequests();
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerTitle}>Withdrawal Requests</div>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        {loading ? <p style={s.empty}>Loading...</p>
          : requests.length === 0 ? <p style={s.empty}>No pending withdrawal requests.</p>
          : requests.map(r => (
            <div key={r.id} style={s.card}>
              <div>
                <div style={s.cardName}>Rs {r.amount?.toLocaleString()}</div>
                <div style={s.cardMeta}>{r.role} · {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : "—"}</div>
              </div>
              <div style={s.viewBtn} onClick={() => setSelected(r)}>View Details</div>
            </div>
          ))
        }
      </div>

      {selected && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>Withdrawal Request</div>
            <DetailRow label="Amount" value={`Rs ${selected.amount?.toLocaleString()}`} />
            <DetailRow label="Role" value={selected.role} />
            <DetailRow label="Payment Account" value={selected.paymentAccount} />
            <DetailRow label="Account Type" value={selected.accountType} />
            <DetailRow label="User ID" value={selected.userId?.slice(0, 12)} />
            <DetailRow label="Requested On" value={selected.createdAt?.toDate ? selected.createdAt.toDate().toLocaleString() : "—"} />
            <div style={s.modalActions}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleMarkPaid(selected)} disabled={actionLoading}>
                {actionLoading ? "Processing..." : "✓ Mark as Paid"}
              </button>
            </div>
            <div style={s.closeBtn} onClick={() => setSelected(null)}>Close</div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10.5, color: "#888", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: "#1a1a1a", fontWeight: 500 }}>{value || "—"}</div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  empty: { fontSize: 13, color: "#888", padding: "20px 0" },
  card: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 14, marginBottom: 10 },
  cardName: { fontSize: 15, fontWeight: 800, color: "#0B3D2E" },
  cardMeta: { fontSize: 11, color: "#888", marginTop: 3, textTransform: "capitalize" },
  viewBtn: { background: "#0B3D2E", color: "#D4AF37", fontWeight: 700, fontSize: 11.5, padding: "8px 14px", borderRadius: 20, cursor: "pointer" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxHeight: "85vh", overflowY: "auto" },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 16, fontWeight: 700 },
  modalActions: { display: "flex", gap: 10, marginTop: 20, marginBottom: 12 },
  closeBtn: { textAlign: "center", fontSize: 13, color: "#888", cursor: "pointer", padding: "8px 0" }
};
