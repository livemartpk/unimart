// ============================================
// UniMart - Product Reviews (Content Team)
// New seller first-10 products with full detail
// View before Approve/Reject.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { formatPrice } from "../../../utils/countries";
import "../../../styles/theme.css";

export default function ProductReviews({ user }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "products"), where("status", "==", "pending_review"));
      const snap = await getDocs(q);
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleApprove = async (product) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "products", product.id), { status: "active", reviewedBy: user.uid, reviewedAt: serverTimestamp() });
      await addDoc(collection(db, "adminLogs"), { adminId: user.uid, adminRole: "content_team", action: "approved_product", targetId: product.id, timestamp: serverTimestamp() });
      setSelected(null);
      loadProducts();
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const handleReject = async (product) => {
    const reason = window.prompt("Reason for rejection:");
    if (!reason) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "products", product.id), { status: "rejected", rejectionReason: reason });
      setSelected(null);
      loadProducts();
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerTitle}>Product Reviews</div>
        <div style={s.headerSub}>First-batch products from new sellers</div>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        {loading ? <p style={s.empty}>Loading...</p>
          : products.length === 0 ? <p style={s.empty}>No products awaiting review.</p>
          : products.map(p => (
            <div key={p.id} style={s.card}>
              <div style={s.productImg}>
                {p.images?.[0] ? <img src={p.images[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} /> : "🛍️"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={s.cardName}>{p.name}</div>
                <div style={s.cardMeta}>{p.sellerName} · {formatPrice(p.price, p.country)}</div>
              </div>
              <div style={s.viewBtn} onClick={() => setSelected(p)}>View</div>
            </div>
          ))
        }
      </div>

      {selected && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>Product Detail</div>
            {selected.images?.[0] && <img src={selected.images[0]} alt={selected.name} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12, marginBottom: 14 }} />}
            <DetailRow label="Product Name" value={selected.name} />
            <DetailRow label="Price" value={formatPrice(selected.price, selected.country)} />
            <DetailRow label="Seller" value={selected.sellerName} />
            <DetailRow label="Category" value={selected.category} />
            <DetailRow label="Description" value={selected.description} />
            <DetailRow label="Stock" value={selected.stock} />

            <div style={s.modalActions}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => handleReject(selected)} disabled={actionLoading}>Reject</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleApprove(selected)} disabled={actionLoading}>
                {actionLoading ? "Processing..." : "Approve"}
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
      <div style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 500, lineHeight: 1.4 }}>{value || "—"}</div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  headerSub: { color: "#cfe0d4", fontSize: 11.5, marginTop: 2 },
  empty: { fontSize: 13, color: "#888", padding: "20px 0" },
  card: { display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 12, marginBottom: 10 },
  productImg: { width: 56, height: 56, background: "#F0F5F0", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 },
  cardName: { fontSize: 13, fontWeight: 700, color: "#1a1a1a" },
  cardMeta: { fontSize: 11, color: "#888", marginTop: 3 },
  viewBtn: { background: "#0B3D2E", color: "#D4AF37", fontWeight: 700, fontSize: 11.5, padding: "8px 14px", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 16, fontWeight: 700 },
  modalActions: { display: "flex", gap: 10, marginTop: 16, marginBottom: 12 },
  closeBtn: { textAlign: "center", fontSize: 13, color: "#888", cursor: "pointer", padding: "8px 0" }
};
