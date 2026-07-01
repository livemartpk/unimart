// ============================================
// UniMart - Checkout Page (Fixed)
// ============================================

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

const SHIPPING_PER_SELLER = 150;

export default function Checkout({ user, cartItems = [], onNavigate, onOrderPlaced }) {
  const [address, setAddress] = useState({
    fullName: user?.fullName || "",
    phone: "",
    city: "",
    fullAddress: ""
  });
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressSaved, setAddressSaved] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Group cart items by seller
  const groupedBySeller = Object.values(
    cartItems.reduce((groups, item) => {
      if (!groups[item.sellerId]) {
        groups[item.sellerId] = { sellerId: item.sellerId, sellerName: item.sellerName, items: [] };
      }
      groups[item.sellerId].items.push(item);
      return groups;
    }, {})
  );

  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalShipping = groupedBySeller.length * SHIPPING_PER_SELLER;
  const grandTotal = subtotal + totalShipping;

  const handlePlaceOrder = async () => {
    setError("");
    if (!addressSaved || !address.fullAddress || !address.city || !address.phone) {
      setError("Please add and save your delivery address first.");
      return;
    }
    setPlacing(true);
    try {
      const orderGroupId = `OG-${Date.now()}`;
      const placedOrderIds = [];

      for (const group of groupedBySeller) {
        const sellerSubtotal = group.items.reduce((s, i) => s + i.price * i.qty, 0);
        const orderRef = await addDoc(collection(db, "orders"), {
          orderGroupId,
          buyerId: user.uid,
          buyerName: address.fullName || user.displayName || "",
          buyerPhone: address.phone,
          sellerId: group.sellerId,
          sellerName: group.sellerName,
          items: group.items.map(i => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            qty: i.qty,
            image: i.image || null
          })),
          subtotal: sellerSubtotal,
          shippingCharge: SHIPPING_PER_SELLER,
          grandTotal: sellerSubtotal + SHIPPING_PER_SELLER,
          shippingAddress: address,
          paymentMethod,
          status: "pending",
          createdAt: serverTimestamp(),
          pendingDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
        placedOrderIds.push(orderRef.id);

        // Notify seller
        await addDoc(collection(db, "notifications"), {
          userId: group.sellerId,
          type: "order_update",
          message: `New order received! Order #${orderRef.id.slice(0,8)} — Rs ${sellerSubtotal + SHIPPING_PER_SELLER}`,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      setPlacing(false);
      setOrderSuccess({ orderGroupId, orderIds: placedOrderIds });
      if (onOrderPlaced) onOrderPlaced();

    } catch (err) {
      console.error(err);
      setPlacing(false);
      setError("Something went wrong. Please try again.");
    }
  };

  // Order Success Screen
  if (orderSuccess) {
    return (
      <div style={s.page}>
        <div style={s.successBox}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
          <h2 style={s.successTitle}>Order Placed!</h2>
          <p style={s.successText}>Your order has been placed successfully. The seller will confirm within 24 hours.</p>
          <div style={s.orderIdBox}>
            <div style={{ fontSize: 11, color: "#888" }}>Order Group ID</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0B3D2E" }}>{orderSuccess.orderGroupId}</div>
          </div>
          <button className="btn-primary" style={{ width: "100%", marginBottom: 10 }} onClick={() => onNavigate && onNavigate("orders")}>
            Track My Orders
          </button>
          <button className="btn-secondary" style={{ width: "100%" }} onClick={() => onNavigate && onNavigate("home")}>
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.backBtn} onClick={() => onNavigate && onNavigate("cart")}>←</div>
        <div style={s.headerTitle}>Checkout</div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ padding: "16px 16px 200px" }}>

        {/* ===== Delivery Address ===== */}
        <div style={s.card}>
          <div style={s.cardTitle}>📍 Delivery Address</div>
          {!addressSaved ? (
            <div>
              <input className="input-field" style={{ marginBottom: 8 }} placeholder="Full Name" value={address.fullName} onChange={e => setAddress(a => ({ ...a, fullName: e.target.value }))} />
              <input className="input-field" style={{ marginBottom: 8 }} placeholder="Phone Number" value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: e.target.value }))} />
              <input className="input-field" style={{ marginBottom: 8 }} placeholder="City" value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} />
              <textarea className="input-field" rows={2} placeholder="Full Address (street, area, landmark)" value={address.fullAddress} onChange={e => setAddress(a => ({ ...a, fullAddress: e.target.value }))} style={{ resize: "none", fontFamily: "inherit", marginBottom: 10 }} />
              <button className="btn-primary" style={{ width: "100%" }} onClick={() => {
                if (!address.phone || !address.city || !address.fullAddress) { setError("Fill all address fields."); return; }
                setError("");
                setAddressSaved(true);
              }}>
                Save Address
              </button>
            </div>
          ) : (
            <div>
              <div style={s.addressSaved}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{address.fullName}</div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{address.fullAddress}, {address.city}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{address.phone}</div>
                </div>
                <div style={s.changeBtn} onClick={() => setAddressSaved(false)}>Change</div>
              </div>
            </div>
          )}
        </div>

        {/* ===== Order Items ===== */}
        {groupedBySeller.map(group => (
          <div key={group.sellerId} style={s.card}>
            <div style={s.cardTitle}>🏬 {group.sellerName}</div>
            {group.items.map((item, i) => (
              <div key={i} style={s.itemRow}>
                {item.image && <img src={item.image} alt={item.name} style={s.itemImg} />}
                <div style={{ flex: 1 }}>
                  <div style={s.itemName}>{item.name}</div>
                  <div style={s.itemQty}>Qty: {item.qty}</div>
                </div>
                <div style={s.itemPrice}>Rs {(item.price * item.qty).toLocaleString()}</div>
              </div>
            ))}
            <div style={s.shippingRow}>
              <span style={{ color: "#888", fontSize: 12 }}>Shipping</span>
              <span style={{ color: "#888", fontSize: 12 }}>Rs {SHIPPING_PER_SELLER}</span>
            </div>
          </div>
        ))}

        {/* ===== Payment Method ===== */}
        <div style={s.card}>
          <div style={s.cardTitle}>💳 Payment Method</div>
          <div style={{ ...s.payOption, ...(paymentMethod === "cod" ? s.payActive : {}) }} onClick={() => setPaymentMethod("cod")}>
            <span>💵 Cash on Delivery</span>
            {paymentMethod === "cod" && <span style={s.check}>✓</span>}
          </div>
          <div style={{ ...s.payOption, ...(paymentMethod === "online" ? s.payActive : {}) }} onClick={() => setPaymentMethod("online")}>
            <span>💳 Online Payment</span>
            {paymentMethod === "online" && <span style={s.check}>✓</span>}
          </div>
        </div>

        {/* ===== Summary ===== */}
        <div style={s.card}>
          <div style={s.cardTitle}>🧾 Order Summary</div>
          <div style={s.summaryRow}><span>Subtotal</span><span>Rs {subtotal.toLocaleString()}</span></div>
          <div style={s.summaryRow}><span>Shipping ({groupedBySeller.length} seller{groupedBySeller.length > 1 ? "s" : ""})</span><span>Rs {totalShipping}</span></div>
          <div style={s.summaryDivider} />
          <div style={s.summaryTotal}><span>Grand Total</span><span>Rs {grandTotal.toLocaleString()}</span></div>
        </div>

        {error && <p className="error-text">{error}</p>}
      </div>

      {/* Place Order Button */}
      <div style={s.bottomBar}>
        <button className="btn-primary" style={{ width: "100%", fontSize: 15 }} onClick={handlePlaceOrder} disabled={placing}>
          {placing ? "Placing order..." : `🛒 Place Order — Rs ${grandTotal.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "#fff", borderBottom: "1px solid #eee0c0", position: "sticky", top: 0, zIndex: 10 },
  backBtn: { width: 36, height: 36, borderRadius: "50%", background: "#F0F5F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18 },
  headerTitle: { fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, color: "#0B3D2E" },

  card: { background: "#fff", borderRadius: 14, border: "1px solid #eee0c0", padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "#0B3D2E", marginBottom: 12 },

  addressSaved: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  changeBtn: { fontSize: 12, color: "#0B3D2E", fontWeight: 700, cursor: "pointer", marginLeft: 12, flexShrink: 0 },

  itemRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  itemImg: { width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 },
  itemName: { fontSize: 13, fontWeight: 600, color: "#1a1a1a" },
  itemQty: { fontSize: 11, color: "#888", marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: 700, color: "#0B3D2E", whiteSpace: "nowrap" },
  shippingRow: { display: "flex", justifyContent: "space-between", marginTop: 6, paddingTop: 8, borderTop: "1px dashed #eee0c0" },

  payOption: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #eee0c0", marginBottom: 8, fontSize: 13, cursor: "pointer" },
  payActive: { borderColor: "#0B3D2E", background: "#F0F5F0" },
  check: { color: "#0B3D2E", fontWeight: 800, fontSize: 16 },

  summaryRow: { display: "flex", justifyContent: "space-between", fontSize: 13, color: "#555", marginBottom: 8 },
  summaryDivider: { height: 1, background: "#eee0c0", margin: "8px 0" },
  summaryTotal: { display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, color: "#0B3D2E" },

  bottomBar: { position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #eee0c0", padding: 14 },

  successBox: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" },
  successTitle: { fontFamily: "Georgia, serif", fontSize: 24, color: "#0B3D2E", marginBottom: 8 },
  successText: { fontSize: 13.5, color: "#555", lineHeight: 1.6, marginBottom: 20 },
  orderIdBox: { background: "#F0F5F0", border: "1px solid #eee0c0", borderRadius: 10, padding: "10px 16px", marginBottom: 20, width: "100%" }
};
