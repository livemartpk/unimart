// ============================================
// UniMart - Platform Announcements (Super Admin)
// Send a notification to all users of a chosen role.
// ============================================

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, where } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAdminCountry } from "../../../context/AdminCountryContext";
import "../../../styles/theme.css";

export default function Announcements({ user }) {
  const { country } = useAdminCountry();
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!country) return;
    loadHistory();
  }, [country]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "announcements"), where("country", "==", country), orderBy("createdAt", "desc"), limit(20));
      const snap = await getDocs(q);
      setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load announcement history:", err);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!message.trim()) { alert("Write a message first."); return; }
    setSending(true);
    try {
      await addDoc(collection(db, "announcements"), {
        message,
        audience,
        country,
        sentBy: user.uid,
        createdAt: serverTimestamp()
      });

      // Fan out to a notification per affected user — filtered by BOTH role
      // (audience) and country, so an announcement sent while "Pakistan" is
      // selected never reaches users from other countries.
      const targetRoles = audience === "all" ? ["buyer", "seller", "agent"] : [audience];
      const usersSnap = await getDocs(query(
        collection(db, "users"),
        where("role", "in", targetRoles),
        where("country", "==", country)
      ));
      for (const userDoc of usersSnap.docs) {
        await addDoc(collection(db, "notifications"), {
          userId: userDoc.id,
          type: "announcement",
          message,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      setMessage("");
      loadHistory();
      alert(`Announcement sent to ${usersSnap.size} user(s) in ${country}.`);

    } catch (err) {
      console.error("Failed to send announcement:", err);
    }
    setSending(false);
  };

  if (!country) {
    return (
      <div className="page-shell" style={styles.page}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>Platform Announcements</div>
        </div>
        <p style={{ padding: 30, textAlign: "center", color: "#888" }}>🌍 Select a country from the dropdown above to send an announcement.</p>
      </div>
    );
  }

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Platform Announcements — {country}</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        <p style={styles.helperText}>This will only reach users in <b>{country}</b>. Switch the country dropdown above to send to a different country.</p>

        <label className="input-label">Audience</label>
        <select className="input-field" style={{ marginBottom: 12 }} value={audience} onChange={(e) => setAudience(e.target.value)}>
          <option value="all">Everyone</option>
          <option value="buyer">Buyers only</option>
          <option value="seller">Sellers only</option>
          <option value="agent">Agents only</option>
        </select>

        <label className="input-label">Message</label>
        <textarea
          className="input-field"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ resize: "none", fontFamily: "inherit", marginBottom: 14 }}
          placeholder="e.g. Delivery may be delayed during Eid holidays."
        />

        <button className="btn-primary" style={{ width: "100%" }} onClick={handleSend} disabled={sending}>
          {sending ? "Sending..." : "Send Announcement"}
        </button>

        <h3 style={{ ...styles.sectionTitle, marginTop: 26 }}>Past Announcements</h3>
        {loading ? (
          <p style={styles.emptyText}>Loading...</p>
        ) : history.length === 0 ? (
          <p style={styles.emptyText}>No announcements sent yet.</p>
        ) : (
          history.map((h) => (
            <div key={h.id} style={styles.historyRow}>
              <div style={styles.historyMsg}>{h.message}</div>
              <div style={styles.historyMeta}>To: {h.audience} · {h.createdAt?.toDate ? h.createdAt.toDate().toLocaleString() : "—"}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  sectionTitle: { fontSize: 15, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 10 },
  helperText: { fontSize: 11.5, color: "#888", marginBottom: 16, lineHeight: 1.5 },
  emptyText: { fontSize: 13, color: "#888" },

  historyRow: { background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 12, marginBottom: 8 },
  historyMsg: { fontSize: 12.5, color: "#1a1a1a" },
  historyMeta: { fontSize: 10.5, color: "#888", marginTop: 4, textTransform: "capitalize" }
};
