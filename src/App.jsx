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
import SellerManagerDashboard from "./pages/admin/seller-manager/SellerManagerDashboard";
import MarketingManagerDashboard from "./pages/admin/marketing-manager/MarketingManagerDashboard";
import SupportTeamDashboard from "./pages/admin/support-team/SupportTeamDashboard";
import FinanceTeamDashboard from "./pages/admin/finance-team/FinanceTeamDashboard";
import ContentTeamDashboard from "./pages/admin/content-team/ContentTeamDashboard";
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
import AdminLayout from "./components/AdminLayout";

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
          const ud = { uid: fbUser.uid, ...userDoc.data() };
          setUserData(ud);
          // Auto-redirect admin roles to dashboard on session restore
          const adminRoles = ["super_admin", "seller_manager", "marketing_manager", "support_team", "finance_team", "content_team"];
          if (adminRoles.includes(ud.role)) {
            setPage("dashboard");
          }
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
    if (target === "logout") {
      import("firebase/auth").then(({ signOut }) => {
        import("./config/firebase").then(({ auth }) => {
          signOut(auth);
        });
      });
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
          onSwitchToSellerSignUp={() => setAuthMode("seller-signup")}
          onSwitchToAgentSignUp={() => setAuthMode("agent-signup")}
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
      return <PendingApprovalScreen role="seller" userEmail={firebaseUser.email} />;
    }
    if (userData.status === "objection") {
      return <ObjectionScreen role="seller" userEmail={firebaseUser.email} userId={firebaseUser.uid} />;
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
      return <PendingApprovalScreen role="agent" userEmail={firebaseUser.email} />;
    }
    if (userData.status === "objection") {
      return <ObjectionScreen role="agent" userEmail={firebaseUser.email} userId={firebaseUser.uid} />;
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

    const getAdminPage = () => {
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
          default: return <SellerManagerDashboard onNavigate={navigate} />;
        }
      }
      if (userData.role === "marketing_manager") {
        switch (page) {
          case "performance": return <PerformanceAnalytics />;
          case "fraud-monitor": return <ReferralFraudMonitor />;
          default: return <MarketingManagerDashboard onNavigate={navigate} />;
        }
      }
      if (userData.role === "support_team") {
        switch (page) {
          case "complaints": return <Complaints user={firebaseUser} />;
          case "returns": return <ReturnRefundTracker />;
          default: return <SupportTeamDashboard onNavigate={navigate} />;
        }
      }
      if (userData.role === "finance_team") {
        switch (page) {
          case "reports": return <FinancialReports />;
          case "reconciliation": return <WalletsReconciliation />;
          default: return <FinanceTeamDashboard onNavigate={navigate} />;
        }
      }
      if (userData.role === "content_team") {
        switch (page) {
          case "flagged-listings": return <FlaggedListings user={firebaseUser} />;
          case "banners": return <BannerManagement user={firebaseUser} />;
          default: return <ContentTeamDashboard onNavigate={navigate} />;
        }
      }
      return <div style={{ padding: 40 }}>Unknown admin role.</div>;
    };

    return (
      <AdminLayout role={userData.role} currentPage={page} onNavigate={navigate}>
        {getAdminPage()}
      </AdminLayout>
    );
  }

  return <div style={{ padding: 40 }}>Unknown role. Please contact support.</div>;
}

