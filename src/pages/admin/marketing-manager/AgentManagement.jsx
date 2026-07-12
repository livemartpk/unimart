// ============================================
// UniMart - Agent Management (Marketing Manager)
// Pending agent applications with full View
// Details modal before Approve/Reject.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function AgentManagement({ user }) {
  const [agents, setAgents] = useState([]);
  const [tab, setTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadAgents(); }, [tab]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const statusMap = { pending: "pending", active: "active", rejected: "rejected" };
      const q = query(collection(db, "agents"), where("status", "==", statusMap[tab]));
      const snap = await getDocs(q);
      setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleApprove = async (agent) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "agents", agent.id), { status: "active", approvedAt: serverTimestamp(), approvedBy: user.uid });
      await updateDoc(doc(db, "users", agent.id), { status: "active" });
      await addDoc(collection(db, "adminLogs"), { adminId: user.uid, adminRole: "marketing_manager", action: "approved_agent", targetId: agent.id, timestamp: serverTimestamp() });
      await addDoc(collection(db, "notifications"), { userId: agent.id, type: "tag_status", message: "Congratulations! Your agent application has been approved. You can now log in.", read: false, createdAt: serverTimestamp() });
      setSelectedAgent(null);
      loadAgents();
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const handleReject = async (agent) => {
    const reason = window.prompt("Reason for rejection (will be sent to applicant):");
    if (!reason) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "agents", agent.id), { status: "rejected", rejectionReason: reason, rejectedAt: serverTimestamp() });
      await updateDoc(doc(db, "users", agent.id), { status: "rejected" });
      await addDoc(collection(db, "notifications"), { userId: agent.id, type: "tag_status", message: `Your agent application was not approved. Reason: ${reason}`, read: false, createdAt: serverTimestamp() });
      setSelectedAgent(null);
      loadAgents();
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  return (
    <div style={s.page}>

      {/* Tabs */}
      <div style={s.tabRow}>
        {["pending", "active", "rejected"].map(t => (
          <div key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({agents.length > 0 && tab === t ? agents.length : "—"})
          </div>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: "0 16px 100px" }}>
        {loading ? <p style={s.empty}>Loading...</p>
          : agents.length === 0 ? <p style={s.empty}>No {tab} agents.</p>
          : agents.map(agent => (
            <div key={agent.id} style={s.card}>
              <div>
                <div style={s.cardName}>{agent.fullName || "Agent"}</div>
                <div style={s.cardMeta}>{agent.city} · {agent.phone}</div>
              </div>
              <div style={s.viewBtn} onClick={() => setSelectedAgent(agent)}>View Details</div>
            </div>
          ))
        }
      </div>

      {/* Detail Modal */}
      {selectedAgent && (
        <div style={s.overlay} onClick={() => setSelectedAgent(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>Agent Application</div>

            <DetailRow label="Full Name" value={selectedAgent.fullName} />
            <DetailRow label="Email" value={selectedAgent.email} />
            <DetailRow label="Phone" value={selectedAgent.phone} />
            <DetailRow label="City" value={selectedAgent.city} />
            <DetailRow label="National ID (CNIC)" value={selectedAgent.nationalId} />
            <DetailRow label="Payment Account" value={selectedAgent.paymentAccount} />
            <DetailRow label="Experience" value={selectedAgent.experience || "Not provided"} />
            <DetailRow label="Social Handle" value={selectedAgent.socialHandle || "Not provided"} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10.5, color: "#888", marginBottom: 4 }}>CNIC Document</div>
              {selectedAgent.cnicUrl ? (
                <a href={selectedAgent.cnicUrl} target="_blank" rel="noreferrer" style={{ color: "#0B3D2E", fontWeight: 700, fontSize: 13 }}>View CNIC Photo ↗</a>
              ) : (
                <div style={{ fontSize: 12, color: "#aaa", fontStyle: "italic" }}>No CNIC uploaded</div>
              )}
            </div>
            <DetailRow label="Applied On" value={selectedAgent.createdAt?.toDate ? selectedAgent.createdAt.toDate().toLocaleDateString() : "—"} />

            {tab === "pending" && (
              <div style={s.modalActions}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => handleReject(selectedAgent)} disabled={actionLoading}>Reject</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleApprove(selectedAgent)} disabled={actionLoading}>
                  {actionLoading ? "Processing..." : "Approve Agent"}
                </button>
              </div>
            )}

            <div style={s.closeBtn} onClick={() => setSelectedAgent(null)}>Close</div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10.5, color: "#888", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: "#1a1a1a", fontWeight: 500 }}>{value || "—"}</div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  tabRow: { display: "flex", gap: 8, padding: "14px 16px" },
  tab: { flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10, border: "1.5px solid #eee0c0", fontSize: 12, fontWeight: 700, color: "#0B3D2E", cursor: "pointer", background: "#fff" },
  tabActive: { background: "#0B3D2E", color: "#fff", borderColor: "#0B3D2E" },
  empty: { fontSize: 13, color: "#888", padding: "20px 0" },
  card: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 14, marginBottom: 10 },
  cardName: { fontSize: 13.5, fontWeight: 700, color: "#1a1a1a" },
  cardMeta: { fontSize: 11, color: "#888", marginTop: 3 },
  viewBtn: { background: "#0B3D2E", color: "#D4AF37", fontWeight: 700, fontSize: 11.5, padding: "8px 14px", borderRadius: 20, cursor: "pointer" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxHeight: "85vh", overflowY: "auto" },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 16, fontWeight: 700 },
  modalActions: { display: "flex", gap: 10, marginTop: 20, marginBottom: 12 },
  closeBtn: { textAlign: "center", fontSize: 13, color: "#888", cursor: "pointer", padding: "8px 0" }
};
