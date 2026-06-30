// ============================================
// UniMart - Admin Management (Super Admin)
// Only Super Admin can create other admin accounts.
// ============================================

import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../../config/firebase";
import "../../../styles/theme.css";

const ADMIN_ROLES = [
  { key: "seller_manager", label: "Seller Manager" },
  { key: "marketing_manager", label: "Marketing Manager" },
  { key: "support_team", label: "Support Team" },
  { key: "finance_team", label: "Finance Team" },
  { key: "content_team", label: "Content Team" }
];

export default function AdminManagement({ user }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "seller_manager" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const adminRoleKeys = ADMIN_ROLES.map((r) => r.key);
      const q = query(collection(db, "users"), where("role", "in", adminRoleKeys));
      const snap = await getDocs(q);
      setAdmins(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load admins:", err);
    }
    setLoading(false);
  };

  const handleCreateAdmin = async () => {
    if (!form.name || !form.email || form.password.length < 6) {
      alert("Please fill all fields. Password must be at least 6 characters.");
      return;
    }
    setCreating(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const newUser = userCredential.user;

      await setDoc(doc(db, "users", newUser.uid), {
        email: form.email,
        role: form.role,
        fullName: form.name,
        status: "active",
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      await addDoc(collection(db, "adminLogs"), {
        adminId: user.uid,
        adminRole: "super_admin",
        action: `created_admin_${form.role}`,
        targetId: newUser.uid,
        timestamp: serverTimestamp()
      });

      setShowCreateModal(false);
      setForm({ name: "", email: "", password: "", role: "seller_manager" });
      loadAdmins();

    } catch (err) {
      console.error("Failed to create admin:", err);
      alert("Couldn't create admin. " + (err.code === "auth/email-already-in-use" ? "Email already in use." : ""));
    }
    setCreating(false);
  };

  const toggleAdminStatus = async (admin) => {
    const newStatus = admin.status === "active" ? "blocked" : "active";
    await updateDoc(doc(db, "users", admin.id), { status: newStatus });
    setAdmins((as) => as.map((a) => (a.id === admin.id ? { ...a, status: newStatus } : a)));
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Admin Management</div>
        <div style={styles.addBtn} onClick={() => setShowCreateModal(true)}>+ New Admin</div>
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
        {loading ? (
          <p style={styles.emptyText}>Loading admins...</p>
        ) : admins.length === 0 ? (
          <p style={styles.emptyText}>No admins created yet.</p>
        ) : (
          admins.map((a) => (
            <div key={a.id} style={styles.adminRow}>
              <div>
                <div style={styles.adminName}>{a.fullName}</div>
                <div style={styles.adminRole}>{ADMIN_ROLES.find((r) => r.key === a.role)?.label || a.role}</div>
                <div style={styles.adminEmail}>{a.email}</div>
              </div>
              <div
                style={{ ...styles.statusBtn, ...(a.status === "active" ? styles.statusActive : styles.statusBlocked) }}
                onClick={() => toggleAdminStatus(a)}
              >
                {a.status === "active" ? "Active" : "Blocked"}
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Create New Admin</h3>
            <label className="input-label">Full Name</label>
            <input className="input-field" style={{ marginBottom: 12 }} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <label className="input-label">Email</label>
            <input type="email" className="input-field" style={{ marginBottom: 12 }} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <label className="input-label">Temporary Password</label>
            <input type="password" className="input-field" style={{ marginBottom: 12 }} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <label className="input-label">Admin Role</label>
            <select className="input-field" style={{ marginBottom: 16 }} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              {ADMIN_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleCreateAdmin} disabled={creating}>
                {creating ? "Creating..." : "Create Admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "18px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  addBtn: { background: "#D4AF37", color: "#0B3D2E", fontWeight: 700, fontSize: 12, padding: "8px 14px", borderRadius: 20, cursor: "pointer" },

  emptyText: { fontSize: 13, color: "#888", padding: "20px 0" },

  adminRow: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 14, marginBottom: 10 },
  adminName: { fontSize: 13.5, fontWeight: 700, color: "#1a1a1a" },
  adminRole: { fontSize: 11.5, color: "#0B3D2E", fontWeight: 600, marginTop: 2 },
  adminEmail: { fontSize: 10.5, color: "#888", marginTop: 2 },
  statusBtn: { fontSize: 10.5, fontWeight: 700, padding: "6px 12px", borderRadius: 20, cursor: "pointer" },
  statusActive: { background: "#E3F2E1", color: "#2E7D32" },
  statusBlocked: { background: "#FCEAEA", color: "#C0392B" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 50 },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", margin: "0 auto" },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 16 }
};
