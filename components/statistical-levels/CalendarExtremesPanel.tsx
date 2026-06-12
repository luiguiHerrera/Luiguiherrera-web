import type { AssetStatRecord, StatisticalFrequency } from "@/lib/statistical-levels/types";

type CalendarExtremesPanelProps = {
  asset: AssetStatRecord | null;
  frequency: StatisticalFrequency;
};

function formatPercent(value: number | null) {
  if (value === null) return "n/d";
  return `${(value * 100).toFixed(1)}%`;
}

export function CalendarExtremesPanel({ asset, frequency }: CalendarExtremesPanelProps) {
  const data = asset?.frequencies[frequency];
  const maxCount = Math.max(...(data?.calendarExtremes.flatMap((item) => [item.highs, item.lows]) ?? [1]), 1);
  return (
    <section className="border border-line bg-panel p-5 md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Tops & Bottoms adaptado</p>
      <h2 className="mt-2 text-2xl font-semibold text-ink">Extremos por calendario</h2>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-3">
          {(data?.calendarExtremes ?? []).map((item) => (
            <div key={item.label} className="grid grid-cols-[4.5rem_1fr] items-center gap-3">
              <span className="text-sm font-semibold text-ink">{item.label}</span>
              <div className="grid gap-1">
                <div className="h-2 bg-panelSoft"><div className="h-2 bg-[#6f8f7b]" style={{ width: `${(item.highs / maxCount) * 100}%` }} /></div>
                <div className="h-2 bg-panelSoft"><div className="h-2 bg-[#a86464]" style={{ width: `${(item.lows / maxCount) * 100}%` }} /></div>
              </div>
            </div>
          ))}
        </div>
        <div className="border border-line bg-panelSoft p-4">
          <p className="text-sm font-semibold text-ink">New high / new low</p>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p>Ventana: {data?.newHighLow.lookback ?? "n/d"} periodos</p>
            <p>Nuevos máximos: <span className="font-semibold text-ink">{data?.newHighLow.newHighCount ?? "n/d"}</span> · {formatPercent(data?.newHighLow.newHighRate ?? null)}</p>
            <p>Nuevos mínimos: <span className="font-semibold text-ink">{data?.newHighLow.newLowCount ?? "n/d"}</span> · {formatPercent(data?.newHighLow.newLowRate ?? null)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
