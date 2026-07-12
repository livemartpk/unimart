// ============================================
// UniMart - Seller Dashboard (Main Page)
// ============================================

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";
import LoadingLogo from "../../components/LoadingLogo";
import { formatPrice } from "../../utils/countries";

export default function SellerDashboard({ user, onNavigate }) {
  const [seller, setSeller] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, monthSales: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [activeBoosts, setActiveBoosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vacationLoading, setVacationLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const sellerSnap = await getDoc(doc(db, "sellers", user.uid));
      if (sellerSnap.exists()) setSeller(sellerSnap.data());

      const walletSnap = await getDoc(doc(db, "wallets_seller", user.uid));
      if (walletSnap.exists()) setWallet(walletSnap.data());

      // Products
      const productsQuery = query(collection(db, "products"), where("sellerId", "==", user.uid));
      const productsSnap = await getDocs(productsQuery);
      const products = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStats((s) => ({ ...s, totalProducts: products.length }));
      setLowStockProducts(products.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) <= 5));
      setActiveBoosts(products.filter((p) => p.boost?.expiresAt));

      // Orders
      const ordersQuery = query(
        collection(db, "orders"),
        where("sellerId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const ordersSnap = await getDocs(ordersQuery);
      const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRecentOrders(orders.slice(0, 5));
      setStats((s) => ({ ...s, totalOrders: orders.length }));

      const thisMonth = new Date().getMonth();
      const monthSales = orders
        .filter((o) => o.createdAt?.toDate && o.createdAt.toDate().getMonth() === thisMonth && o.status !== "cancelled")
        .reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      setStats((s) => ({ ...s, monthSales }));

    } catch (err) {
      console.error("Dashboard load failed:", err);
    }
    setLoading(false);
  };

  const toggleVacation = async () => {
    setVacationLoading(true);
    try {
      const newStatus = seller.storeStatus === "vacation" ? "approved" : "vacation";
      await updateDoc(doc(db, "sellers", user.uid), { storeStatus: newStatus });
      setSeller((s) => ({ ...s, storeStatus: newStatus }));
    } catch (err) {
      console.error("Failed to toggle vacation mode:", err);
    }
    setVacationLoading(false);
  };

  if (loading) return <LoadingLogo />;

  const onVacation = seller?.storeStatus === "vacation";

  return (
    <div className="page-shell" style={styles.page}>
      <div className="container" style={{ paddingTop: 16 }}>
        {/* Vacation toggle */}
        <div style={styles.vacationCard}>
          <div>
            <div style={styles.vacationTitle}>Vacation Mode</div>
            <div style={styles.vacationSub}>Pause your store temporarily — new orders won't come in.</div>
          </div>
          <div style={{ ...styles.toggle, ...(onVacation ? styles.toggleOn : {}) }} onClick={!vacationLoading ? toggleVacation : undefined}>
            <div style={{ ...styles.toggleDot, ...(onVacation ? styles.toggleDotOn : {}) }} />
          </div>
        </div>

        {/* Stats cards */}
        <div style={styles.statsGrid}>
          <StatCard label="Total Products" value={stats.totalProducts} />
          <StatCard label="Total Orders" value={stats.totalOrders} />
          <StatCard label="This Month Sales" value={formatPrice(stats.monthSales, seller?.country)} />
          <StatCard label="Store Rating" value={`⭐ ${seller?.rating || "New"}`} />
        </div>

        {/* Wallet */}
        <div style={styles.walletRow}>
          <div style={styles.walletCard}>
            <div style={styles.walletLabel}>Total Balance</div>
            <div style={styles.walletValue}>{formatPrice(wallet?.totalBalance || 0, seller?.country)}</div>
          </div>
          <div style={styles.walletCard}>
            <div style={styles.walletLabel}>Available Balance</div>
            <div style={styles.walletValue}>{formatPrice(wallet?.availableBalance || 0, seller?.country)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => onNavigate && onNavigate("wallet")}>View Wallet</button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => onNavigate && onNavigate("withdraw")}>Withdraw</button>
        </div>

        {/* Low stock alert */}
        {lowStockProducts.length > 0 && (
          <div style={styles.alertCard}>
            <div style={styles.alertTitle}>⚠️ Low Stock Alert</div>
            {lowStockProducts.slice(0, 3).map((p) => (
              <div key={p.id} style={styles.alertRow} onClick={() => onNavigate && onNavigate("edit-product", p.id)}>
                {p.name} — only {p.stock} left
              </div>
            ))}
          </div>
        )}

        {/* Active boosts */}
        {activeBoosts.length > 0 && (
          <div style={styles.boostCard}>
            <div style={styles.boostTitle}>🚀 Active Boosts</div>
            {activeBoosts.slice(0, 2).map((p) => (
              <div key={p.id} style={styles.boostRow}>{p.name} is boosted ({p.boost?.type})</div>
            ))}
          </div>
        )}

        {/* Recent orders */}
        <div style={styles.sectionHead}>
          <h3 style={styles.sectionTitle}>Recent Orders</h3>
          <span style={styles.seeAll} onClick={() => onNavigate && onNavigate("orders")}>View All</span>
        </div>
        {recentOrders.length === 0 ? (
          <p style={styles.emptyText}>No orders yet.</p>
        ) : (
          recentOrders.map((o) => (
            <div key={o.id} style={styles.orderRow} onClick={() => onNavigate && onNavigate("order-detail", o.id)}>
              <div>
                <div style={styles.orderId}>#{o.id.slice(0, 8)}</div>
                <div style={styles.orderBuyer}>{o.buyerName || "Buyer"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={styles.orderAmount}>{formatPrice(o.grandTotal || 0, seller?.country)}</div>
                <div style={styles.orderStatus}>{o.status}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom nav */}
      <div style={styles.bottomNav}>
        <NavItem icon="🏠" label="Dashboard" active onClick={() => onNavigate && onNavigate("dashboard")} />
        <NavItem icon="📦" label="Products" onClick={() => onNavigate && onNavigate("products")} />
        <NavItem icon="🛍️" label="Orders" onClick={() => onNavigate && onNavigate("orders")} />
        <NavItem icon="💰" label="Wallet" onClick={() => onNavigate && onNavigate("wallet")} />
        <NavItem icon="⚙️" label="Settings" onClick={() => onNavigate && onNavigate("settings")} />
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div style={{ ...styles.navItem, ...(active ? styles.navItemActive : {}) }} onClick={onClick}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      {label}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", paddingBottom: 80, margin: "0 auto" },
  header: { padding: "20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee0c0" },
  welcomeText: { color: "#888", fontSize: 12 },
  storeName: { color: "#0B3D2E", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  statusBadge: { fontSize: 10, fontWeight: 800, padding: "5px 10px", borderRadius: 20, textTransform: "uppercase" },
  statusActive: { background: "#D4AF37", color: "#0B3D2E" },
  statusPending: { background: "#fff", color: "#888" },
  statusVacation: { background: "#fff", color: "#0B3D2E" },

  vacationCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  vacationTitle: { fontWeight: 700, fontSize: 13.5, color: "#0B3D2E", marginBottom: 3 },
  vacationSub: { fontSize: 11, color: "#888", maxWidth: 220 },
  toggle: { width: 44, height: 24, borderRadius: 14, background: "#e0e0e0", padding: 3, cursor: "pointer" },
  toggleOn: { background: "#0B3D2E" },
  toggleDot: { width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "transform 0.2s" },
  toggleDotOn: { transform: "translateX(20px)" },

  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 },
  statCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 14 },
  statValue: { fontSize: 19, fontWeight: 800, color: "#0B3D2E" },
  statLabel: { fontSize: 11, color: "#888", marginTop: 4 },

  walletRow: { display: "flex", gap: 10, marginBottom: 10 },
  walletCard: { flex: 1, background: "#F0F5F0", borderRadius: 14, padding: 14 },
  walletLabel: { fontSize: 11, color: "#0B3D2E", fontWeight: 600 },
  walletValue: { fontSize: 17, fontWeight: 800, color: "#0B3D2E", marginTop: 4 },

  alertCard: { background: "#FBF1DA", border: "1px solid #D4AF37", borderRadius: 12, padding: 14, marginBottom: 16 },
  alertTitle: { fontWeight: 700, fontSize: 13, color: "#5a4419", marginBottom: 8 },
  alertRow: { fontSize: 12, color: "#5a4419", padding: "4px 0", cursor: "pointer" },

  boostCard: { background: "#F0F5F0", borderRadius: 12, padding: 14, marginBottom: 20 },
  boostTitle: { fontWeight: 700, fontSize: 13, color: "#0B3D2E", marginBottom: 8 },
  boostRow: { fontSize: 12, color: "#0B3D2E", padding: "3px 0" },

  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Georgia, serif", color: "#0B3D2E" },
  seeAll: { fontSize: 12, color: "#0B3D2E", fontWeight: 700, cursor: "pointer" },
  emptyText: { fontSize: 12.5, color: "#888" },

  orderRow: { display: "flex", justifyContent: "space-between", background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 12, marginBottom: 8, cursor: "pointer" },
  orderId: { fontSize: 12.5, fontWeight: 700, color: "#1a1a1a" },
  orderBuyer: { fontSize: 11, color: "#888", marginTop: 2 },
  orderAmount: { fontSize: 13, fontWeight: 700, color: "#0B3D2E" },
  orderStatus: { fontSize: 10, color: "#888", marginTop: 2, textTransform: "capitalize" },

  bottomNav: { display: "flex", justifyContent: "space-around", padding: "12px 8px", margin: "10px 14px 0", background: "#0B3D2E", borderRadius: 24, position: "fixed", bottom: 10, left: 0, right: 0, maxWidth: 452, marginLeft: "auto", marginRight: "auto" },
  navItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 9, color: "#7fa896", fontWeight: 600, cursor: "pointer" },
  navItemActive: { color: "#D4AF37" }
};
