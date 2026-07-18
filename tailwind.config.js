/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand (Rausch)
        rausch: {
          DEFAULT: "#ff385c",
          active: "#e00b41",
          disabled: "#ffd1da",
        },
        // Sub-brand accents (used only in specialized sub-contexts)
        luxe: "#460479",
        plus: "#92174d",
        // Canvas / surfaces
        canvas: "#ffffff",
        "surface-soft": "#f7f7f7",
        "surface-strong": "#f2f2f2",
        // Hairlines
        hairline: "#dddddd",
        "hairline-soft": "#ebebeb",
        // Text
        ink: "#222222",
        body: "#3f3f3f",
        muted: "#6a6a6a",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["28px", { lineHeight: "1.43", fontWeight: "700" }],
        "display-lg": ["22px", { lineHeight: "1.18", fontWeight: "500" }],
        "display-md": ["21px", { lineHeight: "1.43", fontWeight: "700" }],
        "title-md": ["16px", { fontWeight: "600" }],
        "title-sm": ["16px", { fontWeight: "500" }],
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.43", fontWeight: "400" }],
        "rating-display": ["64px", { fontWeight: "700" }],
        "uppercase-tag": ["8px", { fontWeight: "700", letterSpacing: "0.32px" }],
      },
      borderRadius: {
        btn: "8px",
        card: "14px",
        category: "1.5rem", // 24px -> rounded-3xl equivalent slot
      },
      boxShadow: {
        elevation: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px",
      },
      height: {
        "nav": "80px",
        "search-pill": "64px",
      },
    },
  },
  plugins: [],
}
