// ============================================
// UniMart - Withdrawal Requests (Finance Team)
// View full details, do the bank transfer manually
// outside the app, then record proof here — this is
// what actually deducts the seller's wallet balance.
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, increment, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAdminCountry } from "../../../context/AdminCountryContext";
import { formatPrice } from "../../../utils/countries";
import "../../../styles/theme.css";

export default function WithdrawalRequests({ user }) {
  const { country } = useAdminCountry();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [slipNo, setSlipNo] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentDate, setPaymentDate] = useState("");

  useEffect(() => {
    if (!country) return;
    loadRequests();
  }, [country]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "withdrawalRequests"), where("status", "==", "pending"));
      const snap = await getDocs(q);
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Attach each requester's country (for filtering + correct currency display)
      const withCountry = await Promise.all(all.map(async (r) => {
        try {
          const uSnap = await getDoc(doc(db, "users", r.userId));
          return { ...r, country: uSnap.exists() ? uSnap.data().country : null };
        } catch {
          return { ...r, country: null };
        }
      }));

      setRequests(withCountry.filter((r) => r.country === country));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const openRequest = (r) => {
    setSelected(r);
    setSlipNo("");
    setReferenceNo("");
    setPaymentMethod("Bank Transfer");
    setPaymentDate(new Date().toISOString().slice(0, 10));
  };

  const walletCollectionFor = (role) => {
    if (role === "seller") return "wallets_seller";
    if (role === "agent") return "wallets_agent";
    return "wallets_buyer";
  };

  const handleMarkPaid = async (request) => {
    if (!slipNo.trim() || !referenceNo.trim() || !paymentDate) {
      alert("Please fill in Slip No, Reference No, and Payment Date before marking as paid.");
      return;
    }
    setActionLoading(true);
    try {
      // Deduct from the seller/agent/buyer's wallet — this is the actual money leaving the platform
      const walletCol = walletCollectionFor(request.role);
      await updateDoc(doc(db, walletCol, request.userId), {
        availableBalance: increment(-request.amount),
        totalBalance: increment(-request.amount)
      });
      await addDoc(collection(db, walletCol, request.userId, "ledger_net"), {
        type: "withdrawal_paid",
        amount: request.amount,
        slipNo, referenceNo, paymentMethod, paymentDate,
        withdrawalRequestId: request.id,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "withdrawalRequests", request.id), {
        status: "paid",
        slipNo, referenceNo, paymentMethod, paymentDate,
        paidAt: serverTimestamp(),
        paidBy: user.uid
      });
      await addDoc(collection(db, "notifications"), { userId: request.userId, type: "withdrawal_status", message: `Your withdrawal of ${formatPrice(request.amount, request.country)} has been paid via ${paymentMethod} (Ref: ${referenceNo}).`, read: false, createdAt: serverTimestamp() });
      await addDoc(collection(db, "adminLogs"), { adminId: user.uid, adminRole: "finance_team", action: "marked_withdrawal_paid", targetId: request.id, timestamp: serverTimestamp() });

      setSelected(null);
      loadRequests();
    } catch (err) {
      console.error(err);
      alert("Failed: " + err.message);
    }
    setActionLoading(false);
  };

  if (!country) {
    return (
      <div style={s.page}>
        <p style={{ ...s.empty, textAlign: "center", paddingTop: 40 }}>🌍 Select a country from the dropdown above to view its requests.</p>
      </div>
    );
  }

  return (
    <div style={s.page}>

      <div style={{ padding: "16px 16px 100px" }}>
        {loading ? <p style={s.empty}>Loading...</p>
          : requests.length === 0 ? <p style={s.empty}>No pending withdrawal requests.</p>
          : requests.map(r => (
            <div key={r.id} style={s.card}>
              <div>
                <div style={s.cardName}>{formatPrice(r.amount, r.country)}</div>
                <div style={s.cardMeta}>{r.role} · {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : "—"}</div>
              </div>
              <div style={s.viewBtn} onClick={() => openRequest(r)}>View Details</div>
            </div>
          ))
        }
      </div>

      {selected && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>Withdrawal Request</div>
            <DetailRow label="Amount" value={formatPrice(selected.amount, selected.country)} />
            <DetailRow label="Role" value={selected.role} />
            <DetailRow label="Bank Name" value={selected.bankName} />
            <DetailRow label="Branch" value={selected.branchName} />
            <DetailRow label="Account Number" value={selected.accountNumber} />
            <DetailRow label="User ID" value={selected.userId?.slice(0, 12)} />
            <DetailRow label="Requested On" value={selected.createdAt?.toDate ? selected.createdAt.toDate().toLocaleString() : "—"} />

            <div style={s.divider} />
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0B3D2E", marginBottom: 10 }}>
              After transferring the payment manually, record proof below:
            </div>
            <label className="input-label">Slip No</label>
            <input className="input-field" style={{ marginBottom: 10 }} value={slipNo} onChange={(e) => setSlipNo(e.target.value)} placeholder="Bank slip number" />
            <label className="input-label">Reference No</label>
            <input className="input-field" style={{ marginBottom: 10 }} value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Transaction reference number" />
            <label className="input-label">Payment Method</label>
            <select className="input-field" style={{ marginBottom: 10 }} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option>Bank Transfer</option>
              <option>Easypaisa</option>
              <option>JazzCash</option>
              <option>Cash</option>
            </select>
            <label className="input-label">Payment Date</label>
            <input type="date" className="input-field" style={{ marginBottom: 6 }} value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />

            <div style={s.modalActions}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleMarkPaid(selected)} disabled={actionLoading}>
                {actionLoading ? "Processing..." : "✓ Mark as Paid"}
              </button>
            </div>
            <div style={s.closeBtn} onClick={() => setSelected(null)}>Close</div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10.5, color: "#888", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: "#1a1a1a", fontWeight: 500 }}>{value || "—"}</div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  empty: { fontSize: 13, color: "#888", padding: "20px 0" },
  card: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #eee0c0", borderRadius: 12, padding: 14, marginBottom: 10 },
  cardName: { fontSize: 15, fontWeight: 800, color: "#0B3D2E" },
  cardMeta: { fontSize: 11, color: "#888", marginTop: 3, textTransform: "capitalize" },
  viewBtn: { background: "#0B3D2E", color: "#D4AF37", fontWeight: 700, fontSize: 11.5, padding: "8px 14px", borderRadius: 20, cursor: "pointer" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxHeight: "85vh", overflowY: "auto" },
  modalTitle: { fontSize: 17, fontFamily: "Georgia, serif", color: "#0B3D2E", marginBottom: 16, fontWeight: 700 },
  divider: { borderTop: "1px solid #eee", margin: "14px 0" },
  modalActions: { display: "flex", gap: 10, marginTop: 20, marginBottom: 12 },
  closeBtn: { textAlign: "center", fontSize: 13, color: "#888", cursor: "pointer", padding: "8px 0" }
};

