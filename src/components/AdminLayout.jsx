// ============================================
// UniMart - Admin Layout
// Sidebar pattern copied from Rising Hope Society:
// - Desktop: sidebar always visible (fixed left)
// - Mobile: hamburger button toggles sidebar
//   with overlay (same as RHS admin dashboard)
// ============================================

import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { COUNTRIES, getFlagUrl } from "../utils/countries";
import { AdminCountryProvider, useAdminCountry } from "../context/AdminCountryContext";
import "../styles/theme.css";

const SIDEBAR_ITEMS = {
  super_admin: [
    { key: "dashboard", icon: "🏠", label: "Dashboard" },
    { key: "policy-engine", icon: "⚙️", label: "Policy Engine" },
    { key: "admin-management", icon: "👥", label: "Admin Management" },
    { key: "wallets", icon: "💰", label: "Wallets Overview" },
    { key: "sellers", icon: "🏪", label: "Sellers" },
    { key: "agents", icon: "🤝", label: "Agents" },
    { key: "activity-logs", icon: "📋", label: "Activity Logs" },
    { key: "categories", icon: "🏷️", label: "Categories" },
    { key: "countries-mgmt", icon: "🌍", label: "Countries" },
    { key: "backfill-countries", icon: "🔄", label: "Backfill Countries" },
    { key: "announcements", icon: "📢", label: "Announcements" },
    { key: "reset-test-data", icon: "🧹", label: "Reset Test Data" },
  ],
  seller_manager: [
    { key: "dashboard", icon: "🏠", label: "Dashboard" },
    { key: "seller-registrations", icon: "📋", label: "New Registrations" },
    { key: "all-sellers", icon: "🏪", label: "All Sellers" },
    { key: "product-review", icon: "📦", label: "Product Reviews" },
    { key: "vacation-requests", icon: "🌴", label: "Vacation Requests" },
    { key: "flagged-sellers", icon: "⚠️", label: "Flagged Sellers" },
  ],
  marketing_manager: [
    { key: "dashboard", icon: "🏠", label: "Dashboard" },
    { key: "agents", icon: "🤝", label: "Agent Management" },
    { key: "performance", icon: "📊", label: "Performance Analytics" },
    { key: "fraud-monitor", icon: "🔍", label: "Fraud Monitor" },
    { key: "flash-banner", icon: "⚡", label: "Flash Deals Banner" },
  ],
  support_team: [
    { key: "dashboard", icon: "🏠", label: "Dashboard" },
    { key: "disputes", icon: "⚔️", label: "Disputes" },
    { key: "complaints", icon: "💬", label: "Complaints" },
    { key: "returns", icon: "↩️", label: "Returns & Refunds" },
  ],
  finance_team: [
    { key: "dashboard", icon: "🏠", label: "Dashboard" },
    { key: "withdrawals", icon: "💸", label: "Withdrawal Requests" },
    { key: "reports", icon: "📈", label: "Financial Reports" },
    { key: "reconciliation", icon: "⚖️", label: "Reconciliation" },
  ],
  content_team: [
    { key: "dashboard", icon: "🏠", label: "Dashboard" },
    { key: "product-reviews", icon: "📦", label: "Product Reviews" },
    { key: "flagged-listings", icon: "🚩", label: "Flagged Listings" },
    { key: "banners", icon: "🖼️", label: "Banner Management" },
  ],
};

const ROLE_LABELS = {
  super_admin: "Super Admin",
  seller_manager: "Seller Manager",
  marketing_manager: "Marketing Manager",
  support_team: "Support Team",
  finance_team: "Finance Team",
  content_team: "Content Team",
};

export default function AdminLayout(props) {
  return (
    <AdminCountryProvider>
      <AdminLayoutInner {...props} />
    </AdminCountryProvider>
  );
}

