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
import LoadingLogo from "../../components/LoadingLogo";
import { optimizeImage } from "../../utils/optimizeImage";
import { COUNTRIES, getFlagEmoji, formatPrice } from "../../utils/countries";

export default function Homepage({ user, onNavigate, onAddToCart, cartCount = 0 }) {
  const [flashSaleProducts, setFlashSaleProducts] = useState([]);
  const [flashBanners, setFlashBanners] = useState([]);
  const [bannerSlide, setBannerSlide] = useState(0);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    try { await signOut(auth); } catch (err) { console.error(err); }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    onNavigate && onNavigate("search", searchQuery.trim());
  };

  // Filter recommended products by search query
  const isSearching = searchQuery.trim().length > 0;

  const displayedProducts = isSearching
    ? recommendedProducts.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sellerName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recommendedProducts;
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [guestCountry, setGuestCountry] = useState(() => localStorage.getItem("unimart_guest_country") || "");
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [activeCountryList, setActiveCountryList] = useState([]);
  const [countrySearch, setCountrySearch] = useState("");

  useEffect(() => {
    loadHomepageData();
  }, [guestCountry]);

  // Guest country detection: GPS first, then IP-based, so the homepage can
  // still filter products by country before the guest ever logs in.
  useEffect(() => {
    if (user || guestCountry) return; // logged-in users use their profile; already-detected guests skip this

    const tryIP = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data?.country_name) {
          setGuestCountry(data.country_name);
          localStorage.setItem("unimart_guest_country", data.country_name);
        }
      } catch (err) {
        console.error("IP-based location detection failed:", err);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await res.json();
            if (data?.countryName) {
              setGuestCountry(data.countryName);
              localStorage.setItem("unimart_guest_country", data.countryName);
            } else {
              await tryIP();
            }
          } catch (err) {
            await tryIP();
          }
        },
        async () => { await tryIP(); }, // permission denied or GPS failed
        { timeout: 6000 }
      );
    } else {
      tryIP();
    }
  }, [user]);

  // Load the Active countries list for the manual picker modal
  useEffect(() => {
    const loadActive = async () => {
      try {
        const snap = await getDocs(collection(db, "activeCountries"));
        const activeCodes = new Set(snap.docs.filter((d) => d.data().active === true).map((d) => d.id));
        setActiveCountryList(COUNTRIES.filter((c) => activeCodes.has(c.code)));
      } catch (err) {
        console.error("Failed to load active countries:", err);
      }
    };
    loadActive();
  }, []);

  const handleSelectGuestCountry = (countryName) => {
    setGuestCountry(countryName);
    localStorage.setItem("unimart_guest_country", countryName);
    setShowCountryModal(false);
    setCountrySearch("");
  };

  useEffect(() => {
    if (flashBanners.length < 2) return;
    const interval = setInterval(() => {
      setBannerSlide((i) => (i + 1) % flashBanners.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [flashBanners.length]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        setIsScrolled(prev => {
          if (!prev && y > 90) return true;
          if (prev && y < 40) return false;
          return prev;
        });
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const loadHomepageData = async () => {
    setLoading(true);
    try {
      // Country-matching: buyer only ever sees sellers/products from their own
      // country. Guests default to Pakistan until location auto-detection is
      // built (a later step) — this keeps behavior consistent in the meantime.
      const buyerCountry = user?.country || guestCountry || "Pakistan";

      // Flash Sale products
      const flashQuery = query(
        collection(db, "products"),
        where("boost.type", "==", "flash_sale"),
        where("status", "==", "active"),
        where("country", "==", buyerCountry),
        limit(6)
      );
      const flashSnap = await getDocs(flashQuery);
      setFlashSaleProducts(flashSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Flash Deals banners (set by Marketing Manager) — homepage slideshow
      try {
        const bannersSnap = await getDocs(collection(db, "flashBanners"));
        setFlashBanners(bannersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to load flash banners:", err);
      }

      // "Just For You" — ranked by a weighted score (sales, rating, recency),
      // out-of-stock items pushed to the bottom. Candidate pool of 40 active
      // products, ranked client-side, top 8 shown — same two-stage pattern
      // (candidates → ranking) that marketplaces like Daraz use, sized down
      // to what UniMart actually tracks today.
      const recoQuery = query(
        collection(db, "products"),
        where("status", "==", "active"),
        where("country", "==", buyerCountry),
        limit(40)
      );
      const recoSnap = await getDocs(recoQuery);
      const candidates = recoSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const now = Date.now();
      const scored = candidates.map((p) => {
        const inStock = (p.stock || 0) > 0;
        const salesScore = Math.log((p.salesCount || 0) + 1) * 12;   // sales velocity — strongest signal
        const ratingScore = (p.rating || 0) * 5;                      // customer trust
        const ageDays = p.createdAt?.seconds ? (now - p.createdAt.seconds * 1000) / 86400000 : 999;
        const recencyScore = Math.max(0, 15 - ageDays);                // fresh listings get a temporary boost
        const score = inStock ? salesScore + ratingScore + recencyScore : -9999; // out-of-stock sinks to the bottom
        return { ...p, _score: score };
      });
      scored.sort((a, b) => b._score - a._score);

      setRecommendedProducts(scored.slice(0, 8));

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
      <div
        className="header-responsive"
        style={{
          ...styles.header,
          padding: isScrolled ? "12px 16px 12px" : "16px 16px 16px",
          transition: "padding 0.25s ease"
        }}
      >
        {/* Top info row: Salam (left) + icons (right) — single clean line, collapses on scroll */}
        <div
          style={{
            ...styles.topInfoRow,
            maxHeight: isScrolled ? 0 : 46,
            opacity: isScrolled ? 0 : 1,
            overflow: "hidden",
            marginBottom: isScrolled ? 0 : 14,
            transition: "max-height 0.25s ease, opacity 0.2s ease, margin-bottom 0.25s ease"
          }}
        >
          <div style={styles.topInfoLine}>
            <div style={styles.greetingEyebrow}>
              {user?.fullName ? `Salam, ${user.fullName.split(" ")[0]}` : "Salam"}
            </div>
            <div style={styles.topIconsInline}>
              {user ? (
                <>
                  <IconButton icon="🔔" label="Notification" onClick={() => onNavigate && onNavigate("notifications")} hasBadge />
                  <IconButton icon="📦" label="Track Order" onClick={() => onNavigate && onNavigate("orders")} />
                  <div style={styles.iconBtnWrap} onClick={handleLogout}>
                    <div style={styles.logoutIconBtn}>🚪</div>
                    <div style={styles.iconBtnLabel}>Logout</div>
                  </div>
                </>
              ) : (
                <>
                  <div style={styles.countryChip} onClick={() => setShowCountryModal(true)}>
                    {guestCountry ? `${getFlagEmoji(COUNTRIES.find(c => c.name === guestCountry)?.code)} ${guestCountry}` : "🌍 Select country"}
                  </div>
                  <div style={styles.loginIconBtn} onClick={() => onNavigate && onNavigate("login")}>
                    👤 Login
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main row: logo (left) + search bar + cart (right) — same row, like Daraz */}
        <div style={styles.mainRow}>
          <div style={styles.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span></div>
          <div style={styles.searchWrap}>
            <input
              style={styles.searchBar}
              placeholder="Search products, stores, brands..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              autoComplete="off"
            />
            <div style={styles.searchBtn} onClick={handleSearch}>🔍</div>
          </div>
          <div style={{ position: "relative" }}>
            <div style={styles.cartIconMain} onClick={() => onNavigate && onNavigate("cart")}>🛒</div>
            {cartCount > 0 && <div style={styles.cartBadge}>{cartCount}</div>}
          </div>
        </div>
      </div>

      {/* Stories bar — hidden during search */}
      {!isSearching && <div style={styles.storiesBar}>
        {stories.map((s) => (
          <div key={s.key} style={styles.storyItem}>
            <div style={styles.storyRing}>
              <div style={styles.storyInner}>{s.icon}</div>
            </div>
            <div style={styles.storyLabel}>{s.label}</div>
          </div>
        ))}
      </div>}

      {!isSearching && <div style={styles.socialProof}>
        <div style={styles.avatarStack}>
          <div style={styles.miniAvatar}>😊</div>
          <div style={{ ...styles.miniAvatar, marginLeft: -8 }}>🙂</div>
          <div style={{ ...styles.miniAvatar, marginLeft: -8 }}>😄</div>
        </div>
        <div style={styles.socialText}><b>2,300+</b> orders placed today</div>
      </div>}

      {!isSearching && <div className="bento-grid-responsive" style={styles.bentoWrap}>
        <div style={styles.bentoGrid}>
          <div style={{ flex: 1.3 }}>
            <div
              style={{
                ...styles.bentoCard,
                ...styles.bentoBig,
                ...(flashBanners[bannerSlide]?.imageUrl
                  ? { backgroundImage: `linear-gradient(180deg, rgba(11,61,46,0.15) 0%, rgba(11,61,46,0.85) 100%), url(${optimizeImage(flashBanners[bannerSlide].imageUrl, 700)})`, backgroundSize: "cover", backgroundPosition: "center", transition: "background-image 0.5s ease" }
                  : {})
              }}
              onClick={() => onNavigate && onNavigate("category", "flash")}
            >
              <div style={styles.bentoEmoji}>⚡</div>
              <div>
                <div style={styles.bentoLabel}>Flash Deals</div>
                <div style={styles.bentoSub}>Up to 60% off</div>
              </div>
              {flashBanners.length > 1 && (
                <div style={styles.bannerDots} onClick={(e) => e.stopPropagation()}>
                  {flashBanners.map((_, i) => (
                    <div
                      key={i}
                      style={{ ...styles.bannerDot, ...(i === bannerSlide ? styles.bannerDotActive : {}) }}
                      onClick={() => setBannerSlide(i)}
                    />
                  ))}
                </div>
              )}
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
      </div>}

      {!isSearching && <div style={styles.section}>
        <div style={styles.sectionHead}>
          <div style={styles.sectionTitle}>Flash Sale <span style={styles.livePill}>LIVE</span></div>
          <div style={styles.sectionLink} onClick={() => onNavigate && onNavigate("flash-sale")}>See all</div>
        </div>

        {loading ? (
          <LoadingLogo fullPage={false} size={16} />
        ) : flashSaleProducts.length === 0 ? (
          <p style={styles.emptyText}>No flash deals right now — check back soon.</p>
        ) : (
          <div style={styles.flashScroll}>
            {flashSaleProducts.map((p) => (
              <div key={p.id} className="product-card-hover" style={styles.flashCard} onClick={() => onNavigate && onNavigate("product", p.id)}>
                <div style={styles.flashImg}>
                  {p.images?.[0] ? <img src={optimizeImage(p.images[0], 260)} alt={p.name} style={styles.imgFit} loading="lazy" /> : "🛍️"}
                  {p.discountPercent && <div style={styles.flashTag}>-{p.discountPercent}%</div>}
                </div>
                <div style={styles.flashInfo}>
                  <div style={styles.flashName}>{p.name}</div>
                  <div style={styles.flashPriceRow}>
                    <span style={styles.flashPrice}>{formatPrice(p.price, p.country)}</span>
                    {p.mrp && <span style={styles.flashOld}>{p.mrp}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}

      {!isSearching && <div style={styles.voucherCard} onClick={() => onNavigate && onNavigate("vouchers")}>
        <div style={styles.voucherEyebrow}>Limited Drop</div>
        <div style={styles.voucherTitle}>Rs 200 off your first order</div>
        <div style={styles.voucherBtn}>Claim now →</div>
      </div>}

      {/* Products Section */}
      <div style={styles.section}>
        <div style={styles.sectionHead}>
          <div style={styles.sectionTitle}>{isSearching ? `Search Results for "${searchQuery}"` : "Just For You"}</div>
          <div style={styles.sectionLink}>See all</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "12px 16px" }}><LoadingLogo fullPage={false} size={18} /></div>
      ) : displayedProducts.length === 0 ? (
        <p style={{ ...styles.emptyText, padding: "0 16px" }}>{searchQuery ? "No products found for your search." : "No products yet — be the first seller to add one!"}</p>
      ) : (
        <div className="product-grid-responsive" style={styles.productGrid}>
          {displayedProducts.map((p) => (
            <div key={p.id} className="product-card-hover" style={styles.pcard}>
              <div style={styles.pimg} onClick={() => onNavigate && onNavigate("product", p.id)}>
                {p.images?.[0] ? <img src={optimizeImage(p.images[0], 320)} alt={p.name} style={styles.imgFit} loading="lazy" /> : "🛍️"}
                <div style={styles.heart} onClick={(e) => { e.stopPropagation(); toggleWishlist(p.id); }}>
                  {wishlist.includes(p.id) ? "❤️" : "🤍"}
                </div>
                {p.verifiedMall && <div style={styles.verifiedTag}>VERIFIED</div>}
              </div>
              <div style={styles.pinfo}>
                <div style={styles.pname}>{p.name}</div>
                <div style={styles.priceRow}>
                  <span style={styles.pprice}>{formatPrice(p.price, p.country)}</span>
                  {p.mrp > p.price && <span style={styles.pdiscount}>-{Math.round((1 - p.price / p.mrp) * 100)}%</span>}
                </div>
                <div style={styles.pratingRow}>⭐ {p.rating || "New"}</div>
                <div style={styles.quickAdd} onClick={() => {
                  if (onAddToCart) {
                    onAddToCart({
                      productId: p.id,
                      name: p.name,
                      price: p.price,
                      image: p.images?.[0] || null,
                      sellerId: p.sellerId,
                      sellerName: p.sellerName || "Store",
                      country: p.country,
                      qty: 1
                    });
                    // If guest, redirect to login
                    if (!user) { onNavigate && onNavigate("login"); return; }
                  }
                  onNavigate && onNavigate("cart");
                }}>+ Add to Cart</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual country picker — for guests, either as override or when auto-detection fails */}
      {showCountryModal && (
        <div style={styles.countryModalOverlay} onClick={() => setShowCountryModal(false)}>
          <div style={styles.countryModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.countryModalTitle}>Select your country</div>
            <input
              className="input-field"
              style={{ marginBottom: 12 }}
              placeholder="Search countries..."
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              autoFocus
            />
            <div style={styles.countryModalList}>
              {activeCountryList
                .filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
                .map((c) => (
                  <div key={c.code} style={styles.countryModalRow} onClick={() => handleSelectGuestCountry(c.name)}>
                    <span style={{ fontSize: 20, marginRight: 10 }}>{getFlagEmoji(c.code)}</span>
                    <span>{c.name}</span>
                  </div>
                ))}
              {activeCountryList.length === 0 && (
                <p style={{ fontSize: 12.5, color: "#888", textAlign: "center", padding: 20 }}>No countries available yet.</p>
              )}
            </div>
            <div style={styles.countryModalClose} onClick={() => setShowCountryModal(false)}>Close</div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconButton({ icon, label, onClick, hasBadge }) {
  return (
    <div style={styles.iconBtnWrap} onClick={onClick}>
      <div style={styles.iconBtn}>
        {icon}
        {hasBadge && <div style={styles.badgeDot} />}
      </div>
      {label && <div style={styles.iconBtnLabel}>{label}</div>}
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

  header: { background: "linear-gradient(135deg, #0B3D2E 0%, #0f4d3a 100%)", padding: "18px 16px 18px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 6px 24px rgba(11,61,46,0.28)", borderRadius: "0 0 18px 18px" },
  topInfoRow: { display: "flex", flexDirection: "column", gap: 6 },
  topInfoLine: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  topIconsInline: { display: "flex", gap: 10, alignItems: "center", flexShrink: 0 },
  topUtilityRow: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14 },
  mainRow: { display: "flex", alignItems: "center", gap: 12 },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  logo: { color: "#FBF9F4", fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 900, flexShrink: 0, whiteSpace: "nowrap" },
  topIcons: { display: "flex", gap: 14, alignItems: "center" },
  loginIconBtn: { display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "8px 14px", borderRadius: 20, cursor: "pointer" },
  countryChip: { display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600, fontSize: 11.5, padding: "8px 12px", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap" },

  countryModalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  countryModal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 22, width: "100%", maxWidth: 480, maxHeight: "75vh", display: "flex", flexDirection: "column" },
  countryModalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", fontWeight: 700, marginBottom: 14 },
  countryModalList: { overflowY: "auto", flex: 1 },
  countryModalRow: { display: "flex", alignItems: "center", padding: "10px 6px", borderBottom: "1px solid #f0f0f0", cursor: "pointer", fontSize: 13.5, color: "#1a1a1a" },
  countryModalClose: { textAlign: "center", fontSize: 12.5, color: "#888", cursor: "pointer", padding: "12px 0 0" },
  logoutIconBtn: { background: "rgba(255,90,90,0.18)", border: "1px solid rgba(255,90,90,0.3)", color: "#fff", fontSize: 15, width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  cartBadge: { position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, background: "#D4AF37", color: "#0B3D2E", borderRadius: 999, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", border: "1.5px solid #0B3D2E" },
  iconBtnWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" },
  iconBtn: { width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#fff", position: "relative" },
  cartIconMain: { width: 44, height: 44, borderRadius: 12, background: "#D4AF37", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, cursor: "pointer", boxShadow: "0 3px 10px rgba(212,175,55,0.4)", flexShrink: 0 },
  iconBtnLabel: { fontSize: 8.5, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: 0.2, whiteSpace: "nowrap" },
  badgeDot: { position: "absolute", top: -3, right: -3, width: 9, height: 9, background: "#D4AF37", borderRadius: "50%", border: "2px solid #0B3D2E" },
  searchWrap: { display: "flex", alignItems: "center", background: "rgba(255,255,255,0.97)", borderRadius: 14, overflow: "hidden", flex: 1, minWidth: 0, boxShadow: "0 3px 10px rgba(0,0,0,0.12)" },
  searchBar: { flex: 1, minWidth: 0, background: "transparent", padding: "13px 4px 13px 16px", color: "#1a1a1a", fontSize: 13, fontWeight: 500, border: "none", outline: "none", fontFamily: "inherit" },
  searchBtn: { width: 46, height: 46, flexShrink: 0, background: "#D4AF37", color: "#0B3D2E", fontSize: 17, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, borderRadius: 12, margin: 2 },
  greeting: { marginTop: 14 },
  greetingEyebrow: { color: "#FBF9F4", fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, letterSpacing: 0.3 },
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
  bentoCard: { borderRadius: 18, padding: 14, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 78, cursor: "pointer", position: "relative" },
  bentoBig: { background: "linear-gradient(160deg, #0B3D2E, #1a5c44)", color: "#fff", minHeight: 166 },
  bannerDots: { position: "absolute", bottom: 10, right: 12, display: "flex", gap: 5 },
  bannerDot: { width: 6, height: 6, borderRadius: 10, background: "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.3s ease" },
  bannerDotActive: { background: "#D4AF37", width: 16 },
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

  loadingText: { fontSize: 13, color: "#6b6b6b" },
  emptyText: { fontSize: 13, color: "#6b6b6b" },

  flashScroll: { display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 },
  flashCard: { minWidth: 130, background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 14px rgba(11,61,46,0.08)", cursor: "pointer" },
  flashImg: { width: "100%", height: 120, background: "linear-gradient(135deg,#F0F5F0,#dce8de)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, position: "relative" },
  flashTag: { position: "absolute", top: 8, left: 8, background: "#0B3D2E", color: "#D4AF37", fontSize: 9, fontWeight: 800, padding: "3px 7px", borderRadius: 8 },
  flashInfo: { padding: 10 },
  flashName: {
    fontSize: 11, color: "#444", fontWeight: 600, marginBottom: 4, lineHeight: 1.3,
    minHeight: "2.6em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
  },
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
  pname: {
    fontSize: 11.5, color: "#333", fontWeight: 600, marginBottom: 5, lineHeight: 1.3,
    minHeight: "2.6em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
  },
  priceRow: { display: "flex", alignItems: "center", gap: 6 },
  pprice: { color: "#0B3D2E", fontWeight: 800, fontSize: 13.5 },
  pdiscount: { fontSize: 10.5, color: "#C0392B", fontWeight: 700 },
  pratingRow: { fontSize: 10, color: "#767676", fontWeight: 600, marginTop: 2 },
  quickAdd: { width: "100%", marginTop: 8, background: "#0B3D2E", color: "#D4AF37", fontSize: 10.5, fontWeight: 700, textAlign: "center", padding: 7, borderRadius: 10, cursor: "pointer" },

  bottomNav: { display: "flex", justifyContent: "space-around", alignItems: "center", padding: "12px 8px", margin: "10px 14px 0", background: "#0B3D2E", borderRadius: 24, boxShadow: "0 8px 24px rgba(11,61,46,0.3)", position: "sticky", bottom: 10 },
  navItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 9, color: "#7fa896", fontWeight: 600, cursor: "pointer" },
  navItemActive: { color: "#D4AF37" },
  navCircle: { width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 },
  navCircleActive: { background: "rgba(212,175,55,0.15)", borderRadius: "50%" }
};
