// ============================================
// UniMart - All Sellers (Seller Manager)
// View Details modal + Suspend/Reactivate +
// Objection system with comment
// ============================================

import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function AllSellers({ user }) {
  const [sellers, setSellers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [objectionText, setObjectionText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadSellers(); }, []);

  const loadSellers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "sellers"));
      setSellers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSuspend = async (seller) => {
    const newStatus = seller.storeStatus === "suspended" ? "approved" : "suspended";
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "sellers", seller.id), { storeStatus: newStatus });
      await updateDoc(doc(db, "users", seller.id), { status: newStatus === "suspended" ? "suspended" : "active" });
      await addDoc(collection(db, "adminLogs"), {
        adminId: user.uid, adminRole: "seller_manager",
        action: newStatus === "suspended" ? "suspended_seller" : "reactivated_seller",
        targetId: seller.id, timestamp: serverTimestamp()
      });
      await addDoc(collection(db, "notifications"), {
        userId: seller.id, type: "tag_status",
        message: newStatus === "suspended"
          ? "Your store has been suspended. Please contact support."
          : "Your store has been reactivated. You can now sell again.",
        read: false, createdAt: serverTimestamp()
      });
      setSellers(ss => ss.map(s => s.id === seller.id ? { ...s, storeStatus: newStatus } : s));
      setSelected(null);
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const handleSendObjection = async () => {
    if (!objectionText.trim()) { alert("Write an objection comment first."); return; }
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "sellers", selected.id), {
        objection: objectionText,
        objectionStatus: "pending_edit",
        objectionAt: serverTimestamp()
      });
      await updateDoc(doc(db, "users", selected.id), { status: "objection" });
      await addDoc(collection(db, "notifications"), {
        userId: selected.id, type: "tag_status",
        message: `Your store application has an objection from Seller Manager: "${objectionText}". Please log in and update your application.`,
        read: false, createdAt: serverTimestamp()
      });
      setObjectionText("");
      setSelected(null);
      loadSellers();
      alert("Objection sent to seller.");
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const filteredSellers = sellers.filter(s => {
    const matchFilter = filter === "all" || s.storeStatus === filter;
    const matchSearch = !search || s.storeName?.toLowerCase().includes(search.toLowerCase()) || s.city?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    all: sellers.length,
    approved: sellers.filter(s => s.storeStatus === "approved").length,
    vacation: sellers.filter(s => s.storeStatus === "vacation").length,
    suspended: sellers.filter(s => s.storeStatus === "suspended").length
  };

  return (
    <div style={s.page}>

      <div style={{ padding: "16px 16px 0" }}>
        <input className="input-field" placeholder="Search store name or city..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 12 }} />
        <div style={s.filterRow}>
          {[["all", "All"], ["approved", "Active"], ["vacation", "Vacation"], ["suspended", "Suspended"]].map(([key, label]) => (
            <div key={key} style={{ ...s.pill, ...(filter === key ? s.pillActive : {}) }} onClick={() => setFilter(key)}>
              {label} ({counts[key]})
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 16px 100px" }}>
        {loading ? <p style={s.empty}>Loading...</p>
          : filteredSellers.length === 0 ? <p style={s.empty}>No sellers match this filter.</p>
          : filteredSellers.map(seller => (
            <div key={seller.id} style={s.sellerRow}>
              <div>
                <div style={s.storeName}>{seller.storeName}</div>
                <div style={s.metaRow}>{seller.city} · ⭐ {seller.rating || "New"} · {seller.businessCategory}</div>
                {seller.objectionStatus === "pending_edit" && (
                  <div style={s.objectionBadge}>⚠️ Objection sent — awaiting seller edit</div>
                )}
              </div>
              <div style={s.viewBtn} onClick={() => { setSelected(seller); setObjectionText(seller.objection || ""); }}>
                View Details
              </div>
            </div>
          ))
        }
      </div>

      {/* Detail Modal */}
      {selected && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>Store Details</div>

            <DetailRow label="Store Name" value={selected.storeName} />
            <DetailRow label="Business Category" value={selected.businessCategory} />
            <DetailRow label="Business Type" value={selected.businessType} />
            <DetailRow label="City" value={selected.city} />
            <DetailRow label="Monthly Volume" value={selected.monthlyVolume} />
            <DetailRow label="Payment Account" value={selected.paymentDetails?.account} />
            <DetailRow label="Store Status" value={selected.storeStatus} />
            <DetailRow label="Rating" value={selected.rating || "No ratings yet"} />

            {selected.documents?.url && (
              <div style={{ marginBottom: 12 }}>
                <div style={s.detailLabel}>Category Document</div>
                <a href={selected.documents.url} target="_blank" rel="noreferrer" style={{ color: "#0B3D2E", fontWeight: 700, fontSize: 13 }}>
                  View Document ↗
                </a>
              </div>
            )}

            {/* Objection Box */}
            <div style={s.objectionBox}>
              <div style={s.objectionTitle}>📝 Send Objection / Comment to Seller</div>
              <textarea
                className="input-field"
                rows={3}
                value={objectionText}
                onChange={e => setObjectionText(e.target.value)}
                placeholder="e.g. Your CNIC document is not clear, please re-upload..."
                style={{ resize: "none", fontFamily: "inherit", marginBottom: 8 }}
              />
              <button className="btn-secondary" style={{ width: "100%", fontSize: 12.5 }} onClick={handleSendObjection} disabled={actionLoading}>
                Send Objection to Seller
              </button>
            </div>

            {/* Suspend / Reactivate */}
            <div style={s.modalActions}>
              <button
                style={{ ...s.actionBtn, ...(selected.storeStatus === "suspended" ? s.reactivateBtn : s.suspendBtn) }}
                onClick={() => handleSuspend(selected)}
                disabled={actionLoading}
              >
                {selected.storeStatus === "suspended" ? "Reactivate Store" : "Suspend Store"}
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
      <div style={{ fontSize: 13.5, color: "#1a1a1a", fontWeight: 500, textTransform: "capitalize" }}>{value || "—"}</div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  filterRow: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 14 },
  pill: { padding: "8px 14px", borderRadius: 20, border: "1.5px solid #eee0c0", fontSize: 11.5, fontWeight: 600, color: "#0B3D2E", whiteSpace: "nowrap", cursor: "pointer", background: "#fff" },
  pillActive: { background: "#0B3D2E", color: "#fff", borderColor: "#0B3D2E" },
  empty: { fontSize: 13, color: "#888", padding: "20px 0" },
  sellerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 14, marginBottom: 10 },
  storeName: { fontSize: 13.5, fontWeight: 700, color: "#1a1a1a" },
  metaRow: { fontSize: 11, color: "#888", marginTop: 3 },
  objectionBadge: { fontSize: 10.5, color: "#8a6d1f", background: "#FBF1DA", border: "1px solid #D4AF37", borderRadius: 8, padding: "3px 8px", marginTop: 5, display: "inline-block" },
  viewBtn: { background: "#0B3D2E", color: "#D4AF37", fontWeight: 700, fontSize: 11.5, padding: "8px 14px", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 16, fontWeight: 700 },
  detailLabel: { fontSize: 10.5, color: "#888", marginBottom: 4 },
  objectionBox: { background: "#FBF9F4", border: "1.5px solid #eee0c0", borderRadius: 12, padding: 14, marginBottom: 16, marginTop: 8 },
  objectionTitle: { fontSize: 12.5, fontWeight: 700, color: "#0B3D2E", marginBottom: 10 },
  modalActions: { marginBottom: 12 },
  actionBtn: { width: "100%", padding: "13px 0", borderRadius: 12, border: "none", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  suspendBtn: { background: "#FCEAEA", color: "#C0392B" },
  reactivateBtn: { background: "#E3F2E1", color: "#2E7D32" },
  closeBtn: { textAlign: "center", fontSize: 13, color: "#888", cursor: "pointer", padding: "8px 0" }
};
