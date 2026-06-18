"use client";

import { useMemo, useState } from "react";
import { ExpandableInsightCard } from "@/components/ui/ExpandableInsightCard";
import type {
  CalendarDaySeasonalityCell,
  CalendarMonthSeasonalityCell,
  CalendarWeekSeasonalityCell,
  DailySeasonalityData,
  PresidentialCyclePhase,
  SeasonalityWindow,
  StatisticalFrequency,
} from "@/lib/statistical-levels/types";

type SeasonalityMetric = "averageReturn" | "medianReturn" | "winRate" | "sampleSize";
type SeasonalityCell = CalendarMonthSeasonalityCell | CalendarWeekSeasonalityCell | CalendarDaySeasonalityCell;

type AdvancedSeasonalityPanelProps = {
  data: DailySeasonalityData | null;
  frequency: StatisticalFrequency;
  generatedAt: string;
  locale?: "es" | "en";
  ticker: string;
};

const windowOptions: SeasonalityWindow[] = ["3Y", "5Y", "10Y", "All"];
const spanishMetricOptions: Array<{ key: SeasonalityMetric; label: string }> = [
  { key: "averageReturn", label: "Promedio" },
  { key: "medianReturn", label: "Mediana" },
  { key: "winRate", label: "Win rate" },
  { key: "sampleSize", label: "N" },
];
const englishMetricOptions: Array<{ key: SeasonalityMetric; label: string }> = [
  { key: "averageReturn", label: "Average" },
  { key: "medianReturn", label: "Median" },
  { key: "winRate", label: "Win rate" },
  { key: "sampleSize", label: "N" },
];
const phaseOptions: Array<{ key: PresidentialCyclePhase; label: string }> = [
  { key: "all", label: "Off" },
  { key: "election", label: "Election" },
  { key: "post_election", label: "Post-election" },
  { key: "midterm", label: "Midterm" },
  { key: "pre_election", label: "Pre-election" },
];
const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const shortMonths = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const englishMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const englishShortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthFromGeneratedAt(generatedAt: string) {
  const parsed = new Date(`${generatedAt}T00:00:00Z`);
  const month = parsed.getUTCMonth() + 1;
  return Number.isFinite(month) && month >= 1 && month <= 12 ? month : 1;
}

