import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-main)", "Tahoma", "Arial", "sans-serif"],
        display: ["var(--font-display)", "Tahoma", "Arial", "sans-serif"]
      },
      colors: {
        ink: "#090909",
        graphite: "#121212",
        gold: "#c99a42",
        champagne: "#f7efe4",
        ivory: "#fffaf3",
        mist: "#f3eee9",
        muted: "#8a8178"
      },
      boxShadow: {
        luxury: "0 24px 80px rgba(0,0,0,.18)"
      }
    }
  },
  plugins: []
};

export default config;