function AdminLayoutInner({ role, currentPage, onNavigate, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { country, setCountry } = useAdminCountry();
  const [activeCountryList, setActiveCountryList] = useState([]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const items = SIDEBAR_ITEMS[role] || [];
  const roleLabel = ROLE_LABELS[role] || "Admin";

  useEffect(() => {
    const loadActiveCountries = async () => {
      try {
        const snap = await getDocs(collection(db, "activeCountries"));
        const activeCodes = new Set(snap.docs.filter((d) => d.data().active === true).map((d) => d.id));
        setActiveCountryList(COUNTRIES.filter((c) => activeCodes.has(c.code)));
      } catch (err) {
        console.error("Failed to load active countries:", err);
      }
    };
    loadActiveCountries();
  }, []);

  const selectedCountryData = COUNTRIES.find((c) => c.name === country);

  const handleSelectCountry = (name) => {
    setCountry(name);
    setShowCountryModal(false);
    setCountrySearch("");
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (err) { console.error("Logout failed:", err); }
  };

  const handleNav = (key) => {
    setSidebarOpen(false); // close sidebar on mobile after click
    onNavigate && onNavigate(key);
  };

  const handleViewWebsite = () => {
    window.open(window.location.origin, "_blank");
  };

  return (
    <div style={s.shell}>

      {/* ===== Sidebar ===== */}
      <div className={`admin-sidebar${sidebarOpen ? " open" : ""}`}>

        {/* Brand */}
        <div style={s.brand}>
          <div style={s.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span></div>
          <div style={s.roleLabel}>{roleLabel}</div>
        </div>

        {/* Nav Links */}
        <nav style={s.nav}>
          {items.map((item) => (
            <button
              key={item.key}
              style={{
                ...s.navItem,
                ...(currentPage === item.key ? s.navItemActive : {})
              }}
              onClick={() => handleNav(item.key)}
            >
              <span style={s.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom: View Website + Logout */}
        <div style={s.sidebarBottom}>
          <button style={s.viewWebsiteBtn} onClick={handleViewWebsite}>
            🌐 <span>View Website</span>
          </button>
          <button style={s.logoutBtn} onClick={handleLogout}>
            🚪 <span>Logout</span>
          </button>
        </div>
      </div>

      {/* ===== Mobile Overlay (click to close sidebar) ===== */}
      {sidebarOpen && (
        <div style={s.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ===== Main Content ===== */}
      <div className="admin-main-content" style={s.mainContent}>

        {/* Topbar — same dark green as page headers, no white strip */}
        <div style={s.topbar}>
          {/* Hamburger — mobile only */}
          <button
            className="admin-menu-toggle"
            style={s.menuToggle}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{ ...s.adminChip, ...(!country ? s.countrySelectorEmpty : {}), cursor: "pointer" }}
              onClick={() => setShowCountryModal(true)}
            >
              {country && selectedCountryData ? (
                <>
                  <img src={getFlagUrl(selectedCountryData.code, 40)} alt="" style={s.flagIconSmall} />
                  {country}
                </>
              ) : "🌍 Select country"}
            </div>
            <div style={s.adminChip}>
              <span>👤</span> {roleLabel}
            </div>
            {/* Logout button — visible on both mobile and desktop */}
            <button style={s.topbarLogoutBtn} onClick={handleLogout} title="Logout">
              🚪
            </button>
          </div>
        </div>

        {/* Page Content — this is the only part that scrolls */}
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 30 }}>
          {children}
        </div>

      </div>

      {/* ===== Country Picker Modal (only Active countries) ===== */}
      {showCountryModal && (
        <div style={s.countryModalOverlay} onClick={() => setShowCountryModal(false)}>
          <div style={s.countryModal} onClick={(e) => e.stopPropagation()}>
            <div style={s.countryModalTitle}>Select country</div>
            <input
              className="input-field"
              style={{ marginBottom: 12 }}
              placeholder="Search countries..."
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              autoFocus
            />
            <div style={s.countryModalList}>
              {activeCountryList
                .filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
                .map((c) => (
                  <div key={c.code} style={s.countryModalRow} onClick={() => handleSelectCountry(c.name)}>
                    <img src={getFlagUrl(c.code, 40)} alt="" style={s.flagIconModal} />
                    <span>{c.name}</span>
                  </div>
                ))}
              {activeCountryList.length === 0 && (
                <p style={{ fontSize: 12.5, color: "#888", textAlign: "center", padding: 20 }}>
                  No countries are active yet — turn some on in Countries management.
                </p>
              )}
            </div>
            <div style={s.countryModalClose} onClick={() => setShowCountryModal(false)}>Close</div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  shell: {
    display: "flex",
    height: "100vh",
    background: "#F0F4F3",
    fontFamily: "var(--font-body)"
  },
  brand: {
    padding: "20px 18px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    flexShrink: 0
  },
  logo: {
    fontFamily: "Georgia, serif",
    fontSize: 22,
    fontWeight: 800,
    color: "#fff"
  },
  roleLabel: {
    fontSize: 11,
    color: "#D4AF37",
    fontWeight: 700,
    letterSpacing: 0.5,
    marginTop: 3
  },
  nav: {
    flex: 1,
    padding: "16px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    overflowY: "auto"
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 10,
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.75)",
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    transition: "background 0.2s"
  },
  navItemActive: {
    background: "rgba(255,255,255,0.15)",
    color: "#fff"
  },
  navIcon: { width: 20, textAlign: "center", fontSize: 16 },

  sidebarBottom: {
    padding: "12px 10px",
    borderTop: "1px solid rgba(255,255,255,0.12)",
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  viewWebsiteBtn: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 14px", borderRadius: 10,
    background: "none", border: "none",
    color: "rgba(255,255,255,0.65)", fontSize: 13.5,
    fontWeight: 500, cursor: "pointer", fontFamily: "inherit", width: "100%"
  },
  logoutBtn: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 14px", borderRadius: 10,
    background: "rgba(255,80,80,0.13)",
    border: "1px solid rgba(255,100,100,0.2)",
    color: "rgba(255,180,180,0.9)", fontSize: 13.5,
    fontWeight: 600, cursor: "pointer", fontFamily: "inherit", width: "100%"
  },

  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 99
  },

  mainContent: {
    marginLeft: 240,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "calc(100% - 240px)",
    overflow: "hidden"
  },

  topbar: {
    background: "#0B3D2E",
    padding: "20px 18px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexShrink: 0
  },
  menuToggle: {
    background: "none", border: "none",
    fontSize: 20, cursor: "pointer",
    color: "#fff", display: "none"
  },
  pageTitle: {
    fontFamily: "Georgia, serif",
    fontSize: 18,
    color: "#0B3D2E",
    flex: 1,
    fontWeight: 700
  },
  adminChip: {
    background: "rgba(255,255,255,0.15)", color: "#fff",
    border: "1px solid rgba(255,255,255,0.2)",
    padding: "6px 14px", borderRadius: 999,
    fontSize: 12.5, fontWeight: 600,
    display: "flex", alignItems: "center", gap: 7,
    whiteSpace: "nowrap"
  },
  countrySelectorEmpty: {
    background: "#FCEAEA", color: "#C0392B", border: "1px solid #f5c6c6"
  },
  flagIconSmall: { width: 16, height: 16, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  flagIconModal: { width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },

  countryModalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  countryModal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 22, width: "100%", maxWidth: 480, maxHeight: "75vh", display: "flex", flexDirection: "column" },
  countryModalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", fontWeight: 700, marginBottom: 14 },
  countryModalList: { overflowY: "auto", flex: 1 },
  countryModalRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 6px", borderBottom: "1px solid #f0f0f0", cursor: "pointer", fontSize: 13.5, color: "#1a1a1a" },
  countryModalClose: { textAlign: "center", fontSize: 12.5, color: "#888", cursor: "pointer", padding: "12px 0 0" },
  topbarLogoutBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 16,
    cursor: "pointer",
    color: "#fff",
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center"
  }
};
