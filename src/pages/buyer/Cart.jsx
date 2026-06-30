// ============================================
// UniMart - Cart Page
// Logic: Items grouped by seller, each seller
// group shows its own shipping charge (per our
// earlier decision on multi-seller orders).
// ============================================

import { useState, useMemo } from "react";
import "../../styles/theme.css";

// Each cart item: { productId, name, price, image, sellerId, sellerName, selectedColor, selectedSize, qty }

export default function Cart({ cartItems = [], onUpdateQty, onRemoveItem, onNavigate, onCheckout }) {
  // Group items by seller
  const groupedBySeller = useMemo(() => {
    const groups = {};
    cartItems.forEach((item) => {
      if (!groups[item.sellerId]) {
        groups[item.sellerId] = { sellerId: item.sellerId, sellerName: item.sellerName, items: [] };
      }
      groups[item.sellerId].items.push(item);
    });
    return Object.values(groups);
  }, [cartItems]);

  const SHIPPING_PER_SELLER = 150; // placeholder flat rate — real logic comes from seller/location rules later

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalShipping = groupedBySeller.length * SHIPPING_PER_SELLER;
  const grandTotal = subtotal + totalShipping;

  if (cartItems.length === 0) {
    return (
      <div className="page-shell" style={styles.page}>
        <div style={styles.header}><div style={styles.headerTitle}>My Cart</div></div>
        <div style={styles.emptyState}>
          <div style={{ fontSize: 50, marginBottom: 12 }}>🛒</div>
          <p style={styles.emptyTitle}>Your cart is empty</p>
          <p style={styles.emptyText}>Add something you love and it'll show up here.</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => onNavigate && onNavigate("home")}>
            Start shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.backBtn} onClick={() => onNavigate && onNavigate("back")}>←</div>
        <div style={styles.headerTitle}>My Cart</div>
        <div style={{ width: 36 }} />
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 200 }}>
        {groupedBySeller.map((group) => (
          <div key={group.sellerId} style={styles.sellerGroup}>
            <div style={styles.sellerHeader}>🏬 {group.sellerName}</div>

            {group.items.map((item, idx) => (
              <div key={`${item.productId}-${idx}`} style={styles.cartItem}>
                <div style={styles.itemImg}>
                  {item.image ? <img src={item.image} alt={item.name} style={styles.imgFit} /> : "🛍️"}
                </div>
                <div style={styles.itemInfo}>
                  <div style={styles.itemName}>{item.name}</div>
                  {(item.selectedColor || item.selectedSize) && (
                    <div style={styles.itemVariant}>
                      {item.selectedColor}{item.selectedColor && item.selectedSize ? " · " : ""}{item.selectedSize}
                    </div>
                  )}
                  <div style={styles.itemPrice}>Rs {item.price}</div>

                  <div style={styles.qtyRow}>
                    <div style={styles.qtyControls}>
                      <div style={styles.qtyBtn} onClick={() => onUpdateQty && onUpdateQty(item.productId, Math.max(1, item.qty - 1))}>−</div>
                      <div style={styles.qtyNum}>{item.qty}</div>
                      <div style={styles.qtyBtn} onClick={() => onUpdateQty && onUpdateQty(item.productId, item.qty + 1)}>+</div>
                    </div>
                    <div style={styles.removeBtn} onClick={() => onRemoveItem && onRemoveItem(item.productId)}>Remove</div>
                  </div>
                </div>
              </div>
            ))}

            <div style={styles.shippingRow}>
              <span>Shipping for this seller</span>
              <span>Rs {SHIPPING_PER_SELLER}</span>
            </div>
          </div>
        ))}

        {/* Order summary */}
        <div style={styles.summaryCard}>
          <div style={styles.summaryRow}><span>Subtotal</span><span>Rs {subtotal}</span></div>
          <div style={styles.summaryRow}><span>Shipping ({groupedBySeller.length} seller{groupedBySeller.length > 1 ? "s" : ""})</span><span>Rs {totalShipping}</span></div>
          <div style={styles.summaryDivider} />
          <div style={styles.summaryTotal}><span>Total</span><span>Rs {grandTotal}</span></div>
        </div>
      </div>

      {/* Sticky checkout bar */}
      <div style={styles.bottomBar}>
        <div style={styles.bottomBarInner}>
          <div>
            <div style={styles.bottomTotalLabel}>Total</div>
            <div style={styles.bottomTotalValue}>Rs {grandTotal}</div>
          </div>
          <button className="btn-primary" style={{ flex: 1, marginLeft: 16 }} onClick={() => onCheckout && onCheckout({ groupedBySeller, subtotal, totalShipping, grandTotal })}>
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "#fff", borderBottom: "1px solid #eee0c0" },
  backBtn: { width: 36, height: 36, borderRadius: "50%", background: "#F0F5F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  headerTitle: { fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, color: "#0B3D2E" },

  emptyState: { textAlign: "center", padding: "80px 30px" },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: "#0B3D2E", marginBottom: 6 },
  emptyText: { fontSize: 13, color: "#888" },

  sellerGroup: { background: "#fff", borderRadius: 14, border: "1px solid #eee0c0", marginBottom: 14, overflow: "hidden" },
  sellerHeader: { padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#0B3D2E", borderBottom: "1px solid #f0f0f0" },

  cartItem: { display: "flex", gap: 12, padding: "14px", borderBottom: "1px solid #f5f5f5" },
  itemImg: { width: 70, height: 70, borderRadius: 10, background: "#F0F5F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 },
  imgFit: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 3 },
  itemVariant: { fontSize: 11, color: "#888", marginBottom: 4 },
  itemPrice: { fontSize: 13.5, fontWeight: 800, color: "#0B3D2E", marginBottom: 8 },

  qtyRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  qtyControls: { display: "flex", alignItems: "center", gap: 10, background: "#F0F5F0", borderRadius: 8, padding: "4px 8px" },
  qtyBtn: { width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#0B3D2E", cursor: "pointer" },
  qtyNum: { fontSize: 12.5, fontWeight: 700, minWidth: 16, textAlign: "center" },
  removeBtn: { fontSize: 11, color: "#C0392B", fontWeight: 600, cursor: "pointer" },

  shippingRow: { display: "flex", justifyContent: "space-between", padding: "10px 14px", fontSize: 12, color: "#666", background: "#FBF9F4" },

  summaryCard: { background: "#fff", borderRadius: 14, border: "1px solid #eee0c0", padding: 16, marginTop: 6 },
  summaryRow: { display: "flex", justifyContent: "space-between", fontSize: 13, color: "#555", marginBottom: 8 },
  summaryDivider: { height: 1, background: "#eee0c0", margin: "8px 0" },
  summaryTotal: { display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, color: "#0B3D2E" },

  bottomBar: { position: "fixed", bottom: 0, left: 0, right: 0, margin: "0 auto", background: "#fff", borderTop: "1px solid #eee0c0", padding: 14 },
  bottomBarInner: { display: "flex", alignItems: "center" },
  bottomTotalLabel: { fontSize: 10.5, color: "#888" },
  bottomTotalValue: { fontSize: 16, fontWeight: 800, color: "#0B3D2E" }
};
