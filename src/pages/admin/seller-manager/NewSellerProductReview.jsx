// ============================================
// UniMart - New Seller Product Reviews (Seller Manager)
// Reviews the first 10 products of newly approved
// sellers before they go fully live.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { formatPrice } from "../../../utils/countries";
import "../../../styles/theme.css";

export default function NewSellerProductReview({ user }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "products"), where("status", "==", "pending_review"), where("isFirstBatch", "==", true));
      const snap = await getDocs(q);
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load new seller products:", err);
    }
    setLoading(false);
  };

  const handleApprove = async (productId) => {
    await updateDoc(doc(db, "products", productId), { status: "active" });
    await addDoc(collection(db, "adminLogs"), {
      adminId: user.uid, adminRole: "seller_manager", action: "approved_new_seller_product", targetId: productId, timestamp: serverTimestamp()
    });
    setProducts((ps) => ps.filter((p) => p.id !== productId));
  };

  const handleReject = async (productId) => {
    const reason = window.prompt("Reason for rejection:");
    if (!reason) return;
    await updateDoc(doc(db, "products", productId), { status: "rejected", rejectionReason: reason });
    setProducts((ps) => ps.filter((p) => p.id !== productId));
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>New Seller Product Checks</div>
        <div style={styles.headerSub}>First 10 products from newly approved stores</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading...</p>
        ) : products.length === 0 ? (
          <p style={styles.emptyText}>No first-batch products awaiting review.</p>
        ) : (
          products.map((p) => (
            <div key={p.id} style={styles.productCard}>
              <div style={styles.productImg}>{p.images?.[0] ? <img src={p.images[0]} alt={p.name} style={styles.imgFit} /> : "🛍️"}</div>
              <div style={{ flex: 1 }}>
                <div style={styles.productName}>{p.name}</div>
                <div style={styles.productMeta}>{p.sellerName} · {formatPrice(p.price, p.country)}</div>
                <div style={styles.actionsRow}>
                  <button className="btn-secondary" style={styles.smallBtn} onClick={() => handleReject(p.id)}>Reject</button>
                  <button className="btn-primary" style={styles.smallBtn} onClick={() => handleApprove(p.id)}>Approve</button>
                </div>
              </div>
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
  headerSub: { color: "#cfe0d4", fontSize: 11.5, marginTop: 2 },
  emptyText: { fontSize: 13, color: "#888", padding: "20px 0" },

  productCard: { display: "flex", gap: 12, background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 12, marginBottom: 10 },
  productImg: { width: 64, height: 64, background: "#F0F5F0", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 },
  imgFit: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 },
  productName: { fontSize: 13, fontWeight: 700, color: "#1a1a1a" },
  productMeta: { fontSize: 11, color: "#888", marginTop: 3 },
  actionsRow: { display: "flex", gap: 8, marginTop: 8 },
  smallBtn: { flex: 1, fontSize: 11.5, padding: "8px 0" }
};
