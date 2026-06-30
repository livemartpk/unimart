// ============================================
// UniMart - All Sellers (Seller Manager)
// ============================================

import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "../../../styles/theme.css";

export default function AllSellers({ user }) {
  const [sellers, setSellers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSellers();
  }, []);

  const loadSellers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "sellers"));
      setSellers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load sellers:", err);
    }
    setLoading(false);
  };

  const handleSuspend = async (seller) => {
    const newStatus = seller.storeStatus === "suspended" ? "approved" : "suspended";
    if (!window.confirm(`${newStatus === "suspended" ? "Suspend" : "Reactivate"} ${seller.storeName}?`)) return;

    await updateDoc(doc(db, "sellers", seller.id), { storeStatus: newStatus });
    await addDoc(collection(db, "adminLogs"), {
      adminId: user.uid,
      adminRole: "seller_manager",
      action: newStatus === "suspended" ? "suspended_seller" : "reactivated_seller",
      targetId: seller.id,
      timestamp: serverTimestamp()
    });
    setSellers((ss) => ss.map((s) => (s.id === seller.id ? { ...s, storeStatus: newStatus } : s)));
  };

  const filteredSellers = sellers.filter((s) => {
    const matchesFilter = filter === "all" || s.storeStatus === filter;
    const matchesSearch = !search || s.storeName?.toLowerCase().includes(search.toLowerCase()) || s.city?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = {
    all: sellers.length,
    approved: sellers.filter((s) => s.storeStatus === "approved").length,
    vacation: sellers.filter((s) => s.storeStatus === "vacation").length,
    suspended: sellers.filter((s) => s.storeStatus === "suspended").length
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>All Sellers</div>
      </div>

      <div className="container" style={{ paddingTop: 16 }}>
        <input className="input-field" placeholder="Search store name or city..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 12 }} />
        <div style={styles.filterRow}>
          <Pill label="All" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
          <Pill label="Active" count={counts.approved} active={filter === "approved"} onClick={() => setFilter("approved")} />
          <Pill label="Vacation" count={counts.vacation} active={filter === "vacation"} onClick={() => setFilter("vacation")} />
          <Pill label="Suspended" count={counts.suspended} active={filter === "suspended"} onClick={() => setFilter("suspended")} />
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading sellers...</p>
        ) : filteredSellers.length === 0 ? (
          <p style={styles.emptyText}>No sellers match this filter.</p>
        ) : (
          filteredSellers.map((s) => (
            <div key={s.id} style={styles.sellerRow}>
              <div>
                <div style={styles.storeName}>{s.storeName}</div>
                <div style={styles.metaRow}>{s.city} · ⭐ {s.rating || "New"} · {s.businessCategory}</div>
              </div>
              <div
                style={{ ...styles.actionBtn, ...(s.storeStatus === "suspended" ? styles.reactivateBtn : styles.suspendBtn) }}
                onClick={() => handleSuspend(s)}
              >
                {s.storeStatus === "suspended" ? "Reactivate" : "Suspend"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Pill({ label, count, active, onClick }) {
  return <div style={{ ...styles.pill, ...(active ? styles.pillActive : {}) }} onClick={onClick}>{label} ({count})</div>;
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },

  filterRow: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 14 },
  pill: { padding: "8px 14px", borderRadius: 20, border: "1.5px solid #eee0c0", fontSize: 11.5, fontWeight: 600, color: "#0B3D2E", whiteSpace: "nowrap", cursor: "pointer", background: "#fff" },
  pillActive: { background: "#0B3D2E", color: "#fff", borderColor: "#0B3D2E" },

  emptyText: { fontSize: 13, color: "#888", padding: "20px 0" },
  sellerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 14, marginBottom: 10 },
  storeName: { fontSize: 13.5, fontWeight: 700, color: "#1a1a1a" },
  metaRow: { fontSize: 11, color: "#888", marginTop: 3 },
  actionBtn: { fontSize: 10.5, fontWeight: 700, padding: "7px 12px", borderRadius: 16, cursor: "pointer", whiteSpace: "nowrap" },
  suspendBtn: { background: "#FCEAEA", color: "#C0392B" },
  reactivateBtn: { background: "#E3F2E1", color: "#2E7D32" }
};
