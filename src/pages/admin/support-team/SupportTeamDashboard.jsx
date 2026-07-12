import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAdminCountry } from "../../../context/AdminCountryContext";
import "../../../styles/theme.css";

export default function SupportTeamDashboard({ onNavigate }) {
  const { country } = useAdminCountry();
  const [stats, setStats] = useState({ openDisputes: 0, openComplaints: 0, activeReturns: 0, resolvedToday: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!country) return;
    load();
  }, [country]);

  const load = async () => {
    setLoading(true);
    try {
      const disputesSnap = await getDocs(query(collection(db, "disputes"), where("status", "==", "open"), where("country", "==", country)));
      const complaintsSnap = await getDocs(query(collection(db, "complaints"), where("status", "==", "open"), where("country", "==", country)));
      const returnsSnap = await getDocs(query(collection(db, "disputes"), where("status", "==", "resolved_buyer"), where("country", "==", country)));
      setStats({
        openDisputes: disputesSnap.size,
        openComplaints: complaintsSnap.size,
        activeReturns: returnsSnap.size,
        resolvedToday: 0
      });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (!country) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <div style={s.title}>Support Team</div>
          <div style={s.sub}>Customer Support Overview</div>
        </div>
        <p style={{ padding: 30, textAlign: "center", color: "#888" }}>🌍 Select a country from the dropdown above to view its data.</p>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.title}>Support Team</div>
        <div style={s.sub}>Customer Support Overview — {country}</div>
      </div>
      <div style={s.body}>
        <div style={s.statsGrid}>
          <StatCard icon="⚔️" label="Open Disputes" value={stats.openDisputes} color="#C0392B" />
          <StatCard icon="💬" label="Open Complaints" value={stats.openComplaints} color="#8a6d1f" />
          <StatCard icon="↩️" label="Active Returns" value={stats.activeReturns} color="#0B3D2E" />
          <StatCard icon="✅" label="Resolved Today" value={stats.resolvedToday} color="#2E7D32" />
        </div>

        <SectionTitle>⏳ Needs Attention</SectionTitle>
        <div style={s.pendingGrid}>
          <PendingCard label="Open Disputes" count={stats.openDisputes} onClick={() => onNavigate("dashboard")} />
          <PendingCard label="Complaints" count={stats.openComplaints} onClick={() => onNavigate("complaints")} />
          <PendingCard label="Returns" count={stats.activeReturns} onClick={() => onNavigate("returns")} />
        </div>

        <SectionTitle>⚡ Quick Actions</SectionTitle>
        <div style={s.actionsGrid}>
          <ActionTile icon="⚔️" label="Disputes" onClick={() => onNavigate("dashboard")} />
          <ActionTile icon="💬" label="Complaints" onClick={() => onNavigate("complaints")} />
          <ActionTile icon="↩️" label="Returns & Refunds" onClick={() => onNavigate("returns")} />
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
