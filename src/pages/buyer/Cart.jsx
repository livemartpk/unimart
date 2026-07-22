// ============================================
// UniMart - Cart Page
// Logic: Items grouped by seller, each seller
// group shows its own shipping charge (per our
// earlier decision on multi-seller orders).
// [Tailwind / Airbnb-inspired design system]
// ============================================

import { useMemo } from "react";
import { formatPrice } from "../../utils/countries";

// Each cart item: { productId, name, price, image, sellerId, sellerName, country, selectedColor, selectedSize, qty }

export default function Cart({ cartItems = [], onUpdateQty, onRemoveItem, onNavigate, onCheckout }) {
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

  const cartCountry = cartItems[0]?.country;
  const SHIPPING_PER_SELLER = 150;

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalShipping = groupedBySeller.length * SHIPPING_PER_SELLER;
  const grandTotal = subtotal + totalShipping;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="h-16 flex items-center justify-center border-b border-hairline">
          <div className="text-title-md text-ink font-bold">My Cart</div>
        </div>
        <div className="text-center py-20 px-8">
          <div className="text-5xl mb-3">🛒</div>
          <p className="text-title-md text-ink font-bold mb-1.5">Your cart is empty</p>
          <p className="text-body-sm text-muted">Add something you love and it'll show up here.</p>
          <button
            onClick={() => onNavigate && onNavigate("home")}
            className="mt-4 h-12 px-6 rounded-btn bg-rausch hover:bg-rausch-active text-white text-title-sm font-semibold transition-colors"
          >
            Start shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-[110px]">
      <div className="h-16 px-4 flex items-center justify-between border-b border-hairline">
        <div onClick={() => onNavigate && onNavigate("back")} className="w-9 h-9 rounded-full bg-surface-soft flex items-center justify-center cursor-pointer">←</div>
        <div className="text-title-md text-ink font-bold">My Cart</div>
        <div className="w-9" />
      </div>

      <div className="max-w-[600px] mx-auto px-4 pt-4">
        {groupedBySeller.map((group) => (
          <div key={group.sellerId} className="bg-canvas rounded-card border border-hairline mb-3.5 overflow-hidden">
            <div className="px-3.5 py-3 text-body-sm font-bold text-ink border-b border-hairline-soft">🏬 {group.sellerName}</div>

            {group.items.map((item, idx) => (
              <div key={`${item.productId}-${idx}`} className="flex gap-3 p-3.5 border-b border-hairline-soft">
                <div className="w-[70px] h-[70px] rounded-btn bg-surface-soft flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                  {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : "🛍️"}
                </div>
                <div className="flex-1">
                  <div className="text-body-sm text-ink font-semibold mb-0.5">{item.name}</div>
                  {(item.selectedColor || item.selectedSize) && (
                    <div className="text-[11px] text-muted mb-1">
                      {item.selectedColor}{item.selectedColor && item.selectedSize ? " · " : ""}{item.selectedSize}
                    </div>
                  )}
                  <div className="text-[13.5px] font-extrabold text-ink mb-2">{formatPrice(item.price, item.country)}</div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5 bg-surface-soft rounded-btn px-2 py-1">
                      <div onClick={() => onUpdateQty && onUpdateQty(item.productId, Math.max(1, item.qty - 1))} className="w-5 h-5 flex items-center justify-center text-sm font-bold text-ink cursor-pointer">−</div>
                      <div className="text-[12.5px] font-bold min-w-[16px] text-center">{item.qty}</div>
                      <div onClick={() => onUpdateQty && onUpdateQty(item.productId, item.qty + 1)} className="w-5 h-5 flex items-center justify-center text-sm font-bold text-ink cursor-pointer">+</div>
                    </div>
                    <div onClick={() => onRemoveItem && onRemoveItem(item.productId)} className="text-[11px] text-rausch font-semibold cursor-pointer">Remove</div>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-between px-3.5 py-2.5 text-xs text-muted bg-surface-soft">
              <span>Shipping for this seller</span>
              <span>{formatPrice(SHIPPING_PER_SELLER, cartCountry)}</span>
            </div>
          </div>
        ))}

        {/* Order summary */}
        <div className="bg-canvas rounded-card border border-hairline p-4 mt-1.5">
          <div className="flex justify-between text-body-sm text-body mb-2"><span>Subtotal</span><span>{formatPrice(subtotal, cartCountry)}</span></div>
          <div className="flex justify-between text-body-sm text-body mb-2"><span>Shipping ({groupedBySeller.length} seller{groupedBySeller.length > 1 ? "s" : ""})</span><span>{formatPrice(totalShipping, cartCountry)}</span></div>
          <div className="h-px bg-hairline my-2" />
          <div className="flex justify-between text-lg font-extrabold text-ink"><span>Total</span><span>{formatPrice(grandTotal, cartCountry)}</span></div>
        </div>
      </div>

      {/* Sticky checkout bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-canvas border-t border-hairline p-3.5">
        <div className="max-w-[600px] mx-auto flex items-center">
          <div>
            <div className="text-[10.5px] text-muted">Total</div>
            <div className="text-lg font-extrabold text-ink">{formatPrice(grandTotal, cartCountry)}</div>
          </div>
          <button
            onClick={() => onCheckout && onCheckout({ groupedBySeller, subtotal, totalShipping, grandTotal })}
            className="flex-1 ml-4 h-12 rounded-btn bg-rausch hover:bg-rausch-active text-white text-title-sm font-semibold transition-colors"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
