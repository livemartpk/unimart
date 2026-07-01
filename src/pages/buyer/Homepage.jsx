// ============================================
// UniMart - Homepage
// Style: "Emerald Trust" + Gen Z (bento grid,
// stories bar, social proof, micro-interactions)
// Data: Connected to Firestore (products, etc.)
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../../config/firebase";
import "../../styles/theme.css";

export default function Homepage({ user, onNavigate }) {
  const [flashSaleProducts, setFlashSaleProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (err) { console.error(err); }
  };
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    loadHomepageData();
  }, []);

  const loadHomepageData = async () => {
    setLoading(true);
    try {
      // Flash Sale products — boost.type === "flash_sale" and not expired
      const flashQuery = query(
        collection(db, "products"),
        where("boost.type", "==", "flash_sale"),
        where("status", "==", "active"),
        limit(6)
      );
      const flashSnap = await getDocs(flashQuery);
      setFlashSaleProducts(flashSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // "Just For You" — for now, latest active products (true personalization is Phase 2)
      const recoQuery = query(
        collection(db, "products"),
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
        limit(8)
      );
      const recoSnap = await getDocs(recoQuery);
      setRecommendedProducts(recoSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error("Failed to load homepage data:", err);
    }
    setLoading(false);
  };

  const toggleWishlist = (productId) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
    // TODO: persist to buyers/{uid}.wishlist array in Firestore
  };

  const categories = [
    { key: "flash", label: "Flash Deals", sub: "Up to 60% off", big: true, icon: "⚡" },
    { key: "electronics", label: "Tech", icon: "📱" },
    { key: "fashion", label: "Fashion", icon: "👗" },
    { key: "beauty", label: "Beauty", icon: "💄" },
    { key: "home", label: "Home", icon: "🏠" }
  ];

  const stories = [
    { key: "new", label: "New In", icon: "🆕" },
    { key: "trending", label: "Trending", icon: "🔥" },
    { key: "deals", label: "Deals", icon: "🏷️" },
    { key: "mall", label: "Mall", icon: "✨" },
    { key: "gifting", label: "Gifting", icon: "🎁" }
  ];

  return (
    <div className="page-shell" style={styles.page}>
      {/* Header */}
      <div className="header-responsive" style={styles.header}>
        <div style={styles.topRow}>
          <div style={styles.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span></div>
          <div style={styles.topIcons}>
            {user ? (
              <>
                <IconButton icon="🔔" onClick={() => onNavigate && onNavigate("notifications")} hasBadge />
                <IconButton icon="🛒" onClick={() => onNavigate && onNavigate("cart")} />
                <div style={styles.logoutIconBtn} onClick={handleLogout}>🚪</div>
              </>
            ) : (
              <>
                <div style={styles.loginIconBtn} onClick={() => onNavigate && onNavigate("login")}>
                  👤 Login
                </div>
                <IconButton icon="🛒" onClick={() => onNavigate && onNavigate("cart")} />
              </>
            )}
          </div>
        </div>
        <div style={styles.searchBar} onClick={() => onNavigate && onNavigate("search")}>
          🔍 Search products, stores, brands...
        </div>
        <div style={styles.greeting}>
          <div style={styles.greetingEyebrow}>
            {user?.fullName ? `Salam, ${user.fullName.split(" ")[0]}` : "Salam"} 👋
          </div>
          <div style={styles.greetingText}>What are we hunting today?</div>
        </div>
      </div>

      {/* Stories bar */}
      <div style={styles.storiesBar}>
        {stories.map((s) => (
          <div key={s.key} style={styles.storyItem}>
            <div style={styles.storyRing}>
              <div style={styles.storyInner}>{s.icon}</div>
            </div>
            <div style={styles.storyLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Social proof */}
      <div style={styles.socialProof}>
        <div style={styles.avatarStack}>
          <div style={styles.miniAvatar}>😊</div>
          <div style={{ ...styles.miniAvatar, marginLeft: -8 }}>🙂</div>
          <div style={{ ...styles.miniAvatar, marginLeft: -8 }}>😄</div>
        </div>
        <div style={styles.socialText}><b>2,300+</b> orders placed today</div>
      </div>

      {/* Bento category grid */}
      <div className="bento-grid-responsive" style={styles.bentoWrap}>
        <div style={styles.bentoGrid}>
          <div style={{ flex: 1.3 }}>
            <div
              style={{ ...styles.bentoCard, ...styles.bentoBig }}
              onClick={() => onNavigate && onNavigate("category", "flash")}
            >
              <div style={styles.bentoEmoji}>⚡</div>
              <div>
                <div style={styles.bentoLabel}>Flash Deals</div>
                <div style={styles.bentoSub}>Up to 60% off</div>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ ...styles.bentoCard, ...styles.bentoC1, flex: 1 }} onClick={() => onNavigate && onNavigate("category", "electronics")}>
                <div style={styles.bentoEmoji}>📱</div><div style={styles.bentoLabel}>Tech</div>
              </div>
              <div style={{ ...styles.bentoCard, ...styles.bentoC2, flex: 1 }} onClick={() => onNavigate && onNavigate("category", "fashion")}>
                <div style={styles.bentoEmoji}>👗</div><div style={styles.bentoLabel}>Fashion</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ ...styles.bentoCard, ...styles.bentoC1, flex: 1 }} onClick={() => onNavigate && onNavigate("category", "beauty")}>
                <div style={styles.bentoEmoji}>💄</div><div style={styles.bentoLabel}>Beauty</div>
              </div>
              <div style={{ ...styles.bentoCard, ...styles.bentoC2, flex: 1 }} onClick={() => onNavigate && onNavigate("category", "home")}>
                <div style={styles.bentoEmoji}>🏠</div><div style={styles.bentoLabel}>Home</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flash Sale */}
      <div style={styles.section}>
        <div style={styles.sectionHead}>
          <div style={styles.sectionTitle}>Flash Sale <span style={styles.livePill}>LIVE</span></div>
          <div style={styles.sectionLink} onClick={() => onNavigate && onNavigate("flash-sale")}>See all</div>
        </div>

        {loading ? (
          <p style={styles.loadingText}>Loading deals...</p>
        ) : flashSaleProducts.length === 0 ? (
          <p style={styles.emptyText}>No flash deals right now — check back soon.</p>
        ) : (
          <div style={styles.flashScroll}>
            {flashSaleProducts.map((p) => (
              <div key={p.id} style={styles.flashCard} onClick={() => onNavigate && onNavigate("product", p.id)}>
                <div style={styles.flashImg}>
                  {p.images?.[0] ? <img src={p.images[0]} alt={p.name} style={styles.imgFit} /> : "🛍️"}
                  {p.discountPercent && <div style={styles.flashTag}>-{p.discountPercent}%</div>}
                </div>
                <div style={styles.flashInfo}>
                  <div style={styles.flashName}>{p.name}</div>
                  <div style={styles.flashPriceRow}>
                    <span style={styles.flashPrice}>Rs {p.price}</span>
                    {p.mrp && <span style={styles.flashOld}>{p.mrp}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Voucher banner */}
      <div style={styles.voucherCard} onClick={() => onNavigate && onNavigate("vouchers")}>
        <div style={styles.voucherEyebrow}>Limited Drop</div>
        <div style={styles.voucherTitle}>Rs 200 off your first order</div>
        <div style={styles.voucherBtn}>Claim now →</div>
      </div>

      {/* Just For You */}
      <div style={styles.section}>
        <div style={styles.sectionHead}>
          <div style={styles.sectionTitle}>Just For You</div>
          <div style={styles.sectionLink}>See all</div>
        </div>
      </div>

      {loading ? (
        <p style={{ ...styles.loadingText, padding: "0 16px" }}>Loading products...</p>
      ) : recommendedProducts.length === 0 ? (
        <p style={{ ...styles.emptyText, padding: "0 16px" }}>No products yet — be the first seller to add one!</p>
      ) : (
        <div className="product-grid-responsive" style={styles.productGrid}>
          {recommendedProducts.map((p) => (
            <div key={p.id} style={styles.pcard}>
              <div style={styles.pimg} onClick={() => onNavigate && onNavigate("product", p.id)}>
                {p.images?.[0] ? <img src={p.images[0]} alt={p.name} style={styles.imgFit} /> : "🛍️"}
                <div style={styles.heart} onClick={(e) => { e.stopPropagation(); toggleWishlist(p.id); }}>
                  {wishlist.includes(p.id) ? "❤️" : "🤍"}
                </div>
                {p.verifiedMall && <div style={styles.verifiedTag}>VERIFIED</div>}
              </div>
              <div style={styles.pinfo}>
                <div style={styles.pname}>{p.name}</div>
                <div style={styles.priceRow}>
                  <span style={styles.pprice}>Rs {p.price}</span>
                  <span style={styles.prating}>⭐{p.rating || "New"}</span>
                </div>
                <div style={styles.quickAdd} onClick={() => onNavigate && onNavigate("add-to-cart", p.id)}>+ Add to Cart</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Nav */}
      <div className="bottom-nav-responsive" style={styles.bottomNav}>
        <NavItem icon="🏠" label="Home" active onClick={() => onNavigate && onNavigate("home")} />
        <NavItem icon="📂" label="Shop" onClick={() => onNavigate && onNavigate("shop")} />
        <NavItem icon="🛒" label="Cart" onClick={() => onNavigate && onNavigate("cart")} />
        <NavItem icon="❤️" label="Saved" onClick={() => onNavigate && onNavigate("wishlist")} />
        <NavItem icon="👤" label="You" onClick={() => onNavigate && onNavigate("account")} />
      </div>
    </div>
  );
}

function IconButton({ icon, onClick, hasBadge }) {
  return (
    <div style={styles.iconBtn} onClick={onClick}>
      {icon}
      {hasBadge && <div style={styles.badgeDot} />}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div style={{ ...styles.navItem, ...(active ? styles.navItemActive : {}) }} onClick={onClick}>
      <div style={{ ...styles.navCircle, ...(active ? styles.navCircleActive : {}) }}>{icon}</div>
      {label}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", paddingBottom: 20, margin: "0 auto", fontFamily: "var(--font-body)" },

  header: { background: "#0B3D2E", padding: "18px 16px 26px", position: "relative" },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  logo: { color: "#FBF9F4", fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 900 },
  topIcons: { display: "flex", gap: 14, alignItems: "center" },
  loginIconBtn: { display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "8px 14px", borderRadius: 20, cursor: "pointer" },
  logoutIconBtn: { background: "rgba(255,80,80,0.2)", color: "#fff", fontSize: 16, width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  iconBtn: { width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", position: "relative", cursor: "pointer" },
  badgeDot: { position: "absolute", top: -3, right: -3, width: 9, height: 9, background: "#D4AF37", borderRadius: "50%", border: "2px solid #0B3D2E" },
  searchBar: { background: "rgba(255,255,255,0.95)", borderRadius: 14, padding: "13px 16px", color: "#6b6b6b", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  greeting: { marginTop: 14 },
  greetingEyebrow: { color: "#D4AF37", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" },
  greetingText: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 600, marginTop: 4 },

  storiesBar: { display: "flex", gap: 14, padding: "16px 16px 6px", overflowX: "auto" },
  storyItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 58 },
  storyRing: { width: 58, height: 58, borderRadius: "50%", background: "conic-gradient(from 180deg, #D4AF37, #0B3D2E, #7FBF9E, #D4AF37)", padding: 2.5, display: "flex", alignItems: "center", justifyContent: "center" },
  storyInner: { width: "100%", height: "100%", borderRadius: "50%", background: "#F0F5F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: "2px solid #FBF9F4" },
  storyLabel: { fontSize: 9, color: "#444", fontWeight: 600 },

  socialProof: { margin: "6px 16px 0", display: "flex", alignItems: "center", gap: 8, background: "#F0F5F0", borderRadius: 14, padding: "10px 14px" },
  avatarStack: { display: "flex" },
  miniAvatar: { width: 22, height: 22, borderRadius: "50%", background: "#0B3D2E", border: "2px solid #FBF9F4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 },
  socialText: { fontSize: 10.5, color: "#0B3D2E", fontWeight: 600 },

  bentoWrap: { padding: 16 },
  bentoGrid: { display: "flex", gap: 8 },
  bentoCard: { borderRadius: 18, padding: 14, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 78, cursor: "pointer" },
  bentoBig: { background: "linear-gradient(160deg, #0B3D2E, #1a5c44)", color: "#fff", minHeight: 166 },
  bentoC1: { background: "#F0F5F0", color: "#0B3D2E" },
  bentoC2: { background: "#FBF1DA", color: "#0B3D2E" },
  bentoEmoji: { fontSize: 24 },
  bentoLabel: { fontSize: 12.5, fontWeight: 700 },
  bentoSub: { fontSize: 9.5, opacity: 0.75, fontWeight: 500 },

  section: { padding: "10px 16px 4px" },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 },
  sectionTitle: { fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 19, color: "#0B3D2E", display: "flex", alignItems: "center", gap: 7 },
  livePill: { background: "#D4AF37", color: "#0B3D2E", fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 20 },
  sectionLink: { fontSize: 11.5, color: "#0B3D2E", fontWeight: 700, opacity: 0.6, cursor: "pointer" },

  loadingText: { fontSize: 13, color: "#888" },
  emptyText: { fontSize: 13, color: "#888" },

  flashScroll: { display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 },
  flashCard: { minWidth: 130, background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 14px rgba(11,61,46,0.08)", cursor: "pointer" },
  flashImg: { width: "100%", height: 120, background: "linear-gradient(135deg,#F0F5F0,#dce8de)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, position: "relative" },
  flashTag: { position: "absolute", top: 8, left: 8, background: "#0B3D2E", color: "#D4AF37", fontSize: 9, fontWeight: 800, padding: "3px 7px", borderRadius: 8 },
  flashInfo: { padding: 10 },
  flashName: { fontSize: 11, color: "#444", fontWeight: 600, marginBottom: 4 },
  flashPriceRow: { display: "flex", alignItems: "center", gap: 6 },
  flashPrice: { color: "#0B3D2E", fontWeight: 800, fontSize: 14 },
  flashOld: { color: "#bbb", fontSize: 10, textDecoration: "line-through" },

  voucherCard: { margin: "18px 16px", background: "linear-gradient(120deg, #0B3D2E 0%, #155c43 60%, #0B3D2E 100%)", borderRadius: 20, padding: 18, cursor: "pointer" },
  voucherEyebrow: { color: "#D4AF37", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" },
  voucherTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, margin: "4px 0 10px" },
  voucherBtn: { background: "#D4AF37", color: "#0B3D2E", fontSize: 12, fontWeight: 800, padding: "9px 18px", borderRadius: 30, display: "inline-block" },

  productGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "14px 16px 20px" },
  pcard: { background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 3px 12px rgba(11,61,46,0.07)" },
  pimg: { width: "100%", height: 118, background: "#F0F5F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, position: "relative", cursor: "pointer" },
  imgFit: { width: "100%", height: "100%", objectFit: "cover" },
  heart: { position: "absolute", top: 8, right: 8, width: 28, height: 28, background: "rgba(255,255,255,0.9)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: "pointer" },
  verifiedTag: { position: "absolute", bottom: 8, left: 8, background: "#D4AF37", color: "#0B3D2E", fontSize: 8, fontWeight: 800, padding: "3px 7px", borderRadius: 7 },
  pinfo: { padding: 10 },
  pname: { fontSize: 11.5, color: "#333", fontWeight: 600, marginBottom: 5, lineHeight: 1.3 },
  priceRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  pprice: { color: "#0B3D2E", fontWeight: 800, fontSize: 13.5 },
  prating: { fontSize: 9.5, color: "#999", fontWeight: 600 },
  quickAdd: { width: "100%", marginTop: 8, background: "#0B3D2E", color: "#D4AF37", fontSize: 10.5, fontWeight: 700, textAlign: "center", padding: 7, borderRadius: 10, cursor: "pointer" },

  bottomNav: { display: "flex", justifyContent: "space-around", alignItems: "center", padding: "12px 8px", margin: "10px 14px 0", background: "#0B3D2E", borderRadius: 24, boxShadow: "0 8px 24px rgba(11,61,46,0.3)", position: "sticky", bottom: 10 },
  navItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 9, color: "#7fa896", fontWeight: 600, cursor: "pointer" },
  navItemActive: { color: "#D4AF37" },
  navCircle: { width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 },
  navCircleActive: { background: "rgba(212,175,55,0.15)", borderRadius: "50%" }
};
