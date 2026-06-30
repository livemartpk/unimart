// ============================================
// UniMart - Points & Boost (Seller)
// ============================================

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

const BOOST_OPTIONS = [
  { key: "homepage", label: "Homepage Feature", cost: 100, duration: "24 hours", desc: "Your product appears in the homepage Just For You section." },
  { key: "search_top", label: "Search Top", cost: 80, duration: "24 hours", desc: "Your product ranks higher in search results." },
  { key: "category_top", label: "Category Top", cost: 60, duration: "24 hours", desc: "Your product appears at the top of its category page." },
  { key: "flash_sale", label: "Flash Sale Slot", cost: 150, duration: "12 hours", desc: "Your product is featured in the homepage Flash Sale section." }
];

export default function PointsAndBoost({ user, onNavigate }) {
  const [points, setPoints] = useState(0);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedBoost, setSelectedBoost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const sellerSnap = await getDoc(doc(db, "sellers", user.uid));
      if (sellerSnap.exists()) setPoints(sellerSnap.data().points || 0);

      const q = query(collection(db, "products"), where("sellerId", "==", user.uid), where("status", "==", "active"));
      const snap = await getDocs(q);
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error("Failed to load points/boost data:", err);
    }
    setLoading(false);
  };

  const handleApplyBoost = async () => {
    if (!selectedProduct || !selectedBoost) {
      alert("Select a product and a boost type first.");
      return;
    }
    if (points < selectedBoost.cost) {
      alert("Not enough points for this boost.");
      return;
    }

    setApplying(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (selectedBoost.duration.includes("12") ? 12 : 24));

      await updateDoc(doc(db, "products", selectedProduct), {
        boost: { type: selectedBoost.key, expiresAt: expiresAt.toISOString(), appliedAt: new Date().toISOString() }
      });

      await updateDoc(doc(db, "sellers", user.uid), { points: points - selectedBoost.cost });

      setPoints((p) => p - selectedBoost.cost);
      setSelectedProduct("");
      setSelectedBoost(null);
      alert("Boost applied successfully!");

    } catch (err) {
      console.error("Failed to apply boost:", err);
    }
    setApplying(false);
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Points & Boost</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        <div style={styles.pointsCard}>
          <div style={styles.pointsLabel}>Your Points Balance</div>
          <div style={styles.pointsValue}>{points} pts</div>
        </div>

        <div style={styles.infoBox}>
          <div style={styles.infoTitle}>How points are earned</div>
          <div style={styles.infoRow}>• Each completed sale = 10 points</div>
          <div style={styles.infoRow}>• Hitting a monthly target = 50 bonus points</div>
          <div style={styles.infoRow}>• A great rating from a buyer = 5 points</div>
        </div>

        <h3 style={styles.sectionTitle}>Boost a Product</h3>

        <div style={{ marginBottom: 16 }}>
          <label className="input-label">Select Product</label>
          <select className="input-field" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
            <option value="">Choose a product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div style={styles.boostGrid}>
          {BOOST_OPTIONS.map((b) => (
            <div
              key={b.key}
              style={{ ...styles.boostCard, ...(selectedBoost?.key === b.key ? styles.boostCardActive : {}) }}
              onClick={() => setSelectedBoost(b)}
            >
              <div style={styles.boostLabel}>{b.label}</div>
              <div style={styles.boostCost}>{b.cost} pts</div>
              <div style={styles.boostDuration}>{b.duration}</div>
              <div style={styles.boostDesc}>{b.desc}</div>
            </div>
          ))}
        </div>

        <button
          className="btn-primary"
          style={{ width: "100%", marginTop: 16 }}
          onClick={handleApplyBoost}
          disabled={applying || !selectedProduct || !selectedBoost}
        >
          {applying ? "Applying..." : "Apply Boost"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },

  pointsCard: { background: "linear-gradient(120deg, #0B3D2E, #155c43)", borderRadius: 16, padding: 20, marginBottom: 16, textAlign: "center" },
  pointsLabel: { color: "#cfe0d4", fontSize: 12 },
  pointsValue: { color: "#D4AF37", fontSize: 28, fontWeight: 800, marginTop: 6 },

  infoBox: { background: "#F0F5F0", borderRadius: 12, padding: 14, marginBottom: 22 },
  infoTitle: { fontWeight: 700, fontSize: 12.5, color: "#0B3D2E", marginBottom: 6 },
  infoRow: { fontSize: 11.5, color: "#444", marginBottom: 3 },

  sectionTitle: { fontSize: 16, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 12 },

  boostGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  boostCard: { background: "#fff", border: "1.5px solid #eee0c0", borderRadius: 14, padding: 12, cursor: "pointer" },
  boostCardActive: { borderColor: "#0B3D2E", background: "#F0F5F0" },
  boostLabel: { fontSize: 12.5, fontWeight: 700, color: "#0B3D2E" },
  boostCost: { fontSize: 15, fontWeight: 800, color: "#D4AF37", marginTop: 4 },
  boostDuration: { fontSize: 10, color: "#888", marginTop: 2 },
  boostDesc: { fontSize: 10, color: "#666", marginTop: 6, lineHeight: 1.4 }
};
