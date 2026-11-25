"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import styles from "./price-participation.module.css";
import chartStyles from "./price-participation-chart.module.css";

export type PriceParticipationChartSeries = {
  key: string;
  label: string;
  points: readonly { date: string; value: number | null }[];
  color?: string;
};
type Props = {
  series: readonly PriceParticipationChartSeries[];
  locale: "es" | "en";
  id: string;
  title: string;
  unit: string;
  digits?: number;
  reference?: number;
};

const COLORS = ["#193d32", "#946f2e"];
const LEFT = 18, RIGHT = 982, TOP = 18, BOTTOM = 236;

function formatDate(value: string, locale: "es" | "en") {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
function formatNumber(value: number | null, locale: "es" | "en", digits: number) {
  if (value === null || !Number.isFinite(value)) return locale === "es" ? "No disponible" : "Unavailable";
  const displayed = Number(value.toFixed(digits)) === 0 ? 0 : value;
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(displayed).replace(/-/g, "−");
}

/** Select against actual calendar spacing, so weekends and missing dates stay honest. */
export function nearestPriceParticipationDate(timestamps: readonly number[], target: number) {
  if (!timestamps.length || !Number.isFinite(target)) return -1;
  let low = 0, high = timestamps.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (timestamps[middle] < target) low = middle + 1;
    else high = middle;
  }
  return low > 0 && target - timestamps[low - 1] <= timestamps[low] - target ? low - 1 : low;
}

function geometryFor(series: readonly PriceParticipationChartSeries[], reference?: number) {
  const dates = [...new Set(series.flatMap((item) => item.points.map((point) => point.date)))].sort();
  const timestamps = dates.map((date) => Date.parse(`${date}T00:00:00Z`));
  const aligned = series.map((item, index) => {
    const byDate = new Map(item.points.map((point) => [point.date, point.value]));
    return { key: item.key, label: item.label, color: item.color ?? COLORS[index % COLORS.length], values: dates.map((date) => {
      const value = byDate.get(date);
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    }) };
  });
  const values = aligned.flatMap((item) => item.values.filter((value): value is number => value !== null));
  if (!dates.length || !values.length) return null;
  const observedMin = Math.min(...values), observedMax = Math.max(...values);
  const extent = reference === undefined ? values : [...values, reference];
  const lower = Math.min(...extent), upper = Math.max(...extent);
  const padding = Math.max((upper - lower) * 0.08, 0.1);
  const min = lower - padding, max = upper + padding;
  const firstTime = timestamps[0], lastTime = timestamps[timestamps.length - 1];
  const xs = timestamps.map((time) => LEFT + (time - firstTime) / Math.max(lastTime - firstTime, 1) * (RIGHT - LEFT));
  const y = (value: number) => BOTTOM - (value - min) / (max - min) * (BOTTOM - TOP);
  const lines = aligned.map((item) => {
    const ys = item.values.map((value) => value === null ? null : y(value));
    const path = ys.map((pointY, index) => {
      if (pointY === null) return "";
      const connected = index > 0 && ys[index - 1] !== null;
      return `${connected ? "L" : "M"}${xs[index].toFixed(2)},${pointY.toFixed(2)}`;
    }).join(" ");
    return { ...item, ys, path };
  });
  const referenceY = reference === undefined ? null : y(reference);
  const areaPaths: string[] = [];
  if (reference === 0 && lines.length === 1 && referenceY !== null) {
    const ys = lines[0].ys;
    let start = -1;
    for (let index = 0; index <= ys.length; index += 1) {
      if (index < ys.length && ys[index] !== null) {
        if (start === -1) start = index;
      } else if (start !== -1) {
        const end = index - 1;
        const edge = ys.slice(start, index).map((pointY, offset) => `L${xs[start + offset].toFixed(2)},${pointY!.toFixed(2)}`).join(" ");
        areaPaths.push(`M${xs[start].toFixed(2)},${referenceY} ${edge} L${xs[end].toFixed(2)},${referenceY} Z`);
        start = -1;
      }
    }
  }
  return { dates, timestamps, firstTime, lastTime, xs, lines, referenceY, areaPaths,
    observedMin, observedMax, minY: y(observedMin), maxY: y(observedMax) };
}

