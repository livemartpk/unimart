// ============================================
// UniMart - Notification Bell (Reusable Component)
// Drop this into any header across Buyer/Seller/
// Agent/Admin views for a live unread badge.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";

export default function NotificationBell({ user, onClick, darkMode = true }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("read", "==", false)
    );
    const unsubscribe = onSnapshot(q, (snap) => setUnreadCount(snap.size));
    return unsubscribe;
  }, [user?.uid]);

  return (
    <div onClick={onClick} style={{ ...styles.bell, background: darkMode ? "rgba(255,255,255,0.12)" : "#F0F5F0" }}>
      <span style={{ fontSize: 16 }}>🔔</span>
      {unreadCount > 0 && (
        <div style={styles.badge}>{unreadCount > 9 ? "9+" : unreadCount}</div>
      )}
    </div>
  );
}

const styles = {
  bell: { width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", cursor: "pointer" },
  badge: { position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, padding: "0 3px", borderRadius: 8, background: "#D4AF37", color: "#0B3D2E", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #0B3D2E" }
};
