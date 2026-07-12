// ============================================
// UniMart - Activity Logs (Super Admin)
// Full searchable log of every admin action.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

const ROLE_FILTERS = ["all", "super_admin", "seller_manager", "marketing_manager", "support_team", "finance_team", "content_team"];

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "adminLogs"), orderBy("timestamp", "desc"), limit(100));
      const snap = await getDocs(q);
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    }
    setLoading(false);
  };

  const filteredLogs = logs.filter((l) => {
    const matchesRole = filter === "all" || l.adminRole === filter;
    const matchesSearch = !search || l.action?.toLowerCase().includes(search.toLowerCase()) || l.targetId?.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="page-shell" style={styles.page}>

      <div className="container" style={{ paddingTop: 16 }}>
        <input
          className="input-field"
          placeholder="Search by action or target ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        <div style={styles.filterRow}>
          {ROLE_FILTERS.map((r) => (
            <div key={r} style={{ ...styles.pill, ...(filter === r ? styles.pillActive : {}) }} onClick={() => setFilter(r)}>
              {r.replace("_", " ")}
            </div>
          ))}
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading logs...</p>
        ) : filteredLogs.length === 0 ? (
          <p style={styles.emptyText}>No matching logs.</p>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} style={styles.logRow}>
              <div style={styles.logAction}>{log.action?.replace(/_/g, " ")}</div>
              <div style={styles.logMeta}>
                {log.adminRole?.replace("_", " ")} · Target: {log.targetId?.slice(0, 12)} · {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "—"}
              </div>
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

  filterRow: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 14 },
  pill: { padding: "6px 12px", borderRadius: 16, border: "1.5px solid #eee0c0", fontSize: 10.5, fontWeight: 600, color: "#0B3D2E", whiteSpace: "nowrap", cursor: "pointer", textTransform: "capitalize" },
  pillActive: { background: "#0B3D2E", color: "#fff", borderColor: "#0B3D2E" },

  emptyText: { fontSize: 13, color: "#888", padding: "20px 0" },
  logRow: { background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 12, marginBottom: 8 },
  logAction: { fontSize: 12.5, fontWeight: 700, color: "#1a1a1a", textTransform: "capitalize" },
  logMeta: { fontSize: 10.5, color: "#888", marginTop: 3, textTransform: "capitalize" }
};
