// ============================================
// UniMart - Admin Layout Wrapper
// Persistent sidebar for desktop, bottom nav
// for mobile. Used by all 6 admin portals.
// Includes: Logout button + View Website link
// ============================================

import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
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
    { key: "announcements", icon: "📢", label: "Announcements" },
  ],
  seller_manager: [
    { key: "dashboard", icon: "🏠", label: "Dashboard" },
    { key: "all-sellers", icon: "🏪", label: "All Sellers" },
    { key: "product-review", icon: "📦", label: "Product Reviews" },
    { key: "vacation-requests", icon: "🌴", label: "Vacation Requests" },
    { key: "flagged-sellers", icon: "⚠️", label: "Flagged Sellers" },
  ],
  marketing_manager: [
    { key: "dashboard", icon: "🏠", label: "Dashboard" },
    { key: "performance", icon: "📊", label: "Performance" },
    { key: "fraud-monitor", icon: "🔍", label: "Fraud Monitor" },
  ],
  support_team: [
    { key: "dashboard", icon: "🏠", label: "Dashboard" },
    { key: "complaints", icon: "💬", label: "Complaints" },
    { key: "returns", icon: "↩️", label: "Returns/Refunds" },
  ],
  finance_team: [
    { key: "dashboard", icon: "🏠", label: "Dashboard" },
    { key: "reports", icon: "📈", label: "Financial Reports" },
    { key: "reconciliation", icon: "⚖️", label: "Reconciliation" },
  ],
  content_team: [
    { key: "dashboard", icon: "🏠", label: "Dashboard" },
    { key: "flagged-listings", icon: "🚩", label: "Flagged Listings" },
    { key: "banners", icon: "🖼️", label: "Banners" },
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

export default function AdminLayout({ role, currentPage, onNavigate, children }) {
  const items = SIDEBAR_ITEMS[role] || [];
  const roleLabel = ROLE_LABELS[role] || "Admin";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // App.jsx will detect auth state change and redirect to login
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleViewWebsite = () => {
    window.open(window.location.origin, "_blank");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)", fontFamily: "var(--font-body)" }}>

      {/* ===== Desktop Sidebar ===== */}
      <div className="admin-sidebar">

        {/* Logo + Role */}
        <div style={s.sidebarHeader}>
          <div style={s.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span></div>
          <div style={s.roleLabel}>{roleLabel}</div>
        </div>

        {/* Nav Links */}
        <nav style={{ padding: "12px 0", flex: 1 }}>
          {items.map((item) => (
            <div
              key={item.key}
              style={{ ...s.navItem, ...(currentPage === item.key ? s.navItemActive : {}) }}
              onClick={() => onNavigate && onNavigate(item.key)}
            >
              <span style={{ fontSize: 16, minWidth: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div style={s.sidebarBottom}>
          <div style={s.viewWebsiteBtn} onClick={handleViewWebsite}>
            🌐 View Website
          </div>
          <div style={s.logoutBtn} onClick={handleLogout}>
            🚪 Logout
          </div>
        </div>
      </div>

      {/* ===== Main Content ===== */}
      <div className="admin-content">

        {/* Mobile Header */}
        <div className="admin-mobile-header">
          <div style={s.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 11, color: "#D4AF37", fontWeight: 700 }}>{roleLabel}</div>
            <div style={s.mobileLogoutBtn} onClick={handleLogout}>🚪</div>
          </div>
        </div>

        {/* Page Content */}
        <div style={{ flex: 1, paddingBottom: 70 }}>
          {children}
        </div>

        {/* Mobile Bottom Nav */}
        <div className="admin-mobile-nav">
          {items.slice(0, 4).map((item) => (
            <div
              key={item.key}
              style={{ ...s.mobileNavItem, ...(currentPage === item.key ? s.mobileNavActive : {}) }}
              onClick={() => onNavigate && onNavigate(item.key)}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ fontSize: 9 }}>{item.label.split(" ")[0]}</span>
            </div>
          ))}
          {/* Logout in mobile bottom nav */}
          <div style={s.mobileNavItem} onClick={handleLogout}>
            <span style={{ fontSize: 18 }}>🚪</span>
            <span style={{ fontSize: 9 }}>Logout</span>
          </div>
        </div>

      </div>
    </div>
  );
}

const s = {
  sidebarHeader: { padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  logo: { fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 },
  roleLabel: { fontSize: 11, color: "#D4AF37", fontWeight: 700, letterSpacing: 0.5 },

  navItem: { display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", cursor: "pointer", color: "#9dbfb4", fontSize: 13.5, fontWeight: 500 },
  navItemActive: { background: "rgba(212,175,55,0.15)", color: "#D4AF37", borderLeft: "3px solid #D4AF37" },

  sidebarBottom: { borderTop: "1px solid rgba(255,255,255,0.1)", padding: "12px 0" },
  viewWebsiteBtn: { display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", cursor: "pointer", color: "#9dbfb4", fontSize: 13, fontWeight: 500 },
  logoutBtn: { display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", cursor: "pointer", color: "#ff7b7b", fontSize: 13, fontWeight: 600 },

  mobileLogoutBtn: { background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#ff7b7b", cursor: "pointer", fontSize: 16 },

  mobileNavItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: "#9dbfb4", fontWeight: 600, cursor: "pointer", minWidth: 48 },
  mobileNavActive: { color: "#D4AF37" }
};
