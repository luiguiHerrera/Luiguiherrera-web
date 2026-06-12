import type { AssetStatRecord, StatisticalFrequency } from "@/lib/statistical-levels/types";

type CalendarExtremesPanelProps = {
  asset: AssetStatRecord | null;
  frequency: StatisticalFrequency;
};

function formatPercent(value: number | null) {
  if (value === null) return "n/d";
  return `${(value * 100).toFixed(1)}%`;
}

function formatPp(value: number | null) {
  if (value === null) return "n/d";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;
}

function reading(balance: number | null) {
  if (balance === null) return "Historial insuficiente";
  if (balance > 0.05) return "Mayor presencia de máximos";
  if (balance < -0.05) return "Mayor presencia de mínimos";
  return "Balance mixto";
}

export function CalendarExtremesPanel({ asset, frequency }: CalendarExtremesPanelProps) {
  const data = asset?.frequencies[frequency];
  const rows =
    data?.calendarExtremes.map((item) => {
      const highRate = item.periods ? item.highs / item.periods : null;
      const lowRate = item.periods ? item.lows / item.periods : null;
      const balance = highRate === null || lowRate === null ? null : highRate - lowRate;
      return { ...item, highRate, lowRate, balance };
    }) ?? [];

  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Calendario</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Extremos por calendario</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-muted">
          Frecuencia histórica de nuevos máximos y nuevos mínimos dentro de la ventana seleccionada.
        </p>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_17rem]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-3 pr-4 font-medium">Calendario</th>
                <th className="py-3 pr-4 font-medium">% nuevos máximos</th>
                <th className="py-3 pr-4 font-medium">% nuevos mínimos</th>
                <th className="py-3 pr-4 font-medium">Balance</th>
                <th className="py-3 pr-4 font-medium">Lectura</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.label} className="border-b border-line/70">
                  <td className="py-3 pr-4 font-semibold text-ink">{item.label}</td>
                  <td className="py-3 pr-4">
                    <CompactBar value={item.highRate} color="#6f8f7b" />
                  </td>
                  <td className="py-3 pr-4">
                    <CompactBar value={item.lowRate} color="#a86464" />
                  </td>
                  <td className="py-3 pr-4 font-semibold text-ink">{formatPp(item.balance)}</td>
                  <td className="py-3 pr-4 text-muted">{reading(item.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border border-line bg-panelSoft p-4">
          <p className="text-sm font-semibold text-ink">New high / new low</p>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p>Ventana: {data?.newHighLow.lookback ?? "n/d"} periodos</p>
            <p>Nuevos máximos: <span className="font-semibold text-ink">{data?.newHighLow.newHighCount ?? "n/d"}</span> · {formatPercent(data?.newHighLow.newHighRate ?? null)}</p>
            <p>Nuevos mínimos: <span className="font-semibold text-ink">{data?.newHighLow.newLowCount ?? "n/d"}</span> · {formatPercent(data?.newHighLow.newLowRate ?? null)}</p>
            <p className="text-xs leading-5">Conteo sobre ventanas históricas con datos disponibles para {asset?.ticker ?? "el activo seleccionado"}.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CompactBar({ value, color }: { value: number | null; color: string }) {
  const width = value === null ? 0 : Math.min(100, Math.max(0, value * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 bg-panelSoft">
        <div className="h-1.5" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
      <span className="w-12 text-xs font-semibold text-ink">{formatPercent(value)}</span>
    </div>
  );
}
