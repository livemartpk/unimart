// ============================================
// UniMart - Flagged Sellers (Seller Manager)
// Low-rating or complaint-heavy sellers, escalated
// for Super Admin visibility.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function FlaggedSellers() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlagged();
  }, []);

  const loadFlagged = async () => {
    setLoading(true);
    try {
      // Sellers with rating below 3 stars and at least one completed sale
      const snap = await getDocs(collection(db, "sellers"));
      const flagged = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => (s.rating || 5) < 3 && s.storeStatus === "approved");
      setSellers(flagged);
    } catch (err) {
      console.error("Failed to load flagged sellers:", err);
    }
    setLoading(false);
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Flagged Sellers</div>
        <div style={styles.headerSub}>Low-rating stores needing attention</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading...</p>
        ) : sellers.length === 0 ? (
          <p style={styles.emptyText}>No flagged sellers right now.</p>
        ) : (
          sellers.map((s) => (
            <div key={s.id} style={styles.sellerRow}>
              <div>
                <div style={styles.storeName}>{s.storeName}</div>
                <div style={styles.metaRow}>{s.city}</div>
              </div>
              <div style={styles.ratingBadge}>⭐ {s.rating}</div>
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

  sellerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #FCEAEA", borderRadius: 12, padding: 14, marginBottom: 10 },
  storeName: { fontSize: 13.5, fontWeight: 700, color: "#1a1a1a" },
  metaRow: { fontSize: 11, color: "#888", marginTop: 3 },
  ratingBadge: { fontSize: 12.5, fontWeight: 700, color: "#C0392B" }
};
