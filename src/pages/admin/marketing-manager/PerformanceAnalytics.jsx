// ============================================
// UniMart - Performance Analytics (Marketing Manager)
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function PerformanceAnalytics() {
  const [topAgents, setTopAgents] = useState([]);
  const [bottomAgents, setBottomAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const activeSnap = await getDocs(query(collection(db, "agents"), where("status", "==", "active")));
      const agents = activeSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const sorted = [...agents].sort((a, b) => (b.points || 0) - (a.points || 0));
      setTopAgents(sorted.slice(0, 5));
      setBottomAgents(sorted.slice(-5).reverse());

    } catch (err) {
      console.error("Failed to load analytics:", err);
    }
    setLoading(false);
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Performance Analytics</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading analytics...</p>
        ) : (
          <>
            <h3 style={styles.sectionTitle}>Top Performing Agents</h3>
            {topAgents.length === 0 ? <p style={styles.emptyText}>No data yet.</p> : topAgents.map((a, i) => (
              <div key={a.id} style={styles.agentRow}>
                <div style={styles.rank}>#{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={styles.agentName}>{a.fullName}</div>
                  <div style={styles.agentMeta}>{(a.tier || "bronze").toUpperCase()}</div>
                </div>
                <div style={styles.points}>{a.points || 0} pts</div>
              </div>
            ))}

            <h3 style={{ ...styles.sectionTitle, marginTop: 24 }}>Needs Attention</h3>
            {bottomAgents.length === 0 ? <p style={styles.emptyText}>No data yet.</p> : bottomAgents.map((a) => (
              <div key={a.id} style={styles.agentRow}>
                <div style={{ flex: 1 }}>
                  <div style={styles.agentName}>{a.fullName}</div>
                  <div style={styles.agentMeta}>{a.city}</div>
                </div>
                <div style={{ ...styles.points, color: "#C0392B" }}>{a.points || 0} pts</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  sectionTitle: { fontSize: 15, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 10 },
  emptyText: { fontSize: 13, color: "#888" },

  agentRow: { display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 12, marginBottom: 8 },
  rank: { fontSize: 14, fontWeight: 800, color: "#D4AF37", width: 28 },
  agentName: { fontSize: 13, fontWeight: 700, color: "#1a1a1a" },
  agentMeta: { fontSize: 10.5, color: "#888", marginTop: 2 },
  points: { fontSize: 13, fontWeight: 800, color: "#0B3D2E" }
};
