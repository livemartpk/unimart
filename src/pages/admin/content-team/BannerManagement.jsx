// ============================================
// UniMart - Banner Management (Content Team)
// Reviews homepage banners before they go live;
// final activation power rests with Super Admin
// (per our decision).
// ============================================

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function BannerManagement({ user }) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ title: "", imageUrl: "", linkTo: "" });

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "banners"));
      setBanners(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load banners:", err);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.title || !form.imageUrl) { alert("Title and image URL are required."); return; }
    await addDoc(collection(db, "banners"), {
      ...form,
      status: "pending_approval", // Super Admin gives final go-live approval
      submittedBy: user.uid,
      createdAt: serverTimestamp()
    });
    setShowAddModal(false);
    setForm({ title: "", imageUrl: "", linkTo: "" });
    loadBanners();
  };

  const handleDelete = async (bannerId) => {
    if (!window.confirm("Remove this banner?")) return;
    await deleteDoc(doc(db, "banners", bannerId));
    setBanners((bs) => bs.filter((b) => b.id !== bannerId));
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <div style={styles.addBtn} onClick={() => setShowAddModal(true)}>+ New Banner</div>
        </div>
        {loading ? (
          <p style={styles.emptyText}>Loading banners...</p>
        ) : banners.length === 0 ? (
          <p style={styles.emptyText}>No banners yet.</p>
        ) : (
          banners.map((b) => (
            <div key={b.id} style={styles.bannerCard}>
              <div style={styles.bannerImg}>{b.imageUrl ? <img src={b.imageUrl} alt={b.title} style={styles.imgFit} /> : "🖼️"}</div>
              <div style={{ flex: 1 }}>
                <div style={styles.bannerTitle}>{b.title}</div>
                <div style={{ ...styles.statusTag, ...(b.status === "live" ? styles.statusLive : styles.statusPending) }}>
                  {b.status === "live" ? "Live" : "Pending Super Admin approval"}
                </div>
              </div>
              <div style={styles.deleteBtn} onClick={() => handleDelete(b.id)}>Remove</div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>New Banner</h3>
            <label className="input-label">Title</label>
            <input className="input-field" style={{ marginBottom: 12 }} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <label className="input-label">Image URL</label>
            <input className="input-field" style={{ marginBottom: 12 }} value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="Cloudinary image URL" />
            <label className="input-label">Links to (optional)</label>
            <input className="input-field" style={{ marginBottom: 16 }} value={form.linkTo} onChange={(e) => setForm((f) => ({ ...f, linkTo: e.target.value }))} placeholder="e.g. category/electronics" />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleAdd}>Submit for Approval</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  addBtn: { background: "#D4AF37", color: "#0B3D2E", fontWeight: 700, fontSize: 12, padding: "8px 14px", borderRadius: 20, cursor: "pointer" },
  emptyText: { fontSize: 13, color: "#888", padding: "20px 0" },

  bannerCard: { display: "flex", gap: 12, alignItems: "center", background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 12, marginBottom: 10 },
  bannerImg: { width: 60, height: 44, background: "#F0F5F0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 },
  imgFit: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 },
  bannerTitle: { fontSize: 13, fontWeight: 700, color: "#1a1a1a" },
  statusTag: { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 10, display: "inline-block", marginTop: 4 },
  statusLive: { background: "#E3F2E1", color: "#2E7D32" },
  statusPending: { background: "#FBF1DA", color: "#8a6d1f" },
  deleteBtn: { fontSize: 10.5, color: "#C0392B", fontWeight: 700, cursor: "pointer" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 50 },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", margin: "0 auto" },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 16 }
};
