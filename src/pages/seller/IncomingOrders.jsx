// ============================================
// UniMart - Incoming Orders (Seller)
// Professional View Order modal with full details
// Flow: New Order → Packed → Dispatched → Delivered
// [Tailwind / Airbnb-inspired design system]
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { formatPrice } from "../../utils/countries";

const COURIERS = ["TCS", "Leopards", "M&P", "Pakistan Post", "Trax", "Swyft", "BlueEx", "Other"];

const STATUS_CONFIG = {
  pending:    { label: "New Order",   className: "bg-yellow-50 text-yellow-800",  icon: "🆕" },
  packed:     { label: "Packed",      className: "bg-blue-50 text-blue-700",  icon: "📦" },
  dispatched: { label: "Dispatched",  className: "bg-surface-soft text-ink",  icon: "🚚" },
  delivered:  { label: "Delivered",   className: "bg-green-50 text-green-700",  icon: "✅" },
  cancelled:  { label: "Cancelled",   className: "bg-rausch-disabled/30 text-rausch",  icon: "❌" }
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
    <div className="min-h-screen bg-canvas">

      {/* Filter Tabs */}
      <div className="flex gap-2 px-4 py-3.5 overflow-x-auto">
        {[["all","📋","All"], ["pending","🆕","New Order"], ["packed","📦","Packed"], ["dispatched","🚚","Dispatch"], ["delivered","✅","Delivered"]].map(([key, icon, label]) => (
          <div
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3.5 py-2 rounded-full border text-[11.5px] font-semibold whitespace-nowrap cursor-pointer
            ${filter === key ? "bg-ink text-white border-ink" : "bg-canvas text-ink border-hairline"}`}
          >
            {icon} {label} {counts[key] > 0 && `(${counts[key]})`}
          </div>
        ))}
      </div>

      {/* Orders List */}
      <div className="px-4 pt-3 pb-[100px]">
        {loading ? <p className="text-body-sm text-muted py-5">Loading orders...</p>
          : filteredOrders.length === 0 ? <p className="text-body-sm text-muted py-5">No orders here.</p>
          : filteredOrders.map(o => {
            const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
            return (
              <div key={o.id} className="bg-canvas border border-hairline rounded-card p-3.5 mb-2.5">
                <div className="flex justify-between items-start mb-1.5">
                  <div>
                    <div className="text-[13.5px] font-bold text-ink">Order #{o.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-xs text-ink font-semibold mt-0.5">{o.buyerName || "Buyer"}</div>
                    <div className="text-[11px] text-muted mt-0.5">{o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString() : "—"}</div>
                  </div>
                  <div className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${cfg.className}`}>
                    {cfg.icon} {cfg.label}
                  </div>
                </div>

                <div className="text-lg font-extrabold text-ink mb-2">{formatPrice(o.grandTotal || 0, o.country)}</div>

                <div className="flex gap-1.5 flex-wrap mb-2.5">
                  {(o.items || []).slice(0, 2).map((item, i) => (
                    <span key={i} className="text-[10.5px] bg-surface-soft text-ink px-2 py-1 rounded font-semibold">{item.name} ×{item.qty}</span>
                  ))}
                  {(o.items || []).length > 2 && <span className="text-[10.5px] bg-surface-soft text-ink px-2 py-1 rounded font-semibold">+{o.items.length - 2} more</span>}
                </div>

                {o.status === "dispatched" && o.dispatchDetails && (
                  <div className="text-[11.5px] text-ink bg-surface-soft rounded-lg px-2.5 py-1.5 mb-2">
                    🚚 {o.dispatchDetails.courierCompany} · {o.dispatchDetails.trackingNumber}
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setViewOrder(o)} className="flex-1 py-2.5 bg-ink hover:bg-rausch text-white rounded-btn text-body-sm font-bold transition-colors">👁 View Order</button>
                  {o.status === "pending" && (
                    <button onClick={() => setViewOrder(o)} className="flex-1 py-2.5 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-btn text-body-sm font-bold">📦 Pack</button>
                  )}
                  {o.status === "packed" && (
                    <button onClick={() => { setViewOrder(o); setShowDispatch(true); }} className="flex-1 py-2.5 bg-green-50 border border-green-300 text-green-700 rounded-btn text-body-sm font-bold">🚚 Dispatch</button>
                  )}
                </div>
              </div>
            );
          })
        }
      </div>

      {/* ===== VIEW ORDER MODAL ===== */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/55 z-[200] flex items-end" onClick={() => { setViewOrder(null); setShowDispatch(false); }}>
          <div className="bg-canvas rounded-t-card w-full max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

            <div className="flex justify-between items-center px-5 py-4.5 border-b border-hairline-soft bg-canvas flex-shrink-0">
              <div>
                <div className="text-title-md text-ink font-bold">Order Details</div>
                <div className="text-[11.5px] text-muted mt-0.5">#{viewOrder.id.slice(0, 8).toUpperCase()}</div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${STATUS_CONFIG[viewOrder.status]?.className || ""}`}>
                  {STATUS_CONFIG[viewOrder.status]?.icon} {STATUS_CONFIG[viewOrder.status]?.label}
                </div>
                <div onClick={() => { setViewOrder(null); setShowDispatch(false); }} className="text-lg text-muted cursor-pointer px-2 py-1">✕</div>
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-4 pb-6 flex-1">

              <Section title="👤 Customer Info">
                <InfoRow label="Name" value={viewOrder.buyerName || "—"} />
                <InfoRow label="Phone" value={viewOrder.buyerPhone || "—"} />
                <InfoRow label="City" value={viewOrder.shippingAddress?.city || "—"} />
                <InfoRow label="Address" value={viewOrder.shippingAddress?.fullAddress || "—"} />
              </Section>

              <Section title="🛍️ Ordered Items">
                {(viewOrder.items || []).map((item, i) => (
                  <div key={i} className="flex items-start gap-3 mb-2.5 pb-2.5 border-b border-dashed border-hairline-soft">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-14 h-14 rounded-btn object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-btn bg-surface-soft flex items-center justify-center text-2xl flex-shrink-0">🛍️</div>
                    )}
                    <div className="flex-1">
                      <div className="text-[13.5px] font-bold text-ink mb-0.5">{item.name}</div>
                      {item.color && <div className="text-[11.5px] text-muted">Color: {item.color}</div>}
                      {item.size && <div className="text-[11.5px] text-muted">Size: {item.size}</div>}
                      <div className="text-[11.5px] text-muted">Qty: {item.qty}</div>
                    </div>
                    <div className="text-sm font-extrabold text-ink whitespace-nowrap">{formatPrice(item.price * item.qty, viewOrder.country)}</div>
                  </div>
                ))}
              </Section>

              <Section title="💰 Price Summary">
                <InfoRow label="Subtotal" value={formatPrice(viewOrder.subtotal || 0, viewOrder.country)} />
                <InfoRow label="Shipping" value={formatPrice(viewOrder.shippingCharge || 0, viewOrder.country)} />
                <div className="flex justify-between text-[15px] font-extrabold text-ink pt-2 border-t border-hairline mt-1.5">
                  <span>Grand Total</span>
                  <span>{formatPrice(viewOrder.grandTotal || 0, viewOrder.country)}</span>
                </div>
              </Section>

              <Section title="💳 Payment">
                <InfoRow label="Method" value={viewOrder.paymentMethod === "cod" ? "💵 Cash on Delivery" : "💳 Online Payment"} />
              </Section>

              {viewOrder.dispatchDetails && (
                <Section title="🚚 Dispatch Info">
                  <InfoRow label="Courier" value={viewOrder.dispatchDetails.courierCompany} />
                  <InfoRow label="Tracking #" value={viewOrder.dispatchDetails.trackingNumber} />
                  <InfoRow label="Date" value={viewOrder.dispatchDetails.dispatchDate} />
                </Section>
              )}

              {showDispatch && viewOrder.status === "packed" && (
                <div className="bg-surface-soft rounded-card p-4 mb-3.5">
                  <div className="text-body-sm font-bold text-ink mb-3">🚚 Add Dispatch Details</div>

                  <label className="block text-title-sm text-ink mb-1.5">Courier Company</label>
                  <select className={`${inputClass} mb-2.5`}
                    value={dispatchForm.courier}
                    onChange={e => setDispatchForm(f => ({ ...f, courier: e.target.value }))}>
                    <option value="">Select courier...</option>
                    {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  {dispatchForm.courier === "Other" && (
                    <>
                      <label className="block text-title-sm text-ink mb-1.5">Courier Name</label>
                      <input className={`${inputClass} mb-2.5`} placeholder="Enter courier name"
                        value={dispatchForm.customCourier}
                        onChange={e => setDispatchForm(f => ({ ...f, customCourier: e.target.value }))} />
                    </>
                  )}

                  <label className="block text-title-sm text-ink mb-1.5">Dispatch Date</label>
                  <input type="date" className={`${inputClass} mb-2.5`}
                    value={dispatchForm.date}
                    onChange={e => setDispatchForm(f => ({ ...f, date: e.target.value }))} />

                  <label className="block text-title-sm text-ink mb-1.5">Tracking Number</label>
                  <input className={`${inputClass} mb-3.5`} placeholder="e.g. TCS123456789"
                    value={dispatchForm.trackingNumber}
                    onChange={e => setDispatchForm(f => ({ ...f, trackingNumber: e.target.value }))} />

                  <button onClick={handleDispatch} disabled={actionLoading} className="w-full h-12 rounded-btn bg-rausch hover:bg-rausch-active disabled:bg-rausch-disabled text-white text-title-sm font-semibold mb-2 transition-colors">
                    {actionLoading ? "Processing..." : "✅ Confirm Dispatch"}
                  </button>
                  <button onClick={() => setShowDispatch(false)} className="w-full h-11 rounded-btn border border-hairline text-muted text-body-sm font-semibold">Cancel</button>
                </div>
              )}

              <div className="flex gap-2 mb-2.5">
                <button onClick={() => onNavigate && onNavigate("invoice", viewOrder.id)} className="flex-1 py-2.5 bg-surface-soft border border-hairline rounded-btn text-ink text-[12.5px] font-bold">
                  🧾 Print Invoice
                </button>
                <button onClick={() => onNavigate && onNavigate("dispatch-slip", viewOrder.id)} className="flex-1 py-2.5 bg-surface-soft border border-hairline rounded-btn text-ink text-[12.5px] font-bold">
                  📋 Dispatch Slip
                </button>
              </div>

              {viewOrder.status === "pending" && (
                <button onClick={() => handleMarkPacked(viewOrder)} disabled={actionLoading} className="w-full h-12 rounded-btn bg-rausch hover:bg-rausch-active disabled:bg-rausch-disabled text-white text-title-sm font-extrabold mb-2 transition-colors">
                  {actionLoading ? "Processing..." : "📦 Mark as Packed"}
                </button>
              )}

              {viewOrder.status === "packed" && !showDispatch && (
                <button onClick={() => { setShowDispatch(true); setDispatchForm({ courier: "", customCourier: "", date: "", trackingNumber: "" }); }} className="w-full h-12 rounded-btn bg-ink hover:bg-rausch text-white text-title-sm font-extrabold mb-2 transition-colors">
                  🚚 Mark as Dispatched
                </button>
              )}

              {viewOrder.status === "dispatched" && (
                <div className="text-center text-body-sm text-muted py-3 italic">⏳ Waiting for buyer to confirm delivery</div>
              )}

              {viewOrder.status === "delivered" && (
                <div className="text-center text-body-sm text-green-700 font-bold py-3">✅ Delivered — Order Complete</div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass = "w-full h-12 px-4 rounded-btn border border-hairline text-body-md text-ink placeholder:text-muted focus:outline-none focus:border-ink bg-canvas";

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-bold text-ink mb-2 uppercase tracking-wide">{title}</div>
      <div className="bg-surface-soft rounded-btn p-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start mb-1.5 gap-2.5">
      <span className="text-[11.5px] text-muted min-w-[70px]">{label}</span>
      <span className="text-[13px] text-ink font-medium text-right flex-1">{value || "—"}</span>
    </div>
  );
}
