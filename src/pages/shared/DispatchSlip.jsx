// ============================================
// UniMart - Dispatch Slip (Printable Sticker)
// Small parcel label — courier-facing, per our
// decision: From/To addresses, Order ID/tracking,
// COD amount.
// ============================================

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

export default function DispatchSlip({ orderId, onNavigate }) {
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
      console.error("Failed to load order for dispatch slip:", err);
    }
    setLoading(false);
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!order) return <div style={{ padding: 20 }}>Order not found.</div>;

  return (
    <div style={styles.page}>
      <div style={styles.noPrint}>
        <button className="btn-secondary" onClick={() => onNavigate && onNavigate("back")}>← Back</button>
        <button className="btn-primary" onClick={() => window.print()}>Print Sticker</button>
      </div>

      <div style={styles.slip}>
        <div style={styles.slipHeader}>UniMart</div>

        <div style={styles.section}>
          <div style={styles.label}>FROM</div>
          <div style={styles.value}>{order.sellerName}</div>
          <div style={styles.value}>{order.sellerPickupAddress || "Pickup address on file"}</div>
        </div>

        <div style={styles.divider} />

        <div style={styles.section}>
          <div style={styles.label}>TO</div>
          <div style={styles.bigValue}>{order.buyerName}</div>
          <div style={styles.bigValue}>{order.shippingAddress}</div>
          <div style={styles.bigValue}>{order.buyerPhone}</div>
        </div>

        <div style={styles.divider} />

        <div style={styles.metaGrid}>
          <div>
            <div style={styles.label}>Order ID</div>
            <div style={styles.value}>{order.id.slice(0, 10)}</div>
          </div>
          <div>
            <div style={styles.label}>Tracking #</div>
            <div style={styles.value}>{order.dispatchDetails?.trackingNumber || "—"}</div>
          </div>
        </div>

        {order.paymentMethod === "cod" && (
          <div style={styles.codBox}>
            COLLECT ON DELIVERY: Rs {order.grandTotal}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#e8e8e8", minHeight: "100vh", padding: 20 },
  noPrint: { display: "flex", justifyContent: "space-between", maxWidth: 380, margin: "0 auto 16px" },
  slip: { background: "#fff", maxWidth: 380, margin: "0 auto", padding: 20, border: "2px dashed #0B3D2E", borderRadius: 8 },
  slipHeader: { fontFamily: "Georgia, serif", fontWeight: 800, color: "#0B3D2E", fontSize: 16, textAlign: "center", marginBottom: 14 },
  section: { marginBottom: 8 },
  label: { fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 3 },
  value: { fontSize: 12.5, color: "#333" },
  bigValue: { fontSize: 15, fontWeight: 700, color: "#1a1a1a" },
  divider: { height: 1, background: "#eee0c0", margin: "12px 0" },
  metaGrid: { display: "flex", justifyContent: "space-between", marginBottom: 12 },
  codBox: { background: "#0B3D2E", color: "#D4AF37", fontWeight: 800, fontSize: 14, textAlign: "center", padding: 10, borderRadius: 6 }
};
