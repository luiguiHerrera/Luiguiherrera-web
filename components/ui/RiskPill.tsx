export function RiskPill({ label, tone = "neutral" }: { label: string; tone?: "low" | "medium" | "high" | "neutral" }) {
  const tones = {
    low: "border-sage/30 bg-[#f3f7f2] text-[#476b5a]",
    medium: "border-brass/30 bg-[#faf6ee] text-brass",
    high: "border-danger/25 bg-[#fbf2f1] text-danger",
    neutral: "border-line bg-panel text-muted",
  };

  return <span className={`inline-flex border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{label}</span>;
}
