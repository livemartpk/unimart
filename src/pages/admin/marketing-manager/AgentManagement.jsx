// ============================================
// UniMart - Agent Management (Marketing Manager)
// Approve new agents + set monthly targets.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function AgentManagement({ user }) {
  const [pendingAgents, setPendingAgents] = useState([]);
  const [activeAgents, setActiveAgents] = useState([]);
  const [tab, setTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [targetModalAgent, setTargetModalAgent] = useState(null);
  const [targets, setTargets] = useState({ newStores: "", salesAmount: "", traffic: "" });

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const pendingSnap = await getDocs(query(collection(db, "agents"), where("status", "==", "pending")));
      setPendingAgents(pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const activeSnap = await getDocs(query(collection(db, "agents"), where("status", "==", "active")));
      setActiveAgents(activeSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error("Failed to load agents:", err);
    }
    setLoading(false);
  };

  const handleApprove = async (agentId) => {
    try {
      await updateDoc(doc(db, "agents", agentId), { status: "active" });
      await updateDoc(doc(db, "users", agentId), { status: "active" });

      await addDoc(collection(db, "adminLogs"), {
        adminId: user.uid,
        adminRole: "marketing_manager",
        action: "approved_agent",
        targetId: agentId,
        timestamp: serverTimestamp()
      });

      setPendingAgents((as) => as.filter((a) => a.id !== agentId));
    } catch (err) {
      console.error("Failed to approve agent:", err);
    }
  };

  const openTargetModal = (agent) => {
    setTargetModalAgent(agent);
    setTargets(agent.monthlyTargets || { newStores: "", salesAmount: "", traffic: "" });
  };

  const handleSaveTargets = async () => {
    try {
      await updateDoc(doc(db, "agents", targetModalAgent.id), {
        monthlyTargets: {
          newStores: Number(targets.newStores) || 0,
          salesAmount: Number(targets.salesAmount) || 0,
          traffic: Number(targets.traffic) || 0
        }
      });
      setActiveAgents((as) => as.map((a) => (a.id === targetModalAgent.id ? { ...a, monthlyTargets: targets } : a)));
      setTargetModalAgent(null);
    } catch (err) {
      console.error("Failed to save targets:", err);
    }
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Agent Management</div>
      </div>

      <div style={styles.tabRow}>
        <Tab label={`Pending (${pendingAgents.length})`} active={tab === "pending"} onClick={() => setTab("pending")} />
        <Tab label={`Active (${activeAgents.length})`} active={tab === "active"} onClick={() => setTab("active")} />
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading...</p>
        ) : tab === "pending" ? (
          pendingAgents.length === 0 ? (
            <p style={styles.emptyText}>No pending agent applications.</p>
          ) : (
            pendingAgents.map((a) => (
              <div key={a.id} style={styles.agentCard}>
                <div style={styles.agentName}>{a.fullName || "Agent"}</div>
                <div style={styles.metaRow}>{a.city}</div>
                <button className="btn-primary" style={{ marginTop: 10, width: "100%" }} onClick={() => handleApprove(a.id)}>Approve Agent</button>
              </div>
            ))
          )
        ) : (
          activeAgents.length === 0 ? (
            <p style={styles.emptyText}>No active agents yet.</p>
          ) : (
            activeAgents.map((a) => (
              <div key={a.id} style={styles.agentCard}>
                <div style={styles.agentTop}>
                  <div style={styles.agentName}>{a.fullName || "Agent"}</div>
                  <div style={styles.tierTag}>{(a.tier || "bronze").toUpperCase()}</div>
                </div>
                <div style={styles.metaRow}>
                  Targets: {a.monthlyTargets?.newStores || 0} stores · Rs {a.monthlyTargets?.salesAmount || 0} sales · {a.monthlyTargets?.traffic || 0} traffic
                </div>
                <button className="btn-secondary" style={{ marginTop: 10, width: "100%", fontSize: 12 }} onClick={() => openTargetModal(a)}>Set Targets</button>
              </div>
            ))
          )
        )}
      </div>

      {targetModalAgent && (
        <div style={styles.modalOverlay} onClick={() => setTargetModalAgent(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Set Monthly Targets</h3>
            <p style={{ fontSize: 12.5, color: "#666", marginBottom: 14 }}>{targetModalAgent.fullName}</p>
            <label className="input-label">New Stores Target</label>
            <input type="number" className="input-field" style={{ marginBottom: 12 }} value={targets.newStores} onChange={(e) => setTargets((t) => ({ ...t, newStores: e.target.value }))} />
            <label className="input-label">Sales Target (Rs)</label>
            <input type="number" className="input-field" style={{ marginBottom: 12 }} value={targets.salesAmount} onChange={(e) => setTargets((t) => ({ ...t, salesAmount: e.target.value }))} />
            <label className="input-label">Traffic Target</label>
            <input type="number" className="input-field" style={{ marginBottom: 16 }} value={targets.traffic} onChange={(e) => setTargets((t) => ({ ...t, traffic: e.target.value }))} />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setTargetModalAgent(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleSaveTargets}>Save Targets</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <div style={{ ...styles.tab, ...(active ? styles.tabActive : {}) }} onClick={onClick}>{label}</div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },

  tabRow: { display: "flex", gap: 8, padding: "14px 16px" },
  tab: { flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10, border: "1.5px solid #eee0c0", fontSize: 12.5, fontWeight: 700, color: "#0B3D2E", cursor: "pointer", background: "#fff" },
  tabActive: { background: "#0B3D2E", color: "#fff", borderColor: "#0B3D2E" },

  emptyText: { fontSize: 13, color: "#888", padding: "20px 0" },

  agentCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 14, marginBottom: 10 },
  agentTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  agentName: { fontSize: 13.5, fontWeight: 700, color: "#1a1a1a" },
  tierTag: { fontSize: 10, fontWeight: 700, background: "#FBF1DA", color: "#8a6d1f", padding: "4px 10px", borderRadius: 10 },
  metaRow: { fontSize: 11.5, color: "#888", marginTop: 4 },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 50 },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", margin: "0 auto" },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 8 }
};
