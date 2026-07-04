// ============================================
// UniMart - Flash Deals Banner (Marketing Manager)
// Upload the image shown on the buyer homepage's
// big "Flash Deals" tile. Any image size/aspect
// ratio works — it's displayed with cover-fit so it
// always fills the tile cleanly on mobile and web.
// ============================================

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

const CLOUD_NAME = "eez9oojf";
const UPLOAD_PRESET = "unimart-products";

export default function FlashDealsBanner({ user }) {
  const [currentImage, setCurrentImage] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadBanner();
  }, []);

  const loadBanner = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "siteConfig", "flashDealsBanner"));
      if (snap.exists()) setCurrentImage(snap.data().imageUrl || null);
    } catch (err) {
      console.error("Failed to load banner:", err);
    }
    setLoading(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
    setSaved(false);
  };

  const handleUpload = async () => {
    if (!previewFile) { setError("Choose an image first."); return; }
    setUploading(true);
    setError("");
    try {
      const data = new FormData();
      data.append("file", previewFile);
      data.append("upload_preset", UPLOAD_PRESET);
      data.append("folder", "unimart/banners");
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: data });
      const json = await res.json();
      if (!json.secure_url) throw new Error(json.error?.message || "Upload failed");

      await setDoc(doc(db, "siteConfig", "flashDealsBanner"), {
        imageUrl: json.secure_url,
        updatedBy: user.uid,
        updatedAt: serverTimestamp()
      });

      setCurrentImage(json.secure_url);
      setPreviewFile(null);
      setPreviewUrl(null);
      setSaved(true);
    } catch (err) {
      console.error(err);
      setError("Upload failed: " + err.message);
    }
    setUploading(false);
  };

  const handleRemove = async () => {
    if (!window.confirm("Remove the banner image? The homepage will show the plain green tile instead.")) return;
    try {
      await setDoc(doc(db, "siteConfig", "flashDealsBanner"), { imageUrl: null, updatedBy: user.uid, updatedAt: serverTimestamp() });
      setCurrentImage(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p style={{ padding: 30, textAlign: "center", color: "#888" }}>Loading...</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerTitle}>Flash Deals Banner</div>
      </div>

      <div style={{ padding: 16, paddingBottom: 60 }}>
        <p style={s.helper}>
          This image shows on the buyer homepage's big "Flash Deals" tile. Any image size or shape works —
          it's automatically cropped to fill the tile on both mobile and desktop.
        </p>

        <div style={s.previewCard}>
          <div style={s.previewLabel}>Live Preview</div>
          <div
            style={{
              ...s.bentoPreview,
              ...((previewUrl || currentImage)
                ? { backgroundImage: `linear-gradient(180deg, rgba(11,61,46,0.15) 0%, rgba(11,61,46,0.85) 100%), url(${previewUrl || currentImage})`, backgroundSize: "cover", backgroundPosition: "center" }
                : {})
            }}
          >
            <div style={{ fontSize: 22 }}>⚡</div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>Flash Deals</div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>Up to 60% off</div>
            </div>
          </div>
        </div>

        <label className="input-label">Choose Image</label>
        <input type="file" className="input-field" accept="image/*" onChange={handleFileSelect} style={{ marginBottom: 12 }} />

        {error && <p className="error-text">{error}</p>}
        {saved && <p style={s.savedMsg}>✓ Banner updated — live on the homepage now.</p>}

        <button className="btn-primary" style={{ width: "100%", marginBottom: 10 }} onClick={handleUpload} disabled={uploading || !previewFile}>
          {uploading ? "Uploading..." : "Upload & Publish"}
        </button>

        {currentImage && (
          <button style={s.removeBtn} onClick={handleRemove}>🗑 Remove Current Banner Image</button>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  helper: { fontSize: 12, color: "#888", lineHeight: 1.6, marginBottom: 16 },
  previewCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 14, marginBottom: 20 },
  previewLabel: { fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  bentoPreview: { minHeight: 140, borderRadius: 14, background: "linear-gradient(160deg, #0B3D2E, #1a5c44)", color: "#fff", padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" },
  savedMsg: { fontSize: 12.5, color: "#2E7D32", fontWeight: 600, marginBottom: 10 },
  removeBtn: { width: "100%", background: "none", border: "1px solid #C0392B", color: "#C0392B", borderRadius: 10, padding: "10px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }
};
