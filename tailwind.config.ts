import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#0EA5A4",
        "accent-hover": "#0D9494",
        background: "#F8FAFC",
        card: "#FFFFFF",
        "text-primary": "#0F172A",
        "text-secondary": "#64748B",
        border: "#E2E8F0",
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 12px rgba(0, 0, 0, 0.05)",
        "card-hover": "0 8px 20px rgba(0, 0, 0, 0.08)",
      },
      borderRadius: {
        card: "16px",
        button: "12px",
        input: "10px",
      },
    },
  },
  plugins: [],
};
export default config;