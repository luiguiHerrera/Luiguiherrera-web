"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  bandPath,
  linePath,
  linearScale,
  nearestIndex,
  niceAxisTicks,
  paddedDomain,
} from "@/lib/research/tom-decay/chart-geometry";
import type { TomDecayContent } from "@/lib/research/tom-decay/content";
import { createTomFormatters } from "@/lib/research/tom-decay/format";
import type { RollingPoint, TomDatasetId } from "@/lib/research/tom-decay/types";

type DatasetMode = TomDatasetId | "both";

type SeriesInput = {
  id: TomDatasetId;
  name: string;
  short: string;
  points: RollingPoint[];
};

type RollingPremiumChartProps = {
  content: TomDecayContent;
  events: { id: string; label: string; year: number }[];
  series: SeriesInput[];
};

const seriesColor: Record<TomDatasetId, string> = {
  yahoo: "#0B3436",
  french: "#9A7A44",
};

const seriesDash: Record<TomDatasetId, string | undefined> = {
  yahoo: undefined,
  french: "7 4",
};

const DESKTOP = { width: 940, height: 430, top: 26, right: 26, bottom: 74, left: 56 };
const MOBILE = { width: 380, height: 400, top: 22, right: 14, bottom: 92, left: 44 };

export function RollingPremiumChart({ content, events, series }: RollingPremiumChartProps) {
  const copy = content.rolling;
  const format = useMemo(() => createTomFormatters(content.locale), [content.locale]);
  const [mode, setMode] = useState<DatasetMode>("both");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [compact, setCompact] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const tableId = useId();

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setCompact(query.matches);
      setMode((current) => (query.matches && current === "both" ? "yahoo" : current));
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const box = compact ? MOBILE : DESKTOP;
  const plotLeft = box.left;
  const plotRight = box.width - box.right;
  const plotTop = box.top;
  const plotBottom = box.height - box.bottom;

  const visible = useMemo(
    () => (mode === "both" ? series : series.filter((entry) => entry.id === mode)),
    [mode, series],
  );

  const years = series[0].points.map((point) => point.year);

  const { xScale, yScale, yTicks, xTicks } = useMemo(() => {
    const values = visible.flatMap((entry) =>
      entry.points.flatMap((point) => [point.ci95LoBps, point.ci95HiBps, point.premiumBps]),
    );
    const [minY, maxY] = paddedDomain(values);
    const x = linearScale([years[0], years[years.length - 1]], [plotLeft, plotRight]);
    const y = linearScale([minY, maxY], [plotBottom, plotTop]);
    const step = compact ? 20 : 10;
    const first = Math.ceil(years[0] / step) * step;
    const marks: number[] = [];
    for (let year = first; year <= years[years.length - 1]; year += step) marks.push(year);
    return {
      xScale: x,
      yScale: y,
      yTicks: niceAxisTicks(minY, maxY, compact ? 4 : 6),
      xTicks: marks,
    };
  }, [compact, plotBottom, plotLeft, plotRight, plotTop, visible, years]);

  const activePoint = activeIndex === null ? null : series[0].points[activeIndex];

  const moveActive = useCallback(
    (delta: number) => {
      setActiveIndex((current) => {
        const next = current === null ? years.length - 1 : current + delta;
        return Math.min(Math.max(next, 0), years.length - 1);
      });
    },
    [years.length],
  );

  function handlePointer(event: ReactPointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width) return;
    const localX = ((event.clientX - bounds.left) / bounds.width) * box.width;
    setActiveIndex(nearestIndex(years.map((year) => xScale(year)), localX));
  }

  function handleKeyDown(event: ReactKeyboardEvent<SVGSVGElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(years.length - 1);
    } else if (event.key === "Escape") {
      setActiveIndex(null);
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-4 border border-line bg-white/70 p-4 md:flex-row md:items-end md:justify-between md:p-5">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink md:text-lg">{copy.chartTitle}</h3>
          <p className="mt-1 text-xs leading-6 text-muted">{copy.chartSubtitle}</p>
        </div>
        <fieldset className="min-w-0">
          <legend className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            {copy.controlLabel}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {copy.controlOptions.map((option) => {
              const selected = option.id === mode;
              return (
                <button
                  aria-pressed={selected}
                  className={`inline-flex min-h-10 items-center rounded-[3px] border px-3 py-1.5 text-xs font-semibold transition ${
                    selected
                      ? "border-petrol bg-petrol text-white"
                      : "border-line bg-white text-muted hover:border-petrol/45 hover:text-petrol"
                  }`}
                  key={option.id}
                  onClick={() => setMode(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="border border-t-0 border-line bg-white/55 p-3 md:p-4" ref={frameRef}>
        <svg
          aria-describedby={`${tableId}-summary`}
          className="tom-decay-chart-focus h-auto w-full touch-pan-y"
          onBlur={() => setActiveIndex(null)}
          onKeyDown={handleKeyDown}
          onPointerLeave={() => setActiveIndex(null)}
          onPointerMove={handlePointer}
          role="img"
          tabIndex={0}
          viewBox={`0 0 ${box.width} ${box.height}`}
        >
          <title>{copy.chartTitle}</title>

          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                stroke={tick === 0 ? "#0B3436" : "#E4DED3"}
                strokeOpacity={tick === 0 ? 0.55 : 1}
                strokeWidth="1"
                x1={plotLeft}
                x2={plotRight}
                y1={yScale(tick)}
                y2={yScale(tick)}
              />
              <text
                dominantBaseline="middle"
                fill={tick === 0 ? "#0B3436" : "#8A8F8B"}
                fontSize={compact ? 10 : 11}
                textAnchor="end"
                x={plotLeft - 8}
                y={yScale(tick)}
              >
                {format.bps(tick)}
              </text>
            </g>
          ))}

          {events.map((event, index) => {
            const x = xScale(event.year);
            if (x < plotLeft || x > plotRight) return null;
            const labelY = plotTop + 12 + (index % 2) * 15;
            return (
              <g key={event.id}>
                <line
                  stroke="#69706D"
                  strokeDasharray="3 4"
                  strokeOpacity="0.5"
                  strokeWidth="1"
                  x1={x}
                  x2={x}
                  y1={plotTop}
                  y2={plotBottom}
                />
                {compact ? null : (
                  <text fill="#69706D" fontSize="10" textAnchor="middle" x={x} y={labelY}>
                    {event.year} · {event.label}
                  </text>
                )}
              </g>
            );
          })}

          {visible.map((entry) => (
            <path
              d={bandPath(
                entry.points.map((point) => ({
                  x: xScale(point.year),
                  low: yScale(point.ci95LoBps),
                  high: yScale(point.ci95HiBps),
                })),
              )}
              fill={seriesColor[entry.id]}
              fillOpacity={mode === "both" ? (entry.id === "french" ? 0.05 : 0.1) : 0.13}
              key={`${entry.id}-band`}
            />
          ))}

          {visible.map((entry) => (
            <path
              d={linePath(
                entry.points.map((point) => ({ x: xScale(point.year), y: yScale(point.premiumBps) })),
              )}
              fill="none"
              key={`${entry.id}-line`}
              stroke={seriesColor[entry.id]}
              strokeDasharray={seriesDash[entry.id]}
              strokeLinecap="round"
              strokeOpacity={mode === "both" && entry.id === "french" ? 0.85 : 1}
              strokeWidth={mode === "both" && entry.id === "french" ? 1.9 : 2.4}
            />
          ))}

          {activePoint ? (
            <g>
              <line
                stroke="#0B3436"
                strokeOpacity="0.4"
                strokeWidth="1"
                x1={xScale(activePoint.year)}
                x2={xScale(activePoint.year)}
                y1={plotTop}
                y2={plotBottom}
              />
              {visible.map((entry) => {
                const point = entry.points[activeIndex!];
                return (
                  <circle
                    cx={xScale(point.year)}
                    cy={yScale(point.premiumBps)}
                    fill="#ffffff"
                    key={`${entry.id}-dot`}
                    r="4.5"
                    stroke={seriesColor[entry.id]}
                    strokeWidth="2.2"
                  />
                );
              })}
            </g>
          ) : null}

          <line stroke="#C9C2B6" strokeWidth="1" x1={plotLeft} x2={plotRight} y1={plotBottom} y2={plotBottom} />

          {xTicks.map((year) => (
            <text
              fill="#8A8F8B"
              fontSize={compact ? 10 : 11}
              key={year}
              textAnchor="middle"
              x={xScale(year)}
              y={plotBottom + 18}
            >
              {year}
            </text>
          ))}

          <text fill="#69706D" fontSize={compact ? 10 : 11} x={plotLeft} y={box.height - 8}>
            {copy.axisX}
          </text>
          <text fill="#69706D" fontSize={compact ? 10 : 11} textAnchor="end" x={plotRight} y={box.height - 8}>
            {copy.axisY}
          </text>
        </svg>

        <p className="sr-only" id={`${tableId}-summary`}>
          {copy.chartSummary}
        </p>

        <div aria-live="polite" className="mt-3 min-h-[4.5rem] border-t border-line/70 pt-3">
          {activePoint ? (
            <div className="grid gap-2 text-xs leading-5 sm:grid-cols-[auto_1fr] sm:gap-x-6">
              <p className="font-semibold text-ink">
                {copy.tooltip.window}: {activePoint.windowStart} → {activePoint.windowEnd}
              </p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {visible.map((entry) => {
                  const point = entry.points[activeIndex!];
                  return (
                    <li className="flex flex-wrap items-baseline gap-x-2 text-muted" key={entry.id}>
                      <span
                        aria-hidden="true"
                        className="inline-block h-2 w-4 rounded-full"
                        style={{ backgroundColor: seriesColor[entry.id] }}
                      />
                      <span className="font-semibold text-ink">{entry.short}</span>
                      <span className="font-mono tabular-nums">
                        {format.bps(point.premiumBps)} {content.labels.bpsPerDay}
                      </span>
                      <span className="font-mono tabular-nums">
                        {copy.tooltip.interval} {format.interval(point.ci95LoBps, point.ci95HiBps)}
                      </span>
                      <span className="font-mono tabular-nums">
                        {copy.tooltip.pValue} {format.pValue(point.hacP)}
                      </span>
                      <span className="font-mono tabular-nums">
                        {copy.tooltip.observations} {format.integer(point.observations)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {activePoint.isPartialWindow ? (
                <p className="text-muted sm:col-span-2">{copy.tooltip.partial}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-xs leading-5 text-muted">{copy.chartSummary}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border border-t-0 border-line bg-white/70 px-4 py-3 text-xs text-muted md:px-5">
        {series.map((entry) => (
          <span className="inline-flex items-center gap-2" key={entry.id}>
            <svg aria-hidden="true" className="h-2.5 w-7" viewBox="0 0 28 10">
              <line
                stroke={seriesColor[entry.id]}
                strokeDasharray={seriesDash[entry.id]}
                strokeWidth="2.4"
                x1="0"
                x2="28"
                y1="5"
                y2="5"
              />
            </svg>
            {entry.name}
          </span>
        ))}
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-3 w-7 rounded-[2px] bg-petrol/15" />
          {copy.bandLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <svg aria-hidden="true" className="h-2.5 w-7" viewBox="0 0 28 10">
            <line stroke="#69706D" strokeDasharray="3 4" strokeWidth="1.4" x1="14" x2="14" y1="0" y2="10" />
          </svg>
          {copy.eventsLabel}
        </span>
      </div>

      <div className="border border-t-0 border-line bg-white/50 px-4 py-3 md:px-5">
        <button
          aria-controls={tableId}
          aria-expanded={showTable}
          className="inline-flex min-h-10 items-center text-xs font-semibold text-petrol underline decoration-petrol/30 underline-offset-4 transition hover:decoration-petrol"
          onClick={() => setShowTable((current) => !current)}
          type="button"
        >
          {showTable ? copy.tableToggle.hide : copy.tableToggle.show}
        </button>
        {showTable ? (
          <div className="tom-decay-scroll mt-3 max-h-96 overflow-auto border border-line" id={tableId}>
            <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
              <caption className="sr-only">{copy.tableCaption}</caption>
              <thead className="sticky top-0 bg-panelSoft">
                <tr>
                  {copy.tableHeaders.map((header) => (
                    <th className="border-b border-line px-3 py-2 font-semibold text-ink" key={header} scope="col">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {series[0].points.map((point, index) =>
                  visible.map((entry) => {
                    const row = entry.points[index];
                    return (
                      <tr className="odd:bg-white/60" key={`${entry.id}-${row.windowEnd}`}>
                        <th className="px-3 py-1.5 font-mono font-normal tabular-nums text-muted" scope="row">
                          {row.windowEnd}
                          {row.isPartialWindow ? ` *` : ""}
                        </th>
                        <td className="px-3 py-1.5 text-muted">{entry.short}</td>
                        <td className="px-3 py-1.5 font-mono tabular-nums text-ink">{format.bps(row.premiumBps)}</td>
                        <td className="px-3 py-1.5 font-mono tabular-nums text-muted">
                          {format.interval(row.ci95LoBps, row.ci95HiBps)}
                        </td>
                        <td className="px-3 py-1.5 font-mono tabular-nums text-muted">{format.pValue(row.hacP)}</td>
                        <td className="px-3 py-1.5 font-mono tabular-nums text-muted">{format.integer(row.observations)}</td>
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
            <p className="border-t border-line bg-white/70 px-3 py-2 text-[11px] leading-5 text-muted">
              * {copy.tooltip.partial}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
