"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { OfrObservation } from "@/lib/dashboard/ofr-fsi";
import { ofrFsiCopy, type OfrLocale } from "@/lib/dashboard/ofr-fsi-copy";
import styles from "./financial-environment.module.css";
import inspectionStyles from "./financial-environment-history.module.css";

type Props = { observations: OfrObservation[]; locale: OfrLocale; digits: number; id: string };

function formatNumber(value: number | null, locale: OfrLocale, digits: number) {
  if (value === null || !Number.isFinite(value)) return ofrFsiCopy[locale].unavailable;
  const displayed = Number(value.toFixed(digits)) === 0 ? 0 : value;
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(displayed).replace(/-/g, "−");
}

function formatDate(value: string, locale: OfrLocale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

/** Calendar-time proximity preserves the dates shown on the chart, including gaps. */
export function nearestOfrObservationIndex(timestamps: readonly number[], targetTime: number) {
  if (!timestamps.length || !Number.isFinite(targetTime)) return -1;
  let low = 0;
  let high = timestamps.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (timestamps[middle] < targetTime) low = middle + 1;
    else high = middle;
  }
  if (low === 0) return 0;
  return targetTime - timestamps[low - 1] <= timestamps[low] - targetTime ? low - 1 : low;
}

function chartGeometry(observations: OfrObservation[]) {
  const values = observations.flatMap((row) => row.fsi === null ? [] : [row.fsi]);
  if (!values.length) return null;
  const lower = Math.min(0, ...values);
  const upper = Math.max(0, ...values);
  const padding = Math.max((upper - lower) * 0.08, 0.1);
  const min = lower - padding;
  const max = upper + padding;
  const timestamps = observations.map((row) => Date.parse(`${row.date}T00:00:00Z`));
  const firstTime = timestamps[0];
  const lastTime = timestamps[timestamps.length - 1];
  const y = (value: number) => 236 - (value - min) / (max - min) * 218;
  const points = observations.map((row, index) => ({
    x: 18 + (timestamps[index] - firstTime) / Math.max(lastTime - firstTime, 1) * 964,
    y: row.fsi === null ? null : y(row.fsi),
  }));
  const path = points.map((point, index) => {
    if (point.y === null) return "";
    const connected = index > 0 && points[index - 1].y !== null;
    return `${connected ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`;
  }).join(" ");
  return { timestamps, points, firstTime, lastTime, path, zeroY: y(0) };
}

