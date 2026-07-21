// ============================================
// UniMart - Seller Layout
// Same pattern as AdminLayout:
// Fixed left sidebar on desktop
// Hamburger slide menu on mobile
// [Tailwind / Airbnb-inspired design system]
// ============================================

import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

const SIDEBAR_ITEMS = [
  { key: "seller-dashboard", icon: "🏠", label: "Dashboard" },
  { key: "my-products", icon: "🛍️", label: "My Products" },
  { key: "add-product", icon: "➕", label: "Add Product" },
  { key: "incoming-orders", icon: "📦", label: "Incoming Orders" },
  { key: "seller-wallet", icon: "💰", label: "My Wallet" },
  { key: "points-boost", icon: "⚡", label: "Points & Boost" },
  { key: "store-settings", icon: "⚙️", label: "Store Settings" },
];

export default function SellerLayout({ currentPage, onNavigate, storeName, user, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storeStatus, setStoreStatus] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    const loadStatus = async () => {
      try {
        const snap = await getDoc(doc(db, "sellers", user.uid));
        if (snap.exists()) setStoreStatus(snap.data().storeStatus);
      } catch (err) {
        console.error("Failed to load store status:", err);
      }
    };
    loadStatus();
  }, [user?.uid]);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (err) { console.error(err); }
  };

  const handleNav = (key) => {
    setSidebarOpen(false);
    onNavigate && onNavigate(key);
  };

  const statusLabel = storeStatus === "vacation" ? "On Vacation" : storeStatus === "approved" ? "Active" : storeStatus === "pending" ? "Pending" : null;
  const statusClass =
    storeStatus === "approved" ? "bg-green-100 text-green-700" :
    storeStatus === "vacation" ? "bg-surface-strong text-body" :
    "bg-rausch-disabled/40 text-rausch";

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
          <div className="text-[11px] text-rausch font-bold tracking-wide mt-0.5">🏪 {storeName || "Seller"}</div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-2.5 flex flex-col gap-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item) => (
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

        {/* Bottom */}
        <div className="p-2.5 border-t border-hairline flex flex-col gap-1">
          <button onClick={() => window.open(window.location.origin, "_blank")} className="flex items-center gap-3 px-3.5 py-2.5 rounded-btn text-body-sm text-muted hover:bg-surface-soft w-full">
            🌐 <span>View Store</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3.5 py-2.5 rounded-btn bg-rausch/10 border border-rausch/20 text-rausch text-body-sm font-semibold w-full">
            🚪 <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-[99] md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ===== Main Content ===== */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Topbar */}
        <div className="h-16 px-4.5 flex items-center gap-4 bg-canvas border-b border-hairline flex-shrink-0">
          <button className="md:hidden text-xl text-ink" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2.5">
            {statusLabel && (
              <div className={`text-[10.5px] font-extrabold px-3 py-1.5 rounded-full uppercase ${statusClass}`}>
                {statusLabel}
              </div>
            )}
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
    </div>
  );
}
