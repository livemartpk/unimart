// ============================================
// UniMart - Wallets Overview (Super Admin)
// View-only summary of all 5 wallets.
// ============================================

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

const WALLET_COLLECTIONS = [
  { key: "wallets_buyer", label: "Buyer Wallets" },
  { key: "wallets_seller", label: "Seller Wallets" },
  { key: "wallets_agent", label: "Agent Wallets" }
];

export default function WalletsOverview() {
  const [totals, setTotals] = useState({});
  const [websiteTotal, setWebsiteTotal] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    setLoading(true);
    try {
      const newTotals = {};
      for (const w of WALLET_COLLECTIONS) {
        const snap = await getDocs(collection(db, w.key));
        let total = 0, available = 0, pending = 0;
        snap.docs.forEach((d) => {
          const data = d.data();
          total += data.totalBalance || 0;
          available += data.availableBalance || 0;
          pending += data.pendingBalance || 0;
        });
        newTotals[w.key] = { total, available, pending, count: snap.size };
      }
      setTotals(newTotals);

      const websiteSnap = await getDocs(collection(db, "wallets_website"));
      setWebsiteTotal(websiteSnap.docs.reduce((sum, d) => sum + (d.data().totalEarning || 0), 0));

      const taxSnap = await getDocs(collection(db, "wallets_tax"));
      setTaxTotal(taxSnap.docs.reduce((sum, d) => sum + (d.data().totalCollected || 0), 0));

    } catch (err) {
      console.error("Failed to load wallets overview:", err);
    }
    setLoading(false);
  };

  if (loading) return <div className="page-shell" style={styles.page}><p style={{ padding: 20 }}>Loading wallets...</p></div>;

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Wallets Overview</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {WALLET_COLLECTIONS.map((w) => (
          <div key={w.key} style={styles.walletCard}>
            <div style={styles.walletHead}>
              <div style={styles.walletLabel}>{w.label}</div>
              <div style={styles.walletCount}>{totals[w.key]?.count || 0} accounts</div>
            </div>
            <div style={styles.balanceRow}>
              <Balance label="Total" value={totals[w.key]?.total} />
              <Balance label="Available" value={totals[w.key]?.available} />
              <Balance label="Pending" value={totals[w.key]?.pending} />
            </div>
          </div>
        ))}

        <div style={{ ...styles.walletCard, background: "#0B3D2E" }}>
          <div style={{ ...styles.walletLabel, color: "#D4AF37" }}>Website Earning Wallet</div>
          <div style={{ ...styles.bigValue, color: "#D4AF37" }}>Rs {websiteTotal.toLocaleString()}</div>
        </div>

        <div style={{ ...styles.walletCard, background: "#F0F5F0" }}>
          <div style={{ ...styles.walletLabel, color: "#0B3D2E" }}>Tax Collection Wallet</div>
          <div style={{ ...styles.bigValue, color: "#0B3D2E" }}>Rs {taxTotal.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

function Balance({ label, value }) {
  return (
    <div style={styles.balanceItem}>
      <div style={styles.balanceLabel}>{label}</div>
      <div style={styles.balanceValue}>Rs {(value || 0).toLocaleString()}</div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },

  walletCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 16, marginBottom: 12 },
  walletHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  walletLabel: { fontSize: 13.5, fontWeight: 700, color: "#0B3D2E" },
  walletCount: { fontSize: 11, color: "#888" },
  bigValue: { fontSize: 20, fontWeight: 800, marginTop: 6 },

  balanceRow: { display: "flex", gap: 10 },
  balanceItem: { flex: 1 },
  balanceLabel: { fontSize: 10.5, color: "#888" },
  balanceValue: { fontSize: 13.5, fontWeight: 700, color: "#0B3D2E", marginTop: 2 }
};
