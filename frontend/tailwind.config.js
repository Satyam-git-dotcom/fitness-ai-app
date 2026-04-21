/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#10b981", // Emerald-500
          light: "#34d399",
          dark: "#059669",
        },
        zinc: {
          950: "#09090b",
        },
      },
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};