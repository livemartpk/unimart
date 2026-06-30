// ============================================
// UniMart - Leaderboard (Agent)
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

export default function Leaderboard({ user, onNavigate }) {
  const [topAgents, setTopAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "agents"),
        where("status", "==", "active"),
        orderBy("points", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      setTopAgents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    }
    setLoading(false);
  };

  const medalFor = (rank) => (rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : null);

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>This Month's Leaderboard</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading leaderboard...</p>
        ) : topAgents.length === 0 ? (
          <p style={styles.emptyText}>No ranked agents yet this month.</p>
        ) : (
          topAgents.map((a, idx) => {
            const isMe = a.id === user.uid;
            return (
              <div key={a.id} style={{ ...styles.row, ...(isMe ? styles.rowMe : {}) }}>
                <div style={styles.rankCol}>
                  {medalFor(idx) || `#${idx + 1}`}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={styles.agentName}>{a.fullName || "Agent"} {isMe && "(You)"}</div>
                  <div style={styles.agentTier}>{(a.tier || "bronze").toUpperCase()}</div>
                </div>
                <div style={styles.points}>{a.points || 0} pts</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700 },
  emptyText: { fontSize: 13, color: "#888", padding: "20px 0" },

  row: { display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 12, marginBottom: 8 },
  rowMe: { borderColor: "#0B3D2E", background: "#F0F5F0" },
  rankCol: { fontSize: 16, fontWeight: 800, color: "#0B3D2E", width: 32, textAlign: "center" },
  agentName: { fontSize: 13, fontWeight: 700, color: "#1a1a1a" },
  agentTier: { fontSize: 10, color: "#888", marginTop: 2 },
  points: { fontSize: 13.5, fontWeight: 800, color: "#D4AF37" }
};
