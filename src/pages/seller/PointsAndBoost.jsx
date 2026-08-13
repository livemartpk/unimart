// ============================================
// UniMart - Points & Boost (Seller)
// [Tailwind / Airbnb-inspired design system]
// ============================================

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";

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
    <div className="min-h-screen bg-canvas">
      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-8">

        <div className="bg-ink rounded-card p-5 mb-4 text-center">
          <div className="text-white/70 text-xs">Your Points Balance</div>
          <div className="text-rausch text-[28px] font-extrabold mt-1.5">{points} pts</div>
        </div>

        <div className="bg-surface-soft rounded-card p-3.5 mb-5.5">
          <div className="text-[12.5px] font-bold text-ink mb-1.5">How points are earned</div>
          <div className="text-[11.5px] text-body mb-0.5">• Each completed sale = 10 points</div>
          <div className="text-[11.5px] text-body mb-0.5">• Hitting a monthly target = 50 bonus points</div>
          <div className="text-[11.5px] text-body">• A great rating from a buyer = 5 points</div>
        </div>

        <h3 className="text-title-md text-ink font-bold mb-3">Boost a Product</h3>

        <div className="mb-4">
          <label className="block text-title-sm text-ink mb-1.5">Select Product</label>
          <select
            className="w-full h-12 px-4 rounded-btn border border-hairline text-body-md text-ink bg-canvas focus:outline-none focus:border-ink"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            <option value="">Choose a product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {BOOST_OPTIONS.map((b) => (
            <div
              key={b.key}
              onClick={() => setSelectedBoost(b)}
              className={`rounded-card p-3 cursor-pointer border
              ${selectedBoost?.key === b.key ? "border-ink bg-surface-soft" : "border-hairline bg-canvas"}`}
            >
              <div className="text-[12.5px] font-bold text-ink">{b.label}</div>
              <div className="text-[15px] font-extrabold text-rausch mt-1">{b.cost} pts</div>
              <div className="text-[10px] text-muted mt-0.5">{b.duration}</div>
              <div className="text-[10px] text-body mt-1.5 leading-snug">{b.desc}</div>
            </div>
          ))}
        </div>

        <button
          onClick={handleApplyBoost}
          disabled={applying || !selectedProduct || !selectedBoost}
          className="w-full mt-4 h-12 rounded-btn bg-rausch hover:bg-rausch-active disabled:bg-rausch-disabled text-white text-title-sm font-semibold transition-colors"
        >
          {applying ? "Applying..." : "Apply Boost"}
        </button>
      </div>
    </div>
  );
}
