// ============================================
// UniMart - Wallets Reconciliation (Finance Team)
// ============================================

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function WalletsReconciliation() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReconciliation();
  }, []);

  const loadReconciliation = async () => {
    setLoading(true);
    try {
      const collections = ["wallets_buyer", "wallets_seller", "wallets_agent"];
      const results = [];
      for (const colName of collections) {
        const snap = await getDocs(collection(db, colName));
        let total = 0, available = 0, pending = 0;
        snap.docs.forEach((d) => {
          const data = d.data();
          total += data.totalBalance || 0;
          available += data.availableBalance || 0;
          pending += data.pendingBalance || 0;
        });
        const expectedTotal = available + pending;
        results.push({
          name: colName.replace("wallets_", ""),
          total, available, pending,
          matches: Math.abs(total - expectedTotal) < 1 // small float tolerance
        });
      }
      setSummary(results);
    } catch (err) {
      console.error("Failed to reconcile wallets:", err);
    }
    setLoading(false);
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Wallets Reconciliation</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Checking balances...</p>
        ) : (
          summary.map((s) => (
            <div key={s.name} style={styles.walletCard}>
              <div style={styles.walletHead}>
                <div style={styles.walletName}>{s.name} wallets</div>
                <div style={{ ...styles.matchBadge, ...(s.matches ? styles.matchOk : styles.matchFail) }}>
                  {s.matches ? "✓ Balanced" : "⚠ Mismatch"}
                </div>
              </div>
              <div style={styles.row}>Total: Rs {s.total.toLocaleString()}</div>
              <div style={styles.row}>Available + Pending: Rs {(s.available + s.pending).toLocaleString()}</div>
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

  walletCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 16, marginBottom: 12 },
  walletHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  walletName: { fontSize: 13.5, fontWeight: 700, color: "#0B3D2E", textTransform: "capitalize" },
  matchBadge: { fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 12 },
  matchOk: { background: "#E3F2E1", color: "#2E7D32" },
  matchFail: { background: "#FCEAEA", color: "#C0392B" },
  row: { fontSize: 12, color: "#666", marginTop: 4 }
};
