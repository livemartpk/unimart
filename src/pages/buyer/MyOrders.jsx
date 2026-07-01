// ============================================
// UniMart - My Orders + Order Tracking
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

const STATUS_STEPS = ["pending", "packed", "dispatched", "delivered"];

const STATUS_INFO = {
  pending:    { label: "Order Placed",  color: "#D4AF37", icon: "🛒", desc: "Waiting for seller to confirm" },
  packed:     { label: "Packed",        color: "#2C6E91", icon: "📦", desc: "Seller has packed your order" },
  dispatched: { label: "Dispatched",    color: "#0B3D2E", icon: "🚚", desc: "Your order is on the way" },
  delivered:  { label: "Delivered",     color: "#2E7D32", icon: "✅", desc: "Order delivered successfully" },
  cancelled:  { label: "Cancelled",     color: "#C0392B", icon: "❌", desc: "Order was cancelled" }
};

export default function MyOrders({ user, onNavigate }) {
  const [activeTab, setActiveTab] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => { loadOrders(); }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Without orderBy to avoid index requirement
      const q = query(collection(db, "orders"), where("buyerId", "==", user.uid));
      const snap = await getDocs(q);
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort client-side
      loaded.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(loaded);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm("Cancel this order?")) return;
    setActionLoading(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), { status: "cancelled", cancelledAt: serverTimestamp(), cancelledBy: "buyer" });
      await loadOrders();
    } catch (err) { console.error(err); }
    setActionLoading(null);
  };

  const handleMarkReceived = async (orderId) => {
    setActionLoading(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), { status: "delivered", deliveredMarkedBy: "buyer", deliveredAt: serverTimestamp() });
      await loadOrders();
    } catch (err) { console.error(err); }
    setActionLoading(null);
  };

  const [search, setSearch] = useState("");

  const TABS = ["all", "pending", "packed", "dispatched", "delivered", "cancelled"];
  const filtered = (activeTab === "all" ? orders : orders.filter(o => o.status === activeTab))
    .filter(o => !search || o.id.includes(search) || o.orderGroupId?.includes(search));

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.backBtn} onClick={() => onNavigate && onNavigate("home")}>←</div>
        <div style={s.headerTitle}>My Orders</div>
        <div style={{ width: 36 }} />
      </div>

      {/* Tabs */}
      <div style={s.tabBar}>
        {TABS.map(tab => {
          const count = tab === "all" ? orders.length : orders.filter(o => o.status === tab).length;
          return (
            <div key={tab} style={{ ...s.tabPill, ...(activeTab === tab ? s.tabActive : {}) }} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)} {count > 0 && `(${count})`}
            </div>
          );
        })}
      </div>

      {/* Search by Order ID */}
      <div style={{ padding: "10px 16px 0", background: "#fff", borderBottom: "1px solid #eee0c0" }}>
        <input
          className="input-field"
          placeholder="🔍 Search by Order ID or Group ID (OG-...)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 10 }}
        />
      </div>

      <div style={{ padding: "14px 16px 40px" }}>
        {loading ? <p style={s.emptyText}>Loading orders...</p>
          : filtered.length === 0 ? (
            <div style={s.emptyState}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>📦</div>
              <p style={s.emptyTitle}>No {activeTab === "all" ? "" : activeTab} orders yet</p>
            </div>
          ) : filtered.map(order => (
            <div key={order.id} style={s.orderCard}>

              {/* Order Header */}
              <div style={s.orderHead} onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                <div>
                  <div style={s.sellerName}>🏬 {order.sellerName}</div>
                  <div style={s.orderId}>Order #{order.id.slice(-8).toUpperCase()}</div>
                  <div style={s.orderDate}>{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : "—"}</div>
                </div>
                <div>
                  <div style={{ ...s.statusBadge, color: STATUS_INFO[order.status]?.color }}>
                    {STATUS_INFO[order.status]?.icon} {STATUS_INFO[order.status]?.label}
                  </div>
                  <div style={s.expandHint}>{expandedOrder === order.id ? "▲ Less" : "▼ Details"}</div>
                </div>
              </div>

              {/* Tracking Progress Bar */}
              {order.status !== "cancelled" && (
                <div style={s.trackingRow}>
                  {STATUS_STEPS.map((step, i) => {
                    const currentIdx = STATUS_STEPS.indexOf(order.status);
                    const done = i <= currentIdx;
                    const active = i === currentIdx;
                    return (
                      <div key={step} style={s.trackStep}>
                        <div style={{ ...s.trackDot, background: done ? "#0B3D2E" : "#eee0c0", ...(active ? { background: "#D4AF37", transform: "scale(1.3)" } : {}) }}>
                          {done ? "✓" : i + 1}
                        </div>
                        <div style={{ ...s.trackLabel, color: done ? "#0B3D2E" : "#aaa", fontWeight: active ? 800 : 400 }}>
                          {STATUS_INFO[step]?.label}
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div style={{ ...s.trackLine, background: i < currentIdx ? "#0B3D2E" : "#eee0c0" }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Status description */}
              <div style={s.statusDesc}>{STATUS_INFO[order.status]?.desc}</div>

              {/* Expanded Details */}
              {expandedOrder === order.id && (
                <div style={s.expandedBox}>
                  {/* Items */}
                  {order.items?.map((item, idx) => (
                    <div key={idx} style={s.itemRow}>
                      {item.image && <img src={item.image} alt={item.name} style={s.itemImg} />}
                      <div style={{ flex: 1 }}>
                        <div style={s.itemName}>{item.name}</div>
                        <div style={s.itemQty}>Qty: {item.qty}</div>
                      </div>
                      <div style={s.itemPrice}>Rs {(item.price * item.qty).toLocaleString()}</div>
                    </div>
                  ))}

                  {/* Delivery Address */}
                  {order.shippingAddress && (
                    <div style={s.addressBox}>
                      <div style={s.addressTitle}>📍 Delivery Address</div>
                      <div style={s.addressText}>{order.shippingAddress.fullName}</div>
                      <div style={s.addressText}>{order.shippingAddress.fullAddress}, {order.shippingAddress.city}</div>
                      <div style={s.addressText}>{order.shippingAddress.phone}</div>
                    </div>
                  )}

                  {/* Dispatch Info */}
                  {order.status === "dispatched" && order.dispatchDetails && (
                    <div style={s.dispatchBox}>
                      <div style={s.addressTitle}>🚚 Dispatch Details</div>
                      <div style={s.addressText}>Courier: {order.dispatchDetails.courierCompany}</div>
                      <div style={s.addressText}>Tracking #: {order.dispatchDetails.trackingNumber}</div>
                      <div style={s.addressText}>Dispatch Date: {order.dispatchDetails.dispatchDate}</div>
                    </div>
                  )}

                  {/* Total */}
                  <div style={s.totalRow}>
                    <span>Grand Total</span>
                    <span>Rs {(order.grandTotal || order.total || 0).toLocaleString()}</span>
                  </div>
                  <div style={s.totalRow}>
                    <span style={{ fontSize: 11, color: "#888" }}>Payment</span>
                    <span style={{ fontSize: 11, color: "#888" }}>{order.paymentMethod === "cod" ? "Cash on Delivery" : "Online"}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={s.actionsRow}>
                <button style={s.invoiceBtn} onClick={() => onNavigate && onNavigate("invoice", order.id)}>
                  🧾 Invoice
                </button>

                {order.status === "pending" && (
                  <button style={s.cancelBtn} onClick={() => handleCancel(order.id)} disabled={actionLoading === order.id}>
                    {actionLoading === order.id ? "..." : "❌ Cancel"}
                  </button>
                )}

                {order.status === "dispatched" && (
                  <button style={s.receivedBtn} onClick={() => handleMarkReceived(order.id)} disabled={actionLoading === order.id}>
                    {actionLoading === order.id ? "..." : "✅ Mark Received"}
                  </button>
                )}

                {order.status === "delivered" && (
                  <button style={s.problemBtn} onClick={() => onNavigate && onNavigate("disputes")}>
                    ⚠️ Report Problem
                  </button>
                )}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "#fff", borderBottom: "1px solid #eee0c0", position: "sticky", top: 0, zIndex: 10 },
  backBtn: { width: 36, height: 36, borderRadius: "50%", background: "#F0F5F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18 },
  headerTitle: { fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, color: "#0B3D2E" },

  tabBar: { display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto", background: "#fff", borderBottom: "1px solid #eee0c0" },
  tabPill: { padding: "8px 14px", borderRadius: 20, border: "1.5px solid #eee0c0", fontSize: 11.5, fontWeight: 600, color: "#444", whiteSpace: "nowrap", cursor: "pointer", background: "#fff" },
  tabActive: { background: "#0B3D2E", color: "#fff", borderColor: "#0B3D2E" },

  emptyText: { fontSize: 13, color: "#888", textAlign: "center", marginTop: 20 },
  emptyState: { textAlign: "center", padding: "60px 20px" },
  emptyTitle: { fontSize: 14, fontWeight: 700, color: "#0B3D2E" },

  orderCard: { background: "#fff", borderRadius: 16, border: "1px solid #eee0c0", padding: 16, marginBottom: 12, overflow: "hidden" },

  orderHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, cursor: "pointer" },
  sellerName: { fontSize: 13.5, fontWeight: 700, color: "#0B3D2E" },
  orderId: { fontSize: 10.5, color: "#999", marginTop: 2 },
  orderDate: { fontSize: 10.5, color: "#bbb", marginTop: 2 },
  statusBadge: { fontSize: 12, fontWeight: 800, textAlign: "right" },
  expandHint: { fontSize: 10, color: "#aaa", textAlign: "right", marginTop: 4 },

  // Tracking
  trackingRow: { display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 8, position: "relative" },
  trackStep: { display: "flex", flexDirection: "column", alignItems: "center", flex: 1, position: "relative" },
  trackDot: { width: 22, height: 22, borderRadius: "50%", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, transition: "all 0.2s" },
  trackLabel: { fontSize: 8.5, marginTop: 4, textAlign: "center", lineHeight: 1.2 },
  trackLine: { position: "absolute", top: 11, left: "50%", width: "100%", height: 2, zIndex: 0 },

  statusDesc: { fontSize: 11.5, color: "#888", textAlign: "center", marginBottom: 10, fontStyle: "italic" },

  expandedBox: { borderTop: "1px solid #f0f0f0", paddingTop: 12, marginTop: 4 },
  itemRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  itemImg: { width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 },
  itemName: { fontSize: 12.5, fontWeight: 600, color: "#1a1a1a" },
  itemQty: { fontSize: 11, color: "#888", marginTop: 2 },
  itemPrice: { fontSize: 12.5, fontWeight: 700, color: "#0B3D2E" },

  addressBox: { background: "#F0F5F0", borderRadius: 10, padding: 10, marginBottom: 10 },
  dispatchBox: { background: "#EEF8F1", borderRadius: 10, padding: 10, marginBottom: 10 },
  addressTitle: { fontSize: 11, fontWeight: 700, color: "#0B3D2E", marginBottom: 4 },
  addressText: { fontSize: 12, color: "#444" },

  totalRow: { display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, color: "#0B3D2E", marginTop: 8 },

  actionsRow: { display: "flex", gap: 8, marginTop: 12 },
  invoiceBtn: { flex: 1, padding: "10px 0", background: "#F0F5F0", border: "1px solid #eee0c0", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#0B3D2E", cursor: "pointer", fontFamily: "inherit" },
  cancelBtn: { flex: 1, padding: "10px 0", background: "#FCEAEA", border: "1px solid #f5c6c6", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#C0392B", cursor: "pointer", fontFamily: "inherit" },
  receivedBtn: { flex: 1, padding: "10px 0", background: "#E3F2E1", border: "1px solid #BFE3CC", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#2E7D32", cursor: "pointer", fontFamily: "inherit" },
  problemBtn: { flex: 1, padding: "10px 0", background: "#FBF1DA", border: "1px solid #D4AF37", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#8a6d1f", cursor: "pointer", fontFamily: "inherit" }
};
