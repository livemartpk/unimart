// ============================================
// UniMart - Incoming Orders (Seller)
// Professional View Order modal with full details
// Flow: New Order → Packed → Dispatched → Delivered
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

const COURIERS = ["TCS", "Leopards", "M&P", "Pakistan Post", "Trax", "Swyft", "BlueEx", "Other"];

const STATUS_CONFIG = {
  pending:    { label: "New Order",   bg: "#FBF1DA", color: "#8a6d1f",  icon: "🆕" },
  packed:     { label: "Packed",      bg: "#E8F0FF", color: "#2C6E91",  icon: "📦" },
  dispatched: { label: "Dispatched",  bg: "#F0F5F0", color: "#0B3D2E",  icon: "🚚" },
  delivered:  { label: "Delivered",   bg: "#E3F2E1", color: "#2E7D32",  icon: "✅" },
  cancelled:  { label: "Cancelled",   bg: "#FCEAEA", color: "#C0392B",  icon: "❌" }
};

export default function IncomingOrders({ user, onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [viewOrder, setViewOrder] = useState(null);
  const [showDispatch, setShowDispatch] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({ courier: "", customCourier: "", date: "", trackingNumber: "" });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "orders"), where("sellerId", "==", user.uid));
      const snap = await getDocs(q);
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      loaded.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(loaded);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleMarkPacked = async (order) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: "packed",
        packedAt: serverTimestamp()
      });
      // Notify buyer
      const { addDoc, collection: col } = await import("firebase/firestore");
      await addDoc(col(db, "notifications"), {
        userId: order.buyerId,
        type: "order_update",
        message: `Great news! Your order #${order.id.slice(0,8)} has been packed and will be dispatched soon.`,
        orderId: order.id,
        read: false,
        createdAt: serverTimestamp()
      });
      setOrders(os => os.map(o => o.id === order.id ? { ...o, status: "packed" } : o));
      setViewOrder(v => v?.id === order.id ? { ...v, status: "packed" } : v);
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const handleDispatch = async () => {
    const courierName = dispatchForm.courier === "Other" ? dispatchForm.customCourier : dispatchForm.courier;
    if (!courierName || !dispatchForm.date || !dispatchForm.trackingNumber) {
      alert("Please fill in all dispatch details.");
      return;
    }
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "orders", viewOrder.id), {
        status: "dispatched",
        dispatchedAt: serverTimestamp(),
        dispatchDetails: {
          courierCompany: courierName,
          dispatchDate: dispatchForm.date,
          trackingNumber: dispatchForm.trackingNumber
        }
      });
      const { addDoc, collection: col } = await import("firebase/firestore");
      await addDoc(col(db, "notifications"), {
        userId: viewOrder.buyerId,
        type: "order_update",
        message: `Your order number ${viewOrder.orderGroupId || viewOrder.id} has been dispatched via ${courierName}. Tracking: ${dispatchForm.trackingNumber}`,
        orderId: viewOrder.id,
        orderGroupId: viewOrder.orderGroupId || null,
        read: false,
        createdAt: serverTimestamp()
      });
      setOrders(os => os.map(o => o.id === viewOrder.id ? { ...o, status: "dispatched", dispatchDetails: { courierCompany: courierName, dispatchDate: dispatchForm.date, trackingNumber: dispatchForm.trackingNumber } } : o));
      setViewOrder(v => ({ ...v, status: "dispatched", dispatchDetails: { courierCompany: courierName, dispatchDate: dispatchForm.date, trackingNumber: dispatchForm.trackingNumber } }));
      setShowDispatch(false);

      // Track sales count per product (used to rank "Just For You" on the homepage) — only once per order
      if (!viewOrder.salesTracked) {
        try {
          for (const item of viewOrder.items || []) {
            if (item.productId) {
              await updateDoc(doc(db, "products", item.productId), {
                salesCount: increment(item.qty || 1)
              });
            }
          }
          await updateDoc(doc(db, "orders", viewOrder.id), { salesTracked: true });
        } catch (salesErr) {
          console.error("Failed to track product sales:", salesErr);
        }
      }

      // Award points-per-sale (rate set by Super Admin in Policy Engine) — only once per order
      if (!viewOrder.pointsAwarded) {
        try {
          const policySnap = await getDoc(doc(db, "policies", "current"));
          const pointsPerSale = policySnap.exists() ? (policySnap.data().pointsPerSale ?? 10) : 10;
          await updateDoc(doc(db, "sellers", user.uid), { points: increment(pointsPerSale) });
          await updateDoc(doc(db, "orders", viewOrder.id), { pointsAwarded: true });
        } catch (pointsErr) {
          console.error("Failed to award points:", pointsErr);
        }
      }
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const filteredOrders = orders.filter(o => filter === "all" || o.status === filter);
  const counts = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    packed: orders.filter(o => o.status === "packed").length,
    dispatched: orders.filter(o => o.status === "dispatched").length,
    delivered: orders.filter(o => o.status === "delivered").length
  };

  return (
    <div style={s.page}>
      <div style={s.header}><div style={s.headerTitle}>Incoming Orders</div></div>

      {/* Filter Tabs */}
      <div style={s.filterRow}>
        {[["all","📋","All"], ["pending","🆕","New Order"], ["packed","📦","Packed"], ["dispatched","🚚","Dispatch"], ["delivered","✅","Delivered"]].map(([key, icon, label]) => (
          <div key={key} style={{ ...s.pill, ...(filter === key ? s.pillActive : {}) }} onClick={() => setFilter(key)}>
            {icon} {label} {counts[key] > 0 && `(${counts[key]})`}
          </div>
        ))}
      </div>

      {/* Orders List */}
      <div style={{ padding: "12px 16px 100px" }}>
        {loading ? <p style={s.emptyText}>Loading orders...</p>
          : filteredOrders.length === 0 ? <p style={s.emptyText}>No orders here.</p>
          : filteredOrders.map(o => {
            const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
            return (
              <div key={o.id} style={s.orderCard}>
                {/* Card Top */}
                <div style={s.cardTop}>
                  <div>
                    <div style={s.orderId}>Order #{o.id.slice(0, 8).toUpperCase()}</div>
                    <div style={s.buyerName}>{o.buyerName || "Buyer"}</div>
                    <div style={s.orderDate}>{o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString() : "—"}</div>
                  </div>
                  <div style={{ ...s.statusBadge, background: cfg.bg, color: cfg.color }}>
                    {cfg.icon} {cfg.label}
                  </div>
                </div>

                <div style={s.orderTotal}>Rs {(o.grandTotal || 0).toLocaleString()}</div>

                {/* Items preview */}
                <div style={s.itemsPreview}>
                  {(o.items || []).slice(0, 2).map((item, i) => (
                    <span key={i} style={s.itemChip}>{item.name} ×{item.qty}</span>
                  ))}
                  {(o.items || []).length > 2 && <span style={s.itemChip}>+{o.items.length - 2} more</span>}
                </div>

                {/* Dispatch info if dispatched */}
                {o.status === "dispatched" && o.dispatchDetails && (
                  <div style={s.dispatchInfoChip}>
                    🚚 {o.dispatchDetails.courierCompany} · {o.dispatchDetails.trackingNumber}
                  </div>
                )}

                {/* View + Quick Actions */}
                <div style={s.cardActions}>
                  <button style={s.viewBtn} onClick={() => setViewOrder(o)}>👁 View Order</button>
                  {o.status === "pending" && (
                    <button style={s.packBtn} onClick={() => { setViewOrder(o); }}>📦 Pack</button>
                  )}
                  {o.status === "packed" && (
                    <button style={s.dispatchBtn} onClick={() => { setViewOrder(o); setShowDispatch(true); }}>🚚 Dispatch</button>
                  )}
                </div>
              </div>
            );
          })
        }
      </div>

      {/* ===== VIEW ORDER MODAL ===== */}
      {viewOrder && (
        <div style={s.overlay} onClick={() => { setViewOrder(null); setShowDispatch(false); }}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={s.modalHeader}>
              <div>
                <div style={s.modalTitle}>Order Details</div>
                <div style={s.modalOrderId}>#{viewOrder.id.slice(0, 8).toUpperCase()}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ ...s.statusBadge, ...(STATUS_CONFIG[viewOrder.status] || {}) }}>
                  {STATUS_CONFIG[viewOrder.status]?.icon} {STATUS_CONFIG[viewOrder.status]?.label}
                </div>
                <div style={s.closeBtn} onClick={() => { setViewOrder(null); setShowDispatch(false); }}>✕</div>
              </div>
            </div>

            <div style={s.modalBody}>

              {/* Buyer Info */}
              <Section title="👤 Customer Info">
                <InfoRow label="Name" value={viewOrder.buyerName || "—"} />
                <InfoRow label="Phone" value={viewOrder.buyerPhone || "—"} />
                <InfoRow label="City" value={viewOrder.shippingAddress?.city || "—"} />
                <InfoRow label="Address" value={viewOrder.shippingAddress?.fullAddress || "—"} />
              </Section>

              {/* Items */}
              <Section title="🛍️ Ordered Items">
                {(viewOrder.items || []).map((item, i) => (
                  <div key={i} style={s.itemRow}>
                    {item.image ? (
                      <img src={item.image} alt={item.name} style={s.itemImg} />
                    ) : (
                      <div style={s.itemImgPlaceholder}>🛍️</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={s.itemName}>{item.name}</div>
                      {item.color && <div style={s.itemMeta}>Color: {item.color}</div>}
                      {item.size && <div style={s.itemMeta}>Size: {item.size}</div>}
                      <div style={s.itemMeta}>Qty: {item.qty}</div>
                    </div>
                    <div style={s.itemPrice}>Rs {(item.price * item.qty).toLocaleString()}</div>
                  </div>
                ))}
              </Section>

              {/* Price Summary */}
              <Section title="💰 Price Summary">
                <InfoRow label="Subtotal" value={`Rs ${(viewOrder.subtotal || 0).toLocaleString()}`} />
                <InfoRow label="Shipping" value={`Rs ${(viewOrder.shippingCharge || 0).toLocaleString()}`} />
                <div style={s.grandTotalRow}>
                  <span>Grand Total</span>
                  <span>Rs {(viewOrder.grandTotal || 0).toLocaleString()}</span>
                </div>
              </Section>

              {/* Payment */}
              <Section title="💳 Payment">
                <InfoRow label="Method" value={viewOrder.paymentMethod === "cod" ? "💵 Cash on Delivery" : "💳 Online Payment"} />
              </Section>

              {/* Dispatch Info */}
              {viewOrder.dispatchDetails && (
                <Section title="🚚 Dispatch Info">
                  <InfoRow label="Courier" value={viewOrder.dispatchDetails.courierCompany} />
                  <InfoRow label="Tracking #" value={viewOrder.dispatchDetails.trackingNumber} />
                  <InfoRow label="Date" value={viewOrder.dispatchDetails.dispatchDate} />
                </Section>
              )}

              {/* Dispatch Form */}
              {showDispatch && viewOrder.status === "packed" && (
                <div style={s.dispatchForm}>
                  <div style={s.dispatchFormTitle}>🚚 Add Dispatch Details</div>

                  <label className="input-label">Courier Company</label>
                  <select className="input-field" style={{ marginBottom: 10 }}
                    value={dispatchForm.courier}
                    onChange={e => setDispatchForm(f => ({ ...f, courier: e.target.value }))}>
                    <option value="">Select courier...</option>
                    {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  {dispatchForm.courier === "Other" && (
                    <>
                      <label className="input-label">Courier Name</label>
                      <input className="input-field" style={{ marginBottom: 10 }} placeholder="Enter courier name"
                        value={dispatchForm.customCourier}
                        onChange={e => setDispatchForm(f => ({ ...f, customCourier: e.target.value }))} />
                    </>
                  )}

                  <label className="input-label">Dispatch Date</label>
                  <input type="date" className="input-field" style={{ marginBottom: 10 }}
                    value={dispatchForm.date}
                    onChange={e => setDispatchForm(f => ({ ...f, date: e.target.value }))} />

                  <label className="input-label">Tracking Number</label>
                  <input className="input-field" style={{ marginBottom: 14 }} placeholder="e.g. TCS123456789"
                    value={dispatchForm.trackingNumber}
                    onChange={e => setDispatchForm(f => ({ ...f, trackingNumber: e.target.value }))} />

                  <button style={s.confirmDispatchBtn} onClick={handleDispatch} disabled={actionLoading}>
                    {actionLoading ? "Processing..." : "✅ Confirm Dispatch"}
                  </button>
                  <button style={s.cancelDispatchBtn} onClick={() => setShowDispatch(false)}>Cancel</button>
                </div>
              )}

              {/* Action Buttons */}
              <div style={s.modalActions}>
                <button style={s.invoiceModalBtn} onClick={() => onNavigate && onNavigate("invoice", viewOrder.id)}>
                  🧾 Print Invoice
                </button>
                <button style={s.slipModalBtn} onClick={() => onNavigate && onNavigate("dispatch-slip", viewOrder.id)}>
                  📋 Dispatch Slip
                </button>
              </div>

              {viewOrder.status === "pending" && (
                <button style={s.packModalBtn} onClick={() => handleMarkPacked(viewOrder)} disabled={actionLoading}>
                  {actionLoading ? "Processing..." : "📦 Mark as Packed"}
                </button>
              )}

              {viewOrder.status === "packed" && !showDispatch && (
                <button style={s.dispatchModalBtn} onClick={() => { setShowDispatch(true); setDispatchForm({ courier: "", customCourier: "", date: "", trackingNumber: "" }); }}>
                  🚚 Mark as Dispatched
                </button>
              )}

              {viewOrder.status === "dispatched" && (
                <div style={s.waitingNote}>⏳ Waiting for buyer to confirm delivery</div>
              )}

              {viewOrder.status === "delivered" && (
                <div style={s.deliveredNote}>✅ Delivered — Order Complete</div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#0B3D2E", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</div>
      <div style={{ background: "#F8F9FA", borderRadius: 10, padding: 12 }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 10 }}>
      <span style={{ fontSize: 11.5, color: "#888", minWidth: 70 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 500, textAlign: "right", flex: 1 }}>{value || "—"}</span>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },

  filterRow: { display: "flex", gap: 8, padding: "14px 16px", overflowX: "auto" },
  pill: { padding: "8px 14px", borderRadius: 20, border: "1.5px solid #eee0c0", fontSize: 11.5, fontWeight: 600, color: "#0B3D2E", whiteSpace: "nowrap", cursor: "pointer", background: "#fff" },
  pillActive: { background: "#0B3D2E", color: "#fff", borderColor: "#0B3D2E" },
  emptyText: { fontSize: 13, color: "#888", padding: "20px 0" },

  orderCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  orderId: { fontSize: 13.5, fontWeight: 700, color: "#1a1a1a" },
  buyerName: { fontSize: 12, color: "#0B3D2E", fontWeight: 600, marginTop: 2 },
  orderDate: { fontSize: 11, color: "#aaa", marginTop: 1 },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 20 },
  orderTotal: { fontSize: 16, fontWeight: 800, color: "#0B3D2E", marginBottom: 8 },
  itemsPreview: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  itemChip: { fontSize: 10.5, background: "#F0F5F0", color: "#0B3D2E", padding: "3px 8px", borderRadius: 10, fontWeight: 600 },
  dispatchInfoChip: { fontSize: 11.5, color: "#0B3D2E", background: "#F0F5F0", borderRadius: 8, padding: "6px 10px", marginBottom: 8 },
  cardActions: { display: "flex", gap: 8 },
  viewBtn: { flex: 1, padding: "10px 0", background: "#0B3D2E", border: "none", borderRadius: 10, color: "#D4AF37", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  packBtn: { flex: 1, padding: "10px 0", background: "#FBF1DA", border: "1px solid #D4AF37", borderRadius: 10, color: "#8a6d1f", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  dispatchBtn: { flex: 1, padding: "10px 0", background: "#E3F2E1", border: "1px solid #BFE3CC", borderRadius: 10, color: "#2E7D32", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "flex-end" },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid #f0f0f0", background: "#fff", flexShrink: 0 },
  modalTitle: { fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, color: "#0B3D2E" },
  modalOrderId: { fontSize: 11.5, color: "#888", marginTop: 2 },
  closeBtn: { fontSize: 18, color: "#888", cursor: "pointer", padding: "4px 8px" },
  modalBody: { overflowY: "auto", padding: "16px 20px 24px", flex: 1 },

  itemRow: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10, paddingBottom: 10, borderBottom: "1px dashed #f0f0f0" },
  itemImg: { width: 56, height: 56, borderRadius: 10, objectFit: "cover", flexShrink: 0 },
  itemImgPlaceholder: { width: 56, height: 56, borderRadius: 10, background: "#F0F5F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 },
  itemName: { fontSize: 13.5, fontWeight: 700, color: "#1a1a1a", marginBottom: 3 },
  itemMeta: { fontSize: 11.5, color: "#888" },
  itemPrice: { fontSize: 14, fontWeight: 800, color: "#0B3D2E", whiteSpace: "nowrap" },

  grandTotalRow: { display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, color: "#0B3D2E", paddingTop: 8, borderTop: "1px solid #eee0c0", marginTop: 6 },

  dispatchForm: { background: "#F0F5F0", borderRadius: 14, padding: 16, marginBottom: 14 },
  dispatchFormTitle: { fontSize: 14, fontWeight: 700, color: "#0B3D2E", marginBottom: 12 },
  confirmDispatchBtn: { width: "100%", padding: "13px 0", background: "#0B3D2E", border: "none", borderRadius: 12, color: "#D4AF37", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 },
  cancelDispatchBtn: { width: "100%", padding: "11px 0", background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, color: "#888", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },

  modalActions: { display: "flex", gap: 8, marginBottom: 10 },
  invoiceModalBtn: { flex: 1, padding: "11px 0", background: "#F0F5F0", border: "1px solid #eee0c0", borderRadius: 10, color: "#0B3D2E", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  slipModalBtn: { flex: 1, padding: "11px 0", background: "#F0F5F0", border: "1px solid #eee0c0", borderRadius: 10, color: "#0B3D2E", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  packModalBtn: { width: "100%", padding: "13px 0", background: "#D4AF37", border: "none", borderRadius: 12, color: "#0B3D2E", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 },
  dispatchModalBtn: { width: "100%", padding: "13px 0", background: "#0B3D2E", border: "none", borderRadius: 12, color: "#D4AF37", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 },
  waitingNote: { textAlign: "center", fontSize: 13, color: "#888", padding: "12px 0", fontStyle: "italic" },
  deliveredNote: { textAlign: "center", fontSize: 14, color: "#2E7D32", fontWeight: 700, padding: "12px 0" }
};
