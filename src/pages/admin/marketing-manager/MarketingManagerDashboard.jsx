import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function MarketingManagerDashboard({ onNavigate }) {
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, inactive: 0 });
  const [topAgents, setTopAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "agents"));
      const agents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStats({
        total: agents.length,
        active: agents.filter(a => a.status === "active").length,
        pending: agents.filter(a => a.status === "pending").length,
        inactive: agents.filter(a => a.status === "inactive").length,
      });
      const sorted = [...agents].filter(a => a.status === "active").sort((a, b) => (b.points || 0) - (a.points || 0));
      setTopAgents(sorted.slice(0, 3));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.title}>Marketing Manager</div>
        <div style={s.sub}>Agent Network Overview</div>
      </div>
      <div style={s.body}>
        <div style={s.statsGrid}>
          <StatCard icon="🤝" label="Total Agents" value={stats.total} />
          <StatCard icon="✅" label="Active" value={stats.active} color="#2E7D32" />
          <StatCard icon="⏳" label="Pending" value={stats.pending} color="#8a6d1f" />
          <StatCard icon="💤" label="Inactive" value={stats.inactive} color="#C0392B" />
        </div>

        <SectionTitle>⏳ Pending Actions</SectionTitle>
        <div style={s.pendingGrid}>
          <PendingCard label="Agent Approvals" count={stats.pending} onClick={() => onNavigate("dashboard")} />
          <PendingCard label="Fraud Flags" count={0} onClick={() => onNavigate("fraud-monitor")} />
          <PendingCard label="Low Performers" count={stats.inactive} onClick={() => onNavigate("performance")} />
        </div>

        <SectionTitle>🏆 Top Agents</SectionTitle>
        {topAgents.length === 0 ? (
          <p style={s.emptyText}>No active agents yet.</p>
        ) : (
          topAgents.map((a, i) => (
            <div key={a.id} style={s.agentRow}>
              <div style={s.agentRank}>#{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={s.agentName}>{a.fullName}</div>
                <div style={s.agentMeta}>{(a.tier || "bronze").toUpperCase()} · {a.city}</div>
              </div>
              <div style={s.agentPoints}>{a.points || 0} pts</div>
            </div>
          ))
        )}

        <SectionTitle>⚡ Quick Actions</SectionTitle>
        <div style={s.actionsGrid}>
          <ActionTile icon="🤝" label="Agent Management" onClick={() => onNavigate("dashboard")} />
          <ActionTile icon="📊" label="Performance" onClick={() => onNavigate("performance")} />
          <ActionTile icon="🔍" label="Fraud Monitor" onClick={() => onNavigate("fraud-monitor")} />
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
  header: { background: "#0B3D2E", padding: "20px 16px" },
  title: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700 },
  sub: { color: "#cfe0d4", fontSize: 12, marginTop: 2 },
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
  agentRow: { display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 12, marginBottom: 8 },
  agentRank: { fontSize: 16, fontWeight: 800, color: "#D4AF37", width: 28 },
  agentName: { fontSize: 13, fontWeight: 700, color: "#1a1a1a" },
  agentMeta: { fontSize: 10.5, color: "#888", marginTop: 2 },
  agentPoints: { fontSize: 13, fontWeight: 800, color: "#0B3D2E" },
  actionsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 4 },
  actionTile: { background: "#F0F5F0", borderRadius: 12, padding: "16px 8px", textAlign: "center", cursor: "pointer" },
  actionIcon: { fontSize: 22, marginBottom: 6 },
  actionLabel: { fontSize: 10.5, fontWeight: 700, color: "#0B3D2E" },
  emptyText: { fontSize: 13, color: "#888", marginBottom: 16 }
};
