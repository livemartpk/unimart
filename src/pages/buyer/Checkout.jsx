// ============================================
// UniMart - Checkout Page
// Logic: Splits cart into one order document PER
// SELLER (each with its own shipping charge),
// linked by an orderGroupId. No ledger entries
// are created yet — those only happen at Dispatch.
// ============================================

import { useState, useEffect } from "react";
import { collection, doc, addDoc, getDocs, query, where, serverTimestamp, runTransaction } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

const SHIPPING_PER_SELLER = 150;

export default function Checkout({ user, buyerProfile, groupedBySeller = [], onNavigate, onOrderPlaced }) {
  const [addresses, setAddresses] = useState(buyerProfile?.addresses || []);
  const [selectedAddressIdx, setSelectedAddressIdx] = useState(
    addresses.findIndex((a) => a.isDefault) !== -1 ? addresses.findIndex((a) => a.isDefault) : 0
  );
  const [paymentMethod, setPaymentMethod] = useState("cod"); // cod is default — most common in Pakistan
  const [voucherCode, setVoucherCode] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  const subtotal = groupedBySeller.reduce(
    (sum, g) => sum + g.items.reduce((s, i) => s + i.price * i.qty, 0),
    0
  );
  const totalShipping = groupedBySeller.length * SHIPPING_PER_SELLER;
  const grandTotal = subtotal + totalShipping;

  const selectedAddress = addresses[selectedAddressIdx];

  const handlePlaceOrder = async () => {
    setError("");

    if (!selectedAddress) {
      setError("Please add a delivery address before placing your order.");
      return;
    }

    setPlacing(true);
    try {
      const orderGroupId = `OG-${Date.now()}`;
      const placedOrderIds = [];

      // Create one order document per seller (per our multi-seller decision)
      for (const group of groupedBySeller) {
        const sellerSubtotal = group.items.reduce((s, i) => s + i.price * i.qty, 0);

        const orderRef = await addDoc(collection(db, "orders"), {
          orderGroupId,
          buyerId: user.uid,
          buyerName: buyerProfile?.fullName || "",
          sellerId: group.sellerId,
          sellerName: group.sellerName,
          agentId: buyerProfile?.referredByAgentId || null, // last-click-wins tagging, per our decision
          items: group.items.map((i) => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            qty: i.qty,
            color: i.selectedColor || null,
            size: i.selectedSize || null
          })),
          subtotal: sellerSubtotal,
          shippingCharge: SHIPPING_PER_SELLER,
          total: sellerSubtotal + SHIPPING_PER_SELLER,
          shippingAddress: selectedAddress,
          paymentMethod,
          status: "pending", // Pending -> Packed (=confirm) -> Dispatched -> Delivered, per our decision
          invoiceGenerated: false,
          dispatchSlipGenerated: false,
          deliveredMarkedBy: null, // only buyer can mark delivered, per our decision
          createdAt: serverTimestamp(),
          pendingDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24hr auto-cancel window
        });

        placedOrderIds.push(orderRef.id);
      }

      setPlacing(false);
      if (onOrderPlaced) onOrderPlaced({ orderGroupId, orderIds: placedOrderIds });

    } catch (err) {
      console.error("Failed to place order:", err);
      setPlacing(false);
      setError("Something went wrong placing your order. Please try again.");
    }
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.backBtn} onClick={() => onNavigate && onNavigate("back")}>←</div>
        <div style={styles.headerTitle}>Checkout</div>
        <div style={{ width: 36 }} />
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 180 }}>
        {/* Address */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeadRow}>
            <span style={styles.sectionLabel}>Deliver to</span>
            <span style={styles.changeLink} onClick={() => onNavigate && onNavigate("addresses")}>Change</span>
          </div>
          {selectedAddress ? (
            <div>
              <div style={styles.addressLabel}>{selectedAddress.label || "Address"}</div>
              <div style={styles.addressText}>{selectedAddress.fullAddress}, {selectedAddress.city}</div>
            </div>
          ) : (
            <div style={styles.noAddress} onClick={() => onNavigate && onNavigate("add-address")}>
              + Add a delivery address
            </div>
          )}
        </div>

        {/* Order items per seller */}
        {groupedBySeller.map((group) => (
          <div key={group.sellerId} style={styles.sectionCard}>
            <div style={styles.sectionLabel}>🏬 {group.sellerName}</div>
            {group.items.map((item, idx) => (
              <div key={idx} style={styles.itemRow}>
                <span style={styles.itemName}>{item.name} × {item.qty}</span>
                <span style={styles.itemPrice}>Rs {item.price * item.qty}</span>
              </div>
            ))}
            <div style={{ ...styles.itemRow, color: "#888" }}>
              <span>Shipping</span>
              <span>Rs {SHIPPING_PER_SELLER}</span>
            </div>
          </div>
        ))}

        {/* Payment method */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionLabel}>Payment Method</div>
          <div
            style={{ ...styles.paymentOption, ...(paymentMethod === "cod" ? styles.paymentOptionActive : {}) }}
            onClick={() => setPaymentMethod("cod")}
          >
            <span>💵 Cash on Delivery</span>
            {paymentMethod === "cod" && <span style={styles.checkmark}>✓</span>}
          </div>
          <div
            style={{ ...styles.paymentOption, ...(paymentMethod === "online" ? styles.paymentOptionActive : {}) }}
            onClick={() => setPaymentMethod("online")}
          >
            <span>💳 Online Payment</span>
            {paymentMethod === "online" && <span style={styles.checkmark}>✓</span>}
          </div>
        </div>

        {/* Voucher (optional, not forced) */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionLabel}>Have a voucher code?</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              className="input-field"
              placeholder="Enter code (optional)"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
            />
            <button className="btn-secondary">Apply</button>
          </div>
        </div>

        {/* Summary */}
        <div style={styles.sectionCard}>
          <div style={styles.summaryRow}><span>Subtotal</span><span>Rs {subtotal}</span></div>
          <div style={styles.summaryRow}><span>Shipping</span><span>Rs {totalShipping}</span></div>
          <div style={styles.summaryDivider} />
          <div style={styles.summaryTotal}><span>Total</span><span>Rs {grandTotal}</span></div>
        </div>

        {error && <p className="error-text">{error}</p>}
      </div>

      <div style={styles.bottomBar}>
        <button className="btn-primary" style={{ width: "100%" }} onClick={handlePlaceOrder} disabled={placing}>
          {placing ? "Placing order..." : `Place Order — Rs ${grandTotal}`}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "#fff", borderBottom: "1px solid #eee0c0" },
  backBtn: { width: 36, height: 36, borderRadius: "50%", background: "#F0F5F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  headerTitle: { fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, color: "#0B3D2E" },

  sectionCard: { background: "#fff", borderRadius: 14, border: "1px solid #eee0c0", padding: 16, marginBottom: 12 },
  sectionHeadRow: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  sectionLabel: { fontSize: 12.5, fontWeight: 700, color: "#0B3D2E", marginBottom: 6 },
  changeLink: { fontSize: 12, color: "#0B3D2E", fontWeight: 700, cursor: "pointer" },

  addressLabel: { fontSize: 13, fontWeight: 700, color: "#1a1a1a" },
  addressText: { fontSize: 12.5, color: "#666", marginTop: 2 },
  noAddress: { fontSize: 13, color: "#0B3D2E", fontWeight: 600, cursor: "pointer" },

  itemRow: { display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#444", marginBottom: 6 },
  itemName: { flex: 1 },
  itemPrice: { fontWeight: 600 },

  paymentOption: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #eee0c0", marginTop: 8, fontSize: 13, cursor: "pointer" },
  paymentOptionActive: { borderColor: "#0B3D2E", background: "#F0F5F0" },
  checkmark: { color: "#0B3D2E", fontWeight: 800 },

  summaryRow: { display: "flex", justifyContent: "space-between", fontSize: 13, color: "#555", marginBottom: 8 },
  summaryDivider: { height: 1, background: "#eee0c0", margin: "8px 0" },
  summaryTotal: { display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, color: "#0B3D2E" },

  bottomBar: { position: "fixed", bottom: 0, left: 0, right: 0, margin: "0 auto", background: "#fff", borderTop: "1px solid #eee0c0", padding: 14 }
};
