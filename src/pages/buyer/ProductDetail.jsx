// ============================================
// UniMart - Product Detail Page
// Shows: images, price, variants (display only),
// stock status, seller info, reviews, add to cart
// ============================================

import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

export default function ProductDetail({ productId, user, onNavigate, onAddToCart }) {
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [inWishlist, setInWishlist] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const productSnap = await getDoc(doc(db, "products", productId));
      if (!productSnap.exists()) {
        setProduct(null);
        setLoading(false);
        return;
      }
      const productData = { id: productSnap.id, ...productSnap.data() };
      setProduct(productData);

      if (productData.variants?.colors?.length) setSelectedColor(productData.variants.colors[0]);
      if (productData.variants?.sizes?.length) setSelectedSize(productData.variants.sizes[0]);

      // Fetch seller info
      if (productData.sellerId) {
        const sellerSnap = await getDoc(doc(db, "sellers", productData.sellerId));
        if (sellerSnap.exists()) setSeller({ id: sellerSnap.id, ...sellerSnap.data() });
      }

      // Fetch a few reviews
      const reviewsQuery = query(
        collection(db, "products", productId, "reviews"),
        limit(5)
      );
      const reviewsSnap = await getDocs(reviewsQuery);
      setReviews(reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error("Failed to load product:", err);
    }
    setLoading(false);
  };

  const isOutOfStock = product && (product.stock ?? 0) <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    if (onAddToCart) {
      onAddToCart({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || null,
        sellerId: product.sellerId,
        sellerName: seller?.storeName || "Store",
        selectedColor,
        selectedSize,
        qty: 1
      });
    }
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);
  };

  if (loading) {
    return <div style={styles.centerMsg}>Loading product...</div>;
  }

  if (!product) {
    return (
      <div style={styles.centerMsg}>
        <p>This product could not be found.</p>
        <button className="btn-secondary" onClick={() => onNavigate && onNavigate("home")}>Back to Home</button>
      </div>
    );
  }

  return (
    <div className="page-shell" style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.backBtn} onClick={() => onNavigate && onNavigate("back")}>←</div>
        <div style={styles.topActions}>
          <div style={styles.iconBtn} onClick={() => setInWishlist((v) => !v)}>{inWishlist ? "❤️" : "🤍"}</div>
          <div style={styles.iconBtn} onClick={() => onNavigate && onNavigate("cart")}>🛒</div>
        </div>
      </div>

      {/* Image gallery */}
      <div style={styles.imageWrap}>
        {product.images?.length ? (
          <img src={product.images[activeImage]} alt={product.name} style={styles.mainImage} />
        ) : (
          <div style={styles.mainImagePlaceholder}>🛍️</div>
        )}
        {isOutOfStock && <div style={styles.outOfStockBadge}>Out of Stock</div>}
      </div>

      {product.images?.length > 1 && (
        <div style={styles.thumbRow}>
          {product.images.map((img, i) => (
            <div
              key={i}
              style={{ ...styles.thumb, ...(i === activeImage ? styles.thumbActive : {}) }}
              onClick={() => setActiveImage(i)}
            >
              <img src={img} alt="" style={styles.imgFit} />
            </div>
          ))}
        </div>
      )}

      <div className="container" style={styles.content}>
        {/* Verified badge + seller */}
        <div style={styles.sellerRow}>
          {seller?.verifiedMallBadge && <span className="badge-verified">VERIFIED MALL</span>}
          <span style={styles.sellerName}>{seller?.storeName || "UniMart Store"}</span>
        </div>

        <h1 style={styles.productName}>{product.name}</h1>

        <div style={styles.priceRow}>
          <span style={styles.price}>Rs {product.price}</span>
          {product.mrp && <span style={styles.mrp}>Rs {product.mrp}</span>}
          {product.rating && <span style={styles.rating}>⭐ {product.rating} ({product.reviewCount || 0})</span>}
        </div>

        {/* Variants (display only — Phase 1) */}
        {product.variants?.colors?.length > 0 && (
          <div style={styles.variantBlock}>
            <p style={styles.variantLabel}>Color</p>
            <div style={styles.variantOptions}>
              {product.variants.colors.map((c) => (
                <div
                  key={c}
                  style={{ ...styles.variantPill, ...(selectedColor === c ? styles.variantPillActive : {}) }}
                  onClick={() => setSelectedColor(c)}
                >
                  {c}
                </div>
              ))}
            </div>
          </div>
        )}

        {product.variants?.sizes?.length > 0 && (
          <div style={styles.variantBlock}>
            <p style={styles.variantLabel}>Size</p>
            <div style={styles.variantOptions}>
              {product.variants.sizes.map((s) => (
                <div
                  key={s}
                  style={{ ...styles.variantPill, ...(selectedSize === s ? styles.variantPillActive : {}) }}
                  onClick={() => setSelectedSize(s)}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delivery info */}
        <div style={styles.infoCard}>
          <div style={styles.infoRow}>🚚 <span>Delivery in {product.deliveryTime || "3-5 days"}</span></div>
          <div style={styles.infoRow}>🛡️ <span>Buyer Protection — full refund if item isn't as described</span></div>
        </div>

        {/* Description */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Description</h3>
          <p style={styles.description}>{product.description || "No description provided."}</p>
        </div>

        {/* Reviews */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Reviews ({reviews.length})</h3>
          {reviews.length === 0 ? (
            <p style={styles.emptyText}>No reviews yet — be the first to share your experience.</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id} style={styles.reviewCard}>
                <div style={styles.reviewHead}>
                  <span style={styles.reviewStars}>{"⭐".repeat(r.rating || 0)}</span>
                  {r.verifiedPurchase && <span style={styles.verifiedPurchase}>Verified Purchase</span>}
                </div>
                <p style={styles.reviewText}>{r.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div style={styles.bottomBar}>
        <button
          className="btn-primary"
          style={{ width: "100%", opacity: isOutOfStock ? 0.5 : 1 }}
          onClick={handleAddToCart}
          disabled={isOutOfStock}
        >
          {isOutOfStock ? "Out of Stock" : addedFeedback ? "Added ✓" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto", paddingBottom: 80 },
  centerMsg: { padding: 60, textAlign: "center", color: "#666" },

  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", position: "sticky", top: 0, background: "rgba(251,249,244,0.95)", zIndex: 10 },
  backBtn: { width: 36, height: 36, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", cursor: "pointer", fontSize: 16 },
  topActions: { display: "flex", gap: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", cursor: "pointer", fontSize: 15 },

  imageWrap: { width: "100%", height: 320, background: "#F0F5F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, position: "relative" },
  mainImage: { width: "100%", height: "100%", objectFit: "cover" },
  mainImagePlaceholder: { fontSize: 60 },
  outOfStockBadge: { position: "absolute", top: 14, left: 14, background: "#C0392B", color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 8 },

  thumbRow: { display: "flex", gap: 8, padding: "10px 16px" },
  thumb: { width: 56, height: 56, borderRadius: 10, overflow: "hidden", border: "2px solid transparent", cursor: "pointer" },
  thumbActive: { borderColor: "#0B3D2E" },
  imgFit: { width: "100%", height: "100%", objectFit: "cover" },

  content: { paddingTop: 12 },
  sellerRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  sellerName: { fontSize: 12, color: "#6b6b6b", fontWeight: 600 },
  productName: { fontSize: 19, fontFamily: "Georgia, serif", color: "#1a1a1a", marginBottom: 10, lineHeight: 1.3 },
  priceRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 },
  price: { fontSize: 22, fontWeight: 800, color: "#0B3D2E" },
  mrp: { fontSize: 14, color: "#aaa", textDecoration: "line-through" },
  rating: { fontSize: 12, color: "#888", marginLeft: "auto" },

  variantBlock: { marginBottom: 16 },
  variantLabel: { fontSize: 12.5, fontWeight: 700, color: "#0B3D2E", marginBottom: 8 },
  variantOptions: { display: "flex", gap: 8, flexWrap: "wrap" },
  variantPill: { padding: "7px 16px", borderRadius: 20, border: "1.5px solid #eee0c0", fontSize: 12.5, color: "#444", cursor: "pointer" },
  variantPillActive: { background: "#0B3D2E", color: "#fff", borderColor: "#0B3D2E" },

  infoCard: { background: "#F0F5F0", borderRadius: 12, padding: 14, marginBottom: 20 },
  infoRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#333", marginBottom: 6 },

  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 15, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 8 },
  description: { fontSize: 13, color: "#444", lineHeight: 1.6 },
  emptyText: { fontSize: 12.5, color: "#888" },

  reviewCard: { borderBottom: "1px solid #eee0c0", paddingBottom: 12, marginBottom: 12 },
  reviewHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  reviewStars: { fontSize: 11 },
  verifiedPurchase: { fontSize: 9.5, color: "#2E7D32", fontWeight: 700 },
  reviewText: { fontSize: 12.5, color: "#444" },

  bottomBar: { position: "fixed", bottom: 0, left: 0, right: 0, margin: "0 auto", background: "#fff", padding: 14, borderTop: "1px solid #eee0c0" }
};
