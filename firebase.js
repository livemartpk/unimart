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
      <div className="mb-4">
        <label className="block text-title-sm text-ink mb-1.5">Country</label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          disabled={loading}
          className="w-full h-12 px-4 rounded-btn border border-hairline text-body-md text-ink bg-canvas focus:outline-none focus:border-ink focus:shadow-elevation transition-shadow disabled:text-muted"
        >
          <option value="">{loading ? "Loading countries..." : "Select your country"}</option>
          {activeCountries.map((c) => (
            <option key={c.code} value={c.name}>{c.name}</option>
          ))}
        </select>
        {errors.country && <p className="text-rausch text-body-sm mt-1.5">{errors.country}</p>}
        {currency && (
          <p className="text-body-sm text-ink font-semibold mt-1.5">
            Currency: {currency}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-title-sm text-ink mb-1.5">Gender</label>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="w-full h-12 px-4 rounded-btn border border-hairline text-body-md text-ink bg-canvas focus:outline-none focus:border-ink focus:shadow-elevation transition-shadow"
        >
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        {errors.gender && <p className="text-rausch text-body-sm mt-1.5">{errors.gender}</p>}
      </div>
    </>
  );
}
