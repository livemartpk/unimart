// ============================================
// UniMart - Country Management (Super Admin)
// Controls which countries buyers/sellers/agents can
// select during registration. Only "Active" countries
// show up in signup dropdowns. Marking a country
// inactive only blocks NEW registrations from it —
// existing accounts from that country keep working.
// ============================================

import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { COUNTRIES } from "../../../utils/countries";
import "../../../styles/theme.css";

export default function CountryManagement() {
  const [activeMap, setActiveMap] = useState({}); // { countryCode: true/false }
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingCode, setSavingCode] = useState(null);

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "activeCountries"));

      if (snap.empty) {
        // First time ever loading this page — seed Pakistan as the only active country
        await setDoc(doc(db, "activeCountries", "PK"), { active: true });
        setActiveMap({ PK: true });
      } else {
        const map = {};
        snap.docs.forEach((d) => { map[d.id] = d.data().active === true; });
        setActiveMap(map);
      }
    } catch (err) {
      console.error("Failed to load countries:", err);
    }
    setLoading(false);
  };

  const toggleCountry = async (code) => {
    const newValue = !activeMap[code];
    setSavingCode(code);
    setActiveMap((prev) => ({ ...prev, [code]: newValue }));
    try {
      await setDoc(doc(db, "activeCountries", code), { active: newValue });
    } catch (err) {
      console.error("Failed to update country:", err);
      setActiveMap((prev) => ({ ...prev, [code]: !newValue })); // revert on failure
    }
    setSavingCode(null);
  };

  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = Object.values(activeMap).filter(Boolean).length;

  if (loading) return <p style={{ padding: 30, textAlign: "center", color: "#888" }}>Loading...</p>;

  return (
    <div style={s.page}>

      <div style={{ padding: 16, paddingBottom: 60 }}>
        <p style={s.helper}>
          Only <b>Active</b> countries appear in the Country dropdown when buyers, sellers, or agents
          register. Turning a country off only stops <b>new</b> sign-ups from it — anyone already
          registered from that country keeps working normally.
        </p>

        <input
          className="input-field"
          style={{ marginBottom: 14 }}
          placeholder="Search countries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div style={s.list}>
          {filtered.map((c) => {
            const isActive = !!activeMap[c.code];
            return (
              <div key={c.code} style={s.row}>
                <div>
                  <div style={s.countryName}>{c.name}</div>
                  <div style={s.countryCurrency}>{c.currency}</div>
                </div>
                <div
                  style={{ ...s.toggle, ...(isActive ? s.toggleOn : s.toggleOff) }}
                  onClick={() => savingCode !== c.code && toggleCountry(c.code)}
                >
                  <div style={{ ...s.toggleDot, ...(isActive ? s.toggleDotOn : {}) }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "var(--color-bg)" },
  header: { background: "#0B3D2E", padding: "18px 16px" },
  headerTitle: { color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700 },
  headerSub: { color: "#D4AF37", fontSize: 12, fontWeight: 600, marginTop: 4 },
  helper: { fontSize: 12, color: "#888", lineHeight: 1.6, marginBottom: 16 },
  list: { background: "#fff", border: "1px solid #eee0c0", borderRadius: 14, overflow: "hidden" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f0f0f0" },
  countryName: { fontSize: 13.5, fontWeight: 600, color: "#1a1a1a" },
  countryCurrency: { fontSize: 10.5, color: "#888", fontWeight: 600, marginTop: 2 },
  toggle: { width: 42, height: 24, borderRadius: 12, cursor: "pointer", position: "relative", transition: "background 0.2s ease", flexShrink: 0 },
  toggleOn: { background: "#0B3D2E" },
  toggleOff: { background: "#ddd" },
  toggleDot: { width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: 3, transition: "left 0.2s ease" },
  toggleDotOn: { left: 21 }
};
