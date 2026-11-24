type PercentileRangeBarProps = {
  label: string;
  value: number | null;
  quartiles?: boolean;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function PercentileRangeBar({ label, value, quartiles = false }: PercentileRangeBarProps) {
  const position = value === null || !Number.isFinite(value) ? null : clamp(value);
  return (
    <div className="sl-percentile-range">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
        <span className="sl-percentile-reading font-semibold text-ink">{position === null ? "n/d" : `P${position.toFixed(1)}`}</span>
      </div>
      <div className="sl-percentile-track" role="img" aria-label={`${label}: ${position === null ? 'n/d' : `P${position.toFixed(1)}`}`}>
        <div className="sl-percentile-bands" aria-hidden="true">
          <div className="absolute inset-y-0 left-0 bg-[#e4dece]" style={{ width: "10%" }} />
          <div className="absolute inset-y-0 left-[10%] bg-[#e9e4d9]" style={{ width: "20%" }} />
          <div className="absolute inset-y-0 left-[30%] bg-[#f0eee7]" style={{ width: "40%" }} />
          <div className="absolute inset-y-0 left-[70%] bg-[#d7dfd9]" style={{ width: "20%" }} />
          <div className="absolute inset-y-0 left-[90%] bg-[#c5d2cd]" style={{ width: "10%" }} />
        </div>
        {position !== null ? (
          <span className="sl-percentile-current" style={{ left: `${position}%` }} aria-hidden="true"><span /></span>
        ) : null}
      </div>
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-[0.08em] text-muted">
        {(quartiles ? [0, 25, 50, 75, 100] : [0, 50, 100]).map(tick => <span key={tick}>{tick}</span>)}
      </div>
    </div>
  );
}
