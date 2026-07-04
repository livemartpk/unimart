// ============================================
// UniMart - Flash Deals Banners (Marketing Manager)
// Full CRUD list — add unlimited banners, each one
// becomes a slide in the homepage's Flash Deals
// slideshow. Any image size/shape works; it's shown
// with cover-fit so it fills the tile cleanly on
// both mobile and desktop.
// ============================================

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

const CLOUD_NAME = "eez9oojf";
const UPLOAD_PRESET = "unimart-products";

export default function FlashDealsBanner({ user }) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewBanner, setViewBanner] = useState(null);
  const [editBanner, setEditBanner] = useState(null); // null = not editing, "new" = adding, or a banner object
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadBanners(); }, []);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "flashBanners"), orderBy("createdAt", "desc")));
      setBanners(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load banners:", err);
    }
    setLoading(false);
  };

  const openAdd = () => {
    setEditBanner("new");
    setTitle("");
    setFile(null);
    setPreviewUrl(null);
    setError("");
  };

  const openEdit = (b) => {
    setEditBanner(b);
    setTitle(b.title || "");
    setFile(null);
    setPreviewUrl(b.imageUrl);
    setError("");
  };

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setError("");
  };

  const handleSave = async () => {
    const isNew = editBanner === "new";
    if (isNew && !file) { setError("Choose an image."); return; }
    setUploading(true);
    setError("");
    try {
      let imageUrl = isNew ? null : editBanner.imageUrl;
      if (file) {
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", UPLOAD_PRESET);
        data.append("folder", "unimart/banners");
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: data });
        const json = await res.json();
        if (!json.secure_url) throw new Error(json.error?.message || "Upload failed");
        imageUrl = json.secure_url;
      }

      if (isNew) {
        await addDoc(collection(db, "flashBanners"), {
          imageUrl, title: title.trim() || null,
          createdBy: user.uid, createdAt: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, "flashBanners", editBanner.id), {
          imageUrl, title: title.trim() || null,
          updatedBy: user.uid, updatedAt: serverTimestamp()
        });
      }

      setEditBanner(null);
      loadBanners();
    } catch (err) {
      console.error(err);
      setError("Failed: " + err.message);
    }
    setUploading(false);
  };

  const handleDelete = async (bannerId) => {
    if (!window.confirm("Delete this banner? It will be removed from the homepage slideshow.")) return;
    try {
      await deleteDoc(doc(db, "flashBanners", bannerId));
      setBanners((list) => list.filter((b) => b.id !== bannerId));
      setViewBanner(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete: " + err.message);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerTitle}>Flash Deals Banners</div>
        <div style={s.addBtn} onClick={openAdd}>+ Add</div>
      </div>

      <div style={{ padding: 16, paddingBottom: 60 }}>
        <p style={s.helper}>
          Every banner here becomes a slide in the homepage's Flash Deals slideshow (auto-rotating).
          Add as many as you like — any image size or shape works, it's automatically cropped to fit.
        </p>

        {loading ? (
          <p style={s.emptyText}>Loading...</p>
        ) : banners.length === 0 ? (
          <div style={s.emptyState}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>🖼️</div>
            <p style={s.emptyText}>No banners yet — add your first one.</p>
            <button className="btn-primary" onClick={openAdd}>+ Add Banner</button>
          </div>
        ) : (
          <div style={s.grid}>
            {banners.map((b) => (
              <div key={b.id} style={s.card} onClick={() => setViewBanner(b)}>
                <div style={s.thumbWrap}>
                  <img src={b.imageUrl} alt={b.title || "Banner"} style={s.thumb} />
                </div>
                <div style={s.cardTitle}>{b.title || "Untitled banner"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== View Modal ===== */}
      {viewBanner && !editBanner && (
        <div style={s.overlay} onClick={() => setViewBanner(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTitle}>{viewBanner.title || "Untitled banner"}</div>
            <img src={viewBanner.imageUrl} alt="" style={s.modalImg} />
            <div style={s.modalActions}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => openEdit(viewBanner)}>✏️ Edit</button>
              <button style={s.deleteBtn} onClick={() => handleDelete(viewBanner.id)}>🗑 Delete</button>
            </div>
            <div style={s.closeBtn} onClick={() => setViewBanner(null)}>Close</div>
          </div>
        </div>
      )}

      {/* ===== Add / Edit Modal ===== */}
      {editBanner && (
        <div style={s.overlay} onClick={() => setEditBanner(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTitle}>{editBanner === "new" ? "Add Banner" : "Edit Banner"}</div>

            <div style={s.previewBox}>
              {previewUrl ? <img src={previewUrl} alt="" style={s.modalImg} /> : <div style={s.previewPlaceholder}>🖼️ No image selected</div>}
            </div>

            <label className="input-label">Image</label>
            <input type="file" className="input-field" accept="image/*" onChange={handleFileSelect} style={{ marginBottom: 12 }} />

            <label className="input-label">Title (optional, for your own reference)</label>
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Eid Sale Banner" style={{ marginBottom: 12 }} />

            {error && <p className="error-text">{error}</p>}

            <div style={s.modalActions}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={uploading}>
                {uploading ? "Saving..." : "Save"}
              </button>
            </div>
            <div style={s.closeBtn} onClick={() => setEditBanner(null)}>Cancel</div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { background: "#0B3D2E", padding: "18px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  addBtn: { background: "#D4AF37", color: "#0B3D2E", fontWeight: 700, fontSize: 12.5, padding: "8px 16px", borderRadius: 20, cursor: "pointer" },
  helper: { fontSize: 12, color: "#888", lineHeight: 1.6, marginBottom: 16 },
  emptyText: { fontSize: 13, color: "#888", padding: "10px 0" },
  emptyState: { textAlign: "center", padding: "40px 20px", background: "#fff", borderRadius: 14, border: "1px solid #eee0c0" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 },
  card: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, overflow: "hidden", cursor: "pointer" },
  thumbWrap: { width: "100%", height: 90, background: "#F0F5F0" },
  thumb: { width: "100%", height: "100%", objectFit: "cover" },
  cardTitle: { fontSize: 11.5, fontWeight: 600, color: "#1a1a1a", padding: "8px 10px" },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto" },
  modalTitle: { fontSize: 16, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 14, fontWeight: 700 },
  modalImg: { width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12, marginBottom: 14 },
  previewBox: { marginBottom: 14 },
  previewPlaceholder: { width: "100%", height: 140, background: "#F0F5F0", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 13 },
  modalActions: { display: "flex", gap: 10, marginTop: 6, marginBottom: 10 },
  deleteBtn: { flex: 1, background: "#FCEAEA", color: "#C0392B", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" },
  closeBtn: { textAlign: "center", fontSize: 13, color: "#888", cursor: "pointer", padding: "6px 0" }
};
