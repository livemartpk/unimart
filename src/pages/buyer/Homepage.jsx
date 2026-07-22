// ============================================
// UniMart - Homepage
// [Tailwind / Airbnb-inspired design system]
// Data: Connected to Firestore (products, etc.)
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../../config/firebase";
import LoadingLogo from "../../components/LoadingLogo";
import { optimizeImage } from "../../utils/optimizeImage";
import { COUNTRIES, getFlagUrl, formatPrice } from "../../utils/countries";

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
  const [guestCountry, setGuestCountry] = useState("");
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [activeCountryList, setActiveCountryList] = useState([]);
  const [countrySearch, setCountrySearch] = useState("");

  useEffect(() => {
    loadHomepageData();
  }, [guestCountry]);

  // Guest country detection: GPS first, then IP-based, so the homepage can
  // still filter products by country before the guest ever logs in.
  useEffect(() => {
    if (user) return;

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
        async () => { await tryIP(); },
        { timeout: 6000 }
      );
    } else {
      tryIP();
    }
  }, [user]);

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

  const loadHomepageData = async () => {
    setLoading(true);
    try {
      const buyerCountry = user?.country || guestCountry || "Pakistan";

      const flashQuery = query(
        collection(db, "products"),
        where("boost.type", "==", "flash_sale"),
        where("status", "==", "active"),
        where("country", "==", buyerCountry),
        limit(6)
      );
      const flashSnap = await getDocs(flashQuery);
      setFlashSaleProducts(flashSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      try {
        const bannersSnap = await getDocs(collection(db, "flashBanners"));
        setFlashBanners(bannersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to load flash banners:", err);
      }

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
        const salesScore = Math.log((p.salesCount || 0) + 1) * 12;
        const ratingScore = (p.rating || 0) * 5;
        const ageDays = p.createdAt?.seconds ? (now - p.createdAt.seconds * 1000) / 86400000 : 999;
        const recencyScore = Math.max(0, 15 - ageDays);
        const score = inStock ? salesScore + ratingScore + recencyScore : -9999;
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
  };

  const stories = [
    { key: "new", label: "New In", icon: "🆕" },
    { key: "trending", label: "Trending", icon: "🔥" },
    { key: "deals", label: "Deals", icon: "🏷️" },
    { key: "mall", label: "Mall", icon: "✨" },
    { key: "gifting", label: "Gifting", icon: "🎁" }
  ];

  return (
    <div className="min-h-screen bg-canvas pb-5">
      <div className="max-w-[1400px] mx-auto">

      {/* ===== Header (Top Nav) ===== */}
      <div className="sticky top-0 z-[100] bg-canvas border-b border-hairline">
        <div className="px-4 py-4">

          {/* Row 1: greeting + icons — collapses on scroll */}
          <div className="mb-3.5">
            <div className="flex justify-between items-center gap-2.5">
              <div className="text-title-md text-ink font-semibold">
                {user?.fullName ? `Salam, ${user.fullName.split(" ")[0]}` : "Salam"}
              </div>
              <div className="flex gap-2.5 items-center flex-shrink-0">
                {user ? (
                  <>
                    <IconButton icon="🔔" label="Notify" onClick={() => onNavigate && onNavigate("notifications")} hasBadge />
                    <IconButton icon="📦" label="Orders" onClick={() => onNavigate && onNavigate("orders")} />
                    <div className="flex flex-col items-center gap-0.5 cursor-pointer" onClick={handleLogout}>
                      <div className="w-8.5 h-8.5 rounded-btn bg-surface-soft border border-hairline flex items-center justify-center text-base">🚪</div>
                      <div className="text-[8.5px] font-bold text-muted whitespace-nowrap">Logout</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div onClick={() => setShowCountryModal(true)} className="flex items-center gap-1.5 bg-surface-soft border border-hairline text-ink font-semibold text-[11.5px] px-3 py-2 rounded-full cursor-pointer whitespace-nowrap">
                      {guestCountry ? (
                        <>
                          <img src={getFlagUrl(COUNTRIES.find(c => c.name === guestCountry)?.code, 40)} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                          {guestCountry}
                        </>
                      ) : "🌍 Select country"}
                    </div>
                    <div onClick={() => onNavigate && onNavigate("login")} className="flex items-center gap-1.5 bg-rausch text-white font-bold text-[12.5px] px-3.5 py-2 rounded-full cursor-pointer">
                      👤 Login
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: logo + search pill + cart */}
          <div className="flex items-center gap-3">
            <div className="text-display-lg text-ink flex-shrink-0">Uni<span className="text-rausch">Mart</span></div>

            <div className="flex-1 min-w-0 h-search-pill flex items-center bg-canvas border border-hairline rounded-full overflow-hidden shadow-elevation">
              <input
                className="flex-1 min-w-0 bg-transparent px-4 text-body-sm text-ink placeholder:text-muted outline-none"
                placeholder="Search products, stores, brands..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                autoComplete="off"
              />
              <div onClick={handleSearch} className="w-12 h-12 flex-shrink-0 bg-rausch hover:bg-rausch-active text-white flex items-center justify-center rounded-full m-0.5 cursor-pointer transition-colors">
                🔍
              </div>
            </div>

            <div className="relative flex-shrink-0">
              <div onClick={() => onNavigate && onNavigate("cart")} className="w-11 h-11 rounded-full bg-rausch text-white flex items-center justify-center text-lg cursor-pointer shadow-elevation">🛒</div>
              {cartCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-ink text-white rounded-full text-[9px] font-extrabold flex items-center justify-center px-1 border-2 border-canvas">
                  {cartCount}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Stories bar ===== */}
      {!isSearching && (
        <div className="flex gap-3.5 px-4 pt-4 pb-1.5 overflow-x-auto">
          {stories.map((s) => (
            <div key={s.key} className="flex flex-col items-center gap-1.5 min-w-[58px]">
              <div className="w-[58px] h-[58px] rounded-full border-2 border-hairline p-0.5 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-surface-soft flex items-center justify-center text-xl">{s.icon}</div>
              </div>
              <div className="text-[9px] text-body font-semibold">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ===== Social proof ===== */}
      {!isSearching && (
        <div className="mx-4 mt-1.5 flex items-center gap-2 bg-surface-soft rounded-card px-3.5 py-2.5">
          <div className="flex">
            <div className="w-5.5 h-5.5 rounded-full bg-canvas border-2 border-surface-soft flex items-center justify-center text-[10px]">😊</div>
            <div className="w-5.5 h-5.5 rounded-full bg-canvas border-2 border-surface-soft flex items-center justify-center text-[10px] -ml-2">🙂</div>
            <div className="w-5.5 h-5.5 rounded-full bg-canvas border-2 border-surface-soft flex items-center justify-center text-[10px] -ml-2">😄</div>
          </div>
          <div className="text-[10.5px] text-ink font-semibold"><b>2,300+</b> orders placed today</div>
        </div>
      )}

      {/* ===== Bento category grid ===== */}
      {!isSearching && (
        <div className="p-4">
          <div className="flex gap-2">
            <div className="flex-[1.3]">
              <div
                onClick={() => onNavigate && onNavigate("category", "flash")}
                className="rounded-card p-3.5 min-h-[166px] cursor-pointer relative flex flex-col justify-between text-white bg-ink"
                style={flashBanners[bannerSlide]?.imageUrl ? {
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.75) 100%), url(${optimizeImage(flashBanners[bannerSlide].imageUrl, 700)})`,
                  backgroundSize: "cover", backgroundPosition: "center", transition: "background-image 0.5s ease"
                } : {}}
              >
                <div className="text-2xl">⚡</div>
                <div>
                  <div className="text-[12.5px] font-bold">Flash Deals</div>
                  <div className="text-[9.5px] opacity-80 font-medium">Up to 60% off</div>
                </div>
                {flashBanners.length > 1 && (
                  <div className="absolute bottom-2.5 right-3 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {flashBanners.map((_, i) => (
                      <div
                        key={i}
                        onClick={() => setBannerSlide(i)}
                        className={`h-1.5 rounded-full cursor-pointer transition-all ${i === bannerSlide ? "w-4 bg-rausch" : "w-1.5 bg-white/40"}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex gap-2">
                <div onClick={() => onNavigate && onNavigate("category", "electronics")} className="flex-1 rounded-card p-3.5 min-h-[78px] cursor-pointer bg-surface-soft text-ink flex flex-col justify-between">
                  <div className="text-2xl">📱</div><div className="text-[12.5px] font-bold">Tech</div>
                </div>
                <div onClick={() => onNavigate && onNavigate("category", "fashion")} className="flex-1 rounded-card p-3.5 min-h-[78px] cursor-pointer bg-surface-strong text-ink flex flex-col justify-between">
                  <div className="text-2xl">👗</div><div className="text-[12.5px] font-bold">Fashion</div>
                </div>
              </div>
              <div className="flex gap-2">
                <div onClick={() => onNavigate && onNavigate("category", "beauty")} className="flex-1 rounded-card p-3.5 min-h-[78px] cursor-pointer bg-surface-soft text-ink flex flex-col justify-between">
                  <div className="text-2xl">💄</div><div className="text-[12.5px] font-bold">Beauty</div>
                </div>
                <div onClick={() => onNavigate && onNavigate("category", "home")} className="flex-1 rounded-card p-3.5 min-h-[78px] cursor-pointer bg-surface-strong text-ink flex flex-col justify-between">
                  <div className="text-2xl">🏠</div><div className="text-[12.5px] font-bold">Home</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Flash Sale ===== */}
      {!isSearching && (
        <div className="px-4 pt-2.5 pb-1">
          <div className="flex justify-between items-baseline mb-3">
            <div className="text-display-md text-ink flex items-center gap-1.5">
              Flash Sale <span className="bg-rausch text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full">LIVE</span>
            </div>
            <div onClick={() => onNavigate && onNavigate("flash-sale")} className="text-[11.5px] text-muted font-bold cursor-pointer">See all</div>
          </div>

          {loading ? (
            <LoadingLogo fullPage={false} size={16} />
          ) : flashSaleProducts.length === 0 ? (
            <p className="text-body-sm text-muted">No flash deals right now — check back soon.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1.5">
              {flashSaleProducts.map((p) => (
                <div key={p.id} onClick={() => onNavigate && onNavigate("product", p.id)} className="min-w-[130px] bg-canvas rounded-card overflow-hidden shadow-elevation cursor-pointer hover:shadow-lg transition-shadow">
                  <div className="w-full h-[120px] bg-surface-soft flex items-center justify-center text-4xl relative">
                    {p.images?.[0] ? <img src={optimizeImage(p.images[0], 260)} alt={p.name} className="w-full h-full object-cover" loading="lazy" /> : "🛍️"}
                    {p.discountPercent && <div className="absolute top-2 left-2 bg-ink text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">-{p.discountPercent}%</div>}
                  </div>
                  <div className="p-2.5">
                    <div className="text-[11px] text-body font-semibold mb-1 leading-tight line-clamp-2 min-h-[2.6em]">{p.name}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-ink font-extrabold text-sm">{formatPrice(p.price, p.country)}</span>
                      {p.mrp && <span className="text-muted text-[10px] line-through">{p.mrp}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== Voucher banner ===== */}
      {!isSearching && (
        <div onClick={() => onNavigate && onNavigate("vouchers")} className="mx-4 my-4.5 bg-ink rounded-card p-4.5 cursor-pointer">
          <div className="text-rausch text-[10px] font-extrabold tracking-wide uppercase">Limited Drop</div>
          <div className="text-white text-display-md my-1 mb-2.5">Rs 200 off your first order</div>
          <div className="inline-block bg-rausch text-white text-xs font-extrabold px-4.5 py-2 rounded-full">Claim now →</div>
        </div>
      )}

      {/* ===== Product grid ===== */}
      <div className="px-4 pt-2.5 pb-1">
        <div className="flex justify-between items-baseline">
          <div className="text-display-md text-ink">{isSearching ? `Search Results for "${searchQuery}"` : "Just For You"}</div>
          <div className="text-[11.5px] text-muted font-bold cursor-pointer">See all</div>
        </div>
      </div>

      {loading ? (
        <div className="px-4 py-3"><LoadingLogo fullPage={false} size={18} /></div>
      ) : displayedProducts.length === 0 ? (
        <p className="text-body-sm text-muted px-4">{searchQuery ? "No products found for your search." : "No products yet — be the first seller to add one!"}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 px-4 py-3.5">
          {displayedProducts.map((p) => (
            <div key={p.id} className="bg-canvas rounded-card overflow-hidden shadow-elevation hover:shadow-lg transition-shadow">
              <div onClick={() => onNavigate && onNavigate("product", p.id)} className="w-full aspect-square bg-surface-soft flex items-center justify-center text-3xl relative cursor-pointer">
                {p.images?.[0] ? <img src={optimizeImage(p.images[0], 320)} alt={p.name} className="w-full h-full object-cover" loading="lazy" /> : "🛍️"}
                <div onClick={(e) => { e.stopPropagation(); toggleWishlist(p.id); }} className="absolute top-2 right-2 w-7 h-7 bg-canvas/90 rounded-full flex items-center justify-center text-[13px] cursor-pointer shadow-elevation">
                  {wishlist.includes(p.id) ? "❤️" : "🤍"}
                </div>
                {p.verifiedMall && <div className="absolute bottom-2 left-2 bg-canvas text-ink text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-elevation">VERIFIED</div>}
              </div>
              <div className="p-2.5">
                <div className="text-[11.5px] text-ink font-semibold mb-1 leading-tight line-clamp-2 min-h-[2.6em]">{p.name}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-ink font-extrabold text-[13.5px]">{formatPrice(p.price, p.country)}</span>
                  {p.mrp > p.price && <span className="text-[10.5px] text-rausch font-bold">-{Math.round((1 - p.price / p.mrp) * 100)}%</span>}
                </div>
                <div className="text-[10px] text-muted font-semibold mt-0.5">⭐ {p.rating || "New"}</div>
                <div
                  onClick={() => {
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
                      if (!user) { onNavigate && onNavigate("login"); return; }
                    }
                    onNavigate && onNavigate("cart");
                  }}
                  className="w-full mt-2 bg-ink hover:bg-rausch text-white text-[10.5px] font-bold text-center py-1.5 rounded-btn cursor-pointer transition-colors"
                >
                  + Add to Cart
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      </div>

      {/* ===== Manual country picker ===== */}
      {showCountryModal && (
        <div onClick={() => setShowCountryModal(false)} className="fixed inset-0 bg-black/50 z-[400] flex items-end justify-center">
          <div onClick={(e) => e.stopPropagation()} className="bg-canvas rounded-t-card p-5.5 w-full max-w-[480px] max-h-[75vh] flex flex-col">
            <div className="text-title-md text-ink font-bold mb-3.5">Select your country</div>
            <input
              className="w-full h-12 px-4 mb-3 rounded-btn border border-hairline text-body-md text-ink placeholder:text-muted outline-none focus:border-ink"
              placeholder="Search countries..."
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              autoFocus
            />
            <div className="overflow-y-auto flex-1">
              {activeCountryList
                .filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
                .map((c) => (
                  <div key={c.code} onClick={() => handleSelectGuestCountry(c.name)} className="flex items-center gap-2.5 py-2.5 px-1.5 border-b border-hairline-soft cursor-pointer text-body-sm text-ink">
                    <img src={getFlagUrl(c.code, 40)} alt="" className="w-6.5 h-6.5 rounded-full object-cover flex-shrink-0" />
                    <span>{c.name}</span>
                  </div>
                ))}
              {activeCountryList.length === 0 && (
                <p className="text-body-sm text-muted text-center p-5">No countries available yet.</p>
              )}
            </div>
            <div onClick={() => setShowCountryModal(false)} className="text-center text-body-sm text-muted cursor-pointer pt-3">Close</div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconButton({ icon, label, onClick, hasBadge }) {
  return (
    <div className="flex flex-col items-center gap-0.5 cursor-pointer" onClick={onClick}>
      <div className="w-8.5 h-8.5 rounded-btn bg-surface-soft border border-hairline flex items-center justify-center text-base relative">
        {icon}
        {hasBadge && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rausch rounded-full border-2 border-canvas" />}
      </div>
      {label && <div className="text-[8.5px] font-bold text-muted whitespace-nowrap">{label}</div>}
    </div>
  );
}
