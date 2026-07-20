// ============================================
// UniMart - Flagged Listings (Content Team)
// Products reported by buyers/other sellers as
// fake, duplicate, or inappropriate.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function FlaggedListings({ user }) {
  const [flagged, setFlagged] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlagged();
  }, []);

  const loadFlagged = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "products"), where("flagged", "==", true));
      const snap = await getDocs(q);
      setFlagged(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load flagged listings:", err);
    }
    setLoading(false);
  };

  const handleRemove = async (productId) => {
    if (!window.confirm("Remove this listing permanently?")) return;
    await updateDoc(doc(db, "products", productId), { status: "removed" });
    await addDoc(collection(db, "adminLogs"), {
      adminId: user.uid, adminRole: "content_team", action: "removed_flagged_listing", targetId: productId, timestamp: serverTimestamp()
    });
    setFlagged((fs) => fs.filter((f) => f.id !== productId));
  };

  const handleDismiss = async (productId) => {
    await updateDoc(doc(db, "products", productId), { flagged: false });
    setFlagged((fs) => fs.filter((f) => f.id !== productId));
  };

  return (
    <div className="page-shell" style={styles.page}>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        <div style={styles.infoNote}>
          💡 Tip: for suspected stolen images, try a reverse image search before deciding.
        </div>

        {loading ? (
          <p style={styles.emptyText}>Loading...</p>
        ) : flagged.length === 0 ? (
          <p style={styles.emptyText}>No flagged listings right now.</p>
        ) : (
          flagged.map((p) => (
            <div key={p.id} style={styles.productCard}>
              <div style={styles.productImg}>{p.images?.[0] ? <img src={p.images[0]} alt={p.name} style={styles.imgFit} /> : "🛍️"}</div>
              <div style={{ flex: 1 }}>
                <div style={styles.productName}>{p.name}</div>
                <div style={styles.productMeta}>{p.sellerName} · Reported: {p.flagReason || "Unspecified"}</div>
                <div style={styles.actionsRow}>
                  <button className="btn-secondary" style={styles.smallBtn} onClick={() => handleDismiss(p.id)}>Dismiss Flag</button>
                  <button className="btn-primary" style={{ ...styles.smallBtn, background: "#C0392B" }} onClick={() => handleRemove(p.id)}>Remove Listing</button>
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
  infoNote: { fontSize: 11.5, color: "#5a4419", background: "#FBF1DA", border: "1px solid #D4AF37", borderRadius: 10, padding: 12, marginBottom: 16 },
  emptyText: { fontSize: 13, color: "#888" },

  productCard: { display: "flex", gap: 12, background: "#fff", border: "1px solid #FCEAEA", borderRadius: 14, padding: 12, marginBottom: 10 },
  productImg: { width: 64, height: 64, background: "#F0F5F0", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 },
  imgFit: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 },
  productName: { fontSize: 13, fontWeight: 700, color: "#1a1a1a" },
  productMeta: { fontSize: 11, color: "#888", marginTop: 3 },
  actionsRow: { display: "flex", gap: 8, marginTop: 8 },
  smallBtn: { flex: 1, fontSize: 11, padding: "8px 0" }
};
