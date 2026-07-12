import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAdminCountry } from "../../../context/AdminCountryContext";
import "../../../styles/theme.css";

export default function SellerManagerDashboard({ onNavigate }) {
  const { country } = useAdminCountry();
  const [stats, setStats] = useState({ total: 0, active: 0, vacation: 0, suspended: 0 });
  const [pending, setPending] = useState({ registrations: 0, productReviews: 0, flagged: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!country) return;
    load();
  }, [country]);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "sellers"), where("country", "==", country)));
      const sellers = snap.docs.map(d => d.data());
      setStats({
        total: sellers.length,
        active: sellers.filter(s => s.storeStatus === "approved").length,
        vacation: sellers.filter(s => s.storeStatus === "vacation").length,
        suspended: sellers.filter(s => s.storeStatus === "suspended").length,
      });
      setPending(p => ({ ...p, registrations: sellers.filter(s => s.status === "pending" || !s.status).length }));
      const prSnap = await getDocs(query(collection(db, "products"), where("status", "==", "pending_review"), where("country", "==", country)));
      const flSnap = await getDocs(query(collection(db, "sellers"), where("flagged", "==", true), where("country", "==", country)));
      setPending(p => ({ ...p, productReviews: prSnap.size, flagged: flSnap.size }));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (!country) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <div style={s.title}>Seller Manager</div>
          <div style={s.sub}>Store Management Overview</div>
        </div>
        <p style={{ padding: 30, textAlign: "center", color: "#888" }}>🌍 Select a country from the dropdown above to view its data.</p>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.title}>Seller Manager</div>
        <div style={s.sub}>Store Management Overview — {country}</div>
      </div>
      <div style={s.body}>
        <div style={s.statsGrid}>
          <StatCard icon="🏪" label="Total Sellers" value={stats.total} />
          <StatCard icon="✅" label="Active Stores" value={stats.active} color="#2E7D32" />
          <StatCard icon="🌴" label="On Vacation" value={stats.vacation} color="#8a6d1f" />
          <StatCard icon="🚫" label="Suspended" value={stats.suspended} color="#C0392B" />
        </div>

        <SectionTitle>⏳ Pending Actions</SectionTitle>
        <div style={s.pendingGrid}>
          <PendingCard label="New Registrations" count={pending.registrations} onClick={() => onNavigate("dashboard")} />
          <PendingCard label="Product Reviews" count={pending.productReviews} onClick={() => onNavigate("product-review")} />
          <PendingCard label="Flagged Sellers" count={pending.flagged} onClick={() => onNavigate("flagged-sellers")} />
        </div>

        <SectionTitle>⚡ Quick Actions</SectionTitle>
        <div style={s.actionsGrid}>
          <ActionTile icon="📋" label="New Registrations" onClick={() => onNavigate("dashboard")} />
          <ActionTile icon="🏪" label="All Sellers" onClick={() => onNavigate("all-sellers")} />
          <ActionTile icon="📦" label="Product Reviews" onClick={() => onNavigate("product-review")} />
          <ActionTile icon="🌴" label="Vacation Requests" onClick={() => onNavigate("vacation-requests")} />
          <ActionTile icon="⚠️" label="Flagged Sellers" onClick={() => onNavigate("flagged-sellers")} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color = "#0B3D2E" }) {
  return <div style={s.statCard}><div style={s.statIcon}>{icon}</div><div style={{ ...s.statValue, color }}>{value}</div><div style={s.statLabel}>{label}</div></div>;
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
  statValue: { fontSize: 22, fontWeight: 800 },
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
