import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14161a",
        paper: "#fdfcf9",
        panel: "#ffffff",
        panelSoft: "#f8f6f1",
        line: "#e9e4dc",
        muted: "#656a70",
        petrol: "#4d666d",
        sage: "#6f8f7b",
        brass: "#74624b",
        danger: "#a86464",
      },
      boxShadow: {
        quiet: "0 18px 55px rgba(28, 28, 26, 0.055)",
      },
    },
  },
  plugins: [],
};

export default config;
