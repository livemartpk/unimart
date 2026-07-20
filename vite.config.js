// ============================================
// UniMart - Agent Dashboard (Main Page)
// ============================================

import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";
import LoadingLogo from "../../components/LoadingLogo";
import { formatPrice } from "../../utils/countries";

const TIER_COLORS = {
  bronze: { bg: "#E8D5C4", text: "#7a4f2a" },
  silver: { bg: "#E0E0E0", text: "#555" },
  gold: { bg: "#FBF1DA", text: "#8a6d1f" },
  platinum: { bg: "#E8F0FF", text: "#2C6E91" }
};

export default function AgentDashboard({ user, country, onNavigate }) {
  const [agent, setAgent] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [taggedStoresCount, setTaggedStoresCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const agentSnap = await getDoc(doc(db, "agents", user.uid));
      if (agentSnap.exists()) {
        const data = agentSnap.data();
        setAgent(data);
        setTaggedStoresCount(data.taggedStores?.length || 0);
      }

      const walletSnap = await getDoc(doc(db, "wallets_agent", user.uid));
      if (walletSnap.exists()) setWallet(walletSnap.data());

    } catch (err) {
      console.error("Failed to load agent dashboard:", err);
    }
    setLoading(false);
  };

  const copyReferralLink = () => {
    const link = `https://unimart.app/ref/${agent?.referralCode}`;
    navigator.clipboard?.writeText(link);
    alert("Referral link copied!");
  };

  if (loading) return <LoadingLogo />;

  const targets = agent?.monthlyTargets || { newStores: 0, salesAmount: 0, traffic: 0 };
  const tierStyle = TIER_COLORS[agent?.tier] || TIER_COLORS.bronze;

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.welcomeText}>Welcome back,</div>
          <div style={styles.agentName}>{agent?.fullName || "Agent"}</div>
        </div>
        <div style={{ ...styles.tierBadge, background: tierStyle.bg, color: tierStyle.text }}>
          {(agent?.tier || "bronze").toUpperCase()}
        </div>
      </div>

      <div className="container" style={{ paddingTop: 16 }}>
        {/* Status banner */}
        {agent?.status === "warning" && (
          <div style={styles.warningBanner}>
            ⚠️ You missed last month's target. You have a grace period to hit this month's target before your account becomes inactive.
          </div>
        )}
        {agent?.status === "inactive" && (
          <div style={styles.inactiveBanner}>
            🔴 Your account is inactive. Commission on tagged stores is currently going to UniMart. Submit a reapplication to become active again.
            <button className="btn-gold" style={{ marginTop: 10, width: "100%" }} onClick={() => onNavigate && onNavigate("reapply")}>Reapply Now</button>
          </div>
        )}

        {/* Monthly Targets */}
        <h3 style={styles.sectionTitle}>This Month's Targets</h3>
        <div style={styles.targetsGrid}>
          <TargetCard label="New Stores" target={targets.newStores} current={0} />
          <TargetCard label="Sales (Rs)" target={targets.salesAmount} current={0} />
          <TargetCard label="Traffic" target={targets.traffic} current={0} />
        </div>

        {/* Stats cards */}
        <div style={styles.statsGrid}>
          <StatCard label="Tagged Stores" value={taggedStoresCount} />
          <StatCard label="Points" value={agent?.points || 0} />
        </div>

        {/* Wallet */}
        <div style={styles.walletRow}>
          <div style={styles.walletCard}>
            <div style={styles.walletLabel}>Total Earned</div>
            <div style={styles.walletValue}>{formatPrice(wallet?.totalBalance || 0, country)}</div>
          </div>
          <div style={{ ...styles.walletCard, background: "#0B3D2E" }}>
            <div style={{ ...styles.walletLabel, color: "#cfe0d4" }}>Available</div>
            <div style={{ ...styles.walletValue, color: "#D4AF37" }}>{formatPrice(wallet?.availableBalance || 0, country)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => onNavigate && onNavigate("wallet")}>View Wallet</button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => onNavigate && onNavigate("withdraw")}>Withdraw</button>
        </div>

        {/* Referral link */}
        <div style={styles.referralCard}>
          <div style={styles.referralTitle}>Your Referral Link</div>
          <div style={styles.referralLinkRow}>
            <div style={styles.referralLink}>unimart.app/ref/{agent?.referralCode}</div>
            <div style={styles.copyBtn} onClick={copyReferralLink}>Copy</div>
          </div>
          <div style={styles.referralNote}>Buyers who use this link are tagged to you for future purchases.</div>
        </div>
      </div>

      {/* Bottom nav */}
      <div style={styles.bottomNav}>
        <NavItem icon="🏠" label="Dashboard" active onClick={() => onNavigate && onNavigate("dashboard")} />
        <NavItem icon="🏪" label="Tags" onClick={() => onNavigate && onNavigate("seller-tags")} />
        <NavItem icon="🔗" label="Referrals" onClick={() => onNavigate && onNavigate("referrals")} />
        <NavItem icon="🏆" label="Leaderboard" onClick={() => onNavigate && onNavigate("leaderboard")} />
        <NavItem icon="💰" label="Wallet" onClick={() => onNavigate && onNavigate("wallet")} />
      </div>
    </div>
  );
}

