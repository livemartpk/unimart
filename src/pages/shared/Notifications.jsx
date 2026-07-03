// ============================================
// UniMart - Notifications
// Real-time, per our decision: Firestore onSnapshot
// listener + in-app bell + history list.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";
import LoadingLogo from "../../components/LoadingLogo";

export default function Notifications({ user, onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    // Real-time listener — updates instantly without page refresh
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Notification listener failed:", err);
      setLoading(false);
    });

    return unsubscribe;
  }, [user.uid]);

  const markAsRead = async (notifId) => {
    await updateDoc(doc(db, "notifications", notifId), { read: true });
  };

  const iconForType = (type) => {
    const icons = {
      order_update: "📦",
      commission_credit: "💰",
      withdrawal_status: "💳",
      tag_status: "🏪",
      target_achieved: "🎯",
      announcement: "📢",
      review: "⭐"
    };
    return icons[type] || "🔔";
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.backBtn} onClick={() => onNavigate && onNavigate("back")}>←</div>
        <div style={styles.headerTitle}>Notifications</div>
        <div style={{ width: 24 }} />
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {loading ? (
          <LoadingLogo fullPage={false} size={20} />
        ) : notifications.length === 0 ? (
          <p style={styles.emptyText}>You're all caught up — no notifications yet.</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              style={{ ...styles.notifRow, ...(n.read ? {} : styles.notifUnread) }}
              onClick={() => !n.read && markAsRead(n.id)}
            >
              <div style={styles.notifIcon}>{iconForType(n.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={styles.notifMessage}>{n.message}</div>
                <div style={styles.notifTime}>{n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : "—"}</div>
              </div>
              {!n.read && <div style={styles.unreadDot} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  backBtn: { color: "#fff", fontSize: 18, cursor: "pointer", width: 24 },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700 },

  emptyText: { fontSize: 13, color: "#888", padding: "30px 0", textAlign: "center" },

  notifRow: { display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: 14, marginBottom: 8, cursor: "pointer" },
  notifUnread: { background: "#F0F5F0", borderColor: "#D4AF37" },
  notifIcon: { fontSize: 20, width: 32, textAlign: "center" },
  notifMessage: { fontSize: 12.5, color: "#1a1a1a", lineHeight: 1.4 },
  notifTime: { fontSize: 10.5, color: "#999", marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: "50%", background: "#D4AF37" }
};
