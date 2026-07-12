// ============================================
// UniMart - Super Admin Dashboard
// ============================================

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAdminCountry } from "../../../context/AdminCountryContext";
import "../../../styles/theme.css";

export default function SuperAdminDashboard({ user, onNavigate }) {
  const { country } = useAdminCountry();
  const [stats, setStats] = useState({ buyers: 0, sellers: 0, agents: 0, orders: 0 });
  const [pendingCounts, setPendingCounts] = useState({ sellers: 0, agents: 0, withdrawals: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!country) return;
    loadDashboard();
  }, [country]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(query(collection(db, "users"), where("country", "==", country)));
      const users = usersSnap.docs.map((d) => d.data());
      setStats({
        buyers: users.filter((u) => u.role === "buyer").length,
        sellers: users.filter((u) => u.role === "seller").length,
        agents: users.filter((u) => u.role === "agent").length,
        orders: 0
      });

      const ordersSnap = await getDocs(query(collection(db, "orders"), where("country", "==", country)));
      setStats((s) => ({ ...s, orders: ordersSnap.size }));

      const pendingSellersSnap = await getDocs(query(collection(db, "sellers"), where("storeStatus", "==", "pending"), where("country", "==", country)));
      const pendingAgentsSnap = await getDocs(query(collection(db, "agents"), where("status", "==", "pending"), where("country", "==", country)));
      setPendingCounts({
        sellers: pendingSellersSnap.size,
        agents: pendingAgentsSnap.size,
        withdrawals: 0 // would aggregate across wallets in production
      });

      // Admin activity logs stay global (cross-cutting audit trail, not tied to one country)
      const logsSnap = await getDocs(query(collection(db, "adminLogs"), orderBy("timestamp", "desc"), limit(10)));
      setRecentLogs(logsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error("Failed to load Super Admin dashboard:", err);
    }
    setLoading(false);
  };

  if (!country) {
    return (
      <div className="page-shell" style={styles.page}>
        <p style={{ padding: 30, textAlign: "center", color: "#888" }}>🌍 Select a country from the dropdown above to view its data.</p>
      </div>
    );
  }

  return (
    <div className="page-shell" style={styles.page}>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        <div style={styles.statsGrid}>
          <StatCard label="Total Buyers" value={stats.buyers} />
          <StatCard label="Total Sellers" value={stats.sellers} />
          <StatCard label="Total Agents" value={stats.agents} />
          <StatCard label="Total Orders" value={stats.orders} />
        </div>

        <h3 style={styles.sectionTitle}>Pending Approvals</h3>
        <div style={styles.pendingGrid}>
          <PendingCard label="Sellers" count={pendingCounts.sellers} onClick={() => onNavigate && onNavigate("sellers")} />
          <PendingCard label="Agents" count={pendingCounts.agents} onClick={() => onNavigate && onNavigate("agents")} />
          <PendingCard label="Withdrawals" count={pendingCounts.withdrawals} onClick={() => onNavigate && onNavigate("wallets")} />
        </div>

        <h3 style={styles.sectionTitle}>Quick Actions</h3>
        <div style={styles.actionsGrid}>
          <ActionTile icon="⚙️" label="Policy Engine" onClick={() => onNavigate && onNavigate("policy-engine")} />
          <ActionTile icon="👥" label="Admin Management" onClick={() => onNavigate && onNavigate("admin-management")} />
          <ActionTile icon="💰" label="Wallets Overview" onClick={() => onNavigate && onNavigate("wallets")} />
          <ActionTile icon="📋" label="Activity Logs" onClick={() => onNavigate && onNavigate("activity-logs")} />
          <ActionTile icon="🏷️" label="Categories" onClick={() => onNavigate && onNavigate("categories")} />
          <ActionTile icon="📢" label="Announcements" onClick={() => onNavigate && onNavigate("announcements")} />
        </div>

        <h3 style={styles.sectionTitle}>Recent Admin Activity</h3>
        {recentLogs.length === 0 ? (
          <p style={styles.emptyText}>No activity logged yet.</p>
        ) : (
          recentLogs.map((log) => (
            <div key={log.id} style={styles.logRow}>
              <div style={styles.logAction}>{log.action}</div>
              <div style={styles.logMeta}>{log.adminRole} · {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "—"}</div>
            </div>
          ))
        )}
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

function PendingCard({ label, count, onClick }) {
  return (
    <div style={styles.pendingCard} onClick={onClick}>
      <div style={styles.pendingCount}>{count}</div>
      <div style={styles.pendingLabel}>{label}</div>
    </div>
  );
}

function ActionTile({ icon, label, onClick }) {
  return (
    <div style={styles.actionTile} onClick={onClick}>
      <div style={styles.actionIcon}>{icon}</div>
      <div style={styles.actionLabel}>{label}</div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { padding: "20px 16px", borderBottom: "1px solid #eee0c0" },
  headerTitle: { color: "#0B3D2E", fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700 },
  headerSub: { color: "#888", fontSize: 12, marginTop: 2 },

  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 },
  statCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 16 },
  statValue: { fontSize: 22, fontWeight: 800, color: "#0B3D2E" },
  statLabel: { fontSize: 11.5, color: "#888", marginTop: 4 },

  sectionTitle: { fontSize: 15, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 12, marginTop: 8 },

  pendingGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 22 },
  pendingCard: { background: "#FBF1DA", border: "1px solid #D4AF37", borderRadius: 12, padding: 14, textAlign: "center", cursor: "pointer" },
  pendingCount: { fontSize: 20, fontWeight: 800, color: "#8a6d1f" },
  pendingLabel: { fontSize: 10.5, color: "#5a4419", marginTop: 4 },

  actionsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 22 },
  actionTile: { background: "#F0F5F0", borderRadius: 12, padding: "16px 8px", textAlign: "center", cursor: "pointer" },
  actionIcon: { fontSize: 22, marginBottom: 6 },
  actionLabel: { fontSize: 10.5, fontWeight: 700, color: "#0B3D2E" },

  emptyText: { fontSize: 13, color: "#888" },
  logRow: { background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 12, marginBottom: 8 },
  logAction: { fontSize: 12.5, fontWeight: 700, color: "#1a1a1a", textTransform: "capitalize" },
  logMeta: { fontSize: 10.5, color: "#888", marginTop: 3 }
};
