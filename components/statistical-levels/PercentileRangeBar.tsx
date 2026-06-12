type PercentileRangeBarProps = {
  label: string;
  value: number | null;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function PercentileRangeBar({ label, value }: PercentileRangeBarProps) {
  const position = value === null ? null : clamp(value);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
        <span className="font-semibold text-ink">{position === null ? "n/d" : `${position.toFixed(1)}%`}</span>
      </div>
      <div className="relative mt-2 h-2 overflow-hidden bg-panelSoft">
        <div className="absolute inset-y-0 left-0 bg-[#d9cfca]" style={{ width: "10%" }} />
        <div className="absolute inset-y-0 left-[10%] bg-[#e8e1dc]" style={{ width: "20%" }} />
        <div className="absolute inset-y-0 left-[30%] bg-[#eef0ec]" style={{ width: "40%" }} />
        <div className="absolute inset-y-0 left-[70%] bg-[#dfe8e2]" style={{ width: "20%" }} />
        <div className="absolute inset-y-0 left-[90%] bg-[#c9d8cf]" style={{ width: "10%" }} />
        {position !== null ? (
          <div className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-ink" style={{ left: `${position}%` }} />
        ) : null}
      </div>
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-[0.08em] text-muted">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}
