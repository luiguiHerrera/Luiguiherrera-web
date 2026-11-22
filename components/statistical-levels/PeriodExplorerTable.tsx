"use client";

import { useId, useMemo, useState } from "react";
import { MetricHelpTooltip } from "@/components/ui/MetricHelpTooltip";
import { explorerHistory } from "@/lib/statistical-levels/period-history";
import type { AssetStatRecord, PeriodExplorerRow, StatisticalFrequency } from "@/lib/statistical-levels/types";

type Locale = "es" | "en";
type Props = { asset: AssetStatRecord | null; frequency: StatisticalFrequency; locale?: Locale };
const filterOptions = [
  ["positive_extreme", "Extensión positiva extrema", "Extreme positive extension"],
  ["negative_extreme", "Extensión negativa extrema", "Extreme negative extension"],
  ["positive", "Positivos", "Positive"],
  ["negative", "Negativos", "Negative"],
  ["above_previous_range", "Sobre el rango previo", "Above previous range"],
  ["below_previous_range", "Bajo el rango previo", "Below previous range"],
  ["all", "Todos", "All"],
] as const;
type FilterKey = (typeof filterOptions)[number][0];
const columns = [
  ["period", "Periodo", "Period"],
  ["open", "Apertura", "Open"],
  ["high", "Máximo", "High"],
  ["low", "Mínimo", "Low"],
  ["close", "Cierre", "Close"],
  ["change", "Cambio", "Change"],
  ["openGap", "Brecha de apertura", "Open gap"],
  ["range", "Amplitud", "Range"],
  ["closeLocation", "Posición del cierre", "Close location"],
  ["classification", "Clasificación", "Classification"],
] as const;
type Column = (typeof columns)[number][0];
type ColumnFilters = Partial<Record<Column, { min?: string; max?: string; value?: string }>>;
type Sort = { column: Column; direction: "asc" | "desc" };
const classificationLabels: Record<string, string> = {
  "Extensión negativa extrema": "Extreme negative extension",
  "Extensión negativa": "Negative extension",
  "Zona media": "Middle zone",
  "Extensión positiva": "Positive extension",
  "Extensión positiva extrema": "Extreme positive extension",
};
const percentColumns = new Set<Column>(["change", "openGap", "range"]);
const PAGE_SIZE = 10;

function classificationLabel(value: string, locale: Locale) {
  return locale === "en" ? classificationLabels[value] ?? value : value;
}

function formatPercent(value: number | null) {
  return value === null ? "n/d" : `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

function formatNumber(value: number | null) {
  return value === null ? "n/d" : value.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

export function formatExplorerPeriod(row: PeriodExplorerRow, frequency: StatisticalFrequency, locale: Locale) {
  if (frequency === "daily") return row.period;
  const date = new Date(`${row.periodEnd}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return row.period;
  const month = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-ES", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  if (frequency === "monthly") return month;
  // Use the same closing-date buckets as the existing calendar seasonality.
  const week = Math.min(5, Math.floor((date.getUTCDate() - 1) / 7) + 1);
  return locale === "es" ? `${week}.ª semana · ${month}` : `${week}${["st", "nd", "rd", "th", "th"][week - 1]} week · ${month}`;
}

function matchesFilter(row: PeriodExplorerRow, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "positive") return (row.change ?? 0) > 0;
  if (filter === "negative") return (row.change ?? 0) < 0;
  if (filter === "positive_extreme") return row.classification === "Extensión positiva extrema";
  if (filter === "negative_extreme") return row.classification === "Extensión negativa extrema";
  if (filter === "above_previous_range") return row.openingRangeCategory === "Above previous range";
  return row.openingRangeCategory === "Below previous range";
}

// Filtering and sorting only change the view; source rows and statistics remain intact.
export function selectExplorerRows(rows: PeriodExplorerRow[], filter: FilterKey, columnFilters: ColumnFilters, sort: Sort, locale: Locale) {
  return rows.filter(row => matchesFilter(row, filter) && columns.every(([key]) => {
    const bounds = columnFilters[key];
    if (!bounds) return true;
    if (key === "classification") return !bounds.value || row.classification === bounds.value;
    if (key === "period") return (!bounds.min || row.periodEnd >= bounds.min) && (!bounds.max || row.periodEnd <= bounds.max);
    const hasMin = bounds.min !== undefined && bounds.min !== "";
    const hasMax = bounds.max !== undefined && bounds.max !== "";
    if (!hasMin && !hasMax) return true;
    const value = row[key];
    if (value === null) return false;
    const displayedValue = percentColumns.has(key) ? value * 100 : value;
    return (!hasMin || displayedValue >= Number(bounds.min)) && (!hasMax || displayedValue <= Number(bounds.max));
  })).sort((a, b) => {
    const key = sort.column;
    const left = key === "period" ? a.periodEnd : key === "classification" ? classificationLabel(a.classification, locale) : a[key];
    const right = key === "period" ? b.periodEnd : key === "classification" ? classificationLabel(b.classification, locale) : b[key];
    // Missing values stay last in both directions; zero remains a valid value.
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    const comparison = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), locale);
    return (sort.direction === "asc" ? comparison : -comparison) || b.periodEnd.localeCompare(a.periodEnd);
  });
}

