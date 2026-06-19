import type { AssetStatRecord, StatisticalFrequency } from "@/lib/statistical-levels/types";

type CalendarExtremesPanelProps = {
  asset: AssetStatRecord | null;
  frequency: StatisticalFrequency;
  locale?: "es" | "en";
};

function formatPercent(value: number | null) {
  if (value === null) return "n/d";
  return `${(value * 100).toFixed(1)}%`;
}

function formatPp(value: number | null) {
  if (value === null) return "n/d";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;
}

function reading(balance: number | null, locale: "es" | "en") {
  if (balance === null) return locale === "en" ? "Not enough history" : "Historial insuficiente";
  if (balance > 0.05) return locale === "en" ? "More frequent highs" : "Mayor presencia de máximos";
  if (balance < -0.05) return locale === "en" ? "More frequent lows" : "Mayor presencia de mínimos";
  return locale === "en" ? "Mixed balance" : "Balance mixto";
}

function formatCalendarLabel(label: string, frequency: StatisticalFrequency, locale: "es" | "en") {
  if (frequency !== "weekly") return label;

  const weekRanges: Record<string, string> = {
    "Semana 1": "01-07",
    "Semana 2": "08-14",
    "Semana 3": "15-21",
    "Semana 4": "22-28",
    "Semana 5": "29-31",
  };

  return weekRanges[label] ?? (locale === "en" ? label.replace("Semana", "Week") : label);
}

function calendarHeader(frequency: StatisticalFrequency, locale: "es" | "en") {
  if (frequency === "weekly") return locale === "en" ? "Days of month" : "Días del mes";
  if (frequency === "monthly") return locale === "en" ? "Month" : "Mes";
  return locale === "en" ? "Day" : "Día";
}

export function CalendarExtremesPanel({ asset, frequency, locale = "es" }: CalendarExtremesPanelProps) {
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
          <h2 className="mt-1 text-xl font-semibold text-ink">{locale === "en" ? "Calendar extremes" : "Extremos por calendario"}</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-muted">
          {locale === "en"
            ? "Historical frequency of new highs and new lows inside the selected window."
            : "Frecuencia histórica de nuevos máximos y nuevos mínimos dentro de la ventana seleccionada."}
        </p>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_17rem]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left text-[13px]">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-2.5 pr-4 font-medium">{calendarHeader(frequency, locale)}</th>
                <th className="py-2.5 pr-4 font-medium">{locale === "en" ? "% new highs" : "% nuevos máximos"}</th>
                <th className="py-2.5 pr-4 font-medium">{locale === "en" ? "% new lows" : "% nuevos mínimos"}</th>
                <th className="py-2.5 pr-4 font-medium">Balance</th>
                <th className="py-2.5 pr-4 font-medium">{locale === "en" ? "Reading" : "Lectura"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.label} className="border-b border-line/70">
                  <td className="py-3 pr-4 font-semibold text-ink">{formatCalendarLabel(item.label, frequency, locale)}</td>
                  <td className="py-3 pr-4">
                    <CompactBar value={item.highRate} color="#6f8f7b" />
                  </td>
                  <td className="py-3 pr-4">
                    <CompactBar value={item.lowRate} color="#a86464" />
                  </td>
                  <td className="py-3 pr-4 font-semibold text-ink">{formatPp(item.balance)}</td>
                  <td className="py-3 pr-4 text-muted">{reading(item.balance, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border border-line bg-panelSoft p-4">
          <p className="text-sm font-semibold text-ink">New high / new low</p>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p>{locale === "en" ? "Window" : "Ventana"}: {data?.newHighLow.lookback ?? "n/d"} {locale === "en" ? "periods" : "periodos"}</p>
            <p>{locale === "en" ? "New highs" : "Nuevos máximos"}: <span className="font-semibold text-ink">{data?.newHighLow.newHighCount ?? "n/d"}</span> · {formatPercent(data?.newHighLow.newHighRate ?? null)}</p>
            <p>{locale === "en" ? "New lows" : "Nuevos mínimos"}: <span className="font-semibold text-ink">{data?.newHighLow.newLowCount ?? "n/d"}</span> · {formatPercent(data?.newHighLow.newLowRate ?? null)}</p>
            <p className="text-xs leading-5">{locale === "en" ? `Count across historical windows with available data for ${asset?.ticker ?? "the selected asset"}.` : `Conteo sobre ventanas históricas con datos disponibles para ${asset?.ticker ?? "el activo seleccionado"}.`}</p>
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
