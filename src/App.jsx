// ============================================
// UniMart - Main App
// Simple state-based navigation (no router library
// needed yet — swap in react-router later if the
// app grows). Tracks: logged-in user, their role,
// and which page is currently active.
// ============================================

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./config/firebase";

// Auth pages
import Login from "./pages/auth/Login";
import BuyerSignUp from "./pages/auth/BuyerSignUp";
import BuyerProfileCompletion from "./pages/auth/BuyerProfileCompletion";

// Buyer pages
import Homepage from "./pages/buyer/Homepage";
import ProductDetail from "./pages/buyer/ProductDetail";
import Cart from "./pages/buyer/Cart";
import Checkout from "./pages/buyer/Checkout";
import MyOrders from "./pages/buyer/MyOrders";
import BuyerWallet from "./pages/buyer/BuyerWallet";

// Seller pages
import SellerSignUp from "./pages/seller/SellerSignUp";
import SellerDashboard from "./pages/seller/SellerDashboard";
import MyProducts from "./pages/seller/MyProducts";
import AddProduct from "./pages/seller/AddProduct";
import IncomingOrders from "./pages/seller/IncomingOrders";
import SellerWallet from "./pages/seller/SellerWallet";
import PointsAndBoost from "./pages/seller/PointsAndBoost";
import StoreSettings from "./pages/seller/StoreSettings";

// Agent pages
import AgentSignUp from "./pages/agent/AgentSignUp";
import AgentDashboard from "./pages/agent/AgentDashboard";
import SellerTags from "./pages/agent/SellerTags";
import AgentWallet from "./pages/agent/AgentWallet";
import Leaderboard from "./pages/agent/Leaderboard";

// Admin pages
import SuperAdminDashboard from "./pages/admin/super-admin/SuperAdminDashboard";
import PolicyEngine from "./pages/admin/super-admin/PolicyEngine";
import AdminManagement from "./pages/admin/super-admin/AdminManagement";
import WalletsOverview from "./pages/admin/super-admin/WalletsOverview";
import ActivityLogs from "./pages/admin/super-admin/ActivityLogs";
import CategoryManagement from "./pages/admin/super-admin/CategoryManagement";
import Announcements from "./pages/admin/super-admin/Announcements";

import SellerRegistrations from "./pages/admin/seller-manager/SellerRegistrations";
import AllSellers from "./pages/admin/seller-manager/AllSellers";
import NewSellerProductReview from "./pages/admin/seller-manager/NewSellerProductReview";
import VacationRequests from "./pages/admin/seller-manager/VacationRequests";
import FlaggedSellers from "./pages/admin/seller-manager/FlaggedSellers";

import AgentManagement from "./pages/admin/marketing-manager/AgentManagement";
import PerformanceAnalytics from "./pages/admin/marketing-manager/PerformanceAnalytics";
import ReferralFraudMonitor from "./pages/admin/marketing-manager/ReferralFraudMonitor";

import Disputes from "./pages/admin/support-team/Disputes";
import Complaints from "./pages/admin/support-team/Complaints";
import ReturnRefundTracker from "./pages/admin/support-team/ReturnRefundTracker";

import WithdrawalRequests from "./pages/admin/finance-team/WithdrawalRequests";
import FinancialReports from "./pages/admin/finance-team/FinancialReports";
import WalletsReconciliation from "./pages/admin/finance-team/WalletsReconciliation";

import ProductReviews from "./pages/admin/content-team/ProductReviews";
import FlaggedListings from "./pages/admin/content-team/FlaggedListings";
import BannerManagement from "./pages/admin/content-team/BannerManagement";

