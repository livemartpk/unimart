// ============================================
// UniMart - Country + Gender + Currency fields
// Shared across Buyer/Seller/Agent signup forms.
// Only shows countries the Super Admin has marked
// "Active"; currency auto-fills once a country is
// picked (not separately selectable).
// ============================================

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { COUNTRIES, getCurrencyForCountry } from "../utils/countries";

export default function CountryGenderFields({ country, setCountry, gender, setGender, errors = {} }) {
  const [activeCountries, setActiveCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "activeCountries"));
        const activeCodes = new Set(snap.docs.filter((d) => d.data().active === true).map((d) => d.id));
        setActiveCountries(COUNTRIES.filter((c) => activeCodes.has(c.code)));
      } catch (err) {
        console.error("Failed to load active countries:", err);
      }
      setLoading(false);
    };
    load();
  }, []);

  const currency = country ? getCurrencyForCountry(country) : "";

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <label className="input-label">Country</label>
        <select
          className="input-field"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          disabled={loading}
        >
          <option value="">{loading ? "Loading countries..." : "Select your country"}</option>
          {activeCountries.map((c) => (
            <option key={c.code} value={c.name}>{c.name}</option>
          ))}
        </select>
        {errors.country && <p className="error-text">{errors.country}</p>}
        {currency && (
          <p style={{ fontSize: 11.5, color: "#0B3D2E", fontWeight: 600, marginTop: 6 }}>
            Currency: {currency}
          </p>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="input-label">Gender</label>
        <select
          className="input-field"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        >
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        {errors.gender && <p className="error-text">{errors.gender}</p>}
      </div>
    </>
  );
}
