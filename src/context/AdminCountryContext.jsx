// ============================================
// UniMart - Admin Country Context
// The country dropdown lives in AdminLayout's topbar,
// but the actual data-fetching happens in each admin
// page (Wallets, Sellers, etc.) — this Context is how
// they share the selected country without prop-drilling
// through arbitrary `children`.
// ============================================

import { createContext, useContext, useState } from "react";

const AdminCountryContext = createContext({ country: "", setCountry: () => {} });

export function AdminCountryProvider({ children }) {
  const [country, setCountry] = useState(""); // intentionally no default — admin must pick one
  return (
    <AdminCountryContext.Provider value={{ country, setCountry }}>
      {children}
    </AdminCountryContext.Provider>
  );
}

export function useAdminCountry() {
  return useContext(AdminCountryContext);
}
