// ============================================
// UniMart - Withdrawal Requests (Finance Team)
// Implements the "Mark as Paid" flow exactly as
// decided: manual transfer outside the platform,
// then Finance Team confirms here.
// ============================================

import { useState, useEffect } from "react";
import { collectionGroup, query, where, getDocs, updateDoc, doc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function WithdrawalRequests({ user }) {
  const [requests, setRequests] = useState({ buyer: [], seller: [], agent: [] });
  const [tab, setTab] = useState("seller");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      // collectionGroup lets us query "ledger_net" across all wallets_X/{id}/ledger_net subcollections
      const buyerSnap = await getDocs(query(collectionGroup(db, "ledger_net"), where("type", "==", "withdrawal_request"), where("status", "==", "pending")));
      // NOTE: In production, separate by parent collection path (wallets_buyer / wallets_seller / wallets_agent)
      // since collectionGroup doesn't distinguish wallet type directly — this is simplified for the starter version.
      const all = buyerSnap.docs.map((d) => ({ id: d.id, path: d.ref.path, ...d.data() }));

      setRequests({
        buyer: all.filter((r) => r.path.includes("wallets_buyer")),
        seller: all.filter((r) => r.path.includes("wallets_seller")),
        agent: all.filter((r) => r.path.includes("wallets_agent"))
      });

    } catch (err) {
      console.error("Failed to load withdrawal requests:", err);
    }
    setLoading(false);
  };

  const handleMarkPaid = async (request) => {
    try {
      await updateDoc(doc(db, request.path), { status: "paid", paidAt: serverTimestamp(), processedByAdminId: user.uid });

      await addDoc(collection(db, "adminLogs"), {
        adminId: user.uid,
        adminRole: "finance_team",
        action: "marked_withdrawal_paid",
        targetId: request.id,
        timestamp: serverTimestamp()
      });

      loadRequests();
    } catch (err) {
      console.error("Failed to mark as paid:", err);
    }
  };

  const activeList = requests[tab] || [];

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Withdrawal Requests</div>
      </div>

      <div style={styles.tabRow}>
        <Tab label={`Seller (${requests.seller.length})`} active={tab === "seller"} onClick={() => setTab("seller")} />
        <Tab label={`Agent (${requests.agent.length})`} active={tab === "agent"} onClick={() => setTab("agent")} />
        <Tab label={`Buyer (${requests.buyer.length})`} active={tab === "buyer"} onClick={() => setTab("buyer")} />
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading requests...</p>
        ) : activeList.length === 0 ? (
          <p style={styles.emptyText}>No pending {tab} withdrawal requests.</p>
        ) : (
          activeList.map((r) => (
            <div key={r.id} style={styles.requestCard}>
              <div style={styles.requestAmount}>Rs {r.amount?.toLocaleString()}</div>
              <div style={styles.requestMeta}>Account: {r.accountNumber}</div>
              <div style={styles.requestMeta}>Requested: {r.requestedAt?.toDate ? r.requestedAt.toDate().toLocaleString() : "—"}</div>
              <button className="btn-primary" style={{ marginTop: 10, width: "100%" }} onClick={() => handleMarkPaid(r)}>
                Mark as Paid
              </button>
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
  tab: { flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10, border: "1.5px solid #eee0c0", fontSize: 12, fontWeight: 700, color: "#0B3D2E", cursor: "pointer", background: "#fff" },
  tabActive: { background: "#0B3D2E", color: "#fff", borderColor: "#0B3D2E" },

  emptyText: { fontSize: 13, color: "#888", padding: "20px 0" },

  requestCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 16, marginBottom: 12 },
  requestAmount: { fontSize: 18, fontWeight: 800, color: "#0B3D2E" },
  requestMeta: { fontSize: 12, color: "#666", marginTop: 4 }
};