export function PeriodExplorerTable({ asset, frequency, locale = "es" }: Props) {
  const en = locale === "en";
  const [filter, setFilter] = useState<FilterKey>("positive_extreme");
  const [sort, setSort] = useState<Sort>({ column: "period", direction: "desc" });
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const filterId = useId();
  const data = asset?.frequencies[frequency];
  const completeHistory = data?.periodHistory !== undefined;
  const rows = useMemo(() => explorerHistory(data), [data]);
  const oldest = rows.at(-1);
  const newest = rows[0];
  const filteredRows = useMemo(() => selectExplorerRows(rows, filter, columnFilters, sort, locale), [rows, filter, columnFilters, sort, locale]);
  const visibleRows = filteredRows.slice(0, limit);
  const activeColumns = Object.values(columnFilters).filter(bounds => Object.values(bounds).some(Boolean)).length;
  const summary = useMemo(() => ({
    positiveRate: rows.length ? rows.filter(row => (row.change ?? 0) > 0).length / rows.length : null,
    negativeRate: rows.length ? rows.filter(row => (row.change ?? 0) < 0).length / rows.length : null,
    positiveExtreme: rows.filter(row => row.classification === "Extensión positiva extrema").length,
    negativeExtreme: rows.filter(row => row.classification === "Extensión negativa extrema").length,
  }), [rows]);
  const headerHelp: Partial<Record<Column, string>> = {
    period: en ? "Weekly labels use the completed close date: days 1–7 = week 1, 8–14 = week 2, 15–21 = week 3, 22–28 = week 4 and 29–31 = week 5. Hover or focus a period to see its exact dates. Date filters use the close date." : "Las semanas se identifican por su fecha de cierre completado: días 1–7 = semana 1, 8–14 = semana 2, 15–21 = semana 3, 22–28 = semana 4 y 29–31 = semana 5. Pasa el cursor o enfoca un periodo para consultar las fechas exactas. Los filtros de fecha usan el cierre.",
    change: en ? "Change over the analyzed period." : "Cambio del periodo analizado.",
    openGap: en ? "Difference between the period open and the prior close." : "Diferencia entre la apertura del periodo y el cierre previo.",
    range: en ? "Range between the period high and low." : "Amplitud entre máximo y mínimo del periodo.",
    closeLocation: en ? "Close position within the period range. 0 is near the low and 1 is near the high." : "Posición del cierre dentro del rango. 0 cerca del mínimo y 1 cerca del máximo.",
  };
  function changeColumn(key: Column, bound: "min" | "max" | "value", value: string) {
    setColumnFilters(current => ({ ...current, [key]: { ...current[key], [bound]: value } }));
    setLimit(PAGE_SIZE);
  }

  return <section className="sl-period-explorer">
    <dl className="sl-explorer-summary">
      <SummaryItem label={completeHistory ? en ? "Available history" : "Historial disponible" : en ? "Recent sample" : "Muestra reciente"} value={`${rows.length} ${en ? "periods" : "periodos"}`} />
      <SummaryItem label={en ? "Positive / negative" : "Positivos / negativos"} value={`${formatPercent(summary.positiveRate)} / ${formatPercent(summary.negativeRate)}`} />
      <SummaryItem label={en ? "Extreme extensions" : "Extensiones extremas"} value={en ? `${summary.positiveExtreme} positive · ${summary.negativeExtreme} negative` : `${summary.positiveExtreme} ${summary.positiveExtreme === 1 ? "positiva" : "positivas"} · ${summary.negativeExtreme} ${summary.negativeExtreme === 1 ? "negativa" : "negativas"}`} />
    </dl>
    <p className="sl-caption sl-explorer-sample-note">
      {completeHistory ? en ? 'Completed periods with an available prior close' : 'Periodos completados con cierre previo disponible' : en ? 'Recent periods shown in the explorer' : 'Periodos recientes incluidos en el explorador'}
      {oldest && newest ? <>: <time dateTime={oldest.periodEnd}>{formatExplorerPeriod(oldest, frequency, locale)}</time> – <time dateTime={newest.periodEnd}>{formatExplorerPeriod(newest, frequency, locale)}</time></> : null}.
      {' '}{en ? 'The explorer uses its available history, independently of the horizon selected above.' : 'El explorador usa su historial disponible, independientemente del horizonte seleccionado arriba.'}
    </p>
    <div className="sl-explorer-groups" aria-label={en ? "Period groups" : "Grupos de periodos"}>
      {filterOptions.map(([key, esLabel, enLabel]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => { setFilter(key); setLimit(PAGE_SIZE); }}>{en ? enLabel : esLabel}</button>)}
    </div>
    <div className="sl-explorer-tools">
      <p className="sl-caption">{en ? "Click a column heading to sort." : "Pulsa una cabecera para ordenar."}</p>
      <div>
        <button type="button" aria-expanded={showFilters} aria-controls={filterId} onClick={() => setShowFilters(current => !current)}>{en ? "Column filters" : "Filtros de columnas"}{activeColumns ? ` (${activeColumns})` : ""}</button>
        {activeColumns || filter !== "all" ? <button type="button" onClick={() => { setColumnFilters({}); setFilter("all"); setLimit(PAGE_SIZE); }}>{en ? "Clear filters" : "Limpiar filtros"}</button> : null}
      </div>
    </div>
    <div className="sl-table-scroll" tabIndex={0} role="region" aria-label={en ? "Period table" : "Tabla de periodos"}>
      <table className="sl-table sl-explorer-table">
        <thead>
          <tr>{columns.map(([key, esLabel, enLabel]) => {
            const label = en ? enLabel : esLabel;
            return <th key={key} scope="col" aria-sort={sort.column === key ? sort.direction === "asc" ? "ascending" : "descending" : "none"}>
              <div className="sl-explorer-column-title">
                <button type="button" aria-label={`${en ? "Sort by" : "Ordenar por"} ${label}`} onClick={() => { setSort({ column: key, direction: sort.column === key && sort.direction === "asc" ? "desc" : "asc" }); setLimit(PAGE_SIZE); }}>{label}<span aria-hidden="true">{sort.column === key ? sort.direction === "asc" ? "↑" : "↓" : "↕"}</span></button>
                {headerHelp[key] ? <MetricHelpTooltip label={label} text={headerHelp[key]} locale={locale} /> : null}
              </div>
            </th>;
          })}</tr>
          <tr id={filterId} className="sl-explorer-column-filters" hidden={!showFilters}>{columns.map(([key, esLabel, enLabel]) => {
            const label = en ? enLabel : esLabel;
            return <td key={key}>{key === "classification" ? <select aria-label={`${en ? "Filter" : "Filtrar"} ${label}`} value={columnFilters[key]?.value ?? ""} onChange={event => changeColumn(key, "value", event.target.value)}>
              <option value="">{en ? "All" : "Todas"}</option>
              {Object.keys(classificationLabels).map(value => <option key={value} value={value}>{classificationLabel(value, locale)}</option>)}
            </select> : <div>
              {["min", "max"].map(bound => <input key={bound} type={key === "period" ? "date" : "number"} step="any" placeholder={bound === "min" ? en ? "Min" : "Mín." : en ? "Max" : "Máx."} aria-label={`${label}: ${key === "period" ? bound === "min" ? en ? "from" : "desde" : en ? "through" : "hasta" : bound === "min" ? en ? "minimum" : "mínimo" : en ? "maximum" : "máximo"}${percentColumns.has(key) ? " (%)" : ""}`} value={columnFilters[key]?.[bound as "min" | "max"] ?? ""} onChange={event => changeColumn(key, bound as "min" | "max", event.target.value)} />)}
              {percentColumns.has(key) ? <small>%</small> : key === "closeLocation" ? <small>0–1</small> : null}
            </div>}</td>;
          })}</tr>
        </thead>
        <tbody>
          {visibleRows.map(row => <tr key={`${row.period}-${row.openingRangeCategory}`}>
            <th scope="row"><time tabIndex={0} dateTime={row.periodEnd} title={`${row.periodStart} → ${row.periodEnd}`}>{formatExplorerPeriod(row, frequency, locale)}</time></th>
            {[row.open, row.high, row.low, row.close].map((value, index) => <td key={index}>{formatNumber(value)}</td>)}
            {[row.change, row.openGap, row.range].map((value, index) => <td key={index}>{formatPercent(value)}</td>)}
            <td>{row.closeLocation === null ? "n/d" : row.closeLocation.toFixed(2)}</td>
            <td>{classificationLabel(row.classification, locale)}</td>
          </tr>)}
          {!visibleRows.length ? <tr><td colSpan={columns.length} className="sl-explorer-empty">{en ? "No periods match these filters. Choose another group or clear the filters." : "No hay periodos que coincidan con estos filtros. Elige otro grupo o limpia los filtros."}</td></tr> : null}
        </tbody>
      </table>
    </div>
    <div className="sl-explorer-footer">
      <p className="sl-caption" role="status">{en ? `Showing ${visibleRows.length} of ${filteredRows.length} matching periods · ${rows.length} completed periods available.` : `Mostrando ${visibleRows.length} de ${filteredRows.length} coincidencias · ${rows.length} periodos completados disponibles.`}</p>
      {visibleRows.length < filteredRows.length ? <button type="button" onClick={() => setLimit(current => current + PAGE_SIZE)}>{en ? `Show ${Math.min(PAGE_SIZE, filteredRows.length - visibleRows.length)} more` : `Mostrar ${Math.min(PAGE_SIZE, filteredRows.length - visibleRows.length)} más`}</button> : null}
    </div>
  </section>;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}