function PendingApprovalScreen({ role, userEmail }) {
  const handleLogout = async () => {
    const { signOut } = await import("firebase/auth");
    const { auth } = await import("./config/firebase");
    await signOut(auth);
  };

  const roleInfo = {
    seller: {
      icon: "🏪",
      title: "Application Under Review",
      reviewer: "Seller Manager",
      color: "#D4AF37"
    },
    agent: {
      icon: "🤝",
      title: "Application Under Review",
      reviewer: "Marketing Manager",
      color: "#D4AF37"
    }
  };

  const info = roleInfo[role] || { icon: "⏳", title: "Under Review", reviewer: "Admin", color: "#D4AF37" };

  return (
    <div style={ps.overlay}>
      <div style={ps.card}>
        {/* Header */}
        <div style={ps.header}>
          <div style={ps.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span></div>
        </div>

        {/* Content */}
        <div style={ps.body}>
          <div style={ps.icon}>{info.icon}</div>
          <h2 style={ps.title}>{info.title}</h2>

          <div style={ps.statusBadge}>
            ⏳ Pending Approval
          </div>

          <p style={ps.text}>
            Your <strong>{role}</strong> application has been received and is currently being reviewed by our <strong>{info.reviewer}</strong>.
          </p>

          {userEmail && (
            <div style={ps.emailBox}>
              <div style={ps.emailLabel}>Logged in as:</div>
              <div style={ps.emailValue}>{userEmail}</div>
            </div>
          )}

          <div style={ps.stepsBox}>
            <div style={ps.step}>
              <div style={ps.stepDot}>✓</div>
              <div style={ps.stepText}>Application submitted</div>
            </div>
            <div style={ps.stepLine} />
            <div style={ps.step}>
              <div style={{ ...ps.stepDot, ...ps.stepDotPending }}>2</div>
              <div style={{ ...ps.stepText, color: "#D4AF37", fontWeight: 700 }}>Under review by {info.reviewer}</div>
            </div>
            <div style={ps.stepLine} />
            <div style={ps.step}>
              <div style={{ ...ps.stepDot, background: "#eee", color: "#999" }}>3</div>
              <div style={{ ...ps.stepText, color: "#999" }}>Account approved — full access granted</div>
            </div>
          </div>

          <p style={ps.noteText}>
            You will receive an email notification once your application is approved. This usually takes 1–2 business days.
          </p>

          <button style={ps.logoutBtn} onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
}

const ps = {
  overlay: { minHeight: "100vh", background: "#FBF9F4", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { background: "#fff", borderRadius: 20, maxWidth: 420, width: "100%", overflow: "hidden", boxShadow: "0 10px 40px rgba(11,61,46,0.12)" },
  header: { background: "#0B3D2E", padding: "20px 24px", textAlign: "center" },
  logo: { fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, color: "#fff" },
  body: { padding: 28, textAlign: "center" },
  icon: { fontSize: 52, marginBottom: 12 },
  title: { fontFamily: "Georgia, serif", fontSize: 20, color: "#0B3D2E", marginBottom: 12 },
  statusBadge: { display: "inline-block", background: "#FBF1DA", color: "#8a6d1f", border: "1.5px solid #D4AF37", borderRadius: 20, padding: "6px 16px", fontSize: 12.5, fontWeight: 700, marginBottom: 16 },
  text: { fontSize: 13.5, color: "#555", lineHeight: 1.6, marginBottom: 16 },
  emailBox: { background: "#F0F5F0", border: "1px solid #eee0c0", borderRadius: 10, padding: "10px 14px", marginBottom: 20, textAlign: "left" },
  emailLabel: { fontSize: 10.5, color: "#888" },
  emailValue: { fontSize: 13.5, fontWeight: 700, color: "#0B3D2E", marginTop: 2 },
  stepsBox: { textAlign: "left", marginBottom: 20 },
  step: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 4 },
  stepDot: { width: 24, height: 24, borderRadius: "50%", background: "#0B3D2E", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  stepDotPending: { background: "#D4AF37", color: "#fff" },
  stepText: { fontSize: 12.5, color: "#444", lineHeight: 1.4, paddingTop: 4 },
  stepLine: { width: 2, height: 12, background: "#eee0c0", marginLeft: 11, marginBottom: 4 },
  noteText: { fontSize: 11.5, color: "#888", lineHeight: 1.5, marginBottom: 20 },
  logoutBtn: { width: "100%", padding: "13px 0", background: "#FCEAEA", border: "1px solid #f5c6c6", borderRadius: 12, color: "#C0392B", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
};

// ============================================
// ObjectionScreen — shown when admin sends
// an objection on seller/agent application.
// Seller can view objection + edit & resubmit.
// ============================================
import { useState as useStateObj, useEffect as useEffectObj } from "react";
import { doc as docObj, getDoc as getDocObj, updateDoc as updateDocObj, serverTimestamp as stObj } from "firebase/firestore";

function ObjectionScreen({ role, userEmail, userId }) {
  const [objection, setObjection] = useState("");
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogout = async () => {
    const { signOut } = await import("firebase/auth");
    const { auth } = await import("./config/firebase");
    await signOut(auth);
  };

  useEffect(() => {
    const loadObjection = async () => {
      try {
        const collectionName = role === "seller" ? "sellers" : "agents";
        const snap = await getDoc(doc(db, collectionName, userId));
        if (snap.exists()) setObjection(snap.data().objection || "");
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    loadObjection();
  }, [userId, role]);

  const handleResubmit = async () => {
    if (!editText.trim()) { alert("Please explain how you resolved the objection."); return; }
    setSubmitting(true);
    try {
      const collectionName = role === "seller" ? "sellers" : "agents";
      await updateDoc(doc(db, collectionName, userId), {
        objection: null,
        objectionStatus: "resubmitted",
        resubmitNote: editText,
        resubmittedAt: serverTimestamp()
      });
      await updateDoc(doc(db, "users", userId), { status: "pending" });
      setSubmitting(false);
    } catch (err) { console.error(err); setSubmitting(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;

  return (
    <div style={os.overlay}>
      <div style={os.card}>
        <div style={os.header}>
          <div style={os.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span></div>
        </div>
        <div style={os.body}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h2 style={os.title}>Action Required</h2>
          <p style={os.subtitle}>Our Seller Manager has an objection on your application.</p>

          <div style={os.objectionCard}>
            <div style={os.objectionLabel}>📋 Objection from Seller Manager:</div>
            <div style={os.objectionText}>{objection || "Please contact support for details."}</div>
          </div>

          {!editMode ? (
            <button className="btn-primary" style={{ width: "100%", marginBottom: 10 }} onClick={() => setEditMode(true)}>
              ✏️ Resolve & Resubmit Application
            </button>
          ) : (
            <div style={os.editBox}>
              <div style={os.editLabel}>Explain how you resolved this objection:</div>
              <textarea
                className="input-field"
                rows={4}
                value={editText}
                onChange={e => setEditText(e.target.value)}
                placeholder="e.g. I have re-uploaded a clearer CNIC document..."
                style={{ resize: "none", fontFamily: "inherit", marginBottom: 10 }}
              />
              <button className="btn-primary" style={{ width: "100%", marginBottom: 8 }} onClick={handleResubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "✓ Resubmit for Review"}
              </button>
              <button className="btn-secondary" style={{ width: "100%" }} onClick={() => setEditMode(false)}>
                Cancel
              </button>
            </div>
          )}

          <div style={os.emailBox}>
            <div style={{ fontSize: 10.5, color: "#888" }}>Logged in as:</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0B3D2E" }}>{userEmail}</div>
          </div>

          <button style={os.logoutBtn} onClick={handleLogout}>🚪 Logout</button>
        </div>
      </div>
    </div>
  );
}

const os = {
  overlay: { minHeight: "100vh", background: "#FBF9F4", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { background: "#fff", borderRadius: 20, maxWidth: 420, width: "100%", overflow: "hidden", boxShadow: "0 10px 40px rgba(11,61,46,0.12)" },
  header: { background: "#0B3D2E", padding: "20px 24px", textAlign: "center" },
  logo: { fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, color: "#fff" },
  body: { padding: 24, textAlign: "center" },
  title: { fontFamily: "Georgia, serif", fontSize: 20, color: "#C0392B", marginBottom: 8 },
  subtitle: { fontSize: 13.5, color: "#555", marginBottom: 16, lineHeight: 1.5 },
  objectionCard: { background: "#FBF1DA", border: "1.5px solid #D4AF37", borderRadius: 12, padding: 14, marginBottom: 16, textAlign: "left" },
  objectionLabel: { fontSize: 11, fontWeight: 700, color: "#8a6d1f", marginBottom: 6 },
  objectionText: { fontSize: 13.5, color: "#1a1a1a", lineHeight: 1.5 },
  editBox: { background: "#F0F5F0", borderRadius: 12, padding: 14, marginBottom: 12, textAlign: "left" },
  editLabel: { fontSize: 12, fontWeight: 700, color: "#0B3D2E", marginBottom: 8 },
  emailBox: { background: "#F0F5F0", border: "1px solid #eee0c0", borderRadius: 10, padding: "10px 14px", marginBottom: 12, textAlign: "left" },
  logoutBtn: { width: "100%", padding: "13px 0", background: "#FCEAEA", border: "1px solid #f5c6c6", borderRadius: 12, color: "#C0392B", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
};
