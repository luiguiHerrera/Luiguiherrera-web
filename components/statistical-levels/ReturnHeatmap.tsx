import { ExpandableInsightCard } from "@/components/ui/ExpandableInsightCard";
import type { AssetStatRecord, PeriodExplorerRow, StatisticalFrequency } from "@/lib/statistical-levels/types";

type ReturnHeatmapProps = {
  asset: AssetStatRecord | null;
  frequency: StatisticalFrequency;
  locale?: "es" | "en";
};

type HeatmapPoint = {
  date: string;
  label: string;
  value: number | null;
};

const monthLabels = {
  es: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
const weekdayLabels = {
  es: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

function formatPercent(value: number | null, digits = 1) {
  if (value === null) return "n/d";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`;
}

function formatRate(value: number | null) {
  if (value === null) return "n/d";
  return `${(value * 100).toFixed(0)}%`;
}

function percentile(values: number[], point: number) {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length) return null;
  const index = (clean.length - 1) * point;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return clean[lower];
  return clean[lower] + (clean[upper] - clean[lower]) * (index - lower);
}

function maxAbsForScale(points: HeatmapPoint[]) {
  const magnitudes = points.map((point) => Math.abs(point.value ?? 0)).filter((value) => value > 0);
  if (!magnitudes.length) return 0.01;
  const p95 = magnitudes.length >= 20 ? percentile(magnitudes, 0.95) : Math.max(...magnitudes);
  return Math.max(p95 ?? 0.01, 0.01);
}

function color(value: number | null, maxAbs: number) {
  if (value === null) return "#f3f0eb";
  const intensity = Math.min(Math.abs(value) / maxAbs, 1);
  if (Math.abs(value) < maxAbs * 0.08) return "#e8e3dc";
  if (value > 0) return `rgba(111, 143, 123, ${0.22 + intensity * 0.58})`;
  return `rgba(168, 100, 100, ${0.22 + intensity * 0.58})`;
}

function textTone(value: number | null, maxAbs: number) {
  if (value === null) return "text-muted";
  return Math.abs(value) / maxAbs > 0.72 ? "text-white" : "text-ink";
}

function toPoints(rows: PeriodExplorerRow[]): HeatmapPoint[] {
  return rows
    .map((row) => ({
      date: row.periodEnd,
      label: row.period,
      value: row.change,
    }))
    .reverse();
}

function summarize(points: HeatmapPoint[]) {
  const values = points.map((point) => point.value).filter((value): value is number => Number.isFinite(value));
  const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const positiveRate = values.length ? values.filter((value) => value > 0).length / values.length : null;
  const highest = values.length ? Math.max(...values) : null;
  const lowest = values.length ? Math.min(...values) : null;
  return { count: values.length, avg, positiveRate, highest, lowest };
}

function dateFrom(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function weekdayIndex(dateString: string) {
  const day = dateFrom(dateString).getUTCDay();
  return day === 0 ? 6 : day - 1;
}

function weekKey(dateString: string) {
  const date = dateFrom(dateString);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function SummaryStrip({ locale, points }: { locale: "es" | "en"; points: HeatmapPoint[] }) {
  const summary = summarize(points);
  const copy = locale === "en"
    ? { periods: "Visible periods", average: "Average return", positive: "% positive", highest: "Highest return", lowest: "Lowest return" }
    : { periods: "Periodos visibles", average: "Retorno medio", positive: "% positivos", highest: "Mayor retorno", lowest: "Menor retorno" };
  return (
    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-5">
      <SummaryItem label={copy.periods} value={String(summary.count)} />
      <SummaryItem label={copy.average} value={formatPercent(summary.avg)} />
      <SummaryItem label={copy.positive} value={formatRate(summary.positiveRate)} />
      <SummaryItem label={copy.highest} value={formatPercent(summary.highest)} />
      <SummaryItem label={copy.lowest} value={formatPercent(summary.lowest)} />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-panelSoft px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function Legend({ locale, maxAbs }: { locale: "es" | "en"; maxAbs: number }) {
  const labels = locale === "en" ? ["Negative", "Neutral", "Positive"] : ["Negativo", "Neutro", "Positivo"];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
      <span>{labels[0]}</span>
      <div className="flex items-center gap-1">
        {[-1, -0.55, -0.12, 0, 0.12, 0.55, 1].map((value) => (
          <span key={value} className="h-3 w-7 border border-white" style={{ backgroundColor: color(value * maxAbs, maxAbs) }} />
        ))}
      </div>
      <span>{labels[1]}</span>
      <span>{labels[2]}</span>
    </div>
  );
}

function EmptyState({ locale }: { locale: "es" | "en" }) {
  return (
    <div className="mt-5 border border-line bg-panelSoft p-4 text-sm leading-6 text-muted">
      {locale === "en" ? "Not enough history to build the return map for this frequency." : "Historial insuficiente para construir el mapa de retornos en esta frecuencia."}
    </div>
  );
}

function MonthlyHeatmap({ locale, points, maxAbs }: { locale: "es" | "en"; points: HeatmapPoint[]; maxAbs: number }) {
  if (points.length < 12) return <EmptyState locale={locale} />;
  const byMonth = new Map(points.map((point) => [point.label.slice(0, 7), point]));
  const years = Array.from(new Set(points.map((point) => point.label.slice(0, 4)))).sort().reverse();
  const labels = monthLabels[locale];

  return (
    <div className="mt-5 max-w-full overflow-x-auto [contain:paint]">
      <div className="grid min-w-[760px] gap-1" style={{ gridTemplateColumns: "4.5rem repeat(12, minmax(3.2rem, 1fr))" }}>
        <div />
        {labels.map((month) => <div key={month} className="pb-1 text-center text-xs font-semibold text-muted">{month}</div>)}
        {years.map((year) => (
          <div key={year} className="contents">
            <div className="py-2 text-sm font-semibold text-ink">{year}</div>
            {labels.map((_, monthIndex) => {
              const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
              const point = byMonth.get(key);
              return <HeatmapCell key={key} point={point} maxAbs={maxAbs} className="min-h-11" showValue />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyHeatmap({ locale, points, maxAbs }: { locale: "es" | "en"; points: HeatmapPoint[]; maxAbs: number }) {
  if (points.length < 13) return <EmptyState locale={locale} />;
  const visible = points.slice(-52);
  const blocks: HeatmapPoint[][] = [];
  for (let index = 0; index < visible.length; index += 13) blocks.push(visible.slice(index, index + 13));
  const labels = locale === "en" ? ["Start", "+3 weeks", "+6 weeks", "+9 weeks", "Current"] : ["Inicio", "+3 semanas", "+6 semanas", "+9 semanas", "Actual"];
  const blockLabels = locale === "en" ? ["52-40 weeks ago", "39-27 weeks ago", "26-14 weeks ago", "Last 13 weeks"] : ["52-40 semanas atrás", "39-27 semanas atrás", "26-14 semanas atrás", "Últimas 13 semanas"];

  return (
    <div className="mt-5 max-w-full overflow-x-auto [contain:paint]">
      <div className="min-w-[760px]">
        <div className="grid gap-1 text-xs font-semibold text-muted" style={{ gridTemplateColumns: "7.5rem repeat(13, minmax(2.7rem, 1fr))" }}>
          <div />
          {Array.from({ length: 13 }).map((_, index) => (
            <div key={index} className="text-center">{index === 0 ? labels[0] : index === 3 ? labels[1] : index === 6 ? labels[2] : index === 9 ? labels[3] : index === 12 ? labels[4] : ""}</div>
          ))}
          {blocks.map((block, blockIndex) => (
            <div key={blockIndex} className="contents">
              <div className="py-2 text-sm font-semibold text-ink">{blockLabels[blockIndex] ?? `-${blocks.length - blockIndex - 1} bloques`}</div>
              {Array.from({ length: 13 }).map((_, index) => {
                const point = block[index];
                return <HeatmapCell key={`${blockIndex}-${index}`} point={point} maxAbs={maxAbs} className="min-h-9" showValue />;
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DailyHeatmap({ locale, points, maxAbs }: { locale: "es" | "en"; points: HeatmapPoint[]; maxAbs: number }) {
  if (points.length < 10) return <EmptyState locale={locale} />;
  const visible = points.slice(-90);
  const hasWeekend = visible.some((point) => weekdayIndex(point.date) > 4);
  const columns = hasWeekend ? weekdayLabels[locale] : weekdayLabels[locale].slice(0, 5);
  const weeks = new Map<string, Array<HeatmapPoint | null>>();
  for (const point of visible) {
    const key = weekKey(point.date);
    if (!weeks.has(key)) weeks.set(key, Array.from({ length: columns.length }, () => null));
    const index = weekdayIndex(point.date);
    if (index < columns.length) weeks.get(key)![index] = point;
  }
  const entries = Array.from(weeks.entries());

  return (
    <div className="mt-5 max-w-full overflow-x-auto [contain:paint]">
      <div className="min-w-[620px]">
        <div className="grid gap-1 text-xs font-semibold text-muted" style={{ gridTemplateColumns: `5.5rem repeat(${columns.length}, minmax(3.2rem, 1fr))` }}>
          <div />
          {columns.map((day) => <div key={day} className="text-center">{day}</div>)}
          {entries.map(([week, row]) => (
            <div key={week} className="contents">
              <div className="py-2 text-xs font-semibold text-ink">{week}</div>
              {row.map((point, index) => <HeatmapCell key={`${week}-${index}`} point={point ?? undefined} maxAbs={maxAbs} className="min-h-9" showValue />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeatmapCell({
  point,
  maxAbs,
  className = "",
  showValue = false,
}: {
  point?: HeatmapPoint;
  maxAbs: number;
  className?: string;
  showValue?: boolean;
}) {
  if (!point) return <div className={`${className} border border-white bg-panelSoft`} aria-hidden="true" />;
  return (
    <div
      title={`${point.date} · ${formatPercent(point.value, 2)}`}
      aria-label={`${point.date} · ${formatPercent(point.value, 2)}`}
      className={`${className} flex items-center justify-center border border-white px-1 text-[11px] font-semibold ${textTone(point.value, maxAbs)}`}
      style={{ backgroundColor: color(point.value, maxAbs) }}
    >
      <span className={showValue ? "hidden md:inline" : "sr-only"}>{formatPercent(point.value)}</span>
    </div>
  );
}

const titles: Record<StatisticalFrequency, { title: string; subtitle: string; limit: number; unit: string }> = {
  monthly: {
    title: "Historial reciente de retornos",
    subtitle: "Muestra los últimos meses visibles en grupos temporales para revisar continuidad y dispersión reciente.",
    limit: 120,
    unit: "Mensual",
  },
  weekly: {
    title: "Historial reciente de retornos",
    subtitle: "Muestra los últimos periodos visibles en grupos temporales para revisar continuidad y dispersión reciente.",
    limit: 52,
    unit: "Semanal",
  },
  daily: {
    title: "Historial reciente de retornos",
    subtitle: "Muestra los últimos días visibles en grupos temporales para revisar continuidad y dispersión reciente.",
    limit: 90,
    unit: "Diario",
  },
};

export function ReturnHeatmap({ asset, frequency, locale = "es" }: ReturnHeatmapProps) {
  const rows = asset?.frequencies[frequency].recentPeriods ?? [];
  const config = titles[frequency];
  const points = toPoints(rows).slice(-config.limit);
  const maxAbs = maxAbsForScale(points);
  const copy = locale === "en"
    ? {
        eyebrow: "Technical context",
        frequency: "Frequency",
        visiblePeriods: "Visible periods",
        averageReturn: "Average return",
        positive: "% positive",
        footer: "Diverging scale centered on 0; intensity is capped at the 95th percentile of visible magnitudes to reduce the weight of outliers.",
      }
    : {
        eyebrow: "Contexto técnico",
        frequency: "Frecuencia",
        visiblePeriods: "Periodos visibles",
        averageReturn: "Retorno medio",
        positive: "% positivos",
        footer: "Escala divergente centrada en 0; la intensidad se limita con el percentil 95 de magnitudes visibles para reducir el peso de valores extremos.",
      };
  const localizedTitles = locale === "en"
    ? {
        monthly: { title: "Recent return history", subtitle: "Shows the latest visible months in time groups to review recent continuity and dispersion.", unit: "Monthly" },
        weekly: { title: "Recent return history", subtitle: "Shows the latest visible periods in time groups to review recent continuity and dispersion.", unit: "Weekly" },
        daily: { title: "Recent return history", subtitle: "Shows the latest visible days in time groups to review recent continuity and dispersion.", unit: "Daily" },
      }
    : titles;

  return (
    <ExpandableInsightCard
      eyebrow={copy.eyebrow}
      title={localizedTitles[frequency].title}
      reading={localizedTitles[frequency].subtitle}
      status={asset?.ticker ?? "n/d"}
      defaultOpen={false}
      metrics={[
        { label: copy.frequency, value: localizedTitles[frequency].unit },
        { label: copy.visiblePeriods, value: String(points.length) },
        { label: copy.averageReturn, value: formatPercent(summarize(points).avg) },
        { label: copy.positive, value: formatRate(summarize(points).positiveRate) },
      ]}
    >
      {points.length ? <SummaryStrip locale={locale} points={points} /> : null}
      <Legend locale={locale} maxAbs={maxAbs} />
      {frequency === "monthly" ? <MonthlyHeatmap locale={locale} points={points} maxAbs={maxAbs} /> : null}
      {frequency === "weekly" ? <WeeklyHeatmap locale={locale} points={points} maxAbs={maxAbs} /> : null}
      {frequency === "daily" ? <DailyHeatmap locale={locale} points={points} maxAbs={maxAbs} /> : null}
      <p className="mt-3 text-xs leading-5 text-muted">
        {copy.footer}
      </p>
    </ExpandableInsightCard>
  );
}
