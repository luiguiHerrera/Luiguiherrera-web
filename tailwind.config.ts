import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        institutional: "var(--color-institutional)",
        ink: "var(--color-ink)",
        paper: "var(--color-paper)",
        panel: "#ffffff",
        panelSoft: "var(--color-soft)",
        line: "var(--color-line)",
        muted: "var(--color-muted)",
        petrol: "var(--color-institutional)",
        sage: "var(--color-signal)",
        brass: "var(--color-brass)",
        danger: "var(--color-risk)",
      },
      boxShadow: {
        quiet: "0 18px 55px rgba(11, 52, 54, 0.07)",
      },
    },
  },
  plugins: [],
};

export default config;
