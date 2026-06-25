export function RiskPill({ label, tone = "neutral" }: { label: string; tone?: "low" | "medium" | "high" | "neutral" }) {
  const tones = {
    low: "border-sage/30 bg-[#eef5f1] text-[#3f5f52]",
    medium: "border-brass/30 bg-[#f7f0e2] text-brass",
    high: "border-danger/25 bg-[#f4e9e6] text-danger",
    neutral: "border-line bg-panel text-muted",
  };

  return <span className={`inline-flex rounded-[4px] border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{label}</span>;
}
