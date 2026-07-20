// ============================================
// UniMart - Complaints (Support Team)
// General complaints, separate from formal order
// disputes (e.g. app issues, general queries).
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function Complaints({ user }) {
  const [complaints, setComplaints] = useState([]);
  const [tab, setTab] = useState("open");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComplaints();
  }, [tab]);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "complaints"), where("status", "==", tab));
      const snap = await getDocs(q);
      setComplaints(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load complaints:", err);
    }
    setLoading(false);
  };

  const handleResolve = async (complaintId) => {
    await updateDoc(doc(db, "complaints", complaintId), { status: "resolved", resolvedAt: serverTimestamp(), resolvedBy: user.uid });
    setComplaints((cs) => cs.filter((c) => c.id !== complaintId));
  };

  return (
    <div className="page-shell" style={styles.page}>

      <div style={styles.tabRow}>
        <Tab label="Open" active={tab === "open"} onClick={() => setTab("open")} />
        <Tab label="Resolved" active={tab === "resolved"} onClick={() => setTab("resolved")} />
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading...</p>
        ) : complaints.length === 0 ? (
          <p style={styles.emptyText}>No {tab} complaints.</p>
        ) : (
          complaints.map((c) => (
            <div key={c.id} style={styles.complaintCard}>
              <div style={styles.complaintFrom}>{c.fromRole === "buyer" ? "👤 Buyer" : "🏪 Seller"} · {c.fromName}</div>
              <div style={styles.complaintText}>{c.message}</div>
              {tab === "open" && (
                <button className="btn-primary" style={{ marginTop: 10, fontSize: 11.5, padding: "8px 14px" }} onClick={() => handleResolve(c.id)}>
                  Mark Resolved
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return <div style={{ ...styles.tab, ...(active ? styles.tabActive : {}) }} onClick={onClick}>{label}</div>;
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },

  tabRow: { display: "flex", gap: 8, padding: "14px 16px" },
  tab: { flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10, border: "1.5px solid #eee0c0", fontSize: 12.5, fontWeight: 700, color: "#0B3D2E", cursor: "pointer", background: "#fff" },
  tabActive: { background: "#0B3D2E", color: "#fff", borderColor: "#0B3D2E" },

  emptyText: { fontSize: 13, color: "#888", padding: "20px 0" },
  complaintCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 14, marginBottom: 10 },
  complaintFrom: { fontSize: 11.5, fontWeight: 700, color: "#0B3D2E", marginBottom: 6 },
  complaintText: { fontSize: 12.5, color: "#444", lineHeight: 1.5 }
};
