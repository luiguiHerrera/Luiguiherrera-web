type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  emphasis?: boolean;
};

export function MetricCard({ label, value, helper, emphasis = false }: MetricCardProps) {
  return (
    <div className={`rounded-[6px] border p-4 shadow-[0_10px_28px_rgba(11,52,54,0.035)] ${emphasis ? "border-petrol/30 bg-[#eef5f2]" : "border-line bg-panel"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold leading-none text-ink md:text-2xl">{value}</p>
      {helper ? <p className="mt-2 text-[13px] leading-6 text-muted">{helper}</p> : null}
    </div>
  );
}