export default function PriceParticipationChart({ series, locale, id, title, unit, digits = 1, reference }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const pinned = useRef(false);
  const geometry = useMemo(() => geometryFor(series, reference), [series, reference]);
  const selected = Math.min(activeIndex ?? (geometry?.dates.length ?? 0) - 1, (geometry?.dates.length ?? 0) - 1);
  const en = locale === "en";
  const help = en
    ? "Hover to inspect. Click or tap to pin. Keyboard: ← → move through dates; Home / End jump to the endpoints; Esc or a tap outside clears the selection."
    : "Pasa el cursor para consultar. Haz clic o toca para fijar. Teclado: ← → recorren fechas; Inicio / Fin van a los extremos; Esc o un toque fuera limpia la selección.";

  useEffect(() => {
    const dismiss = (event: globalThis.PointerEvent) => {
      if (!surface.current?.contains(event.target as Node)) { pinned.current = false; setActiveIndex(null); }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  const inspect = (event: PointerEvent<HTMLDivElement>) => {
    if (!geometry) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0) return;
    const fraction = Math.max(0, Math.min(1, ((event.clientX - bounds.left) / bounds.width * 1000 - LEFT) / (RIGHT - LEFT)));
    const target = geometry.firstTime + fraction * (geometry.lastTime - geometry.firstTime);
    const index = nearestPriceParticipationDate(geometry.timestamps, target);
    if (index >= 0) setActiveIndex(index);
  };
  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!geometry) return;
    let next = selected;
    if (event.key === "ArrowLeft") next = Math.max(0, selected - 1);
    else if (event.key === "ArrowRight") next = Math.min(geometry.dates.length - 1, selected + 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = geometry.dates.length - 1;
    else if (event.key === "Escape") { event.preventDefault(); pinned.current = false; setActiveIndex(null); return; }
    else return;
    event.preventDefault(); pinned.current = false; setActiveIndex(next);
  };

  if (!geometry || selected < 0) return <section className={styles.chart}><h4>{title}</h4><p className={styles.note}>{en ? "No observations available for this window." : "No hay observaciones disponibles en esta ventana."}</p></section>;
  const selectedDate = geometry.dates[selected];
  const valueText = `${formatDate(selectedDate, locale)} · ${geometry.lines.map((line) => `${line.label}: ${formatNumber(line.values[selected], locale, digits)} ${unit}`).join("; ")}`;
  const inspecting = activeIndex !== null;
  const xPercent = geometry.xs[selected] / 10;
  const activeYs = geometry.lines.flatMap((line) => line.ys[selected] === null ? [] : [line.ys[selected]!]);
  const anchorY = activeYs.length ? Math.min(...activeYs) / 260 * 100 : 50;
  const tooltipHeight = 46 + geometry.lines.length * 26;
  const shaded = reference === 0 && geometry.lines.length === 1 && geometry.referenceY !== null;
  const sameExtrema = geometry.observedMin === geometry.observedMax;

  return <section className={styles.chart} aria-labelledby={`${id}-title`}>
    <div className={styles.chartHeading}><h4 id={`${id}-title`}>{title}</h4><span className={styles.chartUnit}>{unit}</span></div>
    <div className={styles.chartReadout}><time dateTime={selectedDate}>{formatDate(selectedDate, locale)}</time>{geometry.lines.map((line) => <span key={line.key} className={styles.chartLegendItem}><span aria-hidden="true" className={styles.chartSwatch} style={{ background: line.color }} /><span>{line.label}</span><strong>{formatNumber(line.values[selected], locale, digits)}</strong></span>)}</div>
    <div ref={surface} className={styles.chartCanvas} role="slider" tabIndex={0}
      aria-label={`${en ? "Inspect" : "Consultar"}: ${title}`} aria-orientation="horizontal"
      aria-valuemin={0} aria-valuemax={geometry.dates.length - 1} aria-valuenow={selected}
      aria-valuetext={valueText} aria-describedby={`${id}-help`}
      data-price-participation-chart data-selected-date={inspecting ? selectedDate : undefined}
      onPointerMove={(event) => { if (event.pointerType === "mouse" && !pinned.current) inspect(event); }}
      onPointerDown={(event) => { pinned.current = true; inspect(event); }}
      onPointerLeave={() => { if (!pinned.current) setActiveIndex(null); }}
      onFocus={() => setActiveIndex((index) => index ?? geometry.dates.length - 1)}
      onBlur={() => { if (!pinned.current) setActiveIndex(null); }} onKeyDown={navigate}>
      <svg viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true">
        {shaded ? <>
          <defs>
            <clipPath id={`${id}-positive-area`} clipPathUnits="userSpaceOnUse"><rect x={LEFT} y={TOP} width={RIGHT - LEFT} height={Math.max(0, geometry.referenceY! - TOP)} /></clipPath>
            <clipPath id={`${id}-negative-area`} clipPathUnits="userSpaceOnUse"><rect x={LEFT} y={geometry.referenceY!} width={RIGHT - LEFT} height={Math.max(0, BOTTOM - geometry.referenceY!)} /></clipPath>
          </defs>
          {geometry.areaPaths.map((area, index) => <g key={index}>
            <path d={area} className={chartStyles.positiveArea} clipPath={`url(#${id}-positive-area)`} />
            <path d={area} className={chartStyles.negativeArea} clipPath={`url(#${id}-negative-area)`} />
          </g>)}
        </> : null}
        {geometry.referenceY !== null ? <line x1={LEFT} x2={RIGHT} y1={geometry.referenceY} y2={geometry.referenceY} className={styles.chartReference} vectorEffect="non-scaling-stroke" /> : null}
        <line x1={LEFT} x2={RIGHT} y1={geometry.maxY} y2={geometry.maxY} className={chartStyles.extremeLine} vectorEffect="non-scaling-stroke" />
        {!sameExtrema ? <line x1={LEFT} x2={RIGHT} y1={geometry.minY} y2={geometry.minY} className={chartStyles.extremeLine} vectorEffect="non-scaling-stroke" /> : null}
        {geometry.lines.map((line) => <path key={line.key} d={line.path} className={styles.chartLine} stroke={line.color} fill="none" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}
        <line x1={geometry.xs[selected]} x2={geometry.xs[selected]} y1={TOP} y2={BOTTOM} className={styles.chartCursor} vectorEffect="non-scaling-stroke" />
        {inspecting && geometry.lines.length === 1 && geometry.lines[0].ys[selected] !== null ? <line x1={LEFT} x2={RIGHT} y1={geometry.lines[0].ys[selected]!} y2={geometry.lines[0].ys[selected]!} className={styles.chartLevel} vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      <span className={`${chartStyles.extremeLabel} ${chartStyles.maximum}`} style={{ top: `${geometry.maxY / 260 * 100}%` }}>{sameExtrema ? (en ? "Min / Max" : "Mín / Máx") : (en ? "Max" : "Máx")} · {formatNumber(geometry.observedMax, locale, digits)}</span>
      {!sameExtrema ? <span className={`${chartStyles.extremeLabel} ${chartStyles.minimum}`} style={{ top: `${geometry.minY / 260 * 100}%` }}>{en ? "Min" : "Mín"} · {formatNumber(geometry.observedMin, locale, digits)}</span> : null}
      {geometry.referenceY !== null ? <span className={styles.chartReferenceLabel} style={{ top: `${geometry.referenceY / 260 * 100}%` }}>{formatNumber(reference!, locale, 0)}</span> : null}
      {geometry.lines.map((line) => line.ys[selected] === null ? null : <span key={line.key} className={styles.chartPoint} aria-hidden="true" style={{ left: `${xPercent}%`, top: `${line.ys[selected]! / 260 * 100}%`, background: line.color }} />)}
      {inspecting ? <div className={styles.chartTooltip} role="tooltip" style={{ left: `clamp(8px, calc(${xPercent}% - 90px), calc(100% - 188px))`, top: `clamp(8px, calc(${anchorY}% ${anchorY > 45 ? `- ${tooltipHeight + 12}px` : "+ 14px"}), calc(100% - ${tooltipHeight + 8}px))` }}><time dateTime={selectedDate}>{formatDate(selectedDate, locale)}</time>{geometry.lines.map((line) => <span key={line.key} className={styles.chartTooltipRow}><span>{line.label}</span><strong>{formatNumber(line.values[selected], locale, digits)}</strong></span>)}<span className={styles.chartUnit}>{unit}</span></div> : null}
    </div>
    <div className={styles.chartDates}><span>{formatDate(geometry.dates[0], locale)}</span><span>{formatDate(geometry.dates[geometry.dates.length - 1], locale)}</span></div>
    <p id={`${id}-help`} className={styles.chartHelp}>{help}</p>
  </section>;
}
