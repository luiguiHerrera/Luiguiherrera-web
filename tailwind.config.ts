import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07100f",
        panel: "#101a18",
        panelSoft: "#14211f",
        line: "#263532",
        muted: "#93a39d",
        petrol: "#2f7f7a",
        sage: "#9dbb9b",
        brass: "#c7a35a",
        danger: "#d56b63",
      },
      boxShadow: {
        quiet: "0 18px 60px rgba(0, 0, 0, 0.24)",
      },
    },
  },
  plugins: [],
};

export default config;