function TargetCard({ label, target, current }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div style={styles.targetCard}>
      <div style={styles.targetLabel}>{label}</div>
      <div style={styles.targetNumbers}>{current} / {target}</div>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${pct}%` }} />
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
  header: { background: "#0B3D2E", padding: "20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  welcomeText: { color: "#cfe0d4", fontSize: 12 },
  agentName: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  tierBadge: { fontSize: 10.5, fontWeight: 800, padding: "6px 12px", borderRadius: 20 },

  warningBanner: { background: "#FBF1DA", border: "1px solid #D4AF37", borderRadius: 12, padding: 14, fontSize: 12, color: "#5a4419", marginBottom: 16, lineHeight: 1.5 },
  inactiveBanner: { background: "#FCEAEA", border: "1px solid #C0392B", borderRadius: 12, padding: 14, fontSize: 12, color: "#7a2020", marginBottom: 16, lineHeight: 1.5 },

  sectionTitle: { fontSize: 16, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 12 },
  targetsGrid: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 },
  targetCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 14 },
  targetLabel: { fontSize: 12, fontWeight: 700, color: "#0B3D2E" },
  targetNumbers: { fontSize: 11, color: "#888", marginTop: 2, marginBottom: 8 },
  progressTrack: { height: 6, background: "#F0F5F0", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", background: "#D4AF37", borderRadius: 4 },

  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 },
  statCard: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, padding: 14 },
  statValue: { fontSize: 19, fontWeight: 800, color: "#0B3D2E" },
  statLabel: { fontSize: 11, color: "#888", marginTop: 4 },

  walletRow: { display: "flex", gap: 10, marginBottom: 10 },
  walletCard: { flex: 1, background: "#F0F5F0", borderRadius: 14, padding: 14 },
  walletLabel: { fontSize: 11, color: "#0B3D2E", fontWeight: 600 },
  walletValue: { fontSize: 17, fontWeight: 800, color: "#0B3D2E", marginTop: 4 },

  referralCard: { background: "#fff", border: "1.5px solid #D4AF37", borderRadius: 14, padding: 16, marginBottom: 20 },
  referralTitle: { fontSize: 13, fontWeight: 700, color: "#0B3D2E", marginBottom: 10 },
  referralLinkRow: { display: "flex", gap: 8, alignItems: "center" },
  referralLink: { flex: 1, background: "#F0F5F0", borderRadius: 8, padding: "10px 12px", fontSize: 11.5, color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  copyBtn: { background: "#0B3D2E", color: "#D4AF37", fontSize: 11.5, fontWeight: 700, padding: "10px 16px", borderRadius: 8, cursor: "pointer" },
  referralNote: { fontSize: 10.5, color: "#888", marginTop: 8 },

  bottomNav: { display: "flex", justifyContent: "space-around", padding: "12px 8px", margin: "10px 14px 0", background: "#0B3D2E", borderRadius: 24, position: "fixed", bottom: 10, left: 0, right: 0, maxWidth: 452, marginLeft: "auto", marginRight: "auto" },
  navItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 9, color: "#7fa896", fontWeight: 600, cursor: "pointer" },
  navItemActive: { color: "#D4AF37" }
};
