// ============================================
// UniMart - Dispatch Slip (Printable Sticker)
// ============================================

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

export default function DispatchSlip({ orderId, onNavigate }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadOrder(); }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "orders", orderId));
      if (snap.exists()) setOrder({ id: snap.id, ...snap.data() });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading dispatch slip...</div>;
  if (!order) return <div style={{ padding: 40, textAlign: "center" }}>Order not found. ID: {orderId}</div>;

  return (
    <div style={s.page}>
      {/* Controls */}
      <div style={s.controls} className="no-print">
        <button style={s.backBtn} onClick={() => onNavigate && onNavigate("incoming-orders")}>← Back to Orders</button>
        <button style={s.printBtn} onClick={() => window.print()}>🖨️ Print Dispatch Slip</button>
      </div>

      {/* Slip */}
      <div style={s.slip} id="dispatch-slip">

        {/* Header */}
        <div style={s.header}>
          <div style={s.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span></div>
          <div style={s.slipTitle}>DISPATCH SLIP</div>
        </div>

        <div style={s.divider} />

        {/* FROM */}
        <div style={s.section}>
          <div style={s.sectionLabel}>FROM:</div>
          <div style={s.sectionValue}>{order.sellerName}</div>
          <div style={s.sectionSub}>UniMart Seller · Pakistan</div>
        </div>

        <div style={s.divider} />

        {/* TO */}
        <div style={s.section}>
          <div style={s.sectionLabel}>DELIVER TO:</div>
          <div style={{ ...s.sectionValue, fontSize: 18 }}>{order.buyerName}</div>
          <div style={s.addressLine}>{order.shippingAddress?.fullAddress}</div>
          <div style={s.addressLine}>{order.shippingAddress?.city}</div>
          <div style={{ ...s.addressLine, fontWeight: 700, fontSize: 14, marginTop: 6 }}>
            📞 {order.buyerPhone || order.shippingAddress?.phone}
          </div>
        </div>

        <div style={s.divider} />

        {/* Order Info */}
        <div style={s.infoGrid}>
          <div style={s.infoItem}>
            <div style={s.infoLabel}>Order ID</div>
            <div style={s.infoValue}>{order.id.slice(0, 12).toUpperCase()}</div>
          </div>
          <div style={s.infoItem}>
            <div style={s.infoLabel}>Date</div>
            <div style={s.infoValue}>{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString("en-PK") : "—"}</div>
          </div>
          <div style={s.infoItem}>
            <div style={s.infoLabel}>Items</div>
            <div style={s.infoValue}>{(order.items || []).reduce((s, i) => s + i.qty, 0)} pcs</div>
          </div>
          <div style={s.infoItem}>
            <div style={s.infoLabel}>Tracking #</div>
            <div style={s.infoValue}>{order.dispatchDetails?.trackingNumber || "—"}</div>
          </div>
        </div>

        {order.dispatchDetails?.courierCompany && (
          <div style={s.courierBox}>
            🚚 Courier: <b>{order.dispatchDetails.courierCompany}</b>
          </div>
        )}

        {/* COD Box */}
        {order.paymentMethod === "cod" && (
          <div style={s.codBox}>
            <div style={s.codLabel}>COLLECT ON DELIVERY</div>
            <div style={s.codAmount}>Rs {Number(order.grandTotal || 0).toLocaleString()}</div>
          </div>
        )}

        {/* Items Summary */}
        <div style={s.itemsBox}>
          <div style={s.itemsTitle}>Contents:</div>
          {(order.items || []).map((item, i) => (
            <div key={i} style={s.itemRow}>
              <span>{item.name}</span>
              <span>× {item.qty}</span>
            </div>
          ))}
        </div>

        <div style={s.footer}>
          UniMart · unimart-virid.vercel.app
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          #dispatch-slip { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}

const s = {
  page: { background: "#f0f0f0", minHeight: "100vh", padding: 20, fontFamily: "var(--font-body)" },
  controls: { display: "flex", justifyContent: "space-between", maxWidth: 420, margin: "0 auto 16px" },
  backBtn: { background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  printBtn: { background: "#0B3D2E", color: "#D4AF37", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700 },

  slip: { background: "#fff", maxWidth: 420, margin: "0 auto", padding: 24, borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", border: "2px dashed #0B3D2E" },

  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  logo: { fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, color: "#0B3D2E" },
  slipTitle: { fontSize: 13, fontWeight: 800, color: "#888", letterSpacing: 2 },

  divider: { height: 1, background: "#eee0c0", margin: "12px 0" },

  section: { marginBottom: 4 },
  sectionLabel: { fontSize: 10, fontWeight: 800, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  sectionValue: { fontSize: 16, fontWeight: 800, color: "#1a1a1a" },
  sectionSub: { fontSize: 11, color: "#888", marginTop: 2 },
  addressLine: { fontSize: 13, color: "#333", marginTop: 2 },

  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 },
  infoItem: {},
  infoLabel: { fontSize: 10, color: "#888", textTransform: "uppercase", marginBottom: 2 },
  infoValue: { fontSize: 12.5, fontWeight: 700, color: "#1a1a1a" },

  courierBox: { fontSize: 13, color: "#444", background: "#F0F5F0", borderRadius: 8, padding: "8px 12px", marginBottom: 12 },

  codBox: { background: "#0B3D2E", borderRadius: 10, padding: 14, textAlign: "center", marginBottom: 12 },
  codLabel: { fontSize: 11, color: "#D4AF37", fontWeight: 800, letterSpacing: 1, marginBottom: 4 },
  codAmount: { fontSize: 22, fontWeight: 800, color: "#fff" },

  itemsBox: { background: "#fafafa", borderRadius: 8, padding: 10, marginBottom: 12 },
  itemsTitle: { fontSize: 10, color: "#888", textTransform: "uppercase", marginBottom: 6 },
  itemRow: { display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#333", marginBottom: 3 },

  footer: { textAlign: "center", fontSize: 10, color: "#aaa", paddingTop: 8 }
};
