// ============================================
// UniMart - Product Reviews (Content Team)
// Reviews new sellers' first 10 products for
// quality/fake listing checks.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

const REJECT_REASONS = [
  "Poor image quality",
  "Misleading description",
  "Price seems incorrect",
  "Possible copyright/brand issue",
  "Category mismatch"
];

export default function ProductReviews({ user }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "products"), where("status", "==", "pending_review"));
      const snap = await getDocs(q);
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load products for review:", err);
    }
    setLoading(false);
  };

  const handleApprove = async (productId) => {
    try {
      await updateDoc(doc(db, "products", productId), { status: "active" });
      await addDoc(collection(db, "adminLogs"), {
        adminId: user.uid,
        adminRole: "content_team",
        action: "approved_product",
        targetId: productId,
        timestamp: serverTimestamp()
      });
      setProducts((ps) => ps.filter((p) => p.id !== productId));
    } catch (err) {
      console.error("Failed to approve product:", err);
    }
  };

  const handleReject = async () => {
    if (!rejectReason) { alert("Select a rejection reason."); return; }
    try {
      await updateDoc(doc(db, "products", selectedProduct.id), { status: "rejected", rejectionReason: rejectReason });
      await addDoc(collection(db, "adminLogs"), {
        adminId: user.uid,
        adminRole: "content_team",
        action: "rejected_product",
        targetId: selectedProduct.id,
        timestamp: serverTimestamp()
      });
      setProducts((ps) => ps.filter((p) => p.id !== selectedProduct.id));
      setSelectedProduct(null);
      setRejectReason("");
    } catch (err) {
      console.error("Failed to reject product:", err);
    }
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Product Reviews</div>
        <div style={styles.headerSub}>{products.length} pending</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading...</p>
        ) : products.length === 0 ? (
          <p style={styles.emptyText}>No products awaiting review.</p>
        ) : (
          products.map((p) => (
            <div key={p.id} style={styles.productCard}>
              <div style={styles.productImg}>
                {p.images?.[0] ? <img src={p.images[0]} alt={p.name} style={styles.imgFit} /> : "🛍️"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.productName}>{p.name}</div>
                <div style={styles.productMeta}>{p.category} · Rs {p.price} · {p.sellerName}</div>
                <div style={styles.actionsRow}>
                  <button className="btn-secondary" style={styles.smallBtn} onClick={() => setSelectedProduct(p)}>Reject</button>
                  <button className="btn-primary" style={styles.smallBtn} onClick={() => handleApprove(p.id)}>Approve</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedProduct && (
        <div style={styles.modalOverlay} onClick={() => setSelectedProduct(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Reject Product</h3>
            <p style={{ fontSize: 12.5, color: "#666", marginBottom: 14 }}>{selectedProduct.name}</p>
            {REJECT_REASONS.map((r) => (
              <div key={r} style={{ ...styles.reasonOption, ...(rejectReason === r ? styles.reasonOptionActive : {}) }} onClick={() => setRejectReason(r)}>
                {r}
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedProduct(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, background: "#C0392B" }} onClick={handleReject}>Reject Product</button>
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

  productCard: { display: "flex", gap: 12, background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 12, marginBottom: 10 },
  productImg: { width: 64, height: 64, background: "#F0F5F0", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 },
  imgFit: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 },
  productName: { fontSize: 13, fontWeight: 700, color: "#1a1a1a" },
  productMeta: { fontSize: 11, color: "#888", marginTop: 3 },
  actionsRow: { display: "flex", gap: 8, marginTop: 8 },
  smallBtn: { flex: 1, fontSize: 11.5, padding: "8px 0" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 50 },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", margin: "0 auto" },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 8 },

  reasonOption: { padding: "10px 14px", borderRadius: 10, border: "1.5px solid #eee0c0", fontSize: 12.5, color: "#444", marginBottom: 8, cursor: "pointer" },
  reasonOptionActive: { borderColor: "#C0392B", background: "#FCEAEA", color: "#C0392B", fontWeight: 600 }
};
