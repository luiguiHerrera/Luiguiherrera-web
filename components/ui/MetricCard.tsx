type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
};

export function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      {helper ? <p className="mt-2 text-sm leading-6 text-muted">{helper}</p> : null}
    </div>
  );
}
