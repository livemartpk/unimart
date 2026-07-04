// ============================================
// UniMart - Add Product (Seller)
// ============================================

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";
import LoadingLogo from "../../components/LoadingLogo";

export default function AddProduct({ user, sellerStoreName, editProductId, onSuccess, onNavigate }) {
  const isEditMode = !!editProductId;
  const [form, setForm] = useState({
    name: "", category: "", price: "", mrp: "", stock: "",
    description: "", deliveryTime: "", colors: "", sizes: "",
    brand: "", highlights: "", material: "", weight: "", warranty: ""
  });
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProduct, setLoadingProduct] = useState(isEditMode);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const snap = await getDocs(collection(db, "categories"));
        setCategories(snap.docs.map((d) => d.data().name).filter(Boolean));
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (!isEditMode) return;
    const loadProduct = async () => {
      setLoadingProduct(true);
      try {
        const snap = await getDoc(doc(db, "products", editProductId));
        if (snap.exists()) {
          const p = snap.data();
          setForm({
            name: p.name || "",
            category: p.category || "",
            price: p.price != null ? String(p.price) : "",
            mrp: p.mrp != null ? String(p.mrp) : "",
            stock: p.stock != null ? String(p.stock) : "",
            description: p.description || "",
            deliveryTime: p.deliveryTime || "",
            colors: p.variants?.colors?.join(", ") || "",
            sizes: p.variants?.sizes?.join(", ") || "",
            brand: p.brand || "",
            highlights: p.highlights?.join("\n") || "",
            material: p.material || "",
            weight: p.weight || "",
            warranty: p.warranty || ""
          });
          setExistingImages(p.images || []);
        }
      } catch (err) {
        console.error("Failed to load product for editing:", err);
        setSubmitError("Couldn't load this product. Please go back and try again.");
      }
      setLoadingProduct(false);
    };
    loadProduct();
  }, [editProductId]);

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setImages(files);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Product name is required.";
    if (!form.category) e.category = "Select a category.";
    if (!form.price || Number(form.price) <= 0) e.price = "Enter a valid price.";
    if (form.mrp && Number(form.mrp) < Number(form.price)) e.mrp = "MRP should not be less than price.";
    if (form.stock === "" || Number(form.stock) < 0) e.stock = "Enter a valid stock quantity.";
    if (!form.description.trim()) e.description = "Add a short description.";
    const highlightLines = form.highlights.split("\n").map((l) => l.trim()).filter(Boolean);
    if (highlightLines.length < 2) e.highlights = "Add at least 2 key details (one per line) — e.g. material, capacity, what makes it special.";
    if (images.length === 0 && existingImages.length === 0) e.images = "Add at least one product image.";
    return e;
  };

  const uploadImagesToCloudinary = async (files) => {
    const CLOUD_NAME = "eez9oojf";
    const UPLOAD_PRESET = "unimart-products";
    const urls = [];
    for (const file of files) {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", UPLOAD_PRESET);
      data.append("folder", "unimart/products");
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: data
      });
      const json = await res.json();
      console.log("Cloudinary response:", json); // for debugging
      if (json.secure_url) {
        urls.push(json.secure_url);
      } else {
        throw new Error(json.error?.message || "Image upload failed — check Cloudinary preset");
      }
    }
    return urls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      let newImageUrls = [];
      if (images.length > 0) {
        try {
          newImageUrls = await uploadImagesToCloudinary(images);
        } catch (uploadErr) {
          setSubmitting(false);
          setSubmitError(`Image upload failed: ${uploadErr.message}. Please try again.`);
          return;
        }
      }
      const finalImages = [...existingImages, ...newImageUrls];

      const productData = {
        name: form.name,
        category: form.category,
        price: Number(form.price),
        mrp: form.mrp ? Number(form.mrp) : null,
        stock: Number(form.stock),
        description: form.description,
        deliveryTime: form.deliveryTime || "3-5 days",
        images: finalImages,
        brand: form.brand.trim() || null,
        material: form.material.trim() || null,
        weight: form.weight.trim() || null,
        warranty: form.warranty.trim() || null,
        highlights: form.highlights.split("\n").map((l) => l.trim()).filter(Boolean),
        variants: {
          colors: form.colors ? form.colors.split(",").map((c) => c.trim()).filter(Boolean) : [],
          sizes: form.sizes ? form.sizes.split(",").map((s) => s.trim()).filter(Boolean) : []
        }
      };

      if (isEditMode) {
        await updateDoc(doc(db, "products", editProductId), productData);
      } else {
        await addDoc(collection(db, "products"), {
          ...productData,
          sellerId: user.uid,
          sellerName: sellerStoreName || "Store",
          status: "active",
          rating: 0,
          reviewCount: 0,
          verifiedMall: false,
          boost: null,
          createdAt: serverTimestamp()
        });
      }

      setSubmitting(false);
      if (onSuccess) onSuccess();

    } catch (err) {
      console.error(err);
      setSubmitting(false);
      setSubmitError("Couldn't save the product. Please try again.");
    }
  };

  if (loadingProduct) return <LoadingLogo label="Loading product..." />;

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.backBtn} onClick={() => onNavigate && onNavigate("products")}>←</div>
        <div style={styles.headerTitle}>{isEditMode ? "Edit Product" : "Add Product"}</div>
        <div style={{ width: 36 }} />
      </div>

      <div className="container" style={{ paddingTop: 18, paddingBottom: 40 }}>
        <form onSubmit={handleSubmit}>
          <Field label="Product Name" error={errors.name}>
            <input className="input-field" value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="e.g. Wireless Earbuds" />
          </Field>

          <Field label="Category" error={errors.category}>
            <select className="input-field" value={form.category} onChange={(e) => handleChange("category", e.target.value)}>
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              {/* Keep the product's existing category selectable even if it was later removed from Category Management */}
              {isEditMode && form.category && !categories.includes(form.category) && (
                <option value={form.category}>{form.category}</option>
              )}
            </select>
            {categories.length === 0 && (
              <p style={styles.helperText}>No categories set up yet — ask Super Admin to add some in Category Management.</p>
            )}
          </Field>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Price (Rs)" error={errors.price}>
                <input type="number" className="input-field" value={form.price} onChange={(e) => handleChange("price", e.target.value)} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="MRP (Rs, optional)" error={errors.mrp}>
                <input type="number" className="input-field" value={form.mrp} onChange={(e) => handleChange("mrp", e.target.value)} />
              </Field>
            </div>
          </div>

          <Field label="Stock Quantity" error={errors.stock}>
            <input type="number" className="input-field" value={form.stock} onChange={(e) => handleChange("stock", e.target.value)} />
          </Field>

          <Field label="Delivery Time">
            <input className="input-field" value={form.deliveryTime} onChange={(e) => handleChange("deliveryTime", e.target.value)} placeholder="e.g. 3-5 days" />
          </Field>

          <Field label="Colors (optional, comma-separated)">
            <input className="input-field" value={form.colors} onChange={(e) => handleChange("colors", e.target.value)} placeholder="Red, Blue, Black" />
          </Field>

          <Field label="Sizes (optional, comma-separated)">
            <input className="input-field" value={form.sizes} onChange={(e) => handleChange("sizes", e.target.value)} placeholder="S, M, L, XL" />
          </Field>

          <Field label="Description" error={errors.description}>
            <textarea className="input-field" rows={4} value={form.description} onChange={(e) => handleChange("description", e.target.value)} style={{ resize: "none", fontFamily: "inherit" }} />
          </Field>

          <Field label="Brand (optional)">
            <input className="input-field" value={form.brand} onChange={(e) => handleChange("brand", e.target.value)} placeholder="e.g. No Brand, Sony, Khaadi" />
          </Field>

          <Field label="Key Product Details" error={errors.highlights}>
            <textarea
              className="input-field"
              rows={5}
              value={form.highlights}
              onChange={(e) => handleChange("highlights", e.target.value)}
              placeholder={"One detail per line — buyers see these as bullet points.\ne.g.\nPremium metal build, rust-resistant\n100% imported material\nIdeal for daily use and gifting\nHandcrafted with fine finishing"}
              style={{ resize: "none", fontFamily: "inherit" }}
            />
            <p style={styles.helperText}>Write one detail per line. The more specific, the more buyers trust your product.</p>
          </Field>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Material (optional)">
                <input className="input-field" value={form.material} onChange={(e) => handleChange("material", e.target.value)} placeholder="e.g. Stainless Steel" />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Weight / Size (optional)">
                <input className="input-field" value={form.weight} onChange={(e) => handleChange("weight", e.target.value)} placeholder="e.g. 450g, 30x20cm" />
              </Field>
            </div>
          </div>

          <Field label="Warranty (optional)">
            <input className="input-field" value={form.warranty} onChange={(e) => handleChange("warranty", e.target.value)} placeholder="e.g. 6 months seller warranty" />
          </Field>

          <Field label={isEditMode ? "Add More Images (optional)" : "Product Images (up to 5)"} error={errors.images}>
            {existingImages.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                {existingImages.map((url, i) => (
                  <div key={i} style={styles.existingImgWrap}>
                    <img src={url} alt="" style={styles.existingImg} />
                    <div style={styles.removeImgBtn} onClick={() => setExistingImages((imgs) => imgs.filter((_, idx) => idx !== i))}>✕</div>
                  </div>
                ))}
              </div>
            )}
            <input type="file" className="input-field" multiple accept="image/*" onChange={handleImageSelect} />
            {images.length > 0 && <p style={styles.imgCount}>{images.length} new image(s) selected</p>}
          </Field>

          {submitError && <p className="error-text">{submitError}</p>}

          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={submitting}>
            {submitting ? "Saving..." : isEditMode ? "Save Changes" : "Publish Product"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="input-label">{label}</label>
      {children}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--color-bg)", margin: "0 auto" },
  header: { background: "#0B3D2E", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  backBtn: { color: "#fff", fontSize: 18, cursor: "pointer", width: 36 },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700 },
  imgCount: { fontSize: 11.5, color: "#0B3D2E", marginTop: 6, fontWeight: 600 },
  helperText: { fontSize: 11, color: "#888", marginTop: 5 },
  existingImgWrap: { position: "relative", width: 64, height: 64 },
  existingImg: { width: 64, height: 64, objectFit: "cover", borderRadius: 10, border: "1px solid #eee0c0" },
  removeImgBtn: { position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#C0392B", color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }
};