export default function FinancialEnvironmentHistory({ observations, locale, digits, id }: Props) {
  const copy = ofrFsiCopy[locale];
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const retained = useRef(false);
  const geometry = useMemo(() => chartGeometry(observations), [observations]);
  const selectedIndex = Math.min(activeIndex ?? observations.length - 1, observations.length - 1);
  const active = observations[selectedIndex];
  const selectedPoint = geometry?.points[selectedIndex];
  const help = locale === "en"
    ? "Hover to see a date and value. Click or tap to pin. Use ← →, Home and End to inspect; Esc or a tap outside clears the selection."
    : "Pasa el cursor para ver fecha y valor. Haz clic o toca para fijar. Usa ← →, Inicio y Fin para consultar; Esc o un toque fuera limpia la selección.";

  useEffect(() => {
    const dismiss = (event: globalThis.PointerEvent) => {
      if (!surface.current?.contains(event.target as Node)) {
        retained.current = false;
        setActiveIndex(null);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  const inspect = (event: PointerEvent<HTMLDivElement>) => {
    if (!geometry) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0) return;
    // The SVG plot spans x=18..982 within its 1000-unit viewBox.
    const plotFraction = Math.max(0, Math.min(1, (event.clientX - bounds.left - bounds.width * 0.018) / (bounds.width * 0.964)));
    const targetTime = geometry.firstTime + plotFraction * (geometry.lastTime - geometry.firstTime);
    const nearest = nearestOfrObservationIndex(geometry.timestamps, targetTime);
    if (nearest !== -1) setActiveIndex(nearest);
  };

  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!observations.length) return;
    let next = selectedIndex;
    if (event.key === "ArrowLeft") next = Math.max(0, selectedIndex - 1);
    else if (event.key === "ArrowRight") next = Math.min(observations.length - 1, selectedIndex + 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = observations.length - 1;
    else if (event.key === "Escape") {
      event.preventDefault();
      retained.current = false;
      setActiveIndex(null);
      return;
    } else return;
    event.preventDefault();
    retained.current = false;
    setActiveIndex(next);
  };

  if (!geometry || !active || !selectedPoint) return <p className={styles.note}>{copy.chartEmpty}</p>;
  const valueText = `${formatDate(active.date, locale)} · ${formatNumber(active.fsi, locale, digits)} ${copy.points}`;
  const xPercent = selectedPoint.x / 10;
  const yPercent = selectedPoint.y === null ? 50 : selectedPoint.y / 260 * 100;
  const inspecting = activeIndex !== null;

  return <div className={styles.historyChart}>
    <div className={styles.chartReadout}>
      <time dateTime={active.date}>{formatDate(active.date, locale)}</time>
      <strong>{formatNumber(active.fsi, locale, digits)}</strong><span>{copy.points}</span>
    </div>
    <div ref={surface} className={`${styles.chartCanvas} ${inspectionStyles.surface}`}
      role="slider" tabIndex={0} aria-label={copy.inspect} aria-orientation="horizontal"
      aria-valuemin={0} aria-valuemax={observations.length - 1} aria-valuenow={selectedIndex}
      aria-valuetext={valueText} aria-describedby={`${id}-history-help`}
      data-ofr-history-inspection data-selected-date={inspecting ? active.date : undefined}
      data-selected-value={inspecting ? active.fsi ?? undefined : undefined}
      onPointerMove={(event) => { if (event.pointerType === "mouse" && !retained.current) inspect(event); }}
      onPointerDown={(event) => { retained.current = true; inspect(event); }}
      onPointerLeave={() => { if (!retained.current) setActiveIndex(null); }}
      onFocus={() => setActiveIndex((value) => value ?? observations.length - 1)}
      onBlur={() => { if (!retained.current) setActiveIndex(null); }}
      onKeyDown={navigate}>
      <svg viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true">
        <line x1="18" x2="982" y1={geometry.zeroY} y2={geometry.zeroY} className={styles.zeroLine} vectorEffect="non-scaling-stroke" />
        <path d={geometry.path} className={styles.historyLine} vectorEffect="non-scaling-stroke" />
        <line x1={selectedPoint.x} x2={selectedPoint.x} y1="18" y2="236" className={styles.cursorLine} vectorEffect="non-scaling-stroke" />
        {inspecting && selectedPoint.y !== null ? <line x1="18" x2="982" y1={selectedPoint.y} y2={selectedPoint.y} className={inspectionStyles.levelLine} vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      <span className={styles.zeroLabel} style={{ top: `${geometry.zeroY / 260 * 100}%` }}>{copy.zero}</span>
      {selectedPoint.y !== null ? <span className={inspectionStyles.point} aria-hidden="true" style={{ left: `${xPercent}%`, top: `${yPercent}%` }} /> : null}
      {inspecting ? <div className={inspectionStyles.tooltip} role="tooltip" style={{
        left: `clamp(8px, calc(${xPercent}% - 80px), calc(100% - 168px))`,
        top: `clamp(8px, calc(${yPercent}% ${yPercent > 45 ? "- 88px" : "+ 14px"}), calc(100% - 82px))`,
      }}><time dateTime={active.date}>{formatDate(active.date, locale)}</time><strong>{formatNumber(active.fsi, locale, digits)}</strong><span>{copy.points}</span></div> : null}
    </div>
    <div className={styles.chartDates}><span>{formatDate(observations[0].date, locale)}</span><span>{formatDate(observations[observations.length - 1].date, locale)}</span></div>
    <p id={`${id}-history-help`} className={inspectionStyles.help}>{help}</p>
    <label className={styles.scrubber} htmlFor={`${id}-observation`}><span>{copy.inspect}</span><input id={`${id}-observation`} type="range" min="0" max={observations.length - 1} value={selectedIndex}
      onChange={(event) => { retained.current = false; setActiveIndex(Number(event.target.value)); }}
      onKeyDown={(event) => { if (event.key === "Escape") { retained.current = false; setActiveIndex(null); } }}
      aria-valuetext={valueText} aria-describedby={`${id}-history-help`} /></label>
  </div>;
}
