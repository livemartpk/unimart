// ============================================
// UniMart - Backfill Countries (Super Admin)
// One-time tool: sets country="Pakistan" (currency
// PKR) on any user/seller/product created before the
// multi-country feature existed, so nothing silently
// disappears once country-based filtering goes live.
// ============================================

import { useState } from "react";
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

const DEFAULT_COUNTRY = "Pakistan";
const DEFAULT_CURRENCY = "PKR";

export default function BackfillCountries() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [done, setDone] = useState(false);

  const addLog = (line) => setLog((prev) => [...prev, line]);

  const commitInChunks = async (docsToUpdate) => {
    let batch = writeBatch(db);
    let count = 0;
    for (const { ref, data } of docsToUpdate) {
      batch.update(ref, data);
      count++;
      if (count % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
    }
    await batch.commit();
    return docsToUpdate.length;
  };

  const handleBackfill = async () => {
    setRunning(true);
    setLog([]);
    setDone(false);

    try {
      // 1. Users (buyers, sellers, agents) missing country
      const usersSnap = await getDocs(collection(db, "users"));
      const usersToFix = usersSnap.docs
        .filter((d) => !d.data().country)
        .map((d) => ({ ref: d.ref, data: { country: DEFAULT_COUNTRY, currency: DEFAULT_CURRENCY } }));
      const usersFixed = await commitInChunks(usersToFix);
      addLog(`✓ Set country on ${usersFixed} user account(s)`);

      // 2. Sellers collection (separate document, used for agent-matching later)
      const sellersSnap = await getDocs(collection(db, "sellers"));
      const sellersToFix = sellersSnap.docs
        .filter((d) => !d.data().country)
        .map((d) => ({ ref: d.ref, data: { country: DEFAULT_COUNTRY } }));
      const sellersFixed = await commitInChunks(sellersToFix);
      addLog(`✓ Set country on ${sellersFixed} seller profile(s)`);

      // Build a lookup: sellerId -> country, for tagging products correctly
      const sellerCountryMap = {};
      sellersSnap.docs.forEach((d) => {
        sellerCountryMap[d.id] = d.data().country || DEFAULT_COUNTRY;
      });

      // 3. Products missing country — inherit from their seller
      const productsSnap = await getDocs(collection(db, "products"));
      const productsToFix = productsSnap.docs
        .filter((d) => !d.data().country)
        .map((d) => ({
          ref: d.ref,
          data: { country: sellerCountryMap[d.data().sellerId] || DEFAULT_COUNTRY }
        }));
      const productsFixed = await commitInChunks(productsToFix);
      addLog(`✓ Set country on ${productsFixed} product(s)`);

      // 4. Orders missing country — inherit from their seller
      const ordersSnap = await getDocs(collection(db, "orders"));
      const ordersToFix = ordersSnap.docs
        .filter((d) => !d.data().country)
        .map((d) => ({
          ref: d.ref,
          data: { country: sellerCountryMap[d.data().sellerId] || DEFAULT_COUNTRY }
        }));
      const ordersFixed = await commitInChunks(ordersToFix);
      addLog(`✓ Set country on ${ordersFixed} order(s)`);

      addLog("✅ Done — all old accounts, products, and orders are now tagged with a country.");
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
        <div style={s.infoBox}>
          This is a one-time fix for accounts and products created <b>before</b> the multi-country feature
          existed. It sets <b>Country = Pakistan</b> (Currency = PKR) on any user, seller profile, or
          product that doesn't have a country yet. Run this once, before turning on country-based
          filtering — otherwise old products/sellers won't match any buyer's country and will effectively
          disappear from the site.
        </div>

        {!done && (
          <button className="btn-primary" style={{ width: "100%" }} onClick={handleBackfill} disabled={running}>
            {running ? "Running..." : "Backfill Missing Countries"}
          </button>
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
  infoBox: { background: "#F0F5F0", border: "1px solid #D4AF37", color: "#0B3D2E", fontSize: 12.5, lineHeight: 1.6, padding: 14, borderRadius: 12, marginBottom: 20 },
  logBox: { marginTop: 18, background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 14 },
  logLine: { fontSize: 12.5, color: "#333", marginBottom: 6, fontFamily: "monospace" }
};
