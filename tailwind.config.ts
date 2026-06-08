import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111317",
        paper: "#fbfaf7",
        panel: "#ffffff",
        panelSoft: "#f4f2ed",
        line: "#dedbd2",
        muted: "#686c70",
        petrol: "#4f6870",
        sage: "#6f8f80",
        brass: "#75634c",
        danger: "#b94743",
      },
      boxShadow: {
        quiet: "0 18px 50px rgba(26, 28, 31, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
