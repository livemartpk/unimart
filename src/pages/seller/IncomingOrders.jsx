// ============================================
// UniMart - Incoming Orders (Seller)
// Flow: Pending (=Confirm) -> Packed -> Dispatched
// Seller's responsibility ENDS at Dispatched.
// Only the BUYER can mark an order as Delivered.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

export default function IncomingOrders({ user, onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dispatchModalOrder, setDispatchModalOrder] = useState(null);
  const [dispatchForm, setDispatchForm] = useState({ courier: "", date: "", trackingNumber: "" });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "orders"), where("sellerId", "==", user.uid));
      const snap = await getDocs(q);
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load orders:", err);
    }
    setLoading(false);
  };

  // "Mark as Packed" = also acts as Confirm (per our decision: no separate Confirm step)
  const handleMarkPacked = async (orderId) => {
    await updateDoc(doc(db, "orders", orderId), {
      status: "packed",
      packedAt: serverTimestamp(),
      invoiceGenerated: true,
      dispatchSlipGenerated: true
    });
    setOrders((os) => os.map((o) => (o.id === orderId ? { ...o, status: "packed" } : o)));
  };

  const openDispatchModal = (order) => {
    setDispatchModalOrder(order);
    setDispatchForm({ courier: "", date: "", trackingNumber: "" });
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchForm.courier || !dispatchForm.date || !dispatchForm.trackingNumber) {
      alert("Please fill in courier company, date, and tracking number.");
      return;
    }
    await updateDoc(doc(db, "orders", dispatchModalOrder.id), {
      status: "dispatched",
      dispatchedAt: serverTimestamp(),
      dispatchDetails: {
        courierCompany: dispatchForm.courier,
        dispatchDate: dispatchForm.date,
        trackingNumber: dispatchForm.trackingNumber
      }
    });
    setOrders((os) => os.map((o) => (o.id === dispatchModalOrder.id ? { ...o, status: "dispatched" } : o)));
    setDispatchModalOrder(null);
  };

  const filteredOrders = orders.filter((o) => filter === "all" || o.status === filter);

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    packed: orders.filter((o) => o.status === "packed").length,
    dispatched: orders.filter((o) => o.status === "dispatched").length,
    delivered: orders.filter((o) => o.status === "delivered").length
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Incoming Orders</div>
      </div>

      <div style={styles.filterRow}>
        <FilterPill icon="📋" label="All" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterPill icon="🆕" label="New Order" count={counts.pending} active={filter === "pending"} onClick={() => setFilter("pending")} />
        <FilterPill icon="📦" label="Packed" count={counts.packed} active={filter === "packed"} onClick={() => setFilter("packed")} />
        <FilterPill icon="🚚" label="Dispatch" count={counts.dispatched} active={filter === "dispatched"} onClick={() => setFilter("dispatched")} />
        <FilterPill icon="✅" label="Delivered" count={counts.delivered} active={filter === "delivered"} onClick={() => setFilter("delivered")} />
      </div>

      <div className="container" style={{ paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
          <p style={styles.emptyText}>No orders in this category.</p>
        ) : (
          filteredOrders.map((o) => (
            <div key={o.id} style={styles.orderCard}>
              <div style={styles.orderTop}>
                <div>
                  <div style={styles.orderId}>Order #{o.id.slice(0, 8)}</div>
                  <div style={styles.orderBuyer}>{o.buyerName || "Buyer"}</div>
                </div>
                <div style={{ ...styles.statusTag, ...statusColors[o.status] }}>{o.status}</div>
              </div>

              <div style={styles.orderAmount}>Rs {o.grandTotal || 0}</div>

              {o.status === "pending" && (
                <div style={styles.actionsRow}>
                  <button className="btn-secondary" style={styles.smallBtn} onClick={() => onNavigate && onNavigate("invoice", o.id)}>Print Invoice</button>
                  <button className="btn-secondary" style={styles.smallBtn} onClick={() => onNavigate && onNavigate("dispatch-slip", o.id)}>Print Dispatch Slip</button>
                  <button className="btn-primary" style={styles.smallBtn} onClick={() => handleMarkPacked(o.id)}>Mark as Packed</button>
                </div>
              )}

              {o.status === "packed" && (
                <div style={styles.actionsRow}>
                  <button className="btn-primary" style={{ ...styles.smallBtn, flex: 1 }} onClick={() => openDispatchModal(o)}>Add Dispatch Details</button>
                </div>
              )}

              {o.status === "dispatched" && (
                <div style={styles.dispatchInfo}>
                  🚚 {o.dispatchDetails?.courierCompany} · Tracking: {o.dispatchDetails?.trackingNumber}
                  <div style={styles.waitingNote}>Waiting for buyer to confirm delivery.</div>
                </div>
              )}

              {o.status === "delivered" && (
                <div style={styles.deliveredNote}>✓ Marked received by buyer on {o.deliveredAt?.toDate ? o.deliveredAt.toDate().toLocaleDateString() : "—"}</div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Dispatch Modal */}
      {dispatchModalOrder && (
        <div style={styles.modalOverlay} onClick={() => setDispatchModalOrder(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Dispatch Details</h3>
            <label className="input-label">Courier Company</label>
            <input className="input-field" style={{ marginBottom: 12 }} value={dispatchForm.courier} onChange={(e) => setDispatchForm((f) => ({ ...f, courier: e.target.value }))} placeholder="e.g. TCS, Leopards" />
            <label className="input-label">Dispatch Date</label>
            <input type="date" className="input-field" style={{ marginBottom: 12 }} value={dispatchForm.date} onChange={(e) => setDispatchForm((f) => ({ ...f, date: e.target.value }))} />
            <label className="input-label">Tracking Number</label>
            <input className="input-field" style={{ marginBottom: 16 }} value={dispatchForm.trackingNumber} onChange={(e) => setDispatchForm((f) => ({ ...f, trackingNumber: e.target.value }))} />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setDispatchModalOrder(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleConfirmDispatch}>Mark as Dispatched</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPill({ icon, label, count, active, onClick }) {
  return (
    <div style={{ ...styles.pill, ...(active ? styles.pillActive : {}) }} onClick={onClick}>
      {icon} {label} {count > 0 && `(${count})`}
    </div>
  );
}

const statusColors = {
  pending: { background: "#FBF1DA", color: "#8a6d1f" },
  packed: { background: "#E8F0FF", color: "#2C6E91" },
  dispatched: { background: "#F0F5F0", color: "#0B3D2E" },
  delivered: { background: "#E3F2E1", color: "#2E7D32" }
};

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },

  filterRow: { display: "flex", gap: 8, padding: "14px 16px", overflowX: "auto" },
  pill: { padding: "8px 14px", borderRadius: 20, border: "1.5px solid #eee0c0", fontSize: 11.5, fontWeight: 600, color: "#0B3D2E", whiteSpace: "nowrap", cursor: "pointer", background: "#fff" },
  pillActive: { background: "#0B3D2E", color: "#fff", borderColor: "#0B3D2E" },

  emptyText: { fontSize: 13, color: "#888", padding: "20px 0" },

  orderCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 14, marginBottom: 12 },
  orderTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  orderId: { fontSize: 13, fontWeight: 700, color: "#1a1a1a" },
  orderBuyer: { fontSize: 11.5, color: "#888", marginTop: 2 },
  statusTag: { fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 12, textTransform: "uppercase" },
  orderAmount: { fontSize: 15, fontWeight: 800, color: "#0B3D2E", marginBottom: 10 },

  actionsRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  smallBtn: { fontSize: 11.5, padding: "8px 12px", flex: 1 },

  dispatchInfo: { fontSize: 12, color: "#444", background: "#F0F5F0", borderRadius: 8, padding: 10 },
  waitingNote: { fontSize: 11, color: "#888", marginTop: 6, fontStyle: "italic" },
  deliveredNote: { fontSize: 12, color: "#2E7D32", fontWeight: 600 },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 50 },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", margin: "0 auto" },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 16 }
};
