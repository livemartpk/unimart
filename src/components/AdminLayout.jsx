// ============================================
// UniMart - Admin Layout
// Desktop: sidebar always visible (fixed left)
// Mobile: hamburger button toggles sidebar (slide-in)
// [Tailwind / Airbnb-inspired design system]
// ============================================

import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { COUNTRIES, getFlagUrl } from "../utils/countries";
import { AdminCountryProvider, useAdminCountry } from "../context/AdminCountryContext";

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
    <div className="flex h-screen bg-surface-soft">

      {/* ===== Sidebar ===== */}
      <div
        className={`fixed md:static inset-y-0 left-0 w-60 bg-canvas border-r border-hairline flex flex-col z-[100] transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Brand */}
        <div className="h-16 px-4.5 border-b border-hairline flex flex-col justify-center flex-shrink-0">
          <div className="text-display-lg text-ink">Uni<span className="text-rausch">Mart</span></div>
          <div className="text-[11px] text-rausch font-bold tracking-wide mt-0.5">{roleLabel}</div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-2.5 flex flex-col gap-1 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-btn text-body-sm font-medium text-left w-full transition-colors
              ${currentPage === item.key ? "bg-rausch/10 text-rausch font-semibold" : "text-body hover:bg-surface-soft"}`}
            >
              <span className="w-5 text-center text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom: View Website + Logout */}
        <div className="p-2.5 border-t border-hairline flex flex-col gap-1">
          <button onClick={handleViewWebsite} className="flex items-center gap-3 px-3.5 py-2.5 rounded-btn text-body-sm text-muted hover:bg-surface-soft w-full">
            🌐 <span>View Website</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3.5 py-2.5 rounded-btn bg-rausch/10 border border-rausch/20 text-rausch text-body-sm font-semibold w-full">
            🚪 <span>Logout</span>
          </button>
        </div>
      </div>

      {/* ===== Mobile Overlay ===== */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-[99] md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ===== Main Content ===== */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden md:ml-0">

        {/* Topbar */}
        <div className="h-16 px-4.5 flex items-center gap-4 bg-canvas border-b border-hairline flex-shrink-0">
          <button className="md:hidden text-xl text-ink" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <div className="flex-1 text-title-md text-ink font-bold whitespace-nowrap overflow-hidden text-ellipsis">
            {items.find(i => i.key === currentPage)?.label || roleLabel}
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div
              onClick={() => setShowCountryModal(true)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-body-sm font-semibold cursor-pointer whitespace-nowrap
              ${!country ? "bg-rausch-disabled/30 text-rausch border-rausch-disabled" : "bg-surface-soft text-ink border-hairline"}`}
            >
              {country && selectedCountryData ? (
                <>
                  <img src={getFlagUrl(selectedCountryData.code, 40)} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                  {country}
                </>
              ) : "🌍 Select country"}
            </div>
            <button onClick={handleLogout} title="Logout" className="w-10 h-10 rounded-full border border-hairline bg-surface-soft text-base flex items-center justify-center">
              🚪
            </button>
          </div>
        </div>

        {/* Page Content — this is the only part that scrolls */}
        <div className="flex-1 overflow-y-auto pb-8">
          {children}
        </div>

      </div>

      {/* ===== Country Picker Modal (only Active countries) ===== */}
      {showCountryModal && (
        <div className="fixed inset-0 bg-black/50 z-[400] flex items-end justify-center" onClick={() => setShowCountryModal(false)}>
          <div className="bg-canvas rounded-t-card p-5.5 w-full max-w-[480px] max-h-[75vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="text-title-md text-ink font-bold mb-3.5">Select country</div>
            <input
              className="w-full h-12 px-4 mb-3 rounded-btn border border-hairline text-body-md text-ink placeholder:text-muted focus:outline-none focus:border-ink"
              placeholder="Search countries..."
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              autoFocus
            />
            <div className="overflow-y-auto flex-1">
              {activeCountryList
                .filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
                .map((c) => (
                  <div key={c.code} onClick={() => handleSelectCountry(c.name)} className="flex items-center gap-2.5 py-2.5 px-1.5 border-b border-hairline-soft cursor-pointer text-body-sm text-ink">
                    <img src={getFlagUrl(c.code, 40)} alt="" className="w-6.5 h-6.5 rounded-full object-cover flex-shrink-0" />
                    <span>{c.name}</span>
                  </div>
                ))}
              {activeCountryList.length === 0 && (
                <p className="text-body-sm text-muted text-center p-5">
                  No countries are active yet — turn some on in Countries management.
                </p>
              )}
            </div>
            <div onClick={() => setShowCountryModal(false)} className="text-center text-body-sm text-muted cursor-pointer pt-3">Close</div>
          </div>
        </div>
      )}
    </div>
  );
}
