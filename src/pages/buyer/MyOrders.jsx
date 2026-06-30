// ============================================
// UniMart - My Orders
// Logic: Buyer can cancel only while "pending".
// Only the BUYER can mark an order "delivered" —
// sellers cannot (per our confirmed decision).
// Auto-release happens via backend/cloud function
// after the policy-defined window — not shown here.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "packed", label: "Packed" },
  { key: "dispatched", label: "Dispatched" },
  { key: "delivered", label: "Delivered" }
];

const STATUS_LABELS = {
  pending: { label: "Order Placed", color: "#D4AF37" },
  packed: { label: "Packed", color: "#2C6E91" },
  dispatched: { label: "Dispatched", color: "#0B3D2E" },
  delivered: { label: "Delivered", color: "#2E7D32" },
  cancelled: { label: "Cancelled", color: "#C0392B" }
};

export default function MyOrders({ user, onNavigate }) {
  const [activeTab, setActiveTab] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "orders"),
        where("buyerId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load orders:", err);
    }
    setLoading(false);
  };

  const filteredOrders = activeTab === "all" ? orders : orders.filter((o) => o.status === activeTab);

  const handleCancelOrder = async (orderId) => {
    setActionLoading(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        cancelledBy: "buyer"
      });
      // NOTE: stock restoration + buyer wallet refund (if payment was made) should be
      // handled by a Cloud Function trigger watching this status change.
      await loadOrders();
    } catch (err) {
      console.error("Failed to cancel order:", err);
    }
    setActionLoading(null);
  };

  const handleMarkReceived = async (orderId) => {
    setActionLoading(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "delivered",
        deliveredMarkedBy: "buyer",
        deliveredAt: serverTimestamp()
        // autoReleaseDate should already be calculated by backend logic
        // based on policy's disputeWindowDays / autoReleaseDays
      });
      await loadOrders();
    } catch (err) {
      console.error("Failed to mark as received:", err);
    }
    setActionLoading(null);
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.backBtn} onClick={() => onNavigate && onNavigate("back")}>←</div>
        <div style={styles.headerTitle}>My Orders</div>
        <div style={{ width: 36 }} />
      </div>

      {/* Status tabs */}
      <div style={styles.tabBar}>
        {STATUS_TABS.map((tab) => {
          const count = tab.key === "all" ? orders.length : orders.filter((o) => o.status === tab.key).length;
          return (
            <div
              key={tab.key}
              style={{ ...styles.tabPill, ...(activeTab === tab.key ? styles.tabPillActive : {}) }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label} {count > 0 && `(${count})`}
            </div>
          );
        })}
      </div>

      <div className="container" style={{ paddingTop: 14, paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading your orders...</p>
        ) : filteredOrders.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>📦</div>
            <p style={styles.emptyTitle}>No orders here yet</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} style={styles.orderCard}>
              <div style={styles.orderHead}>
                <div>
                  <div style={styles.orderSeller}>{order.sellerName}</div>
                  <div style={styles.orderId}>Order #{order.id.slice(-8).toUpperCase()}</div>
                </div>
                <div style={{ ...styles.statusBadge, color: STATUS_LABELS[order.status]?.color }}>
                  {STATUS_LABELS[order.status]?.label || order.status}
                </div>
              </div>

              {order.items?.map((item, idx) => (
                <div key={idx} style={styles.orderItemRow}>
                  <span>{item.name} × {item.qty}</span>
                  <span>Rs {item.price * item.qty}</span>
                </div>
              ))}

              <div style={styles.orderTotalRow}>
                <span>Total</span>
                <span>Rs {order.total}</span>
              </div>

              {/* Action buttons depending on status */}
              <div style={styles.actionsRow}>
                <button className="btn-secondary" style={styles.smallBtn} onClick={() => onNavigate && onNavigate("invoice", order.id)}>
                  View Invoice
                </button>

                {order.status === "pending" && (
                  <button
                    className="btn-secondary"
                    style={{ ...styles.smallBtn, color: "#C0392B", borderColor: "#C0392B" }}
                    onClick={() => handleCancelOrder(order.id)}
                    disabled={actionLoading === order.id}
                  >
                    {actionLoading === order.id ? "Cancelling..." : "Cancel Order"}
                  </button>
                )}

                {order.status === "dispatched" && (
                  <button
                    className="btn-primary"
                    style={styles.smallBtn}
                    onClick={() => handleMarkReceived(order.id)}
                    disabled={actionLoading === order.id}
                  >
                    {actionLoading === order.id ? "Updating..." : "Mark as Received"}
                  </button>
                )}

                {order.status === "delivered" && (
                  <button className="btn-secondary" style={styles.smallBtn} onClick={() => onNavigate && onNavigate("dispute", order.id)}>
                    Report a Problem
                  </button>
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

  tabBar: { display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto", background: "#fff", borderBottom: "1px solid #eee0c0" },
  tabPill: { padding: "8px 14px", borderRadius: 20, border: "1.5px solid #eee0c0", fontSize: 12, fontWeight: 600, color: "#444", whiteSpace: "nowrap", cursor: "pointer" },
  tabPillActive: { background: "#0B3D2E", color: "#fff", borderColor: "#0B3D2E" },

  emptyText: { fontSize: 13, color: "#888", textAlign: "center", marginTop: 20 },
  emptyState: { textAlign: "center", padding: "60px 20px" },
  emptyTitle: { fontSize: 14, fontWeight: 700, color: "#0B3D2E" },

  orderCard: { background: "#fff", borderRadius: 14, border: "1px solid #eee0c0", padding: 16, marginBottom: 12 },
  orderHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  orderSeller: { fontSize: 13, fontWeight: 700, color: "#0B3D2E" },
  orderId: { fontSize: 10.5, color: "#999", marginTop: 2 },
  statusBadge: { fontSize: 11, fontWeight: 800, textTransform: "uppercase" },

  orderItemRow: { display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#444", marginBottom: 5 },
  orderTotalRow: { display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 800, color: "#0B3D2E", paddingTop: 8, marginTop: 4, borderTop: "1px solid #f0f0f0" },

  actionsRow: { display: "flex", gap: 8, marginTop: 12 },
  smallBtn: { flex: 1, padding: "9px 12px", fontSize: 12 }
};
