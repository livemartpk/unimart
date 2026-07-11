// ============================================
// UniMart - Invoice (Printable / PDF-style)
// ============================================

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { formatPrice } from "../../utils/countries";
import "../../styles/theme.css";

export default function Invoice({ orderId, onNavigate }) {
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

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading invoice...</div>;
  if (!order) return <div style={{ padding: 40, textAlign: "center" }}>Order not found. ID: {orderId}</div>;

  const subtotal = (order.items || []).reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = order.shippingCharge || 0;
  const total = order.grandTotal || subtotal + shipping;

  return (
    <div style={s.page}>
      {/* Print Controls — hidden when printing */}
      <div style={s.controls} className="no-print">
        <button style={s.backBtn} onClick={() => onNavigate && onNavigate("incoming-orders")}>← Back to Orders</button>
        <button style={s.printBtn} onClick={() => window.print()}>🖨️ Print / Save PDF</button>
      </div>

      {/* Invoice Sheet */}
      <div style={s.sheet} id="invoice-sheet">

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span></div>
            <div style={s.logoSub}>Pakistan's Trusted Marketplace</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={s.invoiceTitle}>INVOICE</div>
            <div style={s.invoiceNum}>#{order.id.slice(0, 10).toUpperCase()}</div>
          </div>
        </div>

        <div style={s.divider} />

        {/* Meta Info */}
        <div style={s.metaRow}>
          <div>
            <div style={s.metaLabel}>Invoice Date</div>
            <div style={s.metaValue}>{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString("en-PK") : "—"}</div>
          </div>
          <div>
            <div style={s.metaLabel}>Payment Method</div>
            <div style={s.metaValue}>{order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}</div>
          </div>
          <div>
            <div style={s.metaLabel}>Order Status</div>
            <div style={{ ...s.metaValue, textTransform: "capitalize", color: "#0B3D2E", fontWeight: 700 }}>{order.status}</div>
          </div>
        </div>

        <div style={s.divider} />

        {/* Parties */}
        <div style={s.parties}>
          <div style={s.partyBox}>
            <div style={s.partyTitle}>FROM (Seller)</div>
            <div style={s.partyName}>{order.sellerName}</div>
            <div style={s.partyDetail}>UniMart Verified Seller</div>
          </div>
          <div style={s.partyBox}>
            <div style={s.partyTitle}>TO (Buyer)</div>
            <div style={s.partyName}>{order.buyerName}</div>
            <div style={s.partyDetail}>{order.shippingAddress?.fullAddress}</div>
            <div style={s.partyDetail}>{order.shippingAddress?.city}</div>
            <div style={s.partyDetail}>📞 {order.buyerPhone || order.shippingAddress?.phone}</div>
          </div>
        </div>

        <div style={s.divider} />

        {/* Items Table */}
        <table style={s.table}>
          <thead>
            <tr style={s.tableHead}>
              <th style={s.th}>#</th>
              <th style={s.th}>Item</th>
              <th style={{ ...s.th, textAlign: "center" }}>Qty</th>
              <th style={{ ...s.th, textAlign: "right" }}>Unit Price</th>
              <th style={{ ...s.th, textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, i) => (
              <tr key={i} style={i % 2 === 0 ? s.trEven : {}}>
                <td style={s.td}>{i + 1}</td>
                <td style={s.td}>{item.name}</td>
                <td style={{ ...s.td, textAlign: "center" }}>{item.qty}</td>
                <td style={{ ...s.td, textAlign: "right" }}>{formatPrice(Number(item.price), order.country)}</td>
                <td style={{ ...s.td, textAlign: "right" }}>{formatPrice(item.price * item.qty, order.country)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={s.totalsBox}>
          <div style={s.totalRow}>
            <span>Subtotal</span>
            <span>{formatPrice(subtotal, order.country)}</span>
          </div>
          <div style={s.totalRow}>
            <span>Shipping</span>
            <span>{formatPrice(shipping, order.country)}</span>
          </div>
          <div style={s.divider} />
          <div style={s.grandTotalRow}>
            <span>Grand Total</span>
            <span>{formatPrice(total, order.country)}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <div style={s.footerText}>Thank you for shopping with UniMart!</div>
          <div style={s.footerSub}>unimart-virid.vercel.app · support@unimart.pk</div>
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          #invoice-sheet { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}

const s = {
  page: { background: "#f0f0f0", minHeight: "100vh", padding: 20, fontFamily: "var(--font-body)" },
  controls: { display: "flex", justifyContent: "space-between", maxWidth: 720, margin: "0 auto 16px" },
  backBtn: { background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  printBtn: { background: "#0B3D2E", color: "#D4AF37", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700 },

  sheet: { background: "#fff", maxWidth: 720, margin: "0 auto", padding: 40, borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" },

  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  logo: { fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 800, color: "#0B3D2E" },
  logoSub: { fontSize: 11, color: "#888", marginTop: 2 },
  invoiceTitle: { fontSize: 24, fontWeight: 800, color: "#0B3D2E", letterSpacing: 3 },
  invoiceNum: { fontSize: 12, color: "#888", marginTop: 4 },

  divider: { height: 1, background: "#eee0c0", margin: "16px 0" },

  metaRow: { display: "flex", justifyContent: "space-between" },
  metaLabel: { fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  metaValue: { fontSize: 13, color: "#1a1a1a", fontWeight: 600 },

  parties: { display: "flex", gap: 40 },
  partyBox: { flex: 1 },
  partyTitle: { fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  partyName: { fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 },
  partyDetail: { fontSize: 12, color: "#555", marginBottom: 2 },

  table: { width: "100%", borderCollapse: "collapse", marginBottom: 20 },
  tableHead: { background: "#0B3D2E" },
  th: { padding: "10px 8px", fontSize: 11, fontWeight: 700, color: "#fff", textAlign: "left" },
  td: { padding: "10px 8px", fontSize: 13, color: "#333", borderBottom: "1px solid #f5f5f5" },
  trEven: { background: "#fafafa" },

  totalsBox: { maxWidth: 260, marginLeft: "auto" },
  totalRow: { display: "flex", justifyContent: "space-between", fontSize: 13, color: "#555", padding: "4px 0" },
  grandTotalRow: { display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, color: "#0B3D2E", padding: "8px 0" },

  footer: { textAlign: "center", marginTop: 30, paddingTop: 16, borderTop: "1px solid #eee0c0" },
  footerText: { fontSize: 13, color: "#0B3D2E", fontWeight: 600 },
  footerSub: { fontSize: 11, color: "#aaa", marginTop: 4 }
};
