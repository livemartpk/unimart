// ============================================
// UniMart - My Products (Seller)
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

export default function MyProducts({ user, onNavigate }) {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "products"), where("sellerId", "==", user.uid));
      const snap = await getDocs(q);
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load products:", err);
    }
    setLoading(false);
  };

  const toggleStatus = async (product) => {
    const newStatus = product.status === "active" ? "draft" : "active";
    await updateDoc(doc(db, "products", product.id), { status: newStatus });
    setProducts((ps) => ps.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p)));
  };

  const handleDelete = async (productId) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    await deleteDoc(doc(db, "products", productId));
    setProducts((ps) => ps.filter((p) => p.id !== productId));
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

      <div className="container" style={{ paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <div style={styles.emptyState}>
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
                <div style={styles.productPrice}>Rs {p.price}</div>
                <div style={{ ...styles.stockBadge, ...((p.stock || 0) <= 5 ? styles.stockLow : {}) }}>
                  Stock: {p.stock || 0}
                </div>
                <div style={styles.actionsRow}>
                  <span style={styles.actionLink} onClick={() => onNavigate && onNavigate("edit-product", p.id)}>Edit</span>
                  <span style={styles.actionLink} onClick={() => toggleStatus(p)}>
                    {p.status === "active" ? "Set Draft" : "Activate"}
                  </span>
                  <span style={{ ...styles.actionLink, color: "#C0392B" }} onClick={() => handleDelete(p.id)}>Delete</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
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

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  addBtn: { background: "#D4AF37", color: "#0B3D2E", fontWeight: 700, fontSize: 12.5, padding: "8px 14px", borderRadius: 20, cursor: "pointer" },

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
  actionsRow: { display: "flex", gap: 12, marginTop: 6 },
  actionLink: { fontSize: 11, color: "#0B3D2E", fontWeight: 700, cursor: "pointer" }
};
