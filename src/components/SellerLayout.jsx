// ============================================
// UniMart - Seller Layout
// Same pattern as AdminLayout:
// Fixed left sidebar on desktop
// Hamburger slide menu on mobile
// ============================================

import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import "../styles/theme.css";

const SIDEBAR_ITEMS = [
  { key: "seller-dashboard", icon: "🏠", label: "Dashboard" },
  { key: "my-products", icon: "🛍️", label: "My Products" },
  { key: "add-product", icon: "➕", label: "Add Product" },
  { key: "incoming-orders", icon: "📦", label: "Incoming Orders" },
  { key: "seller-wallet", icon: "💰", label: "My Wallet" },
  { key: "points-boost", icon: "⚡", label: "Points & Boost" },
  { key: "store-settings", icon: "⚙️", label: "Store Settings" },
];

export default function SellerLayout({ currentPage, onNavigate, storeName, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (err) { console.error(err); }
  };

  const handleNav = (key) => {
    setSidebarOpen(false);
    onNavigate && onNavigate(key);
  };

  return (
    <div style={s.shell}>

      {/* ===== Sidebar ===== */}
      <div className={`admin-sidebar${sidebarOpen ? " open" : ""}`}>

        {/* Brand */}
        <div style={s.brand}>
          <div style={s.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span></div>
          <div style={s.roleLabel}>🏪 {storeName || "Seller"}</div>
        </div>

        {/* Nav Links */}
        <nav style={s.nav}>
          {SIDEBAR_ITEMS.map((item) => (
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

        {/* Bottom */}
        <div style={s.sidebarBottom}>
          <button style={s.viewWebsiteBtn} onClick={() => window.open(window.location.origin, "_blank")}>
            🌐 <span>View Store</span>
          </button>
          <button style={s.logoutBtn} onClick={handleLogout}>
            🚪 <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div style={s.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ===== Main Content ===== */}
      <div className="admin-main-content" style={s.mainContent}>

        {/* Topbar — same dark green as page headers, so there's no white strip */}
        <div style={s.topbar}>
          <button className="admin-menu-toggle" style={s.menuToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={s.sellerChip}>
              🏪 {storeName || "My Store"}
            </div>
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
  shell: { display: "flex", minHeight: "100vh", background: "#F0F4F3", fontFamily: "var(--font-body)" },
  brand: { padding: "20px 18px", borderBottom: "1px solid rgba(255,255,255,0.12)", flexShrink: 0 },
  logo: { fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, color: "#fff" },
  roleLabel: { fontSize: 11, color: "#D4AF37", fontWeight: 700, letterSpacing: 0.5, marginTop: 3 },
  nav: { flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" },
  navItem: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: "none", border: "none", color: "rgba(255,255,255,0.75)", fontFamily: "inherit", fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left", width: "100%" },
  navItemActive: { background: "rgba(255,255,255,0.15)", color: "#fff" },
  navIcon: { width: 20, textAlign: "center", fontSize: 16 },
  sidebarBottom: { padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.12)", display: "flex", flexDirection: "column", gap: 4 },
  viewWebsiteBtn: { display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", width: "100%" },
  logoutBtn: { display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,80,80,0.13)", border: "1px solid rgba(255,100,100,0.2)", color: "rgba(255,180,180,0.9)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", width: "100%" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 },
  mainContent: { marginLeft: 240, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", width: "calc(100% - 240px)", overflowX: "hidden" },
  topbar: { background: "#0B3D2E", padding: "10px 16px", minHeight: 46, display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 40 },
  menuToggle: { background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#fff", display: "none" },
  sellerChip: { background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" },
  topbarLogoutBtn: { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "8px 12px", fontSize: 16, cursor: "pointer", color: "#fff", fontFamily: "inherit" }
};
