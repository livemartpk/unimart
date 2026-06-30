// ============================================
// UniMart - Wallet & Ledger (Seller)
// Implements Gross Ledger (pending, from Dispatch)
// -> Net Ledger (available, after delivery confirm
// or auto-release) as decided in our planning.
// ============================================

import { useState, useEffect } from "react";
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

export default function SellerWallet({ user, onNavigate }) {
  const [wallet, setWallet] = useState(null);
  const [grossLedger, setGrossLedger] = useState([]);
  const [netLedger, setNetLedger] = useState([]);
  const [activeTab, setActiveTab] = useState("net");
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    setLoading(true);
    try {
      const walletSnap = await getDoc(doc(db, "wallets_seller", user.uid));
      if (walletSnap.exists()) setWallet(walletSnap.data());

      const grossSnap = await getDocs(query(collection(db, "wallets_seller", user.uid, "ledger_gross"), orderBy("createdAt", "desc")));
      setGrossLedger(grossSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const netSnap = await getDocs(query(collection(db, "wallets_seller", user.uid, "ledger_net"), orderBy("createdAt", "desc")));
      setNetLedger(netSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error("Failed to load wallet:", err);
    }
    setLoading(false);
  };

  const handleWithdrawRequest = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) { alert("Enter a valid amount."); return; }
    if (amount > (wallet?.availableBalance || 0)) { alert("Amount exceeds your available balance."); return; }
    if (!accountNumber.trim()) { alert("Enter your payment account number."); return; }

    setSubmitting(true);
    try {
      // Create withdrawal request — goes to Finance Team queue
      await addDoc(collection(db, "wallets_seller", user.uid, "ledger_net"), {
        type: "withdrawal_request",
        amount,
        accountNumber,
        status: "pending", // Finance Team will mark "paid" once transferred
        requestedAt: serverTimestamp()
      });

      // NOTE: availableBalance should be decremented here via a transaction
      // in production code, to prevent double-withdrawal of the same funds.

      setSubmitting(false);
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setAccountNumber("");
      loadWallet();

    } catch (err) {
      console.error("Withdrawal request failed:", err);
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-shell" style={styles.page}><p style={{ padding: 20 }}>Loading wallet...</p></div>;

  const activeList = activeTab === "net" ? netLedger : grossLedger;

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Wallet & Ledger</div>
      </div>

      <div className="container" style={{ paddingTop: 16 }}>
        {/* Balance cards */}
        <div style={styles.balanceRow}>
          <div style={styles.balanceCard}>
            <div style={styles.balanceLabel}>Total Balance</div>
            <div style={styles.balanceValue}>Rs {(wallet?.totalBalance || 0).toLocaleString()}</div>
          </div>
          <div style={{ ...styles.balanceCard, background: "#0B3D2E" }}>
            <div style={{ ...styles.balanceLabel, color: "#cfe0d4" }}>Available Balance</div>
            <div style={{ ...styles.balanceValue, color: "#D4AF37" }}>Rs {(wallet?.availableBalance || 0).toLocaleString()}</div>
          </div>
        </div>

        <button className="btn-gold" style={{ width: "100%", marginBottom: 20 }} onClick={() => setShowWithdrawModal(true)}>
          Request Withdrawal
        </button>

        <div style={styles.infoNote}>
          ℹ️ Earnings appear in <b>Gross Ledger</b> once an order is dispatched. They move to <b>Net Ledger</b> (withdrawable) after the buyer confirms delivery, or automatically after the policy window.
        </div>

        {/* Ledger tabs */}
        <div style={styles.tabRow}>
          <div style={{ ...styles.tab, ...(activeTab === "net" ? styles.tabActive : {}) }} onClick={() => setActiveTab("net")}>
            Net Ledger ({netLedger.length})
          </div>
          <div style={{ ...styles.tab, ...(activeTab === "gross" ? styles.tabActive : {}) }} onClick={() => setActiveTab("gross")}>
            Gross Ledger ({grossLedger.length})
          </div>
        </div>

        {activeList.length === 0 ? (
          <p style={styles.emptyText}>No entries yet.</p>
        ) : (
          activeList.map((entry) => (
            <div key={entry.id} style={styles.ledgerRow}>
              <div>
                <div style={styles.ledgerType}>
                  {entry.type === "withdrawal_request" ? "Withdrawal Request" : entry.type === "sale" ? `Order #${entry.orderId?.slice(0, 8)}` : entry.type}
                </div>
                <div style={styles.ledgerDate}>{entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleDateString() : "—"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={styles.ledgerAmount}>Rs {entry.amount}</div>
                {entry.status && (
                  <div style={{ ...styles.ledgerStatus, color: entry.status === "paid" ? "#2E7D32" : "#D4AF37" }}>
                    {entry.status}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div style={styles.modalOverlay} onClick={() => setShowWithdrawModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Request Withdrawal</h3>
            <label className="input-label">Amount (Rs)</label>
            <input type="number" className="input-field" style={{ marginBottom: 12 }} value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder={`Max: ${wallet?.availableBalance || 0}`} />
            <label className="input-label">Payment Account Number</label>
            <input className="input-field" style={{ marginBottom: 16 }} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Bank / Easypaisa / JazzCash account" />
            <p style={styles.modalNote}>Your request will be reviewed by our Finance Team. You'll be notified once payment is processed.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowWithdrawModal(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleWithdrawRequest} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto", paddingBottom: 30 },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },

  balanceRow: { display: "flex", gap: 10, marginBottom: 16 },
  balanceCard: { flex: 1, background: "#F0F5F0", borderRadius: 14, padding: 16 },
  balanceLabel: { fontSize: 11, color: "#0B3D2E", fontWeight: 600 },
  balanceValue: { fontSize: 18, fontWeight: 800, color: "#0B3D2E", marginTop: 6 },

  infoNote: { fontSize: 11.5, color: "#5a4419", background: "#FBF1DA", border: "1px solid #D4AF37", borderRadius: 10, padding: 12, marginBottom: 18, lineHeight: 1.5 },

  tabRow: { display: "flex", gap: 8, marginBottom: 14 },
  tab: { flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10, border: "1.5px solid #eee0c0", fontSize: 12.5, fontWeight: 700, color: "#0B3D2E", cursor: "pointer" },
  tabActive: { background: "#0B3D2E", color: "#fff", borderColor: "#0B3D2E" },

  emptyText: { fontSize: 13, color: "#888", padding: "20px 0" },

  ledgerRow: { display: "flex", justifyContent: "space-between", background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 12, marginBottom: 8 },
  ledgerType: { fontSize: 13, fontWeight: 700, color: "#1a1a1a" },
  ledgerDate: { fontSize: 11, color: "#999", marginTop: 2 },
  ledgerAmount: { fontSize: 13.5, fontWeight: 800, color: "#0B3D2E" },
  ledgerStatus: { fontSize: 10.5, fontWeight: 700, marginTop: 2, textTransform: "uppercase" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 50 },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", margin: "0 auto" },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 16 },
  modalNote: { fontSize: 11, color: "#888", lineHeight: 1.5 }
};
