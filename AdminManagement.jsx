import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAdminCountry } from "../../../context/AdminCountryContext";
import { formatPrice } from "../../../utils/countries";
import "../../../styles/theme.css";

export default function FinanceTeamDashboard({ onNavigate }) {
  const { country } = useAdminCountry();
  const [stats, setStats] = useState({ pendingWithdrawals: 0, totalOrders: 0, taxCollected: 0, websiteEarnings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!country) return;
    load();
  }, [country]);

  const load = async () => {
    setLoading(true);
    try {
      // Orders — filtered directly (orders carry their own country field)
      const oSnap = await getDocs(query(collection(db, "orders"), where("country", "==", country)));

      // Withdrawal requests — look up each requester's country, since the
      // request itself doesn't store one, then keep only matches
      const wSnap = await getDocs(query(collection(db, "withdrawalRequests"), where("status", "==", "pending")));
      const withdrawalCountries = await Promise.all(
        wSnap.docs.map(async (d) => {
          try {
            const uSnap = await getDoc(doc(db, "users", d.data().userId));
            return uSnap.exists() ? uSnap.data().country : null;
          } catch { return null; }
        })
      );
      const pendingWithdrawalsForCountry = withdrawalCountries.filter((c) => c === country).length;

      // Tax/Website wallets are still global totals (not split per country yet)
      const taxSnap = await getDocs(collection(db, "wallets_tax"));
      const webSnap = await getDocs(collection(db, "wallets_website"));
      const taxTotal = taxSnap.docs.reduce((sum, d) => sum + (d.data().totalCollected || 0), 0);
      const webTotal = webSnap.docs.reduce((sum, d) => sum + (d.data().totalEarning || 0), 0);

      setStats({ pendingWithdrawals: pendingWithdrawalsForCountry, totalOrders: oSnap.size, taxCollected: taxTotal, websiteEarnings: webTotal });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (!country) {
    return (
      <div style={s.page}>
        <p style={{ padding: 30, textAlign: "center", color: "#888" }}>🌍 Select a country from the dropdown above to view its data.</p>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.body}>
        {loading ? (
          <p style={{ textAlign: "center", color: "#888", padding: 20 }}>Loading...</p>
        ) : (
          <>
        <div style={s.statsGrid}>
          <StatCard icon="💸" label="Pending Withdrawals" value={stats.pendingWithdrawals} color="#C0392B" />
          <StatCard icon="📦" label="Total Orders" value={stats.totalOrders} />
          <StatCard icon="🏦" label="Tax Collected (global)" value={formatPrice(stats.taxCollected, country)} color="#8a6d1f" />
          <StatCard icon="💰" label="Website Earnings (global)" value={formatPrice(stats.websiteEarnings, country)} color="#2E7D32" />
        </div>

        <SectionTitle>⏳ Pending Actions</SectionTitle>
        <div style={s.pendingGrid}>
          <PendingCard label="Withdrawal Requests" count={stats.pendingWithdrawals} onClick={() => onNavigate("dashboard")} />
          <PendingCard label="Reconciliation" count={0} onClick={() => onNavigate("reconciliation")} />
          <PendingCard label="Reports Due" count={0} onClick={() => onNavigate("reports")} />
        </div>

        <SectionTitle>⚡ Quick Actions</SectionTitle>
        <div style={s.actionsGrid}>
          <ActionTile icon="💸" label="Withdrawals" onClick={() => onNavigate("dashboard")} />
          <ActionTile icon="📈" label="Financial Reports" onClick={() => onNavigate("reports")} />
          <ActionTile icon="⚖️" label="Reconciliation" onClick={() => onNavigate("reconciliation")} />
        </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color = "#0B3D2E" }) {
  return <div style={s.statCard}><div style={s.statIcon}>{icon}</div><div style={{ ...s.statValue, color }}>{String(value)}</div><div style={s.statLabel}>{label}</div></div>;
}
function PendingCard({ label, count, onClick }) {
  return <div style={s.pendingCard} onClick={onClick}><div style={s.pendingCount}>{count}</div><div style={s.pendingLabel}>{label}</div></div>;
}
function ActionTile({ icon, label, onClick }) {
  return <div style={s.actionTile} onClick={onClick}><div style={s.actionIcon}>{icon}</div><div style={s.actionLabel}>{label}</div></div>;
}
function SectionTitle({ children }) {
  return <div style={s.sectionTitle}>{children}</div>;
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { padding: "20px 16px", borderBottom: "1px solid #eee0c0" },
  title: { color: "#0B3D2E", fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700 },
  sub: { color: "#888", fontSize: 12, marginTop: 2 },
  body: { padding: "16px 16px 100px" },
  sectionTitle: { fontSize: 14, fontFamily: "Georgia, serif", color: "#0B3D2E", fontWeight: 700, marginBottom: 10, marginTop: 4 },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 },
  statCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 16, textAlign: "center" },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: 800 },
  statLabel: { fontSize: 11, color: "#888", marginTop: 4 },
  pendingGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 22 },
  pendingCard: { background: "#FBF1DA", border: "1px solid #D4AF37", borderRadius: 12, padding: 14, textAlign: "center", cursor: "pointer" },
  pendingCount: { fontSize: 20, fontWeight: 800, color: "#8a6d1f" },
  pendingLabel: { fontSize: 10, color: "#5a4419", marginTop: 4 },
  actionsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  actionTile: { background: "#F0F5F0", borderRadius: 12, padding: "16px 8px", textAlign: "center", cursor: "pointer" },
  actionIcon: { fontSize: 22, marginBottom: 6 },
  actionLabel: { fontSize: 10.5, fontWeight: 700, color: "#0B3D2E" }
};
