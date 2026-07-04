// ============================================
// UniMart - Product Detail Page
// Shows: images, price, variants (display only),
// stock status, seller info, reviews, add to cart
// ============================================

import { useState, useEffect, useRef } from "react";
import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../../config/firebase";
import "../../styles/theme.css";
import LoadingLogo from "../../components/LoadingLogo";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "ratings", label: "Ratings" },
  { key: "details", label: "Product details" },
  { key: "recommendations", label: "Recommendations" }
];

export default function ProductDetail({ productId, user, onNavigate, onAddToCart }) {
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const tabBarRef = useRef(null);
  const sectionRefs = useRef({});
  const isProgrammaticScroll = useRef(false);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (err) { console.error(err); }
  };

  useEffect(() => {
    setActiveTab("overview");
    setMenuOpen(false);
    loadProduct();
  }, [productId]);

  // Scroll-spy: highlight whichever section is currently under the tab bar
  useEffect(() => {
    if (loading || !product) return;
    const tabBarHeight = tabBarRef.current?.offsetHeight || 44;
    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScroll.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const key = entry.target.getAttribute("data-section");
            if (key) setActiveTab(key);
          }
        });
      },
      { rootMargin: `-${tabBarHeight + 4}px 0px -75% 0px`, threshold: 0 }
    );
    TABS.forEach((t) => {
      const el = sectionRefs.current[t.key];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [loading, product]);

  const scrollToSection = (key) => {
    setActiveTab(key);
    const el = sectionRefs.current[key];
    if (!el) return;
    isProgrammaticScroll.current = true;
    const tabBarHeight = tabBarRef.current?.offsetHeight || 44;
    const top = el.getBoundingClientRect().top + window.scrollY - tabBarHeight - 6;
    window.scrollTo({ top, behavior: "smooth" });
    // Re-enable scroll-spy once the smooth scroll settles
    window.clearTimeout(scrollToSection._t);
    scrollToSection._t = window.setTimeout(() => { isProgrammaticScroll.current = false; }, 600);
  };

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

      // Fetch recommended products from the same category
      if (productData.category) {
        const recQuery = query(
          collection(db, "products"),
          where("category", "==", productData.category),
          limit(6)
        );
        const recSnap = await getDocs(recQuery);
        setRecommended(
          recSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((p) => p.id !== productData.id)
            .slice(0, 4)
        );
      } else {
        setRecommended([]);
      }

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
    return <LoadingLogo label="Loading product..." />;
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
      {/* Image gallery with overlay icons — home (left), cart + menu (right) */}
      <div style={styles.imageWrap} onClick={() => product.images?.length && setLightboxOpen(true)}>
        <div style={styles.overlayTop} onClick={(e) => e.stopPropagation()}>
          <div style={styles.overlayBtn} onClick={() => onNavigate && onNavigate("home")}>🏠</div>
          <div style={styles.overlayRight}>
            <div style={styles.overlayBtn} onClick={() => onNavigate && onNavigate("cart")}>🛒</div>
            <div style={{ position: "relative" }}>
              <div style={styles.overlayBtn} onClick={() => setMenuOpen((v) => !v)}>⋮</div>
              {menuOpen && (
                <div style={styles.dropdownMenu}>
                  <div style={styles.dropdownItem} onClick={() => { setMenuOpen(false); onNavigate && onNavigate("notifications"); }}>🔔 Notification</div>
                  <div style={styles.dropdownItem} onClick={() => { setMenuOpen(false); onNavigate && onNavigate("orders"); }}>📦 Track Order</div>
                  <div style={{ ...styles.dropdownItem, color: "#C0392B", borderBottom: "none" }} onClick={() => { setMenuOpen(false); handleLogout(); }}>🚪 Logout</div>
                </div>
              )}
            </div>
          </div>
        </div>
        {product.images?.length ? (
          <img src={product.images[activeImage]} alt={product.name} style={styles.mainImage} />
        ) : (
          <div style={styles.mainImagePlaceholder}>🛍️</div>
        )}
        {isOutOfStock && <div style={styles.outOfStockBadge}>Out of Stock</div>}
        {product.images?.length > 0 && <div style={styles.zoomHint}>🔍 Tap to view closely</div>}
        {product.images?.length > 1 && <div style={styles.imgCounter}>{activeImage + 1}/{product.images.length}</div>}
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

      {/* Tab bar — Overview / Ratings / Product details / Recommendations */}
      <div ref={tabBarRef} style={styles.tabBar}>
        {TABS.map((t) => (
          <div
            key={t.key}
            style={{ ...styles.tabItem, ...(activeTab === t.key ? styles.tabItemActive : {}) }}
            onClick={() => scrollToSection(t.key)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* Full-screen close-up viewer */}
      {lightboxOpen && product.images?.length > 0 && (
        <div style={styles.lightboxOverlay} onClick={() => setLightboxOpen(false)}>
          <div style={styles.lightboxTop}>
            <span style={styles.lightboxCounter}>{activeImage + 1} / {product.images.length}</span>
            <div style={styles.lightboxClose} onClick={() => setLightboxOpen(false)}>✕</div>
          </div>
          <div style={styles.lightboxImageWrap} onClick={(e) => e.stopPropagation()}>
            {product.images.length > 1 && (
              <div
                style={styles.lightboxNav}
                onClick={() => setActiveImage((i) => (i - 1 + product.images.length) % product.images.length)}
              >
                ‹
              </div>
            )}
            <img src={product.images[activeImage]} alt={product.name} style={styles.lightboxImage} />
            {product.images.length > 1 && (
              <div
                style={{ ...styles.lightboxNav, right: 8, left: "auto" }}
                onClick={() => setActiveImage((i) => (i + 1) % product.images.length)}
              >
                ›
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div style={styles.lightboxThumbRow} onClick={(e) => e.stopPropagation()}>
              {product.images.map((img, i) => (
                <div
                  key={i}
                  style={{ ...styles.lightboxThumb, ...(i === activeImage ? styles.thumbActive : {}) }}
                  onClick={() => setActiveImage(i)}
                >
                  <img src={img} alt="" style={styles.imgFit} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="container" style={styles.content}>
        {/* Verified badge + seller — always visible, like Daraz's title block */}
        <div style={styles.sellerRow}>
          {seller?.verifiedMallBadge && <span className="badge-verified">VERIFIED MALL</span>}
          <span style={styles.sellerName}>{seller?.storeName || "UniMart Store"}</span>
        </div>

        <h1 style={styles.productName}>{product.name}</h1>

        <div style={styles.priceRow}>
          <span style={styles.price}>Rs {product.price}</span>
          {product.mrp && <span style={styles.mrp}>Rs {product.mrp}</span>}
          {product.rating && <span style={styles.rating}>⭐ {product.rating} ({product.reviewCount || 0})</span>}
          <div style={styles.wishlistBtn} onClick={() => setInWishlist((v) => !v)}>{inWishlist ? "❤️" : "🤍"}</div>
        </div>

        {/* ---------- OVERVIEW ---------- */}
        <div ref={(el) => (sectionRefs.current.overview = el)} data-section="overview" style={styles.sectionAnchor}>
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

          <div style={styles.infoCard}>
            <div style={styles.infoRow}>🚚 <span>Delivery in {product.deliveryTime || "3-5 days"}</span></div>
            <div style={styles.infoRow}>🛡️ <span>Buyer Protection — full refund if item isn't as described</span></div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Description</h3>
            <p style={styles.description}>{product.description || "No description provided."}</p>
          </div>
        </div>

        {/* ---------- RATINGS ---------- */}
        <div ref={(el) => (sectionRefs.current.ratings = el)} data-section="ratings" style={{ ...styles.section, ...styles.sectionAnchor }}>
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

        {/* ---------- PRODUCT DETAILS ---------- */}
        <div ref={(el) => (sectionRefs.current.details = el)} data-section="details" style={{ ...styles.section, ...styles.sectionAnchor }}>
          <h3 style={styles.sectionTitle}>Product Details</h3>
          {(product.highlights?.length > 0 || product.brand || product.material || product.weight || product.warranty) ? (
            <div style={styles.detailsCard}>
              {product.highlights?.length > 0 && (
                <ul style={styles.highlightList}>
                  {product.highlights.map((h, i) => (
                    <li key={i} style={styles.highlightItem}>• {h}</li>
                  ))}
                </ul>
              )}
              {(product.brand || product.material || product.weight || product.warranty) && (
                <div style={styles.specGrid}>
                  {product.brand && (
                    <div style={styles.specRow}><span style={styles.specLabel}>Brand</span><span style={styles.specValue}>{product.brand}</span></div>
                  )}
                  {product.material && (
                    <div style={styles.specRow}><span style={styles.specLabel}>Material</span><span style={styles.specValue}>{product.material}</span></div>
                  )}
                  {product.weight && (
                    <div style={styles.specRow}><span style={styles.specLabel}>Weight / Size</span><span style={styles.specValue}>{product.weight}</span></div>
                  )}
                  {product.warranty && (
                    <div style={styles.specRow}><span style={styles.specLabel}>Warranty</span><span style={styles.specValue}>{product.warranty}</span></div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p style={styles.emptyText}>This seller hasn't added deeper product details yet.</p>
          )}
        </div>

        {/* ---------- RECOMMENDATIONS ---------- */}
        <div ref={(el) => (sectionRefs.current.recommendations = el)} data-section="recommendations" style={{ ...styles.section, ...styles.sectionAnchor }}>
          <h3 style={styles.sectionTitle}>You may also like</h3>
          {recommended.length === 0 ? (
            <p style={styles.emptyText}>No similar products found yet.</p>
          ) : (
            <div style={styles.recGrid}>
              {recommended.map((p) => (
                <div key={p.id} className="product-card-hover" style={styles.recCard} onClick={() => onNavigate && onNavigate("product", p.id)}>
                  <div style={styles.recImageWrap}>
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} style={styles.imgFit} />
                    ) : (
                      <div style={styles.recImagePlaceholder}>🛍️</div>
                    )}
                  </div>
                  <p style={styles.recName}>{p.name}</p>
                  <p style={styles.recPrice}>Rs {p.price}</p>
                </div>
              ))}
            </div>
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

  topBar: { display: "none" },
  overlayTop: { position: "absolute", top: 12, left: 12, right: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 5 },
  overlayRight: { display: "flex", gap: 8 },
  overlayBtn: { width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.35)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer", backdropFilter: "blur(4px)" },
  dropdownMenu: { position: "absolute", top: 40, right: 0, background: "#fff", borderRadius: 12, boxShadow: "0 6px 20px rgba(0,0,0,0.18)", minWidth: 150, overflow: "hidden", zIndex: 20 },
  dropdownItem: { padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#1a1a1a", cursor: "pointer", borderBottom: "1px solid #f0f0f0" },
  imgCounter: { position: "absolute", bottom: 12, left: 12, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20 },
  wishlistBtn: { marginLeft: "auto", fontSize: 18, cursor: "pointer" },

  tabBar: { display: "flex", borderBottom: "1px solid #eee0c0", position: "sticky", top: 0, background: "var(--color-bg)", zIndex: 8, overflowX: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  tabItem: { flex: "0 0 auto", padding: "12px 14px", fontSize: 12.5, fontWeight: 600, color: "#888", cursor: "pointer", whiteSpace: "nowrap", borderBottom: "2.5px solid transparent", transition: "color 0.25s ease, border-color 0.25s ease" },
  tabItemActive: { color: "#0B3D2E", borderBottomColor: "#D4AF37" },
  sectionAnchor: { scrollMarginTop: 56 },

  recGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  recCard: { background: "#fff", borderRadius: 12, overflow: "hidden", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  recImageWrap: { width: "100%", height: 110, background: "#F0F5F0", display: "flex", alignItems: "center", justifyContent: "center" },
  recImagePlaceholder: { fontSize: 30 },
  recName: { fontSize: 11.5, color: "#333", padding: "8px 8px 2px", lineHeight: 1.3, minHeight: 28 },
  recPrice: { fontSize: 13, fontWeight: 800, color: "#0B3D2E", padding: "0 8px 10px" },

  imageWrap: { width: "100%", height: 320, background: "#F0F5F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, position: "relative", cursor: "zoom-in" },
  mainImage: { width: "100%", height: "100%", objectFit: "cover" },
  mainImagePlaceholder: { fontSize: 60 },
  outOfStockBadge: { position: "absolute", top: 14, left: 14, background: "#C0392B", color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 8 },
  zoomHint: { position: "absolute", bottom: 12, right: 12, background: "rgba(11,61,46,0.75)", color: "#fff", fontSize: 10.5, fontWeight: 600, padding: "5px 10px", borderRadius: 20 },

  lightboxOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.94)", zIndex: 1000, display: "flex", flexDirection: "column" },
  lightboxTop: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px" },
  lightboxCounter: { color: "#fff", fontSize: 13, fontWeight: 600 },
  lightboxClose: { color: "#fff", fontSize: 22, cursor: "pointer", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" },
  lightboxImageWrap: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "auto", padding: "0 12px" },
  lightboxImage: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" },
  lightboxNav: { position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, cursor: "pointer" },
  lightboxThumbRow: { display: "flex", gap: 8, padding: "14px 16px", overflowX: "auto" },
  lightboxThumb: { width: 50, height: 50, borderRadius: 8, overflow: "hidden", border: "2px solid transparent", cursor: "pointer", flexShrink: 0 },

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

  detailsCard: { background: "#F0F5F0", borderRadius: 12, padding: 16 },
  highlightList: { margin: 0, padding: "0 0 0 18px", listStyle: "none" },
  highlightItem: { fontSize: 12.5, color: "#333", lineHeight: 1.9, position: "relative", paddingLeft: 14 },
  specGrid: { marginTop: 10, borderTop: "1px solid #dfe8df", paddingTop: 10 },
  specRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e4ecE4", fontSize: 12.5 },
  specLabel: { color: "#6b6b6b", fontWeight: 600 },
  specValue: { color: "#1a1a1a", fontWeight: 600, textAlign: "right" },

  reviewCard: { borderBottom: "1px solid #eee0c0", paddingBottom: 12, marginBottom: 12 },
  reviewHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  reviewStars: { fontSize: 11 },
  verifiedPurchase: { fontSize: 9.5, color: "#2E7D32", fontWeight: 700 },
  reviewText: { fontSize: 12.5, color: "#444" },

  bottomBar: { position: "fixed", bottom: 0, left: 0, right: 0, margin: "0 auto", background: "#fff", padding: 14, borderTop: "1px solid #eee0c0" }
};
