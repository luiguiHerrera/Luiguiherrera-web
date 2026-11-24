"use client";

import { useId, useState } from "react";
import { DashboardChartCursor } from './DashboardChartCursor';
import { DashboardDisclosureButton, DashboardValueBar } from "@/components/dashboard/DashboardPrimitives";
import { formatCapitalFlowDate, formatCapitalFlowUsdMillions } from "@/lib/dashboard/capital-flows-presentation";
import { buildGldFlowHistory } from "@/lib/dashboard/gld-flow-history";
import type { GldFlowPressurePoint } from "@/lib/dashboard/types";

export function GldHistoryPanel({ history, locale }: { history: GldFlowPressurePoint[]; locale: "es" | "en" }) {
  const [active, setActive] = useState<number | null>(null);
  const isEnglish = locale === "en";
  const flows = buildGldFlowHistory(history);
  const cumulative = flows.reduce<number[]>((values, point) => {
    values.push((values.at(-1) ?? 0) + point.impliedFlowMillions);
    return values;
  }, []);
  const maxDaily = Math.max(...flows.map(point => Math.abs(point.impliedFlowMillions)), 1);
  const min = cumulative.length ? Math.min(...cumulative) : 0;
  const max = cumulative.length ? Math.max(...cumulative) : 0;
  const range = Math.max(max - min, 1);
  const step = flows.length ? 92 / flows.length : 0;
  const points = flows.map((point, index) => ({
    ...point,
    cumulative: cumulative[index],
    x: 4 + step * (index + 0.5),
    y: 8 + (1 - (cumulative[index] - min) / range) * 25,
  }));
  const path = points.map(({ x, y }, index) => `${index ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const total = cumulative.at(-1) ?? 0;

  return (
    <div className="mt-5" data-gld-history>
      <div className="min-w-0 rounded border border-line bg-panelSoft px-4 py-5 sm:px-6" data-gld-history-chart data-flow-tone={total > 0 ? "positive" : total < 0 ? "negative" : "neutral"}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{isEnglish ? "Recent sessions" : "Sesiones recientes"}</h4>
            <p className="mt-2 text-sm font-semibold text-ink">{isEnglish ? "Estimated daily flow and available cumulative path" : "Flujo diario estimado y trayectoria acumulada disponible"}</p>
          </div>
          <p className="text-xs text-muted">{isEnglish ? "US$ millions" : "Millones de USD"}</p>
        </div>
        {points.length ? <>
          <div className="relative mt-4 h-48 sm:h-[220px] md:h-[244px]">
            <svg viewBox="0 0 100 78" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <line x1="4" x2="96" y1="38" y2="38" stroke="#ded8c9" strokeWidth=".6" vectorEffect="non-scaling-stroke" />
              <line x1="4" x2="96" y1="57" y2="57" stroke="#ded8c9" strokeWidth=".6" vectorEffect="non-scaling-stroke" />
              {points.map(point => {
                const height = Math.abs(point.impliedFlowMillions) / maxDaily * 17;
                return <rect key={point.date} x={point.x - step / 3} y={point.impliedFlowMillions > 0 ? 57 - height : 57} width={step * 2 / 3} height={Math.max(height, 0.5)} fill={point.impliedFlowMillions > 0 ? "#6f8f7b" : point.impliedFlowMillions < 0 ? "#a86464" : "#a8a29e"} rx="0.5" />;
              })}
              <path d={path} fill="none" stroke="#98753b" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              <DashboardChartCursor x={active === null ? null : points[active]?.x} date={active === null ? undefined : points[active]?.date} />
            </svg>
            {points.map((point, index) => <button key={point.date} type="button" aria-label={`${formatCapitalFlowDate(point.date, locale)} · ${isEnglish ? "estimated flow" : "flujo estimado"} ${formatCapitalFlowUsdMillions(point.impliedFlowMillions, locale)}`} className="absolute inset-y-0 -translate-x-1/2 bg-transparent" style={{ left: `${point.x}%`, width: `${step}%` }} onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(index)} onBlur={() => setActive(null)}>
              <span className="absolute left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#98753b] bg-panel" style={{ top: `${point.y / 78 * 100}%` }} aria-hidden="true" />
            </button>)}
            {active !== null && points[active] ? <div role="tooltip" className="pointer-events-none absolute inset-x-0 top-0 mx-auto w-fit max-w-full rounded border border-line bg-panel px-3 py-2 text-xs text-ink shadow-sm">
              <p>{formatCapitalFlowDate(points[active].date, locale)}</p>
              <p>{isEnglish ? "Daily estimate" : "Estimación diaria"}: {formatCapitalFlowUsdMillions(points[active].impliedFlowMillions, locale)}</p>
              <p>{isEnglish ? "Available cumulative" : "Acumulado disponible"}: {formatCapitalFlowUsdMillions(points[active].cumulative, locale)}</p>
            </div> : null}
          </div>
          <div className="mt-1 flex justify-between gap-2 text-xs text-muted">
            <span>{formatCapitalFlowDate(points[0].date, locale)}</span>
            <span>{formatCapitalFlowDate(points.at(-1)!.date, locale)}</span>
          </div>
          <p className="mt-3 text-xs text-muted">{isEnglish ? "The estimate uses changes in shares outstanding; the first observation is the comparison base." : "La estimación usa el cambio en las participaciones; la primera observación sirve como base de comparación."}</p>
        </> : <p className="py-10 text-center text-sm text-muted">{isEnglish ? "Not enough history" : "Historial insuficiente"}</p>}
      </div>
    </div>
  );
}

export function GldSessionsTable({ history, locale }: { history: GldFlowPressurePoint[]; locale: "es" | "en" }) {
  const [tableOpen, setTableOpen] = useState(false);
  const tableId = useId();
  const isEnglish = locale === "en";
  const flows = buildGldFlowHistory(history);
  const max = Math.max(...flows.map(point => Math.abs(point.impliedFlowMillions)));
  if (!flows.length) return null;
  return <section className="mt-5 border-t border-line pt-4" data-flow-sessions>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h4 className="text-sm font-semibold text-ink">{isEnglish ? "Recent-session detail" : "Detalle de sesiones recientes"}</h4><p className="mt-1 text-xs text-muted">{flows.length} {isEnglish ? "sessions with an estimated flow" : "sesiones con flujo estimado"}</p></div>
      <DashboardDisclosureButton controls={tableId} expanded={tableOpen} expandedLabel={isEnglish ? "Hide table" : "Ocultar tabla"} collapsedLabel={isEnglish ? "Show table" : "Mostrar tabla"} onClick={() => setTableOpen(open => !open)} />
    </div>
    {tableOpen ? <div id={tableId} className="mt-3 max-w-full overflow-x-auto" data-flow-session-table>
      <table className="w-full min-w-[38rem] border-collapse text-left text-xs">
        <thead><tr><th scope="col">{isEnglish ? "Date" : "Fecha"}</th><th scope="col" className="text-right">{isEnglish ? "Estimated net flow" : "Flujo neto estimado"}</th><th scope="col">{isEnglish ? "Direction" : "Dirección"}</th></tr></thead>
        <tbody>{[...flows].reverse().map(point => <tr key={point.date}>
          <td>{formatCapitalFlowDate(point.date, locale)}</td>
          <td className="tabular-nums"><span className="grid grid-cols-[minmax(4rem,1fr)_auto] items-center gap-4"><DashboardValueBar value={point.impliedFlowMillions} max={max} /><span>{formatCapitalFlowUsdMillions(point.impliedFlowMillions, locale)}</span></span></td>
          <td>{point.impliedFlowMillions > 0 ? isEnglish ? "Inflow" : "Entrada" : point.impliedFlowMillions < 0 ? isEnglish ? "Outflow" : "Salida" : isEnglish ? "No change" : "Sin cambio"}</td>
        </tr>)}</tbody>
      </table>
    </div> : null}
  </section>;
}
