// ============================================
// UniMart - Seller Registrations (Seller Manager)
// Professional: Status tabs with counts,
// View Details modal with documents,
// Approve / Reject / Objection actions
// ============================================

import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function SellerRegistrations({ user }) {
  const [allSellers, setAllSellers] = useState([]);
  const [tab, setTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [objectionText, setObjectionText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null); // "reject" | "objection" | null

  useEffect(() => { loadSellers(); }, []);

  const loadSellers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "sellers"));
      setAllSellers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // Filter by status — use both "status" and "storeStatus" fields for compatibility
  const getStatus = (s) => {
    if (s.status === "approved" || s.storeStatus === "approved") return "approved";
    if (s.status === "rejected" || s.storeStatus === "rejected") return "rejected";
    return "pending";
  };

  const counts = {
    pending: allSellers.filter(s => getStatus(s) === "pending").length,
    approved: allSellers.filter(s => getStatus(s) === "approved").length,
    rejected: allSellers.filter(s => getStatus(s) === "rejected").length,
  };

  const filtered = allSellers.filter(s => getStatus(s) === tab);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "sellers", selected.id), {
        status: "approved",
        storeStatus: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: user.uid
      });
      await updateDoc(doc(db, "users", selected.id), { status: "active" });
      await addDoc(collection(db, "adminLogs"), {
        adminId: user.uid, adminRole: "seller_manager",
        action: "approved_seller", targetId: selected.id,
        timestamp: serverTimestamp()
      });
      await addDoc(collection(db, "notifications"), {
        userId: selected.id, type: "tag_status",
        message: "🎉 Congratulations! Your seller application has been approved. You can now log in and start selling.",
        read: false, createdAt: serverTimestamp()
      });
      setSelected(null);
      setActiveAction(null);
      loadSellers();
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { alert("Please write a rejection reason."); return; }
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "sellers", selected.id), {
        status: "rejected",
        storeStatus: "rejected",
        rejectionReason: rejectReason,
        rejectedAt: serverTimestamp()
      });
      await updateDoc(doc(db, "users", selected.id), { status: "rejected" });
      await addDoc(collection(db, "notifications"), {
        userId: selected.id, type: "tag_status",
        message: `Your seller application was not approved. Reason: ${rejectReason}`,
        read: false, createdAt: serverTimestamp()
      });
      setSelected(null);
      setActiveAction(null);
      setRejectReason("");
      loadSellers();
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const handleObjection = async () => {
    if (!objectionText.trim()) { alert("Write an objection comment."); return; }
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
        message: `Your seller application has an objection: "${objectionText}". Please log in and resolve it.`,
        read: false, createdAt: serverTimestamp()
      });
      setObjectionText("");
      setSelected(null);
      setActiveAction(null);
      loadSellers();
      alert("Objection sent to seller.");
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const TABS = [
    { key: "pending", label: "Pending", color: "#D4AF37" },
    { key: "approved", label: "Approved", color: "#2E7D32" },
    { key: "rejected", label: "Rejected", color: "#C0392B" },
  ];

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerTitle}>Seller Registrations</div>
      </div>

      {/* Status Tabs with Counts */}
      <div style={s.tabRow}>
        {TABS.map(t => (
          <div
            key={t.key}
            style={{ ...s.tab, ...(tab === t.key ? { ...s.tabActive, borderColor: t.color, background: t.color } : {}) }}
            onClick={() => setTab(t.key)}
          >
            <div style={s.tabLabel}>{t.label}</div>
            <div style={{ ...s.tabCount, ...(tab === t.key ? { color: "#fff" } : { color: t.color }) }}>
              {counts[t.key]}
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: "0 16px 100px" }}>
        {loading ? (
          <p style={s.empty}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div style={s.emptyState}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              {tab === "pending" ? "📋" : tab === "approved" ? "✅" : "❌"}
            </div>
            <div style={s.emptyText}>No {tab} sellers.</div>
          </div>
        ) : (
          filtered.map(seller => (
            <div key={seller.id} style={s.card}>
              <div style={s.cardLeft}>
                <div style={s.storeName}>{seller.storeName || "Unnamed Store"}</div>
                <div style={s.metaRow}>
                  📍 {seller.city} &nbsp;·&nbsp; 🏷️ {seller.businessCategory}
                </div>
                <div style={s.metaRow}>
                  👤 {seller.ownerName} &nbsp;·&nbsp; 📅 {seller.createdAt?.toDate ? seller.createdAt.toDate().toLocaleDateString() : "—"}
                </div>
                {seller.objectionStatus === "pending_edit" && (
                  <div style={s.objBadge}>⚠️ Objection sent — awaiting seller response</div>
                )}
                {seller.rejectionReason && (
                  <div style={{ ...s.objBadge, background: "#FCEAEA", color: "#C0392B", borderColor: "#f5c6c6" }}>
                    ❌ Rejected: {seller.rejectionReason}
                  </div>
                )}
              </div>
              <div style={s.viewBtn} onClick={() => { setSelected(seller); setActiveAction(null); setRejectReason(""); setObjectionText(seller.objection || ""); }}>
                View
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===== Detail Modal ===== */}
      {selected && (
        <div style={s.overlay} onClick={() => { setSelected(null); setActiveAction(null); }}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={s.modalHeader}>
              <div style={s.modalTitle}>Seller Application</div>
              <div style={s.modalClose} onClick={() => { setSelected(null); setActiveAction(null); }}>✕</div>
            </div>

            {/* Status Banner */}
            <div style={{ ...s.statusBanner, background: getStatus(selected) === "approved" ? "#E3F2E1" : getStatus(selected) === "rejected" ? "#FCEAEA" : "#FBF1DA" }}>
              <span style={{ fontWeight: 700, color: getStatus(selected) === "approved" ? "#2E7D32" : getStatus(selected) === "rejected" ? "#C0392B" : "#8a6d1f" }}>
                {getStatus(selected) === "approved" ? "✅ Approved" : getStatus(selected) === "rejected" ? "❌ Rejected" : "⏳ Pending Review"}
              </span>
            </div>

            {/* Details */}
            <div style={s.detailsGrid}>
              <DetailRow label="Store Name" value={selected.storeName} />
              <DetailRow label="Owner Name" value={selected.ownerName} />
              <DetailRow label="Email" value={selected.email} />
              <DetailRow label="Phone" value={selected.phone} />
              <DetailRow label="City" value={selected.city} />
              <DetailRow label="National ID (CNIC)" value={selected.nationalId} />
              <DetailRow label="Business Category" value={selected.businessCategory} />
              <DetailRow label="Business Type" value={selected.businessType} />
              <DetailRow label="Monthly Volume" value={selected.monthlyVolume ? `Rs ${Number(selected.monthlyVolume).toLocaleString()}` : null} />
              <DetailRow label="Payment Account" value={selected.paymentDetails?.account} />
            </div>

            {/* Document Attachment */}
            <div style={s.docBox}>
              <div style={s.docTitle}>📎 Category Document ({selected.documents?.type || "—"})</div>
              {selected.documents?.url ? (
                <a href={selected.documents.url} target="_blank" rel="noreferrer" style={s.docLink}>
                  View / Download Document ↗
                </a>
              ) : (
                <div style={s.docMissing}>No document uploaded yet (Cloudinary not configured)</div>
              )}
            </div>

            {/* Action Buttons — only for pending */}
            {getStatus(selected) === "pending" && !activeAction && (
              <div style={s.actionsRow}>
                <button style={s.approveBtn} onClick={handleApprove} disabled={actionLoading}>
                  {actionLoading ? "..." : "✅ Approve"}
                </button>
                <button style={s.objectionBtn} onClick={() => setActiveAction("objection")}>
                  📝 Objection
                </button>
                <button style={s.rejectBtn} onClick={() => setActiveAction("reject")}>
                  ❌ Reject
                </button>
              </div>
            )}

            {/* Reject Form */}
            {activeAction === "reject" && (
              <div style={s.actionForm}>
                <div style={s.actionFormTitle}>❌ Rejection Reason</div>
                <textarea
                  className="input-field"
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Documents are invalid or incomplete..."
                  style={{ resize: "none", fontFamily: "inherit", marginBottom: 10 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setActiveAction(null)}>Cancel</button>
                  <button style={{ ...s.rejectBtn, flex: 1, padding: "12px 0", borderRadius: 12, border: "none", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }} onClick={handleReject} disabled={actionLoading}>
                    {actionLoading ? "Rejecting..." : "Confirm Reject"}
                  </button>
                </div>
              </div>
            )}

            {/* Objection Form */}
            {activeAction === "objection" && (
              <div style={s.actionForm}>
                <div style={s.actionFormTitle}>📝 Send Objection to Seller</div>
                <textarea
                  className="input-field"
                  rows={3}
                  value={objectionText}
                  onChange={e => setObjectionText(e.target.value)}
                  placeholder="e.g. Your CNIC image is blurry, please re-upload..."
                  style={{ resize: "none", fontFamily: "inherit", marginBottom: 10 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setActiveAction(null)}>Cancel</button>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={handleObjection} disabled={actionLoading}>
                    {actionLoading ? "Sending..." : "Send Objection"}
                  </button>
                </div>
              </div>
            )}

            <div style={s.closeTextBtn} onClick={() => { setSelected(null); setActiveAction(null); }}>Close</div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10.5, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: "#1a1a1a", fontWeight: 500 }}>{value}</div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },

  tabRow: { display: "flex", gap: 10, padding: "16px 16px 12px" },
  tab: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 8px", borderRadius: 12, border: "1.5px solid #eee0c0", cursor: "pointer", background: "#fff", transition: "all 0.2s" },
  tabActive: { color: "#fff" },
  tabLabel: { fontSize: 11.5, fontWeight: 700, marginBottom: 4 },
  tabCount: { fontSize: 20, fontWeight: 800 },

  empty: { fontSize: 13, color: "#888", padding: "20px 0" },
  emptyState: { textAlign: "center", padding: "40px 20px" },
  emptyText: { fontSize: 14, color: "#888" },

  card: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 14, marginBottom: 10 },
  cardLeft: { flex: 1, paddingRight: 10 },
  storeName: { fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 },
  metaRow: { fontSize: 11.5, color: "#888", marginBottom: 2 },
  objBadge: { fontSize: 10.5, color: "#8a6d1f", background: "#FBF1DA", border: "1px solid #D4AF37", borderRadius: 8, padding: "3px 8px", marginTop: 6, display: "inline-block" },
  viewBtn: { background: "#0B3D2E", color: "#D4AF37", fontWeight: 700, fontSize: 11.5, padding: "8px 16px", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "flex-end" },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: "0 0 20px", width: "100%", maxHeight: "92vh", overflowY: "auto" },

  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 14px", borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, background: "#fff", zIndex: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", fontWeight: 700 },
  modalClose: { fontSize: 18, color: "#888", cursor: "pointer", padding: "4px 8px" },

  statusBanner: { padding: "10px 20px", textAlign: "center", fontSize: 13.5 },

  detailsGrid: { padding: "16px 20px 0" },

  docBox: { margin: "12px 20px", background: "#F0F5F0", border: "1px solid #eee0c0", borderRadius: 12, padding: 14 },
  docTitle: { fontSize: 12, fontWeight: 700, color: "#0B3D2E", marginBottom: 8 },
  docLink: { fontSize: 13.5, color: "#0B3D2E", fontWeight: 700, textDecoration: "none" },
  docMissing: { fontSize: 12, color: "#888", fontStyle: "italic" },

  actionsRow: { display: "flex", gap: 8, padding: "14px 20px 0" },
  approveBtn: { flex: 1, padding: "13px 0", background: "#E3F2E1", border: "1.5px solid #BFE3CC", borderRadius: 12, color: "#2E7D32", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  objectionBtn: { flex: 1, padding: "13px 0", background: "#FBF1DA", border: "1.5px solid #D4AF37", borderRadius: 12, color: "#8a6d1f", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  rejectBtn: { flex: 1, padding: "13px 0", background: "#FCEAEA", border: "1.5px solid #f5c6c6", borderRadius: 12, color: "#C0392B", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },

  actionForm: { margin: "14px 20px 0", background: "#F8F8F8", borderRadius: 12, padding: 14 },
  actionFormTitle: { fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 10 },

  closeTextBtn: { textAlign: "center", fontSize: 13, color: "#888", cursor: "pointer", padding: "14px 0 0" }
};
