// ============================================
// UniMart - Financial Reports (Finance Team)
// ============================================

import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAdminCountry } from "../../../context/AdminCountryContext";
import { formatPrice } from "../../../utils/countries";
import "../../../styles/theme.css";

export default function FinancialReports() {
  const { country } = useAdminCountry();
  const [report, setReport] = useState({ thisMonth: 0, lastMonth: 0, taxCollected: 0, totalPayouts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!country) return;
    loadReport();
  }, [country]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const ordersSnap = await getDocs(query(collection(db, "orders"), where("country", "==", country)));
      const orders = ordersSnap.docs.map((d) => d.data());

      const now = new Date();
      const thisMonth = now.getMonth();
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;

      const thisMonthTotal = orders
        .filter((o) => o.createdAt?.toDate && o.createdAt.toDate().getMonth() === thisMonth)
        .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

      const lastMonthTotal = orders
        .filter((o) => o.createdAt?.toDate && o.createdAt.toDate().getMonth() === lastMonth)
        .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

      // Note: tax wallet is currently a single global total, not split per country yet
      const taxSnap = await getDocs(collection(db, "wallets_tax"));
      const taxCollected = taxSnap.docs.reduce((sum, d) => sum + (d.data().totalCollected || 0), 0);

      setReport({ thisMonth: thisMonthTotal, lastMonth: lastMonthTotal, taxCollected, totalPayouts: 0 });

    } catch (err) {
      console.error("Failed to load financial report:", err);
    }
    setLoading(false);
  };

  if (!country) {
    return (
      <div className="page-shell" style={styles.page}>
        <div style={styles.header}><div style={styles.headerTitle}>Financial Reports</div></div>
        <p style={{ padding: 30, textAlign: "center", color: "#888" }}>🌍 Select a country from the dropdown above to view its report.</p>
      </div>
    );
  }

  if (loading) return <div className="page-shell" style={styles.page}><p style={{ padding: 20 }}>Loading reports...</p></div>;

  const growthPct = report.lastMonth > 0 ? Math.round(((report.thisMonth - report.lastMonth) / report.lastMonth) * 100) : 0;

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Financial Reports — {country}</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        <div style={styles.compareCard}>
          <div style={styles.compareCol}>
            <div style={styles.compareLabel}>This Month</div>
            <div style={styles.compareValue}>{formatPrice(report.thisMonth, country)}</div>
          </div>
          <div style={styles.compareCol}>
            <div style={styles.compareLabel}>Last Month</div>
            <div style={styles.compareValue}>{formatPrice(report.lastMonth, country)}</div>
          </div>
        </div>
        <div style={{ ...styles.growthBadge, color: growthPct >= 0 ? "#2E7D32" : "#C0392B" }}>
          {growthPct >= 0 ? "▲" : "▼"} {Math.abs(growthPct)}% vs last month
        </div>

        <div style={styles.statRow}>
          <StatCard label="Tax Collected (global)" value={formatPrice(report.taxCollected, country)} />
          <StatCard label="Total Payouts" value={formatPrice(report.totalPayouts, country)} />
        </div>

        <button className="btn-secondary" style={{ width: "100%", marginTop: 18 }} onClick={() => alert("Export feature: connect a CSV/PDF generator here.")}>
          Export Report
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },

  compareCard: { display: "flex", background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 16, marginBottom: 8 },
  compareCol: { flex: 1 },
  compareLabel: { fontSize: 11, color: "#888" },
  compareValue: { fontSize: 18, fontWeight: 800, color: "#0B3D2E", marginTop: 4 },
  growthBadge: { fontSize: 12.5, fontWeight: 700, marginBottom: 20 },

  statRow: { display: "flex", gap: 10 },
  statCard: { flex: 1, background: "#F0F5F0", borderRadius: 12, padding: 14 },
  statValue: { fontSize: 15, fontWeight: 800, color: "#0B3D2E" },
  statLabel: { fontSize: 10.5, color: "#888", marginTop: 4 }
};
