// ============================================
// UniMart - Disputes (Support Team)
// Full dispute detail + resolution modal.
// Support Team has final authority.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function Disputes({ user }) {
  const [disputes, setDisputes] = useState([]);
  const [tab, setTab] = useState("open");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [resolution, setResolution] = useState("");
  const [favor, setFavor] = useState("buyer");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadDisputes(); }, [tab]);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "disputes"), where("status", "==", tab));
      const snap = await getDocs(q);
      setDisputes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleResolve = async () => {
    if (!resolution.trim()) { alert("Write a resolution note."); return; }
    setActionLoading(true);
    try {
      const newStatus = favor === "buyer" ? "resolved_buyer" : "resolved_seller";
      await updateDoc(doc(db, "disputes", selected.id), { status: newStatus, resolution, resolvedBy: user.uid, resolvedAt: serverTimestamp() });
      await addDoc(collection(db, "notifications"), { userId: selected.buyerId, type: "order_update", message: `Your dispute for Order #${selected.orderId?.slice(0, 8)} has been resolved. ${resolution}`, read: false, createdAt: serverTimestamp() });
      await addDoc(collection(db, "notifications"), { userId: selected.sellerId, type: "order_update", message: `Dispute for Order #${selected.orderId?.slice(0, 8)} has been resolved. ${resolution}`, read: false, createdAt: serverTimestamp() });
      setSelected(null);
      setResolution("");
      loadDisputes();
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerTitle}>Disputes</div>
      </div>

      <div style={s.tabRow}>
        {["open", "resolved_buyer", "resolved_seller"].map(t => (
          <div key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }} onClick={() => setTab(t)}>
            {t === "open" ? "Open" : t === "resolved_buyer" ? "Buyer Won" : "Seller Won"}
          </div>
        ))}
      </div>

      <div style={{ padding: "0 16px 100px" }}>
        {loading ? <p style={s.empty}>Loading...</p>
          : disputes.length === 0 ? <p style={s.empty}>No {tab} disputes.</p>
          : disputes.map(d => (
            <div key={d.id} style={s.card}>
              <div>
                <div style={s.cardName}>Order #{d.orderId?.slice(0, 8)}</div>
                <div style={s.cardMeta}>{d.reason?.slice(0, 40)}...</div>
              </div>
              <div style={s.viewBtn} onClick={() => setSelected(d)}>View Details</div>
            </div>
          ))
        }
      </div>

      {selected && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>Dispute Details</div>
            <DetailRow label="Order ID" value={selected.orderId?.slice(0, 12)} />
            <DetailRow label="Reason" value={selected.reason} />
            <DetailRow label="Description" value={selected.description} />
            <DetailRow label="Buyer ID" value={selected.buyerId?.slice(0, 12)} />
            <DetailRow label="Seller ID" value={selected.sellerId?.slice(0, 12)} />
            <DetailRow label="Opened On" value={selected.createdAt?.toDate ? selected.createdAt.toDate().toLocaleString() : "—"} />

            {tab === "open" && (
              <>
                <div style={{ marginTop: 16, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>Resolve in favor of:</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ ...s.favorBtn, ...(favor === "buyer" ? s.favorActive : {}) }} onClick={() => setFavor("buyer")}>Buyer</div>
                    <div style={{ ...s.favorBtn, ...(favor === "seller" ? s.favorActive : {}) }} onClick={() => setFavor("seller")}>Seller</div>
                  </div>
                </div>
                <textarea className="input-field" rows={3} value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Write resolution note (will be sent to both parties)..." style={{ resize: "none", fontFamily: "inherit", marginBottom: 12 }} />
                <div style={s.modalActions}>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={handleResolve} disabled={actionLoading}>
                    {actionLoading ? "Resolving..." : "Resolve Dispute"}
                  </button>
                </div>
              </>
            )}
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
      <div style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 500, lineHeight: 1.4 }}>{value || "—"}</div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  tabRow: { display: "flex", gap: 6, padding: "14px 16px" },
  tab: { flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10, border: "1.5px solid #eee0c0", fontSize: 11, fontWeight: 700, color: "#0B3D2E", cursor: "pointer", background: "#fff" },
  tabActive: { background: "#0B3D2E", color: "#fff", borderColor: "#0B3D2E" },
  empty: { fontSize: 13, color: "#888", padding: "20px 0" },
  card: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 14, marginBottom: 10 },
  cardName: { fontSize: 13.5, fontWeight: 700, color: "#1a1a1a" },
  cardMeta: { fontSize: 11, color: "#888", marginTop: 3 },
  viewBtn: { background: "#0B3D2E", color: "#D4AF37", fontWeight: 700, fontSize: 11.5, padding: "8px 14px", borderRadius: 20, cursor: "pointer" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxHeight: "85vh", overflowY: "auto" },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 16, fontWeight: 700 },
  favorBtn: { flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10, border: "1.5px solid #eee0c0", fontSize: 13, fontWeight: 700, color: "#0B3D2E", cursor: "pointer" },
  favorActive: { background: "#0B3D2E", color: "#D4AF37", borderColor: "#0B3D2E" },
  modalActions: { display: "flex", gap: 10, marginBottom: 12 },
  closeBtn: { textAlign: "center", fontSize: 13, color: "#888", cursor: "pointer", padding: "8px 0" }
};
