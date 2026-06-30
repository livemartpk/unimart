// ============================================
// UniMart - Invoice (Printable)
// Accessible anytime by buyer or seller, per our
// decision — generated on-demand from order data,
// not stored as a separate file (saves storage cost).
// ============================================

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

export default function Invoice({ orderId, onNavigate }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "orders", orderId));
      if (snap.exists()) setOrder({ id: snap.id, ...snap.data() });
    } catch (err) {
      console.error("Failed to load order for invoice:", err);
    }
    setLoading(false);
  };

  if (loading) return <div style={{ padding: 20 }}>Loading invoice...</div>;
  if (!order) return <div style={{ padding: 20 }}>Order not found.</div>;

  return (
    <div style={styles.page}>
      <div style={styles.noPrint}>
        <button className="btn-secondary" onClick={() => onNavigate && onNavigate("back")}>← Back</button>
        <button className="btn-primary" onClick={() => window.print()}>Print Invoice</button>
      </div>

      <div style={styles.invoiceSheet}>
        <div style={styles.invoiceHeader}>
          <div style={styles.logo}>Uni<span style={{ color: "#D4AF37" }}>Mart</span></div>
          <div style={styles.invoiceTitle}>INVOICE</div>
        </div>

        <div style={styles.metaRow}>
          <div>Order ID: <b>{order.id}</b></div>
          <div>Date: <b>{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : "—"}</b></div>
        </div>

        <div style={styles.partiesRow}>
          <div style={styles.partyBox}>
            <div style={styles.partyLabel}>Seller</div>
            <div style={styles.partyValue}>{order.sellerName}</div>
          </div>
          <div style={styles.partyBox}>
            <div style={styles.partyLabel}>Buyer</div>
            <div style={styles.partyValue}>{order.buyerName}</div>
            <div style={styles.partyValue}>{order.shippingAddress}</div>
          </div>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Item</th>
              <th style={styles.th}>Qty</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, i) => (
              <tr key={i}>
                <td style={styles.td}>{item.name}</td>
                <td style={styles.td}>{item.qty}</td>
                <td style={styles.td}>Rs {item.price}</td>
                <td style={styles.td}>Rs {item.price * item.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={styles.totalsBox}>
          <div style={styles.totalRow}><span>Subtotal</span><span>Rs {order.subtotal || 0}</span></div>
          <div style={styles.totalRow}><span>Shipping</span><span>Rs {order.shippingCharges || 0}</span></div>
          <div style={{ ...styles.totalRow, ...styles.grandTotal }}><span>Total</span><span>Rs {order.grandTotal || 0}</span></div>
        </div>

        <div style={styles.paymentNote}>Payment Method: {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}</div>

        <div style={styles.footer}>Thank you for shopping with UniMart.</div>
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#e8e8e8", minHeight: "100vh", padding: 20 },
  noPrint: { display: "flex", justifyContent: "space-between", margin: "0 auto 16px" },
  invoiceSheet: { background: "#fff", margin: "0 auto", padding: 32, borderRadius: 4 },
  invoiceHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #0B3D2E", paddingBottom: 16, marginBottom: 20 },
  logo: { fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, color: "#0B3D2E" },
  invoiceTitle: { fontSize: 18, fontWeight: 800, color: "#888", letterSpacing: 2 },
  metaRow: { display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#444", marginBottom: 20 },
  partiesRow: { display: "flex", gap: 30, marginBottom: 24 },
  partyBox: { flex: 1 },
  partyLabel: { fontSize: 10.5, fontWeight: 700, color: "#0B3D2E", textTransform: "uppercase", marginBottom: 4 },
  partyValue: { fontSize: 12.5, color: "#333" },
  table: { width: "100%", borderCollapse: "collapse", marginBottom: 20 },
  th: { textAlign: "left", fontSize: 11, color: "#888", borderBottom: "1px solid #eee0c0", padding: "8px 4px" },
  td: { fontSize: 12.5, color: "#333", borderBottom: "1px solid #f5f5f5", padding: "8px 4px" },
  totalsBox: { marginLeft: "auto", width: 200, marginBottom: 20 },
  totalRow: { display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#444", padding: "4px 0" },
  grandTotal: { fontWeight: 800, color: "#0B3D2E", fontSize: 15, borderTop: "1px solid #eee0c0", marginTop: 6, paddingTop: 8 },
  paymentNote: { fontSize: 12, color: "#666", marginBottom: 20 },
  footer: { textAlign: "center", fontSize: 11.5, color: "#888", borderTop: "1px solid #f0f0f0", paddingTop: 16 }
};
