// ============================================
// UniMart - Vacation Requests (Seller Manager)
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function VacationRequests() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVacationSellers();
  }, []);

  const loadVacationSellers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "sellers"), where("storeStatus", "==", "vacation"));
      const snap = await getDocs(q);
      setSellers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load vacation sellers:", err);
    }
    setLoading(false);
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Sellers on Vacation</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading...</p>
        ) : sellers.length === 0 ? (
          <p style={styles.emptyText}>No sellers currently on vacation mode.</p>
        ) : (
          sellers.map((s) => (
            <div key={s.id} style={styles.sellerRow}>
              <div style={styles.storeName}>{s.storeName}</div>
              <div style={styles.metaRow}>{s.city} · This is informational only — sellers control their own vacation toggle.</div>
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

  sellerRow: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 14, marginBottom: 10 },
  storeName: { fontSize: 13.5, fontWeight: 700, color: "#1a1a1a" },
  metaRow: { fontSize: 11, color: "#888", marginTop: 4, lineHeight: 1.5 }
};
