// ============================================
// UniMart - My Orders + Order Tracking
// Option A: Search-first — list hidden by default
// User enters Order ID or OG- group ID and clicks
// Search to see their order(s).
// ============================================

import { useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

const CLOUD_NAME = "eez9oojf";
const UPLOAD_PRESET = "unimart-products";

const STATUS_STEPS = ["pending", "packed", "dispatched", "delivered"];

const STATUS_INFO = {
  pending:    { label: "Order Placed",  color: "#D4AF37", icon: "🛒", desc: "Waiting for seller to confirm" },
  packed:     { label: "Packed",        color: "#2C6E91", icon: "📦", desc: "Seller has packed your order" },
  dispatched: { label: "Dispatched",    color: "#0B3D2E", icon: "🚚", desc: "Your order is on the way" },
  delivered:  { label: "Delivered",     color: "#2E7D32", icon: "✅", desc: "Order delivered successfully" },
  cancelled:  { label: "Cancelled",     color: "#C0392B", icon: "❌", desc: "Order was cancelled" }
};

export default function MyOrders({ user, onNavigate }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [reviewItem, setReviewItem] = useState(null); // { order, item }
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewImage, setReviewImage] = useState(null);
  const [reviewImagePreview, setReviewImagePreview] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const openReview = (order, item) => {
    setReviewItem({ order, item });
    setReviewRating(0);
    setReviewText("");
    setReviewImage(null);
    setReviewImagePreview(null);
    setReviewError("");
  };

  const handleReviewImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setReviewImage(file);
    setReviewImagePreview(URL.createObjectURL(file));
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0) { setReviewError("Please select a star rating."); return; }
    if (!reviewText.trim()) { setReviewError("Please write a short review."); return; }

    setSubmittingReview(true);
    setReviewError("");
    try {
      let imageUrl = null;
      if (reviewImage) {
        const data = new FormData();
        data.append("file", reviewImage);
        data.append("upload_preset", UPLOAD_PRESET);
        data.append("folder", "unimart/reviews");
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: data });
        const json = await res.json();
        if (!json.secure_url) throw new Error(json.error?.message || "Image upload failed");
        imageUrl = json.secure_url;
      }

      const { order, item } = reviewItem;
      await addDoc(collection(db, "products", item.productId, "reviews"), {
        rating: reviewRating,
        comment: reviewText.trim(),
        image: imageUrl,
        verifiedPurchase: true,
        buyerName: user?.fullName || "UniMart Buyer",
        orderId: order.id,
        createdAt: serverTimestamp()
      });

      // Mark this product as reviewed for this order, so the button doesn't show again
      await updateDoc(doc(db, "orders", order.id), {
        reviewedProductIds: arrayUnion(item.productId)
      });

      setResults((list) => list.map((o) =>
        o.id === order.id
          ? { ...o, reviewedProductIds: [...(o.reviewedProductIds || []), item.productId] }
          : o
      ));

      setReviewItem(null);
    } catch (err) {
      console.error("Failed to submit review:", err);
      setReviewError("Something went wrong. Please try again.");
    }
    setSubmittingReview(false);
  };


  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setSearched(true);
    setResults([]);
    try {
      let found = [];

      // Search by orderGroupId (OG-...)
      if (search.startsWith("OG-")) {
        const q = query(
          collection(db, "orders"),
          where("buyerId", "==", user.uid),
          where("orderGroupId", "==", search.trim())
        );
        const snap = await getDocs(q);
        found = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } else {
        // Search by individual order ID
        const q = query(
          collection(db, "orders"),
          where("buyerId", "==", user.uid)
        );
        const snap = await getDocs(q);
        found = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(o => o.id.toLowerCase().includes(search.toLowerCase().trim()));
      }

      found.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setResults(found);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleViewAll = async () => {
    setLoading(true);
    setSearched(true);
    setSearch("");
    setResults([]);
    try {
      const q = query(collection(db, "orders"), where("buyerId", "==", user.uid));
      const snap = await getDocs(q);
      const found = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      found.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setResults(found);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm("Cancel this order?")) return;
    setActionLoading(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        cancelledBy: "buyer"
      });
      setResults(r => r.map(o => o.id === orderId ? { ...o, status: "cancelled" } : o));
    } catch (err) { console.error(err); }
    setActionLoading(null);
  };

  const handleMarkReceived = async (orderId) => {
    setActionLoading(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "delivered",
        deliveredMarkedBy: "buyer",
        deliveredAt: serverTimestamp()
      });
      setResults(r => r.map(o => o.id === orderId ? { ...o, status: "delivered" } : o));
    } catch (err) { console.error(err); }
    setActionLoading(null);
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.backBtn} onClick={() => onNavigate && onNavigate("home")}>←</div>
        <div style={s.headerTitle}>Track My Orders</div>
        <div style={{ width: 36 }} />
      </div>

      {/* Search Box */}
      <div style={s.searchSection}>
        <div style={s.searchTitle}>Enter your Order ID or Group ID</div>
        <div style={s.searchRow}>
          <input
            className="input-field"
            style={{ flex: 1, marginBottom: 0 }}
            placeholder="e.g. OG-1782976642972"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
          <button style={s.searchBtn} onClick={handleSearch} disabled={loading}>
            {loading ? "..." : "🔍 Search"}
          </button>
        </div>
        <div style={s.searchHint}>
          You can find your Order Group ID in your order confirmation message.
        </div>
        <div style={s.viewAllLink} onClick={handleViewAll}>
          Forgot your order number? <span style={{ textDecoration: "underline", fontWeight: 700 }}>View all my orders</span>
        </div>
      </div>

      {/* Results */}
      <div style={{ padding: "0 16px 100px" }}>
        {loading && <div style={s.emptyState}><div style={s.emptyIcon}>⏳</div><p style={s.emptyText}>Searching...</p></div>}

        {!loading && searched && results.length === 0 && (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>📭</div>
            <p style={s.emptyTitle}>No orders found</p>
            <p style={s.emptyText}>Check the Order ID and try again, or view all your orders below.</p>
            <button style={s.viewAllBtn} onClick={handleViewAll}>View All My Orders</button>
          </div>
        )}

        {!loading && !searched && (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>📦</div>
            <p style={s.emptyTitle}>Track your order</p>
            <p style={s.emptyText}>Enter your Order ID above to see your order status.</p>
            <button style={s.viewAllBtn} onClick={handleViewAll}>View All My Orders</button>
          </div>
        )}

        {results.map(order => {
          const info = STATUS_INFO[order.status] || STATUS_INFO.pending;
          const stepIdx = STATUS_STEPS.indexOf(order.status);
          const expanded = expandedOrder === order.id;

          return (
            <div key={order.id} style={s.orderCard}>
              {/* Order Header */}
              <div style={s.orderHead} onClick={() => setExpandedOrder(expanded ? null : order.id)}>
                <div>
                  <div style={s.orderStore}>🏬 {order.sellerName || "Store"}</div>
                  <div style={s.orderId}>Order #{order.id.slice(0, 8).toUpperCase()}</div>
                  <div style={s.orderDate}>{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : "—"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ ...s.statusBadge, color: info.color }}>{info.icon} {info.label}</div>
                  <div style={s.expandHint}>{expanded ? "▲ Hide" : "▼ Details"}</div>
                </div>
              </div>

              {/* Tracking Steps */}
              {order.status !== "cancelled" && (
                <div style={s.stepsRow}>
                  {STATUS_STEPS.map((step, i) => (
                    <div key={step} style={s.stepItem}>
                      <div style={{ ...s.stepDot, ...(i <= stepIdx ? { background: info.color, border: `2px solid ${info.color}` } : {}) }}>
                        {i <= stepIdx ? "✓" : i + 1}
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div style={{ ...s.stepLine, ...(i < stepIdx ? { background: info.color } : {}) }} />
                      )}
                      <div style={{ ...s.stepLabel, ...(i <= stepIdx ? { color: info.color, fontWeight: 700 } : {}) }}>
                        {STATUS_INFO[step]?.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ ...s.statusDesc, color: info.color }}>{info.desc}</div>

              {/* Expanded Details */}
              {expanded && (
                <div style={s.expandedBox}>
                  {/* Items */}
                  <div style={s.expandLabel}>Items Ordered:</div>
                  {(order.items || []).map((item, i) => (
                    <div key={i} style={s.itemRow}>
                      {item.image && <img src={item.image} alt={item.name} style={s.itemImg} />}
                      <div style={{ flex: 1 }}>
                        <div style={s.itemName}>{item.name}</div>
                        <div style={s.itemQty}>Qty: {item.qty}</div>
                        {order.status === "delivered" && (
                          (order.reviewedProductIds || []).includes(item.productId) ? (
                            <div style={s.reviewedTag}>✓ Reviewed</div>
                          ) : (
                            <div style={s.reviewBtn} onClick={() => openReview(order, item)}>⭐ Rate & Review</div>
                          )
                        )}
                      </div>
                      <div style={s.itemPrice}>Rs {(item.price * item.qty).toLocaleString()}</div>
                    </div>
                  ))}

                  {/* Delivery Address */}
                  {order.shippingAddress && (
                    <>
                      <div style={{ ...s.expandLabel, marginTop: 12 }}>Delivery Address:</div>
                      <div style={s.addressBox}>
                        <div style={s.addressText}>{order.shippingAddress.fullName}</div>
                        <div style={s.addressText}>{order.shippingAddress.fullAddress}, {order.shippingAddress.city}</div>
                        <div style={s.addressText}>{order.shippingAddress.phone}</div>
                      </div>
                    </>
                  )}

                  {/* Dispatch Info */}
                  {order.dispatchDetails && (
                    <>
                      <div style={{ ...s.expandLabel, marginTop: 12 }}>Dispatch Info:</div>
                      <div style={s.addressBox}>
                        <div style={s.addressText}>Courier: {order.dispatchDetails.courierCompany}</div>
                        <div style={s.addressText}>Tracking #: {order.dispatchDetails.trackingNumber}</div>
                        <div style={s.addressText}>Date: {order.dispatchDetails.dispatchDate}</div>
                      </div>
                    </>
                  )}

                  {/* Total */}
                  <div style={s.totalRow}>
                    <span style={{ color: "#888" }}>Grand Total</span>
                    <span style={{ fontWeight: 800, color: "#0B3D2E" }}>Rs {order.grandTotal?.toLocaleString()}</span>
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
                    ✕ Cancel
                  </button>
                )}
                {order.status === "dispatched" && (
                  <button style={s.receivedBtn} onClick={() => handleMarkReceived(order.id)} disabled={actionLoading === order.id}>
                    ✅ Mark Received
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== Rate & Review Modal ===== */}
      {reviewItem && (
        <div style={s.reviewOverlay} onClick={() => setReviewItem(null)}>
          <div style={s.reviewModal} onClick={(e) => e.stopPropagation()}>
            <div style={s.reviewModalTitle}>Rate & Review</div>
            <div style={s.reviewProductName}>{reviewItem.item.name}</div>

            <div style={s.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  style={{ ...s.starIcon, color: n <= reviewRating ? "#D4AF37" : "#ddd" }}
                  onClick={() => setReviewRating(n)}
                >★</span>
              ))}
            </div>

            <label className="input-label">Your Review</label>
            <textarea
              className="input-field"
              rows={4}
              style={{ resize: "none", fontFamily: "inherit", marginBottom: 12 }}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="How was the product? Quality, delivery, packaging..."
            />

            <label className="input-label">Add a Photo (optional)</label>
            <input type="file" className="input-field" accept="image/*" onChange={handleReviewImageSelect} style={{ marginBottom: 10 }} />
            {reviewImagePreview && <img src={reviewImagePreview} alt="" style={s.reviewImgPreview} />}

            {reviewError && <p className="error-text">{reviewError}</p>}

            <button className="btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={handleSubmitReview} disabled={submittingReview}>
              {submittingReview ? "Submitting..." : "Submit Review"}
            </button>
            <div style={s.reviewCloseBtn} onClick={() => setReviewItem(null)}>Cancel</div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "#fff", borderBottom: "1px solid #eee0c0", position: "sticky", top: 0, zIndex: 10 },
  backBtn: { width: 36, height: 36, borderRadius: "50%", background: "#F0F5F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18 },
  headerTitle: { fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, color: "#0B3D2E" },

  searchSection: { background: "#0B3D2E", padding: "20px 16px" },
  searchTitle: { color: "#cfe0d4", fontSize: 12, marginBottom: 10, fontWeight: 600 },
  searchRow: { display: "flex", gap: 8 },
  searchBtn: { background: "#D4AF37", color: "#0B3D2E", fontWeight: 800, fontSize: 13, padding: "0 18px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  searchHint: { color: "#9dbfb4", fontSize: 11, marginTop: 8 },
  viewAllLink: { color: "#D4AF37", fontSize: 12, marginTop: 10, cursor: "pointer" },
  viewAllBtn: { marginTop: 14, background: "#0B3D2E", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" },

  emptyState: { textAlign: "center", padding: "50px 20px" },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: "#0B3D2E", marginBottom: 6 },
  emptyText: { fontSize: 13, color: "#888" },

  orderCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 16, padding: 16, marginBottom: 12, marginTop: 12 },
  orderHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer", marginBottom: 14 },
  orderStore: { fontSize: 13.5, fontWeight: 700, color: "#1a1a1a" },
  orderId: { fontSize: 11.5, color: "#888", marginTop: 2 },
  orderDate: { fontSize: 11, color: "#aaa", marginTop: 2 },
  statusBadge: { fontSize: 13, fontWeight: 700 },
  expandHint: { fontSize: 10.5, color: "#888", marginTop: 4, textAlign: "right" },

  stepsRow: { display: "flex", alignItems: "flex-start", marginBottom: 6 },
  stepItem: { display: "flex", flexDirection: "column", alignItems: "center", flex: 1, position: "relative" },
  stepDot: { width: 26, height: 26, borderRadius: "50%", background: "#eee0c0", border: "2px solid #eee0c0", color: "#999", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 },
  stepLine: { position: "absolute", top: 13, left: "50%", width: "100%", height: 2, background: "#eee0c0" },
  stepLabel: { fontSize: 9.5, color: "#aaa", marginTop: 6, textAlign: "center" },
  statusDesc: { fontSize: 11.5, textAlign: "center", marginBottom: 10, fontStyle: "italic" },

  expandedBox: { background: "#F8F9FA", borderRadius: 10, padding: 12, marginBottom: 12 },
  expandLabel: { fontSize: 11, fontWeight: 700, color: "#0B3D2E", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  itemRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  itemImg: { width: 40, height: 40, borderRadius: 8, objectFit: "cover" },
  itemName: { fontSize: 13, fontWeight: 600, color: "#1a1a1a" },
  itemQty: { fontSize: 11, color: "#888" },
  reviewBtn: { fontSize: 10.5, color: "#0B3D2E", fontWeight: 700, marginTop: 4, cursor: "pointer", textDecoration: "underline" },
  reviewedTag: { fontSize: 10.5, color: "#2E7D32", fontWeight: 700, marginTop: 4 },

  reviewOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  reviewModal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 22, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto" },
  reviewModalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", fontWeight: 700, marginBottom: 2 },
  reviewProductName: { fontSize: 12.5, color: "#888", marginBottom: 16 },
  starRow: { display: "flex", gap: 6, marginBottom: 16, justifyContent: "center" },
  starIcon: { fontSize: 32, cursor: "pointer", lineHeight: 1 },
  reviewImgPreview: { width: 70, height: 70, objectFit: "cover", borderRadius: 10, marginBottom: 10 },
  reviewCloseBtn: { textAlign: "center", fontSize: 12.5, color: "#888", cursor: "pointer", padding: "10px 0 0" },
  itemPrice: { fontSize: 13, fontWeight: 700, color: "#0B3D2E" },
  addressBox: { background: "#fff", borderRadius: 8, padding: 10 },
  addressText: { fontSize: 12.5, color: "#444", marginBottom: 3 },
  totalRow: { display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: "1px solid #eee0c0", fontSize: 14 },

  actionsRow: { display: "flex", gap: 8 },
  invoiceBtn: { flex: 1, padding: "11px 0", background: "#F0F5F0", border: "1px solid #eee0c0", borderRadius: 10, color: "#0B3D2E", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  cancelBtn: { flex: 1, padding: "11px 0", background: "#FCEAEA", border: "1px solid #f5c6c6", borderRadius: 10, color: "#C0392B", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  receivedBtn: { flex: 1, padding: "11px 0", background: "#E3F2E1", border: "1px solid #BFE3CC", borderRadius: 10, color: "#2E7D32", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
};
