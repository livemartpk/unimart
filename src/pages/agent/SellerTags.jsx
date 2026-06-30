// ============================================
// UniMart - Seller Tags (Agent)
// Agent requests to tag a seller store; requires
// Admin approval (per our decision).
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

export default function SellerTags({ user, onNavigate }) {
  const [taggedStores, setTaggedStores] = useState([]);
  const [tagRequests, setTagRequests] = useState([]);
  const [filter, setFilter] = useState("approved");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const agentSnap = await getDoc(doc(db, "agents", user.uid));
      const taggedIds = agentSnap.exists() ? agentSnap.data().taggedStores || [] : [];

      const stores = [];
      for (const sellerId of taggedIds) {
        const sellerSnap = await getDoc(doc(db, "sellers", sellerId));
        if (sellerSnap.exists()) stores.push({ id: sellerId, ...sellerSnap.data() });
      }
      setTaggedStores(stores);

      const requestsQuery = query(collection(db, "agentTagRequests"), where("agentId", "==", user.uid));
      const requestsSnap = await getDocs(requestsQuery);
      setTagRequests(requestsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error("Failed to load seller tags:", err);
    }
    setLoading(false);
  };

  const handleSearchStores = async () => {
    if (!storeSearch.trim()) return;
    try {
      const q = query(collection(db, "sellers"), where("storeStatus", "==", "approved"));
      const snap = await getDocs(q);
      const results = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => s.storeName?.toLowerCase().includes(storeSearch.toLowerCase()));
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  const handleRequestTag = async (sellerId, storeName) => {
    try {
      await addDoc(collection(db, "agentTagRequests"), {
        agentId: user.uid,
        sellerId,
        storeName,
        status: "pending", // Super Admin / Seller Manager approves
        requestedAt: serverTimestamp()
      });
      setShowRequestModal(false);
      setStoreSearch("");
      setSearchResults([]);
      loadData();
      alert("Tag request submitted. Waiting for admin approval.");
    } catch (err) {
      console.error("Failed to submit tag request:", err);
    }
  };

  const pendingRequests = tagRequests.filter((r) => r.status === "pending");
  const rejectedRequests = tagRequests.filter((r) => r.status === "rejected");

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Seller Tags</div>
        <div style={styles.addBtn} onClick={() => setShowRequestModal(true)}>+ Tag Store</div>
      </div>

      <div style={styles.filterRow}>
        <FilterPill label="Approved" count={taggedStores.length} active={filter === "approved"} onClick={() => setFilter("approved")} />
        <FilterPill label="Pending" count={pendingRequests.length} active={filter === "pending"} onClick={() => setFilter("pending")} />
        <FilterPill label="Rejected" count={rejectedRequests.length} active={filter === "rejected"} onClick={() => setFilter("rejected")} />
      </div>

      <div className="container" style={{ paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading...</p>
        ) : filter === "approved" ? (
          taggedStores.length === 0 ? (
            <p style={styles.emptyText}>No tagged stores yet. Tag a store to start earning commission on its sales.</p>
          ) : (
            taggedStores.map((s) => (
              <div key={s.id} style={styles.storeCard}>
                <div style={styles.storeName}>{s.storeName}</div>
                <div style={styles.storeMeta}>{s.businessCategory} · {s.city}</div>
                <div style={styles.storeRating}>⭐ {s.rating || "New"}</div>
              </div>
            ))
          )
        ) : filter === "pending" ? (
          pendingRequests.length === 0 ? (
            <p style={styles.emptyText}>No pending requests.</p>
          ) : (
            pendingRequests.map((r) => (
              <div key={r.id} style={styles.storeCard}>
                <div style={styles.storeName}>{r.storeName}</div>
                <div style={styles.pendingTag}>Awaiting admin approval</div>
              </div>
            ))
          )
        ) : (
          rejectedRequests.length === 0 ? (
            <p style={styles.emptyText}>No rejected requests.</p>
          ) : (
            rejectedRequests.map((r) => (
              <div key={r.id} style={styles.storeCard}>
                <div style={styles.storeName}>{r.storeName}</div>
                <div style={styles.rejectedTag}>Rejected: {r.rejectionReason || "No reason given"}</div>
                <button className="btn-secondary" style={{ marginTop: 8, fontSize: 11.5, padding: "6px 12px" }} onClick={() => handleRequestTag(r.sellerId, r.storeName)}>Reapply</button>
              </div>
            ))
          )
        )}
      </div>

      {/* Request Tag Modal */}
      {showRequestModal && (
        <div style={styles.modalOverlay} onClick={() => setShowRequestModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Tag a Seller Store</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input className="input-field" value={storeSearch} onChange={(e) => setStoreSearch(e.target.value)} placeholder="Search store name..." />
              <button className="btn-primary" onClick={handleSearchStores}>Search</button>
            </div>
            {searchResults.map((s) => (
              <div key={s.id} style={styles.searchResultRow}>
                <div>
                  <div style={styles.storeName}>{s.storeName}</div>
                  <div style={styles.storeMeta}>{s.businessCategory}</div>
                </div>
                <button className="btn-gold" style={{ fontSize: 11, padding: "7px 14px" }} onClick={() => handleRequestTag(s.id, s.storeName)}>Request Tag</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, count, active, onClick }) {
  return (
    <div style={{ ...styles.pill, ...(active ? styles.pillActive : {}) }} onClick={onClick}>
      {label} {count > 0 && `(${count})`}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  addBtn: { background: "#D4AF37", color: "#0B3D2E", fontWeight: 700, fontSize: 12, padding: "8px 12px", borderRadius: 20, cursor: "pointer" },

  filterRow: { display: "flex", gap: 8, padding: "14px 16px" },
  pill: { padding: "8px 14px", borderRadius: 20, border: "1.5px solid #eee0c0", fontSize: 11.5, fontWeight: 600, color: "#0B3D2E", cursor: "pointer", background: "#fff" },
  pillActive: { background: "#0B3D2E", color: "#fff", borderColor: "#0B3D2E" },

  emptyText: { fontSize: 13, color: "#888", padding: "20px 0", lineHeight: 1.6 },

  storeCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 14, marginBottom: 10 },
  storeName: { fontSize: 13.5, fontWeight: 700, color: "#1a1a1a" },
  storeMeta: { fontSize: 11, color: "#888", marginTop: 2 },
  storeRating: { fontSize: 11.5, color: "#0B3D2E", marginTop: 6, fontWeight: 600 },
  pendingTag: { fontSize: 11, color: "#8a6d1f", marginTop: 6, fontWeight: 600 },
  rejectedTag: { fontSize: 11, color: "#C0392B", marginTop: 6 },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 50 },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", margin: "0 auto", maxHeight: "75vh", overflowY: "auto" },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 16 },
  searchResultRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0f0f0" }
};
