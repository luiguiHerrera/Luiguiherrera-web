type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  emphasis?: boolean;
};

export function MetricCard({ label, value, helper, emphasis = false }: MetricCardProps) {
  return (
    <div className={`border p-5 ${emphasis ? "border-petrol/45 bg-[#eef3f2]" : "border-line bg-panel"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold leading-none text-ink md:text-3xl">{value}</p>
      {helper ? <p className="mt-2 text-sm leading-6 text-muted">{helper}</p> : null}
    </div>
  );
}
