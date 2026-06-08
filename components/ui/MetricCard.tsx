type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  emphasis?: boolean;
};

export function MetricCard({ label, value, helper, emphasis = false }: MetricCardProps) {
  return (
    <div className={`rounded-lg border p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ${emphasis ? "border-petrol/60 bg-petrol/12" : "border-line bg-panelSoft/75"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold leading-none text-white md:text-3xl">{value}</p>
      {helper ? <p className="mt-2 text-sm leading-6 text-muted">{helper}</p> : null}
    </div>
  );
}
