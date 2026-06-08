export function RiskPill({ label, tone = "neutral" }: { label: string; tone?: "low" | "medium" | "high" | "neutral" }) {
  const tones = {
    low: "border-sage/40 bg-[#eef4ef] text-[#476b5a]",
    medium: "border-brass/40 bg-[#f6f1e7] text-brass",
    high: "border-danger/35 bg-[#fbefef] text-danger",
    neutral: "border-line bg-panelSoft text-muted",
  };

  return <span className={`inline-flex border px-3 py-1 text-sm font-medium ${tones[tone]}`}>{label}</span>;
}
