// ============================================
// UniMart - Wallets Reconciliation (Finance Team)
// This is where money actually moves in two stages,
// since Firestore rules require an admin write for
// wallet balances (sellers can't write their own):
//
// Stage 1 — Order dispatched: commission + tax are
//   locked in, and the net amount is added to the
//   seller's Total Balance (and Pending Balance).
// Stage 2 — Order delivered: that same net amount
//   moves from Pending to Available Balance, which
//   is the only balance a seller can withdraw from.
// ============================================

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc, increment, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function WalletsReconciliation() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stage1Orders, setStage1Orders] = useState([]); // dispatched, not yet credited to Total Balance
  const [stage2Orders, setStage2Orders] = useState([]); // delivered, not yet moved to Available Balance
  const [busyId, setBusyId] = useState(null);
  const [busyAll, setBusyAll] = useState(false);
  const [rates, setRates] = useState({ commissionPercent: 0.5, taxPercent: 10 });

  useEffect(() => {
    loadReconciliation();
    loadPipeline();
  }, []);

  const loadReconciliation = async () => {
    setLoading(true);
    try {
      const collections = ["wallets_buyer", "wallets_seller", "wallets_agent"];
      const results = [];
      for (const colName of collections) {
        const snap = await getDocs(collection(db, colName));
        let total = 0, available = 0, pending = 0;
        snap.docs.forEach((d) => {
          const data = d.data();
          total += data.totalBalance || 0;
          available += data.availableBalance || 0;
          pending += data.pendingBalance || 0;
        });
        const expectedTotal = available + pending;
        results.push({
          name: colName.replace("wallets_", ""),
          total, available, pending,
          matches: Math.abs(total - expectedTotal) < 1
        });
      }
      setSummary(results);
    } catch (err) {
      console.error("Failed to reconcile wallets:", err);
    }
    setLoading(false);
  };

  const loadPipeline = async () => {
    try {
      const policySnap = await getDoc(doc(db, "policies", "current"));
      const currentRates = policySnap.exists()
        ? { commissionPercent: policySnap.data().commissionPercent ?? 0.5, taxPercent: policySnap.data().taxPercent ?? 10 }
        : { commissionPercent: 0.5, taxPercent: 10 };
      setRates(currentRates);

      // Stage 1 candidates: dispatched OR delivered orders that haven't been credited to Total Balance yet
      const dispatchedSnap = await getDocs(query(collection(db, "orders"), where("status", "==", "dispatched")));
      const deliveredSnap = await getDocs(query(collection(db, "orders"), where("status", "==", "delivered")));
      const dispatched = dispatchedSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const delivered = deliveredSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setStage1Orders([...dispatched, ...delivered].filter((o) => !o.totalCredited));
      // Stage 2 candidates: delivered AND already credited to Total, but not yet moved to Available
      setStage2Orders(delivered.filter((o) => o.totalCredited && !o.availableCredited));
    } catch (err) {
      console.error("Failed to load payout pipeline:", err);
    }
  };

  const splitFor = (order) => {
    const gross = order.grandTotal || 0;
    const commission = +(gross * (rates.commissionPercent / 100)).toFixed(2);
    const tax = +(gross * (rates.taxPercent / 100)).toFixed(2);
    const sellerNet = +(gross - commission - tax).toFixed(2);
    return { gross, commission, tax, sellerNet };
  };

  // Stage 1: credit Total Balance + Pending Balance, lock in commission/tax
  const creditTotalBalance = async (order) => {
    setBusyId(order.id);
    try {
      const { gross, commission, tax, sellerNet } = splitFor(order);

      await updateDoc(doc(db, "wallets_seller", order.sellerId), {
        totalBalance: increment(sellerNet),
        pendingBalance: increment(sellerNet)
      });
      await addDoc(collection(db, "wallets_seller", order.sellerId, "ledger_gross"), {
        type: "sale_dispatched",
        orderId: order.id,
        orderGroupId: order.orderGroupId || null,
        grossAmount: gross, commission, tax, amount: sellerNet,
        createdAt: serverTimestamp()
      });

      const websiteRef = doc(db, "wallets_website", "main");
      const websiteSnap = await getDoc(websiteRef);
      if (websiteSnap.exists()) await updateDoc(websiteRef, { totalEarning: increment(commission) });
      else await setDoc(websiteRef, { totalEarning: commission, createdAt: serverTimestamp() });

      const taxRef = doc(db, "wallets_tax", "main");
      const taxSnap = await getDoc(taxRef);
      if (taxSnap.exists()) await updateDoc(taxRef, { totalCollected: increment(tax) });
      else await setDoc(taxRef, { totalCollected: tax, createdAt: serverTimestamp() });

      await updateDoc(doc(db, "orders", order.id), {
        totalCredited: true,
        totalCreditedAt: serverTimestamp(),
        payoutSplit: { gross, commission, tax, sellerNet }
      });

      setStage1Orders((list) => list.filter((o) => o.id !== order.id));
      if (order.status === "delivered") {
        setStage2Orders((list) => [...list, { ...order, totalCredited: true, payoutSplit: { gross, commission, tax, sellerNet } }]);
      }
      loadReconciliation();
    } catch (err) {
      console.error("Failed to credit total balance:", err);
      alert("Failed: " + err.message);
    }
    setBusyId(null);
  };

  // Stage 2: move net amount from Pending to Available Balance
  const releaseAvailable = async (order) => {
    setBusyId(order.id);
    try {
      const sellerNet = order.payoutSplit?.sellerNet ?? splitFor(order).sellerNet;

      await updateDoc(doc(db, "wallets_seller", order.sellerId), {
        pendingBalance: increment(-sellerNet),
        availableBalance: increment(sellerNet)
      });
      await addDoc(collection(db, "wallets_seller", order.sellerId, "ledger_net"), {
        type: "sale_available",
        orderId: order.id,
        orderGroupId: order.orderGroupId || null,
        amount: sellerNet,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "orders", order.id), {
        availableCredited: true,
        availableCreditedAt: serverTimestamp()
      });

      setStage2Orders((list) => list.filter((o) => o.id !== order.id));
      loadReconciliation();
    } catch (err) {
      console.error("Failed to release to available balance:", err);
      alert("Failed: " + err.message);
    }
    setBusyId(null);
  };

  const runAllStage1 = async () => {
    setBusyAll(true);
    for (const o of [...stage1Orders]) await creditTotalBalance(o);
    setBusyAll(false);
  };

  const runAllStage2 = async () => {
    setBusyAll(true);
    for (const o of [...stage2Orders]) await releaseAvailable(o);
    setBusyAll(false);
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Wallets Reconciliation</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {/* STAGE 1 */}
        <div style={styles.sectionHead}>
          <h3 style={styles.sectionTitle}>Dispatched — Credit Total Balance ({stage1Orders.length})</h3>
          {stage1Orders.length > 0 && (
            <button style={styles.releaseAllBtn} onClick={runAllStage1} disabled={busyAll}>
              {busyAll ? "Working..." : "Run All"}
            </button>
          )}
        </div>
        <p style={styles.helperText}>
          Commission ({rates.commissionPercent}%) and Tax ({rates.taxPercent}%) are deducted here; the rest is added to the seller's Total Balance (still pending, not withdrawable yet).
        </p>
        {stage1Orders.length === 0 ? (
          <p style={styles.emptyText}>Nothing waiting — all dispatched orders are credited.</p>
        ) : (
          stage1Orders.map((o) => {
            const { gross, commission, tax, sellerNet } = splitFor(o);
            return (
              <div key={o.id} style={styles.payoutCard}>
                <div style={styles.payoutHead}>
                  <span style={styles.payoutOrderId}>#{o.id.slice(0, 8)} — {o.sellerName || "Seller"}</span>
                  <button style={styles.releaseBtn} onClick={() => creditTotalBalance(o)} disabled={busyId === o.id}>
                    {busyId === o.id ? "..." : "Credit"}
                  </button>
                </div>
                <div style={styles.payoutRow}>Order total: Rs {gross.toLocaleString()}</div>
                <div style={styles.payoutRow}>Commission: Rs {commission.toLocaleString()} · Tax: Rs {tax.toLocaleString()}</div>
                <div style={{ ...styles.payoutRow, fontWeight: 700, color: "#0B3D2E" }}>To Total Balance: Rs {sellerNet.toLocaleString()}</div>
              </div>
            );
          })
        )}

        {/* STAGE 2 */}
        <div style={{ ...styles.sectionHead, marginTop: 26 }}>
          <h3 style={styles.sectionTitle}>Delivered — Move to Available Balance ({stage2Orders.length})</h3>
          {stage2Orders.length > 0 && (
            <button style={styles.releaseAllBtn} onClick={runAllStage2} disabled={busyAll}>
              {busyAll ? "Working..." : "Run All"}
            </button>
          )}
        </div>
        <p style={styles.helperText}>
          Buyer has confirmed delivery — this moves the seller's earnings from Pending into Available Balance, which they can now withdraw.
        </p>
        {stage2Orders.length === 0 ? (
          <p style={styles.emptyText}>Nothing waiting here.</p>
        ) : (
          stage2Orders.map((o) => (
            <div key={o.id} style={styles.payoutCard}>
              <div style={styles.payoutHead}>
                <span style={styles.payoutOrderId}>#{o.id.slice(0, 8)} — {o.sellerName || "Seller"}</span>
                <button style={styles.releaseBtn} onClick={() => releaseAvailable(o)} disabled={busyId === o.id}>
                  {busyId === o.id ? "..." : "Release"}
                </button>
              </div>
              <div style={{ ...styles.payoutRow, fontWeight: 700, color: "#0B3D2E" }}>
                To Available Balance: Rs {(o.payoutSplit?.sellerNet ?? splitFor(o).sellerNet).toLocaleString()}
              </div>
            </div>
          ))
        )}

        <h3 style={{ ...styles.sectionTitle, marginTop: 26 }}>Wallet Balances</h3>
        {loading ? (
          <p style={styles.emptyText}>Checking balances...</p>
        ) : (
          summary.map((s) => (
            <div key={s.name} style={styles.walletCard}>
              <div style={styles.walletHead}>
                <div style={styles.walletName}>{s.name} wallets</div>
                <div style={{ ...styles.matchBadge, ...(s.matches ? styles.matchOk : styles.matchFail) }}>
                  {s.matches ? "✓ Balanced" : "⚠ Mismatch"}
                </div>
              </div>
              <div style={styles.row}>Total: Rs {s.total.toLocaleString()}</div>
              <div style={styles.row}>Available + Pending: Rs {(s.available + s.pending).toLocaleString()}</div>
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
  emptyText: { fontSize: 13, color: "#888", padding: "20px 0" },

  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 14.5, fontFamily: "Georgia, serif", color: "#0B3D2E", margin: 0 },
  helperText: { fontSize: 11.5, color: "#888", margin: "6px 0 14px", lineHeight: 1.5 },
  releaseAllBtn: { background: "#D4AF37", color: "#0B3D2E", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" },

  payoutCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 14, marginBottom: 10 },
  payoutHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  payoutOrderId: { fontSize: 12.5, fontWeight: 700, color: "#0B3D2E" },
  releaseBtn: { background: "#0B3D2E", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" },
  payoutRow: { fontSize: 12, color: "#666", marginTop: 3 },

  walletCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 16, marginBottom: 12 },
  walletHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  walletName: { fontSize: 13.5, fontWeight: 700, color: "#0B3D2E", textTransform: "capitalize" },
  matchBadge: { fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 12 },
  matchOk: { background: "#E3F2E1", color: "#2E7D32" },
  matchFail: { background: "#FCEAEA", color: "#C0392B" },
  row: { fontSize: 12, color: "#666", marginTop: 4 }
};


