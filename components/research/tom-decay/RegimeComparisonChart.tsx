"use client";

import { useId, useMemo, useState } from "react";
import type { TomDecayContent } from "@/lib/research/tom-decay/content";
import { GlossaryText } from "@/components/research/tom-decay/GlossaryLink";
import { createTomFormatters } from "@/lib/research/tom-decay/format";
import type { RegimeEstimate, TomDatasetId, TomRegimeId } from "@/lib/research/tom-decay/types";

type RegimeSeries = {
  id: TomDatasetId;
  name: string;
  short: string;
  estimates: readonly RegimeEstimate[];
};

type RegimeComparisonChartProps = {
  content: TomDecayContent;
  series: RegimeSeries[];
};

const seriesColor: Record<TomDatasetId, string> = {
  yahoo: "#0B3436",
  french: "#9A7A44",
};

const WIDTH = 900;
const HEIGHT = 340;
const TOP = 24;
const BOTTOM = 72;
const LEFT = 54;
const RIGHT = 22;

export function RegimeComparisonChart({ content, series }: RegimeComparisonChartProps) {
  const copy = content.replication;
  const format = useMemo(() => createTomFormatters(content.locale), [content.locale]);
  const labels = content.labels;
  const [active, setActive] = useState<{ regime: TomRegimeId; dataset: TomDatasetId } | null>(null);
  const detailId = useId();

  const regimes = series[0].estimates.map((estimate) => estimate.regime);
  const values = series.flatMap((entry) => entry.estimates.map((estimate) => estimate.premiumBps));
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const span = maxValue - minValue || 1;
  const plotTop = TOP;
  const plotBottom = HEIGHT - BOTTOM;
  const scaleY = (value: number) =>
    plotBottom - ((value - minValue) / span) * (plotBottom - plotTop) * 0.92 - 8;
  const bandWidth = (WIDTH - LEFT - RIGHT) / regimes.length;
  const centerX = (index: number) => LEFT + bandWidth * (index + 0.5);

  const activeEstimate = active
    ? series
        .find((entry) => entry.id === active.dataset)
        ?.estimates.find((estimate) => estimate.regime === active.regime)
    : null;
  const activeSeries = active ? series.find((entry) => entry.id === active.dataset) : null;

  return (
    <div className="min-w-0">
      <div className="border border-line bg-white/70 p-4 md:p-5">
        <h3 className="text-base font-semibold text-ink md:text-lg">{copy.chartTitle}</h3>

        <div className="tom-decay-scroll mt-4 overflow-x-auto">
          <svg
            aria-describedby={`${detailId}-summary`}
            className="h-auto w-full min-w-[34rem]"
            role="img"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          >
            <title>{copy.chartTitle}</title>

            {[0, 5, 10, 15].map((tick) => (
              <g key={tick}>
                <line
                  stroke={tick === 0 ? "#0B3436" : "#E4DED3"}
                  strokeOpacity={tick === 0 ? 0.5 : 1}
                  strokeWidth="1"
                  x1={LEFT}
                  x2={WIDTH - RIGHT}
                  y1={scaleY(tick)}
                  y2={scaleY(tick)}
                />
                <text
                  dominantBaseline="middle"
                  fill="#8A8F8B"
                  fontSize="11"
                  textAnchor="end"
                  x={LEFT - 8}
                  y={scaleY(tick)}
                >
                  {format.bps(tick)}
                </text>
              </g>
            ))}

            {regimes.map((regimeId, index) => {
              const x = centerX(index);
              const isShortSample = regimeId === "T1";
              return (
                <g key={regimeId}>
                  {index % 2 === 1 ? (
                    <rect
                      fill="#0B3436"
                      fillOpacity="0.02"
                      height={plotBottom - plotTop}
                      width={bandWidth}
                      x={LEFT + bandWidth * index}
                      y={plotTop}
                    />
                  ) : null}
                  {series.map((entry, entryIndex) => {
                    const estimate = entry.estimates[index];
                    const pairedEstimate = series[entryIndex === 0 ? 1 : 0]?.estimates[index];
                    const dotX = x + (entryIndex === 0 ? -13 : 13);
                    const labelsAreClose = pairedEstimate
                      ? Math.abs(scaleY(estimate.premiumBps) - scaleY(pairedEstimate.premiumBps)) < 18
                      : false;
                    const labelOffsetY = labelsAreClose && entryIndex === 1
                      ? 22
                      : estimate.premiumBps >= 0 ? -15 : 22;
                    const selected = active?.regime === regimeId && active?.dataset === entry.id;
                    return (
                      <g
                        aria-label={`${entry.name} · ${labels.regimes[regimeId].name}: ${format.bps(estimate.premiumBps)} ${labels.bpsPerDay}, ${labels.hacP} ${format.pValue(estimate.hacP)}`}
                        className="tom-decay-chart-focus cursor-pointer"
                        key={entry.id}
                        onBlur={() => setActive(null)}
                        onFocus={() => setActive({ regime: regimeId, dataset: entry.id })}
                        onPointerEnter={() => setActive({ regime: regimeId, dataset: entry.id })}
                        onPointerLeave={() => setActive(null)}
                        role="img"
                        tabIndex={0}
                      >
                        <line
                          stroke={seriesColor[entry.id]}
                          strokeOpacity="0.35"
                          strokeWidth="1.4"
                          x1={dotX}
                          x2={dotX}
                          y1={scaleY(0)}
                          y2={scaleY(estimate.premiumBps)}
                        />
                        <circle
                          cx={dotX}
                          cy={scaleY(estimate.premiumBps)}
                          fill={entryIndex === 0 ? seriesColor[entry.id] : "#ffffff"}
                          r={selected ? 8.5 : 7}
                          stroke={seriesColor[entry.id]}
                          strokeWidth="2.4"
                        />
                        <text
                          fill="#111716"
                          fontSize="12"
                          fontWeight="600"
                          textAnchor="middle"
                          x={dotX}
                          y={scaleY(estimate.premiumBps) + labelOffsetY}
                        >
                          {format.bps(estimate.premiumBps)}
                        </text>
                      </g>
                    );
                  })}
                  <text fill="#111716" fontSize="12" fontWeight="600" textAnchor="middle" x={x} y={plotBottom + 24}>
                    {labels.regimes[regimeId].short}
                  </text>
                  {isShortSample ? (
                    <text fill="#8A4E45" fontSize="10.5" textAnchor="middle" x={x} y={plotBottom + 42}>
                      {labels.shortSample}
                    </text>
                  ) : null}
                </g>
              );
            })}

            <line stroke="#C9C2B6" strokeWidth="1" x1={LEFT} x2={WIDTH - RIGHT} y1={plotBottom} y2={plotBottom} />
            <a className="tom-decay-chart-focus" href="#glossary-bps">
              <text fill="#69706D" fontSize="11" x={LEFT} y={HEIGHT - 8}>
                {copy.axisY}
              </text>
            </a>
          </svg>
        </div>

        <p className="sr-only" id={`${detailId}-summary`}>
          {copy.chartSummary}
        </p>

        <div aria-live="polite" className="mt-3 min-h-[3.25rem] border-t border-line/70 pt-3 text-xs leading-6">
          {activeEstimate && activeSeries ? (
            <p className="flex flex-wrap gap-x-5 gap-y-1 text-muted">
              <span className="font-semibold text-ink">
                {activeSeries.name} · {labels.regimes[activeEstimate.regime].name}
              </span>
              <span className="font-mono tabular-nums">
                {labels.premium} {format.bps(activeEstimate.premiumBps)} <GlossaryText text={labels.bpsPerDay} />
              </span>
              <span className="font-mono tabular-nums">
                <GlossaryText text={labels.hacP} /> {format.pValue(activeEstimate.hacP)}
              </span>
              <span className="font-mono tabular-nums">
                {labels.tomDays} {format.integer(activeEstimate.tomDays)}
              </span>
              <span className="font-mono tabular-nums">
                {labels.observations} {format.integer(activeEstimate.observations)}
              </span>
            </p>
          ) : (
            <p className="text-muted">{copy.shortSampleNote}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border border-t-0 border-line bg-white/70 px-4 py-3 text-xs text-muted md:px-5">
        {series.map((entry, index) => (
          <span className="inline-flex items-center gap-2" key={entry.id}>
            <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 12 12">
              <circle
                cx="6"
                cy="6"
                fill={index === 0 ? seriesColor[entry.id] : "#ffffff"}
                r="4.4"
                stroke={seriesColor[entry.id]}
                strokeWidth="2.2"
              />
            </svg>
            {entry.name}
          </span>
        ))}
      </div>

      <div className="tom-decay-scroll overflow-x-auto border border-t-0 border-line bg-white/50">
        <table className="w-full min-w-[30rem] border-collapse text-left text-xs">
          <caption className="px-4 py-3 text-left text-[11px] leading-5 text-muted"><GlossaryText text={copy.tableCaption} /></caption>
          <thead>
            <tr className="bg-panelSoft">
              <th className="border-y border-line px-4 py-2 font-semibold text-ink" scope="col">
                {copy.regimeHeader}
              </th>
              {series.map((entry) => (
                <th className="border-y border-line px-4 py-2 text-right font-semibold text-ink" key={entry.id} scope="col">
                  {entry.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {regimes.map((regimeId, index) => (
              <tr className="odd:bg-white/60" key={regimeId}>
                <th className="px-4 py-2 font-normal text-muted" scope="row">
                  {labels.regimes[regimeId].name}
                  {regimeId === "T1" ? (
                    <span className="ml-2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em] text-danger">
                      {labels.shortSample}
                    </span>
                  ) : null}
                </th>
                {series.map((entry) => (
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-ink" key={entry.id}>
                    <span className="inline-flex flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5">
                      <span className="whitespace-nowrap font-semibold">
                        {format.bps(entry.estimates[index].premiumBps)}
                      </span>
                      <span aria-hidden="true" className="hidden text-line sm:inline">
                        |
                      </span>
                      <span className="whitespace-nowrap text-[11px] text-muted">
                        <GlossaryText text={labels.hacP} /> {format.pValue(entry.estimates[index].hacP)}
                      </span>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
