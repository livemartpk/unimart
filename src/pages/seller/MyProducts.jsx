// ============================================
// UniMart - My Products (Seller)
// View / Edit / Delete + status filter
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

export default function MyProducts({ user, onNavigate }) {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [viewProduct, setViewProduct] = useState(null);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "products"), where("sellerId", "==", user.uid));
      const snap = await getDocs(q);
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error("Failed to load products:", err); }
    setLoading(false);
  };

  const toggleStatus = async (product) => {
    const newStatus = product.status === "active" ? "draft" : "active";
    await updateDoc(doc(db, "products", product.id), { status: newStatus });
    setProducts((ps) => ps.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p)));
    if (viewProduct?.id === product.id) setViewProduct(v => ({ ...v, status: newStatus }));
  };

  const handleDelete = async (productId) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    await deleteDoc(doc(db, "products", productId));
    setProducts((ps) => ps.filter((p) => p.id !== productId));
    setViewProduct(null);
  };

  const filteredProducts = products.filter((p) => {
    if (filter === "all") return true;
    if (filter === "outofstock") return (p.stock || 0) <= 0;
    return p.status === filter;
  });

  const counts = {
    all: products.length,
    active: products.filter((p) => p.status === "active").length,
    draft: products.filter((p) => p.status === "draft").length,
    outofstock: products.filter((p) => (p.stock || 0) <= 0).length
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>My Products</div>
        <div style={styles.addBtn} onClick={() => onNavigate && onNavigate("add-product")}>+ Add</div>
      </div>

      <div style={styles.filterRow}>
        <FilterPill label="All" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterPill label="Active" count={counts.active} active={filter === "active"} onClick={() => setFilter("active")} />
        <FilterPill label="Draft" count={counts.draft} active={filter === "draft"} onClick={() => setFilter("draft")} />
        <FilterPill label="Out of Stock" count={counts.outofstock} active={filter === "outofstock"} onClick={() => setFilter("outofstock")} />
      </div>

      <div style={{ padding: "0 16px 30px" }}>
        {loading ? (
          <p style={styles.emptyText}>Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛍️</div>
            <p style={styles.emptyText}>No products here yet.</p>
            <button className="btn-primary" onClick={() => onNavigate && onNavigate("add-product")}>Add your first product</button>
          </div>
        ) : (
          filteredProducts.map((p) => (
            <div key={p.id} style={styles.productCard}>
              <div style={styles.productImg}>
                {p.images?.[0] ? <img src={p.images[0]} alt={p.name} style={styles.imgFit} /> : "🛍️"}
              </div>
              <div style={styles.productInfo}>
                <div style={styles.productName}>{p.name}</div>
                <div style={styles.productPrice}>Rs {Number(p.price).toLocaleString()}</div>
                <div style={{ ...styles.stockBadge, ...((p.stock || 0) <= 5 ? styles.stockLow : {}) }}>
                  Stock: {p.stock || 0}
                </div>
                <div style={styles.statusBadge}>
                  <span style={{ ...styles.statusDot, background: p.status === "active" ? "#2E7D32" : "#888" }} />
                  {p.status === "active" ? "Active" : "Draft"}
                </div>
                <div style={styles.actionsRow}>
                  <span style={styles.actionView} onClick={() => setViewProduct(p)}>👁 View</span>
                  <span style={styles.actionLink} onClick={() => onNavigate && onNavigate("edit-product", p.id)}>✏️ Edit</span>
                  <span style={styles.actionLink} onClick={() => toggleStatus(p)}>
                    {p.status === "active" ? "📋 Draft" : "✅ Activate"}
                  </span>
                  <span style={{ ...styles.actionLink, color: "#C0392B" }} onClick={() => handleDelete(p.id)}>🗑 Delete</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===== View Product Modal ===== */}
      {viewProduct && (
        <div style={styles.overlay} onClick={() => setViewProduct(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>Product Details</div>
              <div style={styles.modalClose} onClick={() => setViewProduct(null)}>✕</div>
            </div>

            {/* Product Image */}
            {viewProduct.images?.[0] ? (
              <img src={viewProduct.images[0]} alt={viewProduct.name} style={styles.modalImg} />
            ) : (
              <div style={styles.modalImgPlaceholder}>🛍️</div>
            )}

            {/* Details */}
            <div style={styles.modalBody}>
              <div style={styles.modalProductName}>{viewProduct.name}</div>
              <div style={styles.modalPrice}>Rs {Number(viewProduct.price).toLocaleString()}</div>

              <div style={styles.detailGrid}>
                <DetailItem label="Category" value={viewProduct.category} />
                <DetailItem label="Stock" value={viewProduct.stock} />
                <DetailItem label="Status" value={viewProduct.status} />
                <DetailItem label="Description" value={viewProduct.description} />
              </div>

              {/* Action Buttons */}
              <div style={styles.modalActions}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setViewProduct(null); onNavigate && onNavigate("edit-product", viewProduct.id); }}>
                  ✏️ Edit Product
                </button>
                <button
                  style={{ ...styles.toggleBtn, ...(viewProduct.status === "active" ? styles.draftBtn : styles.activateBtn) }}
                  onClick={() => toggleStatus(viewProduct)}
                >
                  {viewProduct.status === "active" ? "📋 Set Draft" : "✅ Activate"}
                </button>
              </div>
              <button
                style={styles.deleteBtn}
                onClick={() => handleDelete(viewProduct.id)}
              >
                🗑 Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, count, active, onClick }) {
  return (
    <div style={{ ...styles.pill, ...(active ? styles.pillActive : {}) }} onClick={onClick}>
      {label} {count > 0 && `(${count})`}
    </div>
  );
}

function DetailItem({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10.5, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: "#1a1a1a", fontWeight: 500, textTransform: "capitalize" }}>{value}</div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  addBtn: { background: "#D4AF37", color: "#0B3D2E", fontWeight: 700, fontSize: 12.5, padding: "8px 16px", borderRadius: 20, cursor: "pointer" },

  filterRow: { display: "flex", gap: 8, padding: "14px 16px", overflowX: "auto" },
  pill: { padding: "8px 14px", borderRadius: 20, border: "1.5px solid #eee0c0", fontSize: 11.5, fontWeight: 600, color: "#0B3D2E", whiteSpace: "nowrap", cursor: "pointer", background: "#fff" },
  pillActive: { background: "#0B3D2E", color: "#fff", borderColor: "#0B3D2E" },

  emptyState: { textAlign: "center", padding: "40px 0" },
  emptyText: { fontSize: 13, color: "#888", marginBottom: 14 },

  productCard: { display: "flex", gap: 12, background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 12, marginBottom: 10 },
  productImg: { width: 70, height: 70, background: "#F0F5F0", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 },
  imgFit: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: 700, color: "#1a1a1a" },
  productPrice: { fontSize: 13, fontWeight: 800, color: "#0B3D2E", marginTop: 2 },
  stockBadge: { fontSize: 10.5, color: "#888", marginTop: 3 },
  stockLow: { color: "#C0392B", fontWeight: 700 },
  statusBadge: { display: "flex", alignItems: "center", gap: 4, marginTop: 3 },
  statusDot: { width: 6, height: 6, borderRadius: "50%" },
  actionsRow: { display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" },
  actionView: { fontSize: 11, color: "#D4AF37", fontWeight: 700, cursor: "pointer" },
  actionLink: { fontSize: 11, color: "#0B3D2E", fontWeight: 700, cursor: "pointer" },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "flex-end" },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "92vh", overflowY: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 14px", borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, background: "#fff", zIndex: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", fontWeight: 700 },
  modalClose: { fontSize: 18, color: "#888", cursor: "pointer", padding: "4px 8px" },
  modalImg: { width: "100%", height: 200, objectFit: "cover" },
  modalImgPlaceholder: { width: "100%", height: 150, background: "#F0F5F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50 },
  modalBody: { padding: "16px 20px 24px" },
  modalProductName: { fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 4 },
  modalPrice: { fontSize: 20, fontWeight: 800, color: "#0B3D2E", marginBottom: 16 },
  detailGrid: { marginBottom: 16 },
  modalActions: { display: "flex", gap: 10, marginBottom: 10 },
  toggleBtn: { flex: 1, padding: "13px 0", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  activateBtn: { background: "#E3F2E1", color: "#2E7D32" },
  draftBtn: { background: "#F0F5F0", color: "#555" },
  deleteBtn: { width: "100%", padding: "13px 0", background: "#FCEAEA", border: "1px solid #f5c6c6", borderRadius: 12, color: "#C0392B", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
};


