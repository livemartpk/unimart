// ============================================
// UniMart - Reset Test Financial Data (Super Admin)
// One-time tool: zeroes out all wallet balances and
// clears payout flags on orders, so testing under old/
// wrong Policy Engine rates doesn't pollute real numbers
// once the site goes live. Use once, then it's done.
// ============================================

import { useState } from "react";
import { collection, getDocs, doc, writeBatch, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function ResetTestData({ user }) {
  const [confirmText, setConfirmText] = useState("");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [done, setDone] = useState(false);

  const addLog = (line) => setLog((prev) => [...prev, line]);

  const handleReset = async () => {
    if (confirmText.trim().toUpperCase() !== "RESET") return;
    setRunning(true);
    setLog([]);
    setDone(false);

    try {
      // 1. Zero out every seller/agent/buyer wallet's balances
      for (const colName of ["wallets_seller", "wallets_agent", "wallets_buyer"]) {
        const snap = await getDocs(collection(db, colName));
        let batch = writeBatch(db);
        let count = 0;
        for (const d of snap.docs) {
          batch.update(d.ref, { totalBalance: 0, availableBalance: 0, pendingBalance: 0 });
          count++;
          if (count % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
        }
        await batch.commit();
        addLog(`✓ Reset ${snap.docs.length} ${colName.replace("wallets_", "")} wallet(s)`);
      }

      // 2. Zero out website earning + tax collection
      await setDoc(doc(db, "wallets_website", "main"), { totalEarning: 0, resetAt: serverTimestamp() });
      await setDoc(doc(db, "wallets_tax", "main"), { totalCollected: 0, resetAt: serverTimestamp() });
      addLog("✓ Reset Website Earning + Tax Collection wallets");

      // 3. Clear payout flags on every order, so they can be freshly re-processed under current rates
      const ordersSnap = await getDocs(collection(db, "orders"));
      let obatch = writeBatch(db);
      let ocount = 0;
      for (const d of ordersSnap.docs) {
        obatch.update(d.ref, {
          totalCredited: false,
          availableCredited: false,
          payoutSplit: null,
          pointsAwarded: false,
          salesTracked: false
        });
        ocount++;
        if (ocount % 400 === 0) { await obatch.commit(); obatch = writeBatch(db); }
      }
      await obatch.commit();
      addLog(`✓ Cleared payout flags on ${ordersSnap.docs.length} order(s)`);

      // 4. Reset seller points too, since those were also earned under old/testing rates
      const sellersSnap = await getDocs(collection(db, "sellers"));
      let sbatch = writeBatch(db);
      let scount = 0;
      for (const d of sellersSnap.docs) {
        sbatch.update(d.ref, { points: 0 });
        scount++;
        if (scount % 400 === 0) { await sbatch.commit(); sbatch = writeBatch(db); }
      }
      await sbatch.commit();
      addLog(`✓ Reset points on ${sellersSnap.docs.length} seller(s)`);

      addLog("✅ All done — wallets and orders are clean. New activity will use current Policy Engine rates correctly.");
      setDone(true);
    } catch (err) {
      console.error(err);
      addLog("❌ Something went wrong: " + err.message);
    }
    setRunning(false);
  };

  return (
    <div style={s.page}>

      <div style={{ padding: 16, paddingBottom: 60 }}>
        <div style={s.warningBox}>
          ⚠️ This zeroes out <b>all</b> seller/agent/buyer wallet balances, the Website Earning wallet, the Tax
          Collection wallet, seller points, and clears payout flags on every order so they can be re-processed
          under the current Policy Engine rates. Use this only for cleaning up test data before going live —
          it cannot be undone.
        </div>

        {!done && (
          <>
            <label className="input-label">Type RESET to confirm</label>
            <input
              className="input-field"
              style={{ marginBottom: 14 }}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET"
            />
            <button
              className="btn-primary"
              style={{ width: "100%", background: "#C0392B" }}
              onClick={handleReset}
              disabled={running || confirmText.trim().toUpperCase() !== "RESET"}
            >
              {running ? "Resetting..." : "Reset All Test Financial Data"}
            </button>
          </>
        )}

        {log.length > 0 && (
          <div style={s.logBox}>
            {log.map((line, i) => (
              <div key={i} style={s.logLine}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  warningBox: { background: "#FCEAEA", border: "1px solid #f0b8b8", color: "#8a2f24", fontSize: 12.5, lineHeight: 1.6, padding: 14, borderRadius: 12, marginBottom: 20 },
  logBox: { marginTop: 18, background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 14 },
  logLine: { fontSize: 12.5, color: "#333", marginBottom: 6, fontFamily: "monospace" }
};