function formatPercent(value: number | null, digits = 2) {
  if (value === null) return "n/d";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`;
}

function formatMetric(value: number | null, metric: SeasonalityMetric) {
  if (value === null) return "n/d";
  if (metric === "sampleSize") return String(Math.round(value));
  if (metric === "winRate") return `${(value * 100).toFixed(0)}%`;
  return formatPercent(value);
}

function metricValue(cell: SeasonalityCell | undefined, metric: SeasonalityMetric) {
  if (!cell) return null;
  return metric === "sampleSize" ? cell.sampleSize : cell[metric];
}

function average(values: Array<number | null>) {
  const clean = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function maxAbs(cells: SeasonalityCell[], metric: SeasonalityMetric) {
  const values = cells.map((cell) => Math.abs(metricValue(cell, metric) ?? 0)).filter((value) => value > 0);
  return Math.max(...values, metric === "sampleSize" ? 1 : 0.003);
}

function colorFor(value: number | null, metric: SeasonalityMetric, scale: number) {
  if (value === null) return "#f3f0eb";
  if (metric === "sampleSize") return "#d8d1c8";
  const centered = metric === "winRate" ? value - 0.5 : value;
  const intensity = Math.min(Math.abs(centered) / Math.max(metric === "winRate" ? 0.35 : scale, 0.001), 1);
  if (Math.abs(centered) < (metric === "winRate" ? 0.03 : scale * 0.08)) return "#e8e3dc";
  if (centered > 0) return `rgba(111, 143, 123, ${0.2 + intensity * 0.6})`;
  return `rgba(168, 100, 100, ${0.2 + intensity * 0.6})`;
}

function cellTitle(label: string, cell: SeasonalityCell | undefined, locale: "es" | "en") {
  if (!cell) return locale === "en" ? `${label} · no observations` : `${label} · sin muestra`;
  return `${label} · promedio ${formatPercent(cell.averageReturn)} · mediana ${formatPercent(cell.medianReturn)} · win rate ${formatMetric(cell.winRate, "winRate")} · N ${cell.sampleSize}`;
}

function cellKey(cell: SeasonalityCell) {
  if ("day" in cell) return `${cell.month}-${cell.day}`;
  if ("weekOfMonth" in cell) return `${cell.month}-${cell.weekOfMonth}`;
  return `${cell.month}`;
}

function bestAndWeakest(cells: SeasonalityCell[]) {
  const usable = cells.filter((cell) => cell.sampleSize > 0 && cell.averageReturn !== null);
  const sorted = [...usable].sort((a, b) => (b.averageReturn ?? -Infinity) - (a.averageReturn ?? -Infinity));
  return { best: sorted[0], weakest: sorted.at(-1) };
}

function labelForCell(cell: SeasonalityCell | undefined, locale: "es" | "en") {
  const months = locale === "en" ? englishMonthNames : monthNames;
  const short = locale === "en" ? englishShortMonths : shortMonths;
  if (!cell) return "n/d";
  if ("day" in cell) return `${cell.day} ${short[cell.month - 1]}`;
  if ("weekOfMonth" in cell) return `${short[cell.month - 1]} · ${locale === "en" ? "Week" : "Semana"} ${cell.weekOfMonth}`;
  return months[cell.month - 1];
}

export function AdvancedSeasonalityPanel({ data, frequency, generatedAt, locale = "es", ticker }: AdvancedSeasonalityPanelProps) {
  const [window, setWindow] = useState<SeasonalityWindow>("5Y");
  const [phase, setPhase] = useState<PresidentialCyclePhase>("all");
  const [metric, setMetric] = useState<SeasonalityMetric>("averageReturn");
  const [month, setMonth] = useState(monthFromGeneratedAt(generatedAt));
  const metricOptions = locale === "en" ? englishMetricOptions : spanishMetricOptions;
  const months = locale === "en" ? englishMonthNames : monthNames;
  const windowData = data?.windows[window] ?? (window === "All" ? data?.windows.Full : null);
  const dimension = frequency === "monthly" ? windowData?.monthly : frequency === "weekly" ? windowData?.weekly : windowData?.daily;
  const cells = useMemo(() => {
    if (!dimension) return [];
    return phase === "all" ? dimension.general : dimension.presidentialCycle[phase] ?? [];
  }, [dimension, phase]);
  const monthCells = cells.filter((cell) => cell.month === month && cell.sampleSize > 0);
  const { best, weakest } = bestAndWeakest(frequency === "daily" || frequency === "weekly" ? monthCells : cells);
  const sampleAverage = average(cells.map((cell) => cell.sampleSize));
  const copy = locale === "en"
    ? {
        eyebrow: frequency === "monthly" ? "Monthly seasonality" : frequency === "weekly" ? "Weekly seasonality" : "Daily seasonality",
        title: "Historical calendar patterns",
        reading: frequency === "monthly"
          ? "Historical patterns by calendar month for the selected asset."
          : frequency === "weekly"
            ? "Groups completed weeks inside the selected month. Use the Daily tab for calendar-day analysis."
            : "Daily calendar view using historical daily data; it does not include intraday behavior.",
        window: "Window",
        presidentialCycle: "Presidential cycle",
        metric: "Metric",
        averageN: "Average N",
        month: "Month",
        bestMonth: "Best month",
        weakMonth: "Weakest month",
        strongWeek: "Strongest week",
        weakWeek: "Weakest week",
        strongDay: "Strongest day",
        weakDay: "Weakest day",
        averageReturn: "Average return",
        averageWinRate: "Average win rate",
        lowSample: "Low sample",
        emptyWeekly: "Not enough observations for this window, cycle and month.",
        emptyGeneral: "Not enough history to build advanced seasonality for this asset.",
        methodology: "Completed weeks are grouped by weekly close date. Week 1 = days 1-7; Week 5 = days 29-31.",
        footer: "Average and median help separate historical tendency from outliers. Sample size matters: low N requires careful reading.",
        topStrong: "Top 5 strong",
        topWeak: "Top 5 weak",
        day: "Day",
        week: "Week",
      }
    : {
        eyebrow: frequency === "monthly" ? "Estacionalidad mensual" : frequency === "weekly" ? "Estacionalidad semanal" : "Estacionalidad diaria",
        title: "Patrones históricos por calendario",
        reading: frequency === "monthly"
          ? "Patrones históricos por mes calendario del activo seleccionado."
          : frequency === "weekly"
            ? "Agrupa semanas completadas dentro del mes seleccionado. Para lectura por día calendario usa la pestaña Diario."
            : "Lectura diaria por calendario. Usa días del mes y datos históricos diarios; no incluye comportamiento intradía.",
        window: "Ventana",
        presidentialCycle: "Ciclo presidencial",
        metric: "Métrica",
        averageN: "N promedio",
        month: "Mes",
        bestMonth: "Mejor mes",
        weakMonth: "Mes débil",
        strongWeek: "Semana fuerte",
        weakWeek: "Semana débil",
        strongDay: "Día fuerte",
        weakDay: "Día débil",
        averageReturn: "Retorno medio",
        averageWinRate: "Win rate medio",
        lowSample: "Muestra baja",
        emptyWeekly: "No hay muestra suficiente para esta combinación de ventana, ciclo y mes.",
        emptyGeneral: "Historial insuficiente para construir estacionalidad avanzada de este activo.",
        methodology: "Semanas agregadas por fecha de cierre semanal. Semana 1 = días 1-7 del mes; Semana 5 = días 29-31.",
        footer: "Promedio y mediana ayudan a separar tendencia histórica de valores extremos. La muestra importa: N bajo requiere lectura prudente.",
        topStrong: "Top 5 fuertes",
        topWeak: "Top 5 débiles",
        day: "Día",
        week: "Semana",
      };

  return (
    <ExpandableInsightCard
      eyebrow={copy.eyebrow}
      title={copy.title}
      reading={copy.reading}
      status={ticker}
      metrics={[
        { label: copy.window, value: window },
        { label: copy.presidentialCycle, value: phaseOptions.find((item) => item.key === phase)?.label ?? "Off" },
        { label: copy.metric, value: metricOptions.find((item) => item.key === metric)?.label ?? "Promedio" },
        { label: copy.averageN, value: sampleAverage === null ? "n/d" : sampleAverage.toFixed(0) },
      ]}
      summaryExtra={
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <Control label={copy.window} value={window} setValue={(value) => setWindow(value as SeasonalityWindow)} options={windowOptions.map((item) => [item, item])} />
          <Control label={copy.presidentialCycle} value={phase} setValue={(value) => setPhase(value as PresidentialCyclePhase)} options={phaseOptions.map((item) => [item.key, item.label])} />
          <Control label={copy.metric} value={metric} setValue={(value) => setMetric(value as SeasonalityMetric)} options={metricOptions.map((item) => [item.key, item.label])} />
          {frequency !== "monthly" ? (
            <Control label={copy.month} value={String(month)} setValue={(value) => setMonth(Number(value))} options={months.map((name, index) => [String(index + 1), name])} />
          ) : null}
        </div>
      }
    >
      {dimension ? (
        <div className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Summary label={frequency === "monthly" ? copy.bestMonth : frequency === "weekly" ? copy.strongWeek : copy.strongDay} cell={best} locale={locale} lowSampleLabel={copy.lowSample} />
            <Summary label={frequency === "monthly" ? copy.weakMonth : frequency === "weekly" ? copy.weakWeek : copy.weakDay} cell={weakest} locale={locale} lowSampleLabel={copy.lowSample} />
            <MetricBox label={copy.averageReturn} value={formatPercent(average(cells.map((cell) => cell.averageReturn)))} />
            <MetricBox label={copy.averageWinRate} value={formatMetric(average(cells.map((cell) => cell.winRate)), "winRate")} />
          </div>

          {frequency === "monthly" ? <MonthlyView cells={cells as CalendarMonthSeasonalityCell[]} locale={locale} metric={metric} /> : null}
          {frequency === "weekly" ? <WeeklyView cells={monthCells as CalendarWeekSeasonalityCell[]} copy={copy} locale={locale} metric={metric} month={month} monthNames={months} /> : null}
          {frequency === "daily" ? <DailyView cells={cells as CalendarDaySeasonalityCell[]} copy={copy} locale={locale} metric={metric} month={month} monthNames={months} /> : null}

          <p className="border-t border-line pt-4 text-xs leading-5 text-muted">
            {copy.footer}
          </p>
        </div>
      ) : (
        <div className="mt-5 border border-line bg-panelSoft p-4 text-sm leading-6 text-muted">
          {copy.emptyGeneral}
        </div>
      )}
    </ExpandableInsightCard>
  );
}

function Control({ label, options, setValue, value }: { label: string; options: string[][]; setValue: (value: string) => void; value: string }) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
      {label}
      <select
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="border border-line bg-panelSoft px-3 py-2 text-sm font-semibold normal-case tracking-normal text-ink outline-none transition focus:border-petrol"
      >
        {options.map(([key, optionLabel]) => <option key={key} value={key}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-panelSoft p-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 font-semibold text-ink">{value}</p>
    </div>
  );
}

function Summary({ cell, label, locale, lowSampleLabel }: { cell: SeasonalityCell | undefined; label: string; locale: "es" | "en"; lowSampleLabel: string }) {
  return (
    <div className="border border-line bg-panelSoft p-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 font-semibold text-ink">{labelForCell(cell, locale)}</p>
      <p className="mt-1 text-xs text-muted">{cell ? `${formatPercent(cell.averageReturn)} · N ${cell.sampleSize}${cell.sampleSize < 5 ? ` · ${lowSampleLabel}` : ""}` : "n/d"}</p>
    </div>
  );
}

function MonthlyView({ cells, locale, metric }: { cells: CalendarMonthSeasonalityCell[]; locale: "es" | "en"; metric: SeasonalityMetric }) {
  const byMonth = new Map(cells.map((cell) => [cell.month, cell]));
  const scale = maxAbs(cells, metric);
  const months = locale === "en" ? englishMonthNames : monthNames;
  const short = locale === "en" ? englishShortMonths : shortMonths;
  return (
    <div className="border border-line bg-panelSoft p-4">
      <div className="grid min-h-56 grid-cols-12 items-end gap-2">
        {Array.from({ length: 12 }).map((_, index) => {
          const month = index + 1;
          const cell = byMonth.get(month);
          const value = metricValue(cell, metric);
          const height = metric === "sampleSize" ? Math.max(8, ((value ?? 0) / scale) * 100) : Math.max(8, (Math.abs(value ?? 0) / scale) * 100);
          return (
            <div key={month} className="flex min-w-0 flex-col items-center justify-end gap-2" title={cellTitle(months[index], cell, locale)}>
              <div className="w-full border border-white" style={{ height: `${height}%`, backgroundColor: colorFor(value, metric, scale) }} />
              <span className="text-[10px] font-semibold text-muted">{short[index]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyView({
  cells,
  copy,
  locale,
  metric,
  month,
  monthNames,
}: {
  cells: CalendarWeekSeasonalityCell[];
  copy: { emptyWeekly: string; lowSample: string; methodology: string; week: string };
  locale: "es" | "en";
  metric: SeasonalityMetric;
  month: number;
  monthNames: string[];
}) {
  const byWeek = new Map(cells.map((cell) => [cell.weekOfMonth, cell]));
  const scale = maxAbs(cells, metric);
  if (!cells.length) {
    return (
      <div className="border border-line bg-panelSoft p-4 text-sm leading-6 text-muted">
        {copy.emptyWeekly}
      </div>
    );
  }
  return (
    <div className="border border-line bg-panelSoft p-4">
      <p className="text-sm leading-6 text-muted">{copy.methodology}</p>
      <div className="mt-5 grid min-h-52 grid-cols-5 items-end gap-3">
        {Array.from({ length: 5 }).map((_, index) => {
          const week = index + 1;
          const cell = byWeek.get(week);
          const value = metricValue(cell, metric);
          const height = metric === "sampleSize" ? Math.max(8, ((value ?? 0) / scale) * 100) : Math.max(8, (Math.abs(value ?? 0) / scale) * 100);
          return (
            <div key={week} className="flex min-w-0 flex-col items-center justify-end gap-2" title={cellTitle(`${monthNames[month - 1]} · ${copy.week} ${week}`, cell, locale)}>
              <div className="w-full border border-white shadow-[0_8px_18px_rgba(31,35,40,0.05)]" style={{ height: `${height}%`, backgroundColor: colorFor(value, metric, scale) }} />
              <span className="text-center text-[10px] font-semibold text-muted">{copy.week} {week}</span>
              {cell && cell.sampleSize < 5 ? <span className="text-center text-[10px] font-semibold text-brass">{copy.lowSample}</span> : <span className="h-3" aria-hidden="true" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyView({
  cells,
  copy,
  locale,
  metric,
  month,
  monthNames,
}: {
  cells: CalendarDaySeasonalityCell[];
  copy: { day: string; lowSample: string; topStrong: string; topWeak: string };
  locale: "es" | "en";
  metric: SeasonalityMetric;
  month: number;
  monthNames: string[];
}) {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const monthCells = cells.filter((cell) => cell.month === month && cell.sampleSize > 0);
  const strongest = [...monthCells].sort((a, b) => (b.averageReturn ?? -Infinity) - (a.averageReturn ?? -Infinity)).slice(0, 5);
  const weakest = [...monthCells].sort((a, b) => (a.averageReturn ?? Infinity) - (b.averageReturn ?? Infinity)).slice(0, 5);
  const scale = maxAbs(cells, metric);
  return (
    <div className="grid gap-4">
      <div className="max-w-full overflow-x-auto [contain:paint]">
        <div className="grid min-w-[1120px] gap-1" style={{ gridTemplateColumns: "3.25rem repeat(31, minmax(2rem, 1fr))" }}>
          <div />
          {Array.from({ length: 31 }).map((_, index) => <div key={index + 1} className="pb-1 text-center text-xs font-semibold text-muted">{index + 1}</div>)}
          {shortMonths.map((monthLabel, monthIndex) => {
            const rowMonth = monthIndex + 1;
            return (
              <div key={monthLabel} className="contents">
                <div className="py-1.5 text-sm font-semibold text-ink">{monthLabel}</div>
                {Array.from({ length: 31 }).map((_, index) => {
                  const day = index + 1;
                  const cell = byKey.get(`${rowMonth}-${day}`);
                  const value = metricValue(cell, metric);
                  return (
                    <div
                      key={`${rowMonth}-${day}`}
                      title={cellTitle(`${day}/${rowMonth}`, cell, locale)}
                      className="flex min-h-8 items-center justify-center border border-white px-1 text-center text-[10px] font-semibold text-ink"
                      style={{ backgroundColor: colorFor(value, metric, scale) }}
                    >
                      {metric === "sampleSize" ? cell?.sampleSize ?? "" : formatMetric(value, metric)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <DayList cells={strongest} copy={copy} title={`${copy.topStrong} · ${monthNames[month - 1]}`} />
        <DayList cells={weakest} copy={copy} title={`${copy.topWeak} · ${monthNames[month - 1]}`} />
      </div>
    </div>
  );
}

function DayList({ cells, copy, title }: { cells: CalendarDaySeasonalityCell[]; copy: { day: string; lowSample: string }; title: string }) {
  return (
    <div className="border border-line bg-panelSoft p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-3 grid gap-2">
        {cells.length ? cells.map((cell) => (
          <div key={`${title}-${cell.month}-${cell.day}`} className="flex items-center justify-between gap-3 border-b border-line/70 pb-2 text-sm last:border-b-0 last:pb-0">
            <span className="font-semibold text-ink">{copy.day} {cell.day}</span>
            <span className="text-right text-muted">{formatPercent(cell.averageReturn)} · N {cell.sampleSize}{cell.sampleSize < 5 ? ` · ${copy.lowSample}` : ""}</span>
          </div>
        )) : <p className="text-sm leading-6 text-muted">Historial insuficiente para este mes.</p>}
      </div>
    </div>
  );
}
