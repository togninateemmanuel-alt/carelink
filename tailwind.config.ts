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
        primary: {
          DEFAULT: "#0B5ED7",
          dark: "#0A4BB8",
          light: "#E8F0FE",
        },
        success: {
          DEFAULT: "#198754",
          light: "#D1E7DD",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FEF3C7",
        },
        danger: {
          DEFAULT: "#DC3545",
          light: "#FEE2E2",
        },
        background: "#F4F7FB",
        surface: "#FFFFFF",
        text: {
          primary: "#1E293B",
          secondary: "#64748B",
          muted: "#94A3B8",
        },
        border: "#E2E8F0",
      },
      borderRadius: {
        card: "14px",
        button: "10px",
        input: "10px",
      },
      boxShadow: {
        card: "0 4px 16px rgba(0, 0, 0, 0.06)",
        soft: "0 2px 8px rgba(0, 0, 0, 0.04)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
