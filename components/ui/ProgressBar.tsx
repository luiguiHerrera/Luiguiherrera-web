export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden border border-line bg-panelSoft">
      <div className="h-full bg-ink transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
