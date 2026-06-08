export function RiskPill({ label, tone = "neutral" }: { label: string; tone?: "low" | "medium" | "high" | "neutral" }) {
  const tones = {
    low: "border-sage/40 bg-sage/10 text-sage",
    medium: "border-brass/40 bg-brass/10 text-brass",
    high: "border-danger/40 bg-danger/10 text-danger",
    neutral: "border-line bg-panelSoft text-muted",
  };

  return <span className={`inline-flex rounded-full border px-3 py-1 text-sm ${tones[tone]}`}>{label}</span>;
}
