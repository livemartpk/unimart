// ============================================
// UniMart - Wallets Reconciliation (Finance Team)
// This is where money actually moves in two stages,
// since Firestore rules require an admin write for
// wallet balances (sellers can't write their own):
//
// Stage 1 — Order dispatched: commission is deducted
//   from the order total; the rest goes to the
//   seller's Total Balance (+ Pending Balance).
//   Commission itself then splits into: Tax, and
//   remaining "web earning" — which further splits
//   between Website and Agent (if the seller was
//   tagged by an agent), per Policy Engine rates.
//
// Stage 2 — Order delivered + auto-release window
//   (Policy Engine "autoReleaseDays") has passed:
//   that same seller amount moves from Pending to
//   Available Balance, which is withdrawable.
//   This isn't a background job (no server-side code
//   is deployed for this project) — Finance Team just
//   won't see an order here, and can't release it,
//   until its window has actually passed.
// ============================================

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc, increment, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function WalletsReconciliation() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stage1Orders, setStage1Orders] = useState([]); // dispatched/delivered, not yet credited to Total Balance
  const [stage2Ready, setStage2Ready] = useState([]);   // delivered + auto-release window passed
  const [stage2Waiting, setStage2Waiting] = useState([]); // delivered but still within the auto-release window
  const [busyId, setBusyId] = useState(null);
  const [busyAll, setBusyAll] = useState(false);
  const [rates, setRates] = useState({ commissionPercent: 0.5, taxPercent: 10, agentSharePercent: 30, websiteSharePercent: 70, autoReleaseDays: 7 });
  const [sellerAgentCache, setSellerAgentCache] = useState({}); // sellerId -> agentId | null

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
      const p = policySnap.exists() ? policySnap.data() : {};
      const currentRates = {
        commissionPercent: p.commissionPercent ?? 0.5,
        taxPercent: p.taxPercent ?? 10,
        agentSharePercent: p.agentSharePercent ?? 30,
        websiteSharePercent: p.websiteSharePercent ?? 70,
        autoReleaseDays: p.autoReleaseDays ?? 7
      };
      setRates(currentRates);

      const dispatchedSnap = await getDocs(query(collection(db, "orders"), where("status", "==", "dispatched")));
      const deliveredSnap = await getDocs(query(collection(db, "orders"), where("status", "==", "delivered")));
      const dispatched = dispatchedSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const delivered = deliveredSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setStage1Orders([...dispatched, ...delivered].filter((o) => !o.totalCredited));

      const now = Date.now();
      const windowMs = currentRates.autoReleaseDays * 24 * 60 * 60 * 1000;
      const eligible = delivered.filter((o) => o.totalCredited && !o.availableCredited);
      const ready = [], waiting = [];
      eligible.forEach((o) => {
        const deliveredAtMs = o.deliveredAt?.toMillis ? o.deliveredAt.toMillis() : (o.deliveredAt?.seconds ? o.deliveredAt.seconds * 1000 : null);
        if (deliveredAtMs && now - deliveredAtMs >= windowMs) ready.push(o);
        else waiting.push({ ...o, _deliveredAtMs: deliveredAtMs });
      });
      setStage2Ready(ready);
      setStage2Waiting(waiting);
    } catch (err) {
      console.error("Failed to load payout pipeline:", err);
    }
  };

  // The correct split, per Policy Engine's actual model:
  // commission comes out of the order total (seller gets the rest).
  // Tax and the Agent/Website split both come OUT of that commission —
  // they are not additional deductions from the seller.
  const splitFor = (order, agentId) => {
    const gross = order.grandTotal || 0;
    const commission = +(gross * (rates.commissionPercent / 100)).toFixed(2);
    const sellerNet = +(gross - commission).toFixed(2);
    const tax = +(commission * (rates.taxPercent / 100)).toFixed(2);
    const remaining = +(commission - tax).toFixed(2);
    let agentShare = 0;
    let websiteShare = remaining;
    if (agentId && rates.agentSharePercent > 0) {
      agentShare = +(remaining * (rates.agentSharePercent / 100)).toFixed(2);
      websiteShare = +(remaining - agentShare).toFixed(2);
    }
    return { gross, commission, sellerNet, tax, remaining, agentShare, websiteShare };
  };

  const getAgentIdForSeller = async (sellerId) => {
    if (sellerId in sellerAgentCache) return sellerAgentCache[sellerId];
    let agentId = null;
    try {
      const sellerSnap = await getDoc(doc(db, "sellers", sellerId));
      if (sellerSnap.exists()) agentId = sellerSnap.data().taggedByAgentId || null;
    } catch (err) {
      console.error("Failed to look up seller's agent:", err);
    }
    setSellerAgentCache((c) => ({ ...c, [sellerId]: agentId }));
    return agentId;
  };

  // Stage 1: credit Total Balance + Pending Balance, lock in commission/tax/agent split
  const creditTotalBalance = async (order) => {
    setBusyId(order.id);
    try {
      const agentId = await getAgentIdForSeller(order.sellerId);
      const { gross, commission, sellerNet, tax, remaining, agentShare, websiteShare } = splitFor(order, agentId);

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

      // Tax
      const taxRef = doc(db, "wallets_tax", "main");
      const taxSnap = await getDoc(taxRef);
      if (taxSnap.exists()) await updateDoc(taxRef, { totalCollected: increment(tax) });
      else await setDoc(taxRef, { totalCollected: tax, createdAt: serverTimestamp() });

      // Website's share of the commission (after tax, after agent split if any)
      const websiteRef = doc(db, "wallets_website", "main");
      const websiteSnap = await getDoc(websiteRef);
      if (websiteSnap.exists()) await updateDoc(websiteRef, { totalEarning: increment(websiteShare) });
      else await setDoc(websiteRef, { totalEarning: websiteShare, createdAt: serverTimestamp() });

      // Agent's share, if this seller was tagged by an agent
      if (agentId && agentShare > 0) {
        await updateDoc(doc(db, "wallets_agent", agentId), {
          totalBalance: increment(agentShare),
          availableBalance: increment(agentShare)
        });
        await addDoc(collection(db, "wallets_agent", agentId, "ledger_net"), {
          type: "commission_share",
          orderId: order.id,
          orderGroupId: order.orderGroupId || null,
          amount: agentShare,
          createdAt: serverTimestamp()
        });
      }

      await updateDoc(doc(db, "orders", order.id), {
        totalCredited: true,
        totalCreditedAt: serverTimestamp(),
        payoutSplit: { gross, commission, sellerNet, tax, remaining, agentId: agentId || null, agentShare, websiteShare }
      });

      setStage1Orders((list) => list.filter((o) => o.id !== order.id));
      loadPipeline();
      loadReconciliation();
    } catch (err) {
      console.error("Failed to credit total balance:", err);
      alert("Failed: " + err.message);
    }
    setBusyId(null);
  };

  // Stage 2: move seller's net amount from Pending to Available Balance
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

      setStage2Ready((list) => list.filter((o) => o.id !== order.id));
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
    for (const o of [...stage2Ready]) await releaseAvailable(o);
    setBusyAll(false);
  };

  const daysLeftFor = (o) => {
    if (!o._deliveredAtMs) return "—";
    const windowMs = rates.autoReleaseDays * 24 * 60 * 60 * 1000;
    const msLeft = (o._deliveredAtMs + windowMs) - Date.now();
    return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
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
          Commission ({rates.commissionPercent}%) is deducted from the order; the rest goes to the seller's Total Balance.
          From the commission: Tax ({rates.taxPercent}%) is set aside, and what's left splits between Website ({rates.websiteSharePercent}%) and Agent ({rates.agentSharePercent}%) — only if the seller was tagged by an agent.
        </p>
        {stage1Orders.length === 0 ? (
          <p style={styles.emptyText}>Nothing waiting — all dispatched orders are credited.</p>
        ) : (
          stage1Orders.map((o) => {
            const { gross, commission, sellerNet, tax, agentShare, websiteShare } = splitFor(o, sellerAgentCache[o.sellerId]);
            return (
              <div key={o.id} style={styles.payoutCard}>
                <div style={styles.payoutHead}>
                  <span style={styles.payoutOrderId}>#{o.id.slice(0, 8)} — {o.sellerName || "Seller"}</span>
                  <button style={styles.releaseBtn} onClick={() => creditTotalBalance(o)} disabled={busyId === o.id}>
                    {busyId === o.id ? "..." : "Credit"}
                  </button>
                </div>
                <div style={styles.payoutRow}>Order total: Rs {gross.toLocaleString()} · Commission: Rs {commission.toLocaleString()}</div>
                <div style={styles.payoutRow}>Tax: Rs {tax.toLocaleString()} · Website: Rs {websiteShare.toLocaleString()}{agentShare > 0 && ` · Agent: Rs ${agentShare.toLocaleString()}`}</div>
                <div style={{ ...styles.payoutRow, fontWeight: 700, color: "#0B3D2E" }}>To Seller's Total Balance: Rs {sellerNet.toLocaleString()}</div>
              </div>
            );
          })
        )}

        {/* STAGE 2 — ready */}
        <div style={{ ...styles.sectionHead, marginTop: 26 }}>
          <h3 style={styles.sectionTitle}>Ready — Move to Available Balance ({stage2Ready.length})</h3>
          {stage2Ready.length > 0 && (
            <button style={styles.releaseAllBtn} onClick={runAllStage2} disabled={busyAll}>
              {busyAll ? "Working..." : "Run All"}
            </button>
          )}
        </div>
        <p style={styles.helperText}>
          These orders were delivered {rates.autoReleaseDays}+ days ago (per Policy Engine) — the seller's earnings are ready to move into Available Balance.
        </p>
        {stage2Ready.length === 0 ? (
          <p style={styles.emptyText}>Nothing ready yet.</p>
        ) : (
          stage2Ready.map((o) => (
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

        {/* STAGE 2 — waiting */}
        {stage2Waiting.length > 0 && (
          <>
            <h3 style={{ ...styles.sectionTitle, marginTop: 22 }}>Still in Auto-Release Window ({stage2Waiting.length})</h3>
            <p style={styles.helperText}>Not releasable yet — waiting out the {rates.autoReleaseDays}-day window set in Policy Engine.</p>
            {stage2Waiting.map((o) => (
              <div key={o.id} style={{ ...styles.payoutCard, opacity: 0.6 }}>
                <div style={styles.payoutHead}>
                  <span style={styles.payoutOrderId}>#{o.id.slice(0, 8)} — {o.sellerName || "Seller"}</span>
                  <span style={{ fontSize: 11, color: "#888", fontWeight: 700 }}>{daysLeftFor(o)} day(s) left</span>
                </div>
              </div>
            ))}
          </>
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
