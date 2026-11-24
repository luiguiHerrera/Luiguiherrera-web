export type FlowWindowMetric = {
  id: string;
  label: string;
  value: string;
  valueClassName: string;
  detail?: string;
};

export function FlowWindowMetrics({ asset, title, metrics }: { asset: "btc" | "gld"; title: string; metrics: FlowWindowMetric[] }) {
  return (
    <section className="mt-5" data-flow-windows>
      <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{title}</h4>
      <div className="mt-3 grid border-y border-line sm:grid-cols-3" data-flow-window-metrics data-btc-primary-metrics={asset === "btc" || undefined} data-gld-primary-metrics={asset === "gld" || undefined}>
        {metrics.map(metric => (
          <div key={metric.id} className="min-w-0 border-b border-line px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-l sm:first:border-l-0" data-flow-window={metric.id} data-btc-primary-metric={asset === "btc" ? metric.id : undefined}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{metric.label}</p>
            <p className={`mt-2 break-words font-medium tabular-nums ${metric.valueClassName}`}>{metric.value}</p>
            {metric.detail ? <p className="mt-2 text-xs leading-5 text-muted" data-flow-window-detail>{metric.detail}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
