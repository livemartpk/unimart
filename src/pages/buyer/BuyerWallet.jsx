// ============================================
// UniMart - Buyer Wallet
// Logic: Refunds land directly in Net Ledger
// (no gross/pending stage for buyers, per our
// decision). Withdrawal request goes to Finance
// Team -> manual transfer -> "Mark as Paid".
// ============================================

import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, orderBy, getDocs, addDoc, serverTimestamp, updateDoc, increment } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

export default function BuyerWallet({ user, onNavigate }) {
  const [wallet, setWallet] = useState({ totalBalance: 0, availableBalance: 0, pendingWithdrawal: 0 });
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountMethod, setAccountMethod] = useState("easypaisa");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    loadWallet();
  }, [user]);

  const loadWallet = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const walletSnap = await getDoc(doc(db, "wallets_buyer", user.uid));
      if (walletSnap.exists()) {
        setWallet(walletSnap.data());
      }

      const ledgerQuery = query(
        collection(db, "wallets_buyer", user.uid, "ledger"),
        orderBy("createdAt", "desc")
      );
      const ledgerSnap = await getDocs(ledgerQuery);
      setLedger(ledgerSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load wallet:", err);
    }
    setLoading(false);
  };

  const handleWithdrawRequest = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");

    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setFormError("Enter a valid amount.");
      return;
    }
    if (amount > (wallet.availableBalance || 0)) {
      setFormError("This amount is more than your available balance.");
      return;
    }
    if (!accountNumber.trim()) {
      setFormError("Enter your account number.");
      return;
    }

    setSubmitting(true);
    try {
      // Create a ledger entry — status starts as "pending"
      await addDoc(collection(db, "wallets_buyer", user.uid, "ledger"), {
        type: "withdrawal_request",
        amount,
        accountNumber,
        accountMethod,
        status: "pending",
        requestedAt: serverTimestamp(),
        paidAt: null,
        processedByAdminId: null
      });

      // Move amount from available to pending immediately
      // (this should ideally be a Cloud Function / transaction for safety)
      await updateDoc(doc(db, "wallets_buyer", user.uid), {
        availableBalance: increment(-amount),
        pendingWithdrawal: increment(amount)
      });

      setSubmitting(false);
      setSuccessMsg("Withdrawal request sent. Our finance team will process it shortly.");
      setShowWithdrawForm(false);
      setWithdrawAmount("");
      setAccountNumber("");
      await loadWallet();

    } catch (err) {
      console.error("Failed to submit withdrawal:", err);
      setSubmitting(false);
      setFormError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.backBtn} onClick={() => onNavigate && onNavigate("back")}>←</div>
        <div style={styles.headerTitle}>My Wallet</div>
        <div style={{ width: 36 }} />
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
        {/* Balance cards */}
        <div style={styles.balanceCard}>
          <div style={styles.balanceLabel}>Available Balance</div>
          <div style={styles.balanceValue}>Rs {wallet.availableBalance || 0}</div>
          {wallet.pendingWithdrawal > 0 && (
            <div style={styles.pendingNote}>Rs {wallet.pendingWithdrawal} pending withdrawal</div>
          )}
          <button
            className="btn-gold"
            style={{ width: "100%", marginTop: 14 }}
            onClick={() => setShowWithdrawForm((v) => !v)}
            disabled={(wallet.availableBalance || 0) <= 0}
          >
            {showWithdrawForm ? "Cancel" : "Withdraw"}
          </button>
        </div>

        {successMsg && <p style={styles.successText}>{successMsg}</p>}

        {/* Withdrawal form */}
        {showWithdrawForm && (
          <form onSubmit={handleWithdrawRequest} style={styles.withdrawCard}>
            <div style={{ marginBottom: 14 }}>
              <label className="input-label">Amount</label>
              <input
                type="number"
                className="input-field"
                placeholder="Rs"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="input-label">Payment Method</label>
              <select className="input-field" value={accountMethod} onChange={(e) => setAccountMethod(e.target.value)}>
                <option value="easypaisa">Easypaisa</option>
                <option value="jazzcash">JazzCash</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="input-label">Account Number</label>
              <input
                className="input-field"
                placeholder="03XXXXXXXXX or IBAN"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>

            {formError && <p className="error-text">{formError}</p>}

            <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        )}

        {/* Ledger / Transaction history */}
        <h3 style={styles.sectionTitle}>Transaction History</h3>
        {loading ? (
          <p style={styles.emptyText}>Loading...</p>
        ) : ledger.length === 0 ? (
          <p style={styles.emptyText}>No transactions yet.</p>
        ) : (
          ledger.map((entry) => (
            <div key={entry.id} style={styles.ledgerItem}>
              <div>
                <div style={styles.ledgerType}>
                  {entry.type === "withdrawal_request" ? "Withdrawal" : entry.type === "refund" ? "Refund" : entry.type}
                </div>
                <div style={styles.ledgerDate}>
                  {entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleDateString() : entry.requestedAt?.toDate ? entry.requestedAt.toDate().toLocaleDateString() : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={styles.ledgerAmount}>
                  {entry.type === "refund" ? "+" : "-"}Rs {entry.amount}
                </div>
                {entry.status && (
                  <div style={{ ...styles.ledgerStatus, color: entry.status === "paid" ? "#2E7D32" : "#D4AF37" }}>
                    {entry.status === "paid" ? "Paid" : "Pending"}
                  </div>
                )}
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
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "#fff", borderBottom: "1px solid #eee0c0" },
  backBtn: { width: 36, height: 36, borderRadius: "50%", background: "#F0F5F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  headerTitle: { fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, color: "#0B3D2E" },

  balanceCard: { background: "linear-gradient(135deg, #0B3D2E, #155c43)", borderRadius: 18, padding: 22, marginTop: 16, marginBottom: 16 },
  balanceLabel: { color: "#cfe0d4", fontSize: 12, fontWeight: 600 },
  balanceValue: { color: "#fff", fontSize: 30, fontFamily: "Georgia, serif", fontWeight: 700, marginTop: 4 },
  pendingNote: { color: "#D4AF37", fontSize: 11.5, marginTop: 6, fontWeight: 600 },

  successText: { background: "#F0F5F0", color: "#2E7D32", fontSize: 12.5, padding: 12, borderRadius: 10, marginBottom: 14, fontWeight: 600 },

  withdrawCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 16, marginBottom: 16 },

  sectionTitle: { fontSize: 15, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 10, marginTop: 8 },
  emptyText: { fontSize: 13, color: "#888" },

  ledgerItem: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: 14, marginBottom: 8 },
  ledgerType: { fontSize: 13, fontWeight: 700, color: "#1a1a1a" },
  ledgerDate: { fontSize: 11, color: "#999", marginTop: 2 },
  ledgerAmount: { fontSize: 13.5, fontWeight: 800, color: "#0B3D2E" },
  ledgerStatus: { fontSize: 10.5, fontWeight: 700, marginTop: 2, textTransform: "uppercase" }
};