// Shared pages
import Invoice from "./pages/shared/Invoice";
import DispatchSlip from "./pages/shared/DispatchSlip";
import Notifications from "./pages/shared/Notifications";
import ForgotPassword from "./pages/auth/ForgotPassword";

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState("home");
  const [pageParam, setPageParam] = useState(null);
  const [authMode, setAuthMode] = useState("browse"); // browse | login | buyer-signup | seller-signup | agent-signup | forgot-password

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const userDoc = await getDoc(doc(db, "users", fbUser.uid));
        if (userDoc.exists()) {
          setUserData({ uid: fbUser.uid, ...userDoc.data() });
        }
      } else {
        setUserData(null);
      }
      setAuthChecked(true);
    });
    return unsubscribe;
  }, []);

  const buyerProtectedActions = ["cart", "checkout", "orders", "wallet", "notifications", "wishlist", "account"];

  const navigate = (target, param) => {
    // If a guest (not logged in) tries a protected action, send them to login instead.
    if (!firebaseUser && buyerProtectedActions.includes(target)) {
      setAuthMode("login");
      window.scrollTo(0, 0);
      return;
    }
    if (target === "login") {
      setAuthMode("login");
      window.scrollTo(0, 0);
      return;
    }
    setPage(target);
    setPageParam(param || null);
    window.scrollTo(0, 0);
  };

  const handleLoginSuccess = ({ userData: ud }) => {
    setUserData(ud);
    // Redirect based on role
    if (ud.role === "buyer") navigate("home");
    else if (ud.role === "seller") navigate("dashboard");
    else if (ud.role === "agent") navigate("dashboard");
    else navigate("dashboard"); // admin roles
  };

  if (!authChecked) {
    return <div style={{ padding: 40, textAlign: "center", color: "#0B3D2E" }}>Loading UniMart...</div>;
  }

  // Pages that require being logged in as a buyer
  const buyerProtectedPages = ["cart", "checkout", "orders", "wallet", "notifications"];

  // ============ NOT LOGGED IN ============
  if (!firebaseUser || !userData) {

    // Auth screens (only shown when the visitor explicitly chose to log in / sign up)
    const backToBrowsing = () => { setAuthMode("browse"); setPage("home"); };

    if (authMode === "forgot-password") {
      return <ForgotPassword onBack={() => setAuthMode("login")} />;
    }
    if (authMode === "buyer-signup") {
      return <BuyerSignUp onSuccess={() => navigate("profile-completion")} onSwitchToLogin={() => setAuthMode("login")} onBackToBrowsing={backToBrowsing} />;
    }
    if (authMode === "seller-signup") {
      return <SellerSignUp onSuccess={() => setAuthMode("login")} onSwitchToLogin={() => setAuthMode("login")} onBackToBrowsing={backToBrowsing} />;
    }
    if (authMode === "agent-signup") {
      return <AgentSignUp onSuccess={() => setAuthMode("login")} onSwitchToLogin={() => setAuthMode("login")} onBackToBrowsing={backToBrowsing} />;
    }
    if (authMode === "login") {
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onSwitchToSignUp={() => setAuthMode("buyer-signup")}
          onForgotPassword={() => setAuthMode("forgot-password")}
          onBackToBrowsing={backToBrowsing}
        />
      );
    }

    // authMode === "browse" (default): everyone can explore the storefront freely.
    // Login is only requested when a protected action is attempted.
    if (buyerProtectedPages.includes(page)) {
      setAuthMode("login");
      return <div style={{ padding: 40, textAlign: "center", color: "#0B3D2E" }}>Redirecting to login...</div>;
    }

    switch (page) {
      case "product": return <ProductDetail productId={pageParam} user={null} onNavigate={navigate} />;
      default: return <Homepage user={null} onNavigate={navigate} />;
    }
  }

  // ============ SHARED ROUTES (any logged-in role) ============
  if (page === "notifications") {
    return <Notifications user={firebaseUser} onNavigate={navigate} />;
  }
  if (page === "invoice" && pageParam) {
    return <Invoice orderId={pageParam} onNavigate={navigate} />;
  }
  if (page === "dispatch-slip" && pageParam) {
    return <DispatchSlip orderId={pageParam} onNavigate={navigate} />;
  }

  // ============ BUYER — Profile completion gate ============
  if (userData.role === "buyer" && !userData.profileComplete && page === "profile-completion") {
    return (
      <BuyerProfileCompletion
        user={firebaseUser}
        onComplete={() => {
          setUserData((u) => ({ ...u, profileComplete: true }));
          navigate("home");
        }}
      />
    );
  }

  // ============ BUYER ROUTES ============
  if (userData.role === "buyer") {
    // Checkout requires a complete profile + verified email (per our decision)
    if (page === "checkout" && (!userData.profileComplete || !firebaseUser.emailVerified)) {
      return (
        <BuyerProfileCompletion
          user={firebaseUser}
          onComplete={() => {
            setUserData((u) => ({ ...u, profileComplete: true }));
            navigate("checkout");
          }}
        />
      );
    }
    switch (page) {
      case "product": return <ProductDetail productId={pageParam} user={firebaseUser} onNavigate={navigate} />;
      case "cart": return <Cart user={firebaseUser} onNavigate={navigate} />;
      case "checkout": return <Checkout user={userData} onNavigate={navigate} />;
      case "orders": return <MyOrders user={firebaseUser} onNavigate={navigate} />;
      case "wallet": return <BuyerWallet user={firebaseUser} onNavigate={navigate} />;
      default: return <Homepage user={userData} onNavigate={navigate} />;
    }
  }

  // ============ SELLER ROUTES ============
  if (userData.role === "seller") {
    if (userData.status === "pending") {
      return <PendingApprovalScreen role="seller" />;
    }
    switch (page) {
      case "products": return <MyProducts user={firebaseUser} onNavigate={navigate} />;
      case "add-product": return <AddProduct user={firebaseUser} sellerStoreName={userData.storeName} onSuccess={() => navigate("products")} onNavigate={navigate} />;
      case "orders": return <IncomingOrders user={firebaseUser} onNavigate={navigate} />;
      case "wallet": return <SellerWallet user={firebaseUser} onNavigate={navigate} />;
      case "points-boost": return <PointsAndBoost user={firebaseUser} onNavigate={navigate} />;
      case "settings": return <StoreSettings user={firebaseUser} onNavigate={navigate} />;
      default: return <SellerDashboard user={firebaseUser} onNavigate={navigate} />;
    }
  }

  // ============ AGENT ROUTES ============
  if (userData.role === "agent") {
    if (userData.status === "pending") {
      return <PendingApprovalScreen role="agent" />;
    }
    switch (page) {
      case "seller-tags": return <SellerTags user={firebaseUser} onNavigate={navigate} />;
      case "wallet": return <AgentWallet user={firebaseUser} onNavigate={navigate} />;
      case "leaderboard": return <Leaderboard user={firebaseUser} onNavigate={navigate} />;
      default: return <AgentDashboard user={firebaseUser} onNavigate={navigate} />;
    }
  }

  // ============ ADMIN ROUTES ============
  const adminRoles = ["super_admin", "seller_manager", "marketing_manager", "support_team", "finance_team", "content_team"];
  if (adminRoles.includes(userData.role)) {
    if (userData.role === "super_admin") {
      switch (page) {
        case "policy-engine": return <PolicyEngine user={firebaseUser} />;
        case "admin-management": return <AdminManagement user={firebaseUser} />;
        case "wallets": return <WalletsOverview />;
        case "activity-logs": return <ActivityLogs />;
        case "categories": return <CategoryManagement user={firebaseUser} />;
        case "announcements": return <Announcements user={firebaseUser} />;
        case "sellers": return <SellerRegistrations user={firebaseUser} />;
        case "agents": return <AgentManagement user={firebaseUser} />;
        default: return <SuperAdminDashboard user={firebaseUser} onNavigate={navigate} />;
      }
    }
    if (userData.role === "seller_manager") {
      switch (page) {
        case "all-sellers": return <AllSellers user={firebaseUser} />;
        case "product-review": return <NewSellerProductReview user={firebaseUser} />;
        case "vacation-requests": return <VacationRequests />;
        case "flagged-sellers": return <FlaggedSellers />;
        default: return <SellerRegistrations user={firebaseUser} />;
      }
    }
    if (userData.role === "marketing_manager") {
      switch (page) {
        case "performance": return <PerformanceAnalytics />;
        case "fraud-monitor": return <ReferralFraudMonitor />;
        default: return <AgentManagement user={firebaseUser} />;
      }
    }
    if (userData.role === "support_team") {
      switch (page) {
        case "complaints": return <Complaints user={firebaseUser} />;
        case "returns": return <ReturnRefundTracker />;
        default: return <Disputes user={firebaseUser} />;
      }
    }
    if (userData.role === "finance_team") {
      switch (page) {
        case "reports": return <FinancialReports />;
        case "reconciliation": return <WalletsReconciliation />;
        default: return <WithdrawalRequests user={firebaseUser} />;
      }
    }
    if (userData.role === "content_team") {
      switch (page) {
        case "flagged-listings": return <FlaggedListings user={firebaseUser} />;
        case "banners": return <BannerManagement user={firebaseUser} />;
        default: return <ProductReviews user={firebaseUser} />;
      }
    }
  }

  return <div style={{ padding: 40 }}>Unknown role. Please contact support.</div>;
}

function PendingApprovalScreen({ role }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FBF9F4", padding: 24, textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <h2 style={{ fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 8 }}>Application under review</h2>
        <p style={{ color: "#666", fontSize: 14, maxWidth: 320 }}>
          Your {role} account is pending approval from our team. We'll notify you by email once it's reviewed.
        </p>
      </div>
    </div>
  );
}
