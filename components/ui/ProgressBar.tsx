export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1 w-full overflow-hidden bg-line/70">
      <div className="h-full bg-ink transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
