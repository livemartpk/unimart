// ============================================
// UniMart - Add Product (Seller)
// ============================================

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import "../../styles/theme.css";

export default function AddProduct({ user, sellerStoreName, onSuccess, onNavigate }) {
  const [form, setForm] = useState({
    name: "", category: "", price: "", mrp: "", stock: "",
    description: "", deliveryTime: "", colors: "", sizes: ""
  });
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

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
    if (images.length === 0) e.images = "Add at least one product image.";
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
      let imageUrls = [];
      if (images.length > 0) {
        try {
          imageUrls = await uploadImagesToCloudinary(images);
        } catch (uploadErr) {
          setSubmitting(false);
          setSubmitError(`Image upload failed: ${uploadErr.message}. Please try again.`);
          return;
        }
      }

      await addDoc(collection(db, "products"), {
        sellerId: user.uid,
        sellerName: sellerStoreName || "Store",
        name: form.name,
        category: form.category,
        price: Number(form.price),
        mrp: form.mrp ? Number(form.mrp) : null,
        stock: Number(form.stock),
        description: form.description,
        deliveryTime: form.deliveryTime || "3-5 days",
        images: imageUrls,
        variants: {
          colors: form.colors ? form.colors.split(",").map((c) => c.trim()).filter(Boolean) : [],
          sizes: form.sizes ? form.sizes.split(",").map((s) => s.trim()).filter(Boolean) : []
        },
        status: "active",
        rating: 0,
        reviewCount: 0,
        verifiedMall: false,
        boost: null,
        createdAt: serverTimestamp()
      });

      setSubmitting(false);
      if (onSuccess) onSuccess();

    } catch (err) {
      console.error(err);
      setSubmitting(false);
      setSubmitError("Couldn't save the product. Please try again.");
    }
  };

  return (
    <div className="page-shell" style={styles.page}>
      <div style={styles.header}>
        <div style={styles.backBtn} onClick={() => onNavigate && onNavigate("products")}>←</div>
        <div style={styles.headerTitle}>Add Product</div>
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
              <option value="Electronics">Electronics</option>
              <option value="Fashion">Fashion</option>
              <option value="Home">Home</option>
              <option value="Beauty">Beauty</option>
              <option value="Food">Food</option>
              <option value="Medical">Medical</option>
            </select>
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

          <Field label="Product Images (up to 5)" error={errors.images}>
            <input type="file" className="input-field" multiple accept="image/*" onChange={handleImageSelect} />
            {images.length > 0 && <p style={styles.imgCount}>{images.length} image(s) selected</p>}
          </Field>

          {submitError && <p className="error-text">{submitError}</p>}

          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={submitting}>
            {submitting ? "Publishing..." : "Publish Product"}
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
  imgCount: { fontSize: 11.5, color: "#0B3D2E", marginTop: 6, fontWeight: 600 }
};
