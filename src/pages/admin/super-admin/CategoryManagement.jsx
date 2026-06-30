// ============================================
// UniMart - Category Management (Super Admin)
// ============================================

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function CategoryManagement({ user }) {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "categories"));
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newCategory.trim()) return;
    setAdding(true);
    try {
      await addDoc(collection(db, "categories"), {
        name: newCategory.trim(),
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      setNewCategory("");
      loadCategories();
    } catch (err) {
      console.error("Failed to add category:", err);
    }
    setAdding(false);
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm("Remove this category? Products already using it won't be affected.")) return;
    await deleteDoc(doc(db, "categories", categoryId));
    setCategories((cs) => cs.filter((c) => c.id !== categoryId));
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Category Management</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <input className="input-field" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name" />
          <button className="btn-primary" onClick={handleAdd} disabled={adding}>Add</button>
        </div>

        {loading ? (
          <p style={styles.emptyText}>Loading categories...</p>
        ) : categories.length === 0 ? (
          <p style={styles.emptyText}>No categories yet.</p>
        ) : (
          categories.map((c) => (
            <div key={c.id} style={styles.categoryRow}>
              <div style={styles.categoryName}>{c.name}</div>
              <div style={styles.deleteBtn} onClick={() => handleDelete(c.id)}>Remove</div>
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
  emptyText: { fontSize: 13, color: "#888", padding: "20px 0" },

  categoryRow: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #eee0c0", borderRadius: 10, padding: "12px 14px", marginBottom: 8 },
  categoryName: { fontSize: 13, fontWeight: 600, color: "#1a1a1a" },
  deleteBtn: { fontSize: 11, color: "#C0392B", fontWeight: 700, cursor: "pointer" }
};
