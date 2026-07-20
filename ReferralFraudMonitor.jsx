// ============================================
// UniMart - Platform Announcements (Super Admin)
// Send a notification to all users of a chosen role.
// ============================================

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit, serverTimestamp, where } from "firebase/firestore";
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
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editMessage, setEditMessage] = useState("");
  const [saving, setSaving] = useState(false);

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

  const openEdit = (h) => {
    setEditing(h);
    setEditMessage(h.message);
  };

  const handleSaveEdit = async () => {
    if (!editMessage.trim()) { alert("Message can't be empty."); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, "announcements", editing.id), { message: editMessage.trim() });
      setHistory((list) => list.map((h) => (h.id === editing.id ? { ...h, message: editMessage.trim() } : h)));
      setEditing(null);
    } catch (err) {
      console.error("Failed to update announcement:", err);
      alert("Failed to save changes.");
    }
    setSaving(false);
  };

  const handleDelete = async (h) => {
    if (!window.confirm("Delete this announcement record? (Notifications already sent to users won't be removed.)")) return;
    try {
      await deleteDoc(doc(db, "announcements", h.id));
      setHistory((list) => list.filter((item) => item.id !== h.id));
      setViewing(null);
    } catch (err) {
      console.error("Failed to delete announcement:", err);
      alert("Failed to delete.");
    }
  };

  if (!country) {
    return (
      <div className="page-shell" style={styles.page}>
        <p style={{ padding: 30, textAlign: "center", color: "#888" }}>🌍 Select a country from the dropdown above to send an announcement.</p>
      </div>
    );
  }

  return (
    <div className="page-shell" style={styles.page}>

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
              <div style={styles.historyActions}>
                <span style={styles.actionLink} onClick={() => setViewing(h)}>👁️ View</span>
                <span style={styles.actionLink} onClick={() => openEdit(h)}>✏️ Edit</span>
                <span style={{ ...styles.actionLink, color: "#C0392B" }} onClick={() => handleDelete(h)}>🗑️ Delete</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===== View Modal ===== */}
      {viewing && (
        <div style={styles.overlay} onClick={() => setViewing(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>Announcement Details</div>
            <DetailRow label="Message" value={viewing.message} />
            <DetailRow label="Audience" value={viewing.audience} />
            <DetailRow label="Country" value={viewing.country} />
            <DetailRow label="Sent On" value={viewing.createdAt?.toDate ? viewing.createdAt.toDate().toLocaleString() : "—"} />
            <div style={styles.modalActions}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { openEdit(viewing); setViewing(null); }}>✏️ Edit</button>
              <button style={styles.deleteBtn} onClick={() => handleDelete(viewing)}>🗑 Delete</button>
            </div>
            <div style={styles.closeBtn} onClick={() => setViewing(null)}>Close</div>
          </div>
        </div>
      )}

      {/* ===== Edit Modal ===== */}
      {editing && (
        <div style={styles.overlay} onClick={() => setEditing(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>Edit Announcement</div>
            <p style={styles.helperText}>This only updates the saved record — it won't resend or change notifications already delivered to users.</p>
            <textarea
              className="input-field"
              rows={4}
              value={editMessage}
              onChange={(e) => setEditMessage(e.target.value)}
              style={{ resize: "none", fontFamily: "inherit", marginBottom: 14 }}
            />
            <button className="btn-primary" style={{ width: "100%" }} onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <div style={styles.closeBtn} onClick={() => setEditing(null)}>Cancel</div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10.5, color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: "#1a1a1a", marginTop: 3 }}>{value || "—"}</div>
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
  historyMeta: { fontSize: 10.5, color: "#888", marginTop: 4, textTransform: "capitalize" },
  historyActions: { display: "flex", gap: 14, marginTop: 8 },
  actionLink: { fontSize: 11, fontWeight: 700, color: "#0B3D2E", cursor: "pointer" },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 22, width: "100%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto" },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", fontWeight: 700, marginBottom: 16 },
  modalActions: { display: "flex", gap: 10, marginTop: 10, marginBottom: 10 },
  deleteBtn: { flex: 1, background: "#FCEAEA", color: "#C0392B", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" },
  closeBtn: { textAlign: "center", fontSize: 12.5, color: "#888", cursor: "pointer", padding: "10px 0 0" }
};
