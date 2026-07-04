// ============================================
// UniMart - Admin Layout
// Sidebar pattern copied from Rising Hope Society:
// - Desktop: sidebar always visible (fixed left)
// - Mobile: hamburger button toggles sidebar
//   with overlay (same as RHS admin dashboard)
// ============================================

import { useState } from "react";
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

export default function AdminLayout({ role, currentPage, onNavigate, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const items = SIDEBAR_ITEMS[role] || [];
  const roleLabel = ROLE_LABELS[role] || "Admin";

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

        {/* Topbar (mobile + desktop) */}
        <div style={s.topbar}>
          {/* Hamburger — mobile only */}
          <button
            className="admin-menu-toggle"
            style={s.menuToggle}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <div style={s.pageTitle}>
            {items.find(i => i.key === currentPage)?.label || roleLabel}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={s.adminChip}>
              <span>👤</span> {roleLabel}
            </div>
            {/* Logout button — visible on both mobile and desktop */}
            <button style={s.topbarLogoutBtn} onClick={handleLogout} title="Logout">
              🚪
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div style={{ flex: 1, paddingBottom: 30 }}>
          {children}
        </div>

      </div>
    </div>
  );
}

const s = {
  shell: {
    display: "flex",
    minHeight: "100vh",
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
    minHeight: "100vh",
    width: "calc(100% - 240px)",
    overflowX: "hidden"
  },

  topbar: {
    background: "#fff",
    padding: "0 24px",
    height: 62,
    display: "flex",
    alignItems: "center",
    gap: 16,
    borderBottom: "1px solid #E7DFD2",
    position: "sticky",
    top: 0,
    zIndex: 40
  },
  menuToggle: {
    background: "none", border: "none",
    fontSize: 20, cursor: "pointer",
    color: "#1F2E2B", display: "none"
  },
  pageTitle: {
    fontFamily: "Georgia, serif",
    fontSize: 18,
    color: "#0B3D2E",
    flex: 1,
    fontWeight: 700
  },
  adminChip: {
    background: "#EEF8F1", color: "#1F7A45",
    border: "1px solid #BFE3CC",
    padding: "6px 14px", borderRadius: 999,
    fontSize: 13, fontWeight: 600,
    display: "flex", alignItems: "center", gap: 7
  },
  topbarLogoutBtn: {
    background: "#FCEAEA",
    border: "1px solid #f5c6c6",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 16,
    cursor: "pointer",
    color: "#C0392B",
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center"
  }
};
