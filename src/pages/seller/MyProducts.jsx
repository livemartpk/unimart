// ============================================
// UniMart - My Products (Seller)
// View / Edit / Delete + status filter
// [Tailwind / Airbnb-inspired design system]
// ============================================

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { formatPrice } from "../../utils/countries";

export default function MyProducts({ user, onNavigate }) {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [viewProduct, setViewProduct] = useState(null);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "products"), where("sellerId", "==", user.uid));
      const snap = await getDocs(q);
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error("Failed to load products:", err); }
    setLoading(false);
  };

  const toggleStatus = async (product) => {
    const newStatus = product.status === "active" ? "draft" : "active";
    await updateDoc(doc(db, "products", product.id), { status: newStatus });
    setProducts((ps) => ps.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p)));
    if (viewProduct?.id === product.id) setViewProduct(v => ({ ...v, status: newStatus }));
  };

  const handleDelete = async (productId) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    await deleteDoc(doc(db, "products", productId));
    setProducts((ps) => ps.filter((p) => p.id !== productId));
    setViewProduct(null);
  };

  const filteredProducts = products.filter((p) => {
    if (filter === "all") return true;
    if (filter === "outofstock") return (p.stock || 0) <= 0;
    return p.status === filter;
  });

  const counts = {
    all: products.length,
    active: products.filter((p) => p.status === "active").length,
    draft: products.filter((p) => p.status === "draft").length,
    outofstock: products.filter((p) => (p.stock || 0) <= 0).length
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="p-4 pb-0 flex justify-end">
        <div onClick={() => onNavigate && onNavigate("add-product")} className="bg-rausch hover:bg-rausch-active text-white font-bold text-[12.5px] px-4 py-2 rounded-full cursor-pointer transition-colors">+ Add</div>
      </div>

      <div className="flex gap-2 px-4 py-3.5 overflow-x-auto">
        <FilterPill label="All" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterPill label="Active" count={counts.active} active={filter === "active"} onClick={() => setFilter("active")} />
        <FilterPill label="Draft" count={counts.draft} active={filter === "draft"} onClick={() => setFilter("draft")} />
        <FilterPill label="Out of Stock" count={counts.outofstock} active={filter === "outofstock"} onClick={() => setFilter("outofstock")} />
      </div>

      <div className="px-4 pb-8">
        {loading ? (
          <p className="text-body-sm text-muted">Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">🛍️</div>
            <p className="text-body-sm text-muted mb-3.5">No products here yet.</p>
            <button onClick={() => onNavigate && onNavigate("add-product")} className="h-11 px-5 rounded-btn bg-rausch hover:bg-rausch-active text-white text-body-sm font-semibold">Add your first product</button>
          </div>
        ) : (
          filteredProducts.map((p) => (
            <div key={p.id} className="flex gap-3 bg-canvas border border-hairline rounded-card p-3 mb-2.5">
              <div className="w-[70px] h-[70px] bg-surface-soft rounded-btn flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : "🛍️"}
              </div>
              <div className="flex-1">
                <div className="text-body-sm text-ink font-bold">{p.name}</div>
                <div className="text-body-sm font-extrabold text-ink mt-0.5">{formatPrice(Number(p.price), p.country)}</div>
                <div className={`text-[10.5px] mt-1 ${(p.stock || 0) <= 5 ? "text-rausch font-bold" : "text-muted"}`}>
                  Stock: {p.stock || 0}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${p.status === "active" ? "bg-green-600" : "bg-muted"}`} />
                  <span className="text-[10.5px] text-muted">{p.status === "active" ? "Active" : "Draft"}</span>
                </div>
                <div className="flex gap-2.5 mt-2 flex-wrap">
                  <span className="text-[11px] text-rausch font-bold cursor-pointer" onClick={() => setViewProduct(p)}>👁 View</span>
                  <span className="text-[11px] text-ink font-bold cursor-pointer" onClick={() => onNavigate && onNavigate("edit-product", p.id)}>✏️ Edit</span>
                  <span className="text-[11px] text-ink font-bold cursor-pointer" onClick={() => toggleStatus(p)}>
                    {p.status === "active" ? "📋 Draft" : "✅ Activate"}
                  </span>
                  <span className="text-[11px] text-rausch font-bold cursor-pointer" onClick={() => handleDelete(p.id)}>🗑 Delete</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===== View Product Modal ===== */}
      {viewProduct && (
        <div className="fixed inset-0 bg-black/55 z-[200] flex items-end" onClick={() => setViewProduct(null)}>
          <div className="bg-canvas rounded-t-card w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-5 pt-4.5 pb-3.5 border-b border-hairline-soft sticky top-0 bg-canvas z-10">
              <div className="text-title-md text-ink font-bold">Product Details</div>
              <div className="text-lg text-muted cursor-pointer px-2 py-1" onClick={() => setViewProduct(null)}>✕</div>
            </div>

            {viewProduct.images?.[0] ? (
              <img src={viewProduct.images[0]} alt={viewProduct.name} className="w-full h-[200px] object-cover" />
            ) : (
              <div className="w-full h-[150px] bg-surface-soft flex items-center justify-center text-5xl">🛍️</div>
            )}

            <div className="px-5 pt-4 pb-6">
              <div className="text-lg font-extrabold text-ink mb-1">{viewProduct.name}</div>
              <div className="text-xl font-extrabold text-ink mb-4">{formatPrice(Number(viewProduct.price), viewProduct.country)}</div>

              <div className="mb-4">
                <DetailItem label="Category" value={viewProduct.category} />
                <DetailItem label="Stock" value={viewProduct.stock} />
                <DetailItem label="Status" value={viewProduct.status} />
                <DetailItem label="Description" value={viewProduct.description} />
                {viewProduct.brand && <DetailItem label="Brand" value={viewProduct.brand} />}
                {viewProduct.material && <DetailItem label="Material" value={viewProduct.material} />}
                {viewProduct.weight && <DetailItem label="Weight / Size" value={viewProduct.weight} />}
                {viewProduct.warranty && <DetailItem label="Warranty" value={viewProduct.warranty} />}
              </div>

              {viewProduct.highlights?.length > 0 && (
                <div className="my-1">
                  <div className="text-[10.5px] text-muted font-semibold uppercase tracking-wide">Key Product Details</div>
                  <ul className="mt-1 pl-4.5">
                    {viewProduct.highlights.map((h, i) => (
                      <li key={i} className="text-[12.5px] text-body leading-loose">{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2.5 mb-2.5 mt-4">
                <button
                  onClick={() => { setViewProduct(null); onNavigate && onNavigate("edit-product", viewProduct.id); }}
                  className="flex-1 h-11 rounded-btn border border-hairline text-ink text-body-sm font-semibold hover:bg-surface-soft transition-colors"
                >
                  ✏️ Edit Product
                </button>
                <button
                  onClick={() => toggleStatus(viewProduct)}
                  className={`flex-1 h-11 rounded-btn text-body-sm font-bold ${viewProduct.status === "active" ? "bg-surface-soft text-body" : "bg-green-100 text-green-700"}`}
                >
                  {viewProduct.status === "active" ? "📋 Set Draft" : "✅ Activate"}
                </button>
              </div>
              <button
                onClick={() => handleDelete(viewProduct.id)}
                className="w-full h-11 bg-rausch-disabled/30 border border-rausch-disabled text-rausch text-body-sm font-bold rounded-btn"
              >
                🗑 Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, count, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full border text-[11.5px] font-semibold whitespace-nowrap cursor-pointer
      ${active ? "bg-ink text-white border-ink" : "bg-canvas text-ink border-hairline"}`}
    >
      {label} {count > 0 && `(${count})`}
    </div>
  );
}

function DetailItem({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="mb-2.5">
      <div className="text-[10.5px] text-muted font-semibold uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-[13.5px] text-ink font-medium capitalize">{value}</div>
    </div>
  );
}
