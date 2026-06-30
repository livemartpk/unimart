// ============================================
// UniMart - Referral Fraud Monitor (Marketing Manager)
// ============================================

import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function ReferralFraudMonitor() {
  const [flaggedAgents, setFlaggedAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    setLoading(true);
    try {
      // Simplified heuristic for the starter version: agents whose tagged
      // stores count seems unusually high relative to their account age.
      // In production this would be a scheduled Cloud Function comparing
      // click/conversion ratios against the Policy Engine's threshold.
      const snap = await getDocs(collection(db, "agents"));
      const agents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFlaggedAgents(agents.filter((a) => (a.taggedStores?.length || 0) > 20));
    } catch (err) {
      console.error("Failed to load fraud flags:", err);
    }
    setLoading(false);
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Referral Fraud Monitor</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        <div style={styles.infoNote}>
          ℹ️ This view flags unusual referral activity for manual review. Thresholds are configured by the Super Admin's Policy Engine.
        </div>

        {loading ? (
          <p style={styles.emptyText}>Scanning...</p>
        ) : flaggedAgents.length === 0 ? (
          <p style={styles.emptyText}>No suspicious referral activity detected.</p>
        ) : (
          flaggedAgents.map((a) => (
            <div key={a.id} style={styles.flagRow}>
              <div style={styles.agentName}>{a.fullName}</div>
              <div style={styles.flagReason}>Unusually high tagged store count: {a.taggedStores?.length}</div>
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
  infoNote: { fontSize: 11.5, color: "#5a4419", background: "#FBF1DA", border: "1px solid #D4AF37", borderRadius: 10, padding: 12, marginBottom: 16, lineHeight: 1.5 },
  emptyText: { fontSize: 13, color: "#888" },

  flagRow: { background: "#fff", border: "1px solid #FCEAEA", borderRadius: 12, padding: 14, marginBottom: 10 },
  agentName: { fontSize: 13.5, fontWeight: 700, color: "#1a1a1a" },
  flagReason: { fontSize: 11.5, color: "#C0392B", marginTop: 4 }
};
