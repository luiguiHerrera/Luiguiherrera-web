"use client";

import { useId, useState } from "react";
import {
  DashboardDisclosureButton,
  DashboardStatus,
  dashboardModuleEyebrowClassName,
  dashboardModuleTitleClassName,
} from "@/components/dashboard/DashboardPrimitives";
import { translateDashboardText } from "@/lib/dashboard/translate-dashboard-copy";
import type { MarketBreadthValues } from "@/lib/dashboard/market-breadth";

type SourceMetadata = {
  name: string;
  url?: string;
  updated: string;
  status?: "demo" | "manual" | "live_pending" | "automated" | "fallback" | "delayed" | "unavailable";
};

type MarketBreadthPanelProps = {
  locale: "es" | "en";
  values: MarketBreadthValues;
  statisticalSource: SourceMetadata;
  sectorSource: SourceMetadata | null;
};

function metricCellClass(index: number) {
  return [
    "min-w-0 px-3 py-3 md:px-4",
    index === 0 ? "pl-0 md:pl-0" : "",
    index % 2 === 1 ? "border-l border-line" : "",
    index >= 2 ? "border-t border-line md:border-t-0" : "",
    index >= 1 ? "md:border-l md:border-line" : "",
    index === 4 ? "col-span-2 md:col-span-1" : "",
  ].join(" ");
}

export function MarketBreadthPanel({ locale, values, statisticalSource, sectorSource }: MarketBreadthPanelProps) {
  const [contextOpen, setContextOpen] = useState(false);
  const contextId = useId();
  const sectorDataAvailable = sectorSource?.status === "automated";
  const copy = locale === "en"
    ? {
        eyebrow: "Market breadth",
        title: "Market breadth",
        description: "Evaluates whether market movement is supported by broad participation or concentrated in a few segments.",
        status: sectorDataAvailable ? "Processed public data" : "Processed public data · partial",
        showContext: "Show context",
        hideContext: "Hide context",
        positiveSectors: "Positive sectors",
        sectorTrend: "Sectors above long average",
        methodology: "Source and methodology",
        statistical: "Relative ratios and long-average participation",
        sectors: "Positive-sector participation",
        updated: "Updated",
        unavailable: "Classic breadth is not yet available",
        unavailableDetail: "Advance/decline data and new-high/new-low series are not included because no reliable automated source is connected.",
        limitation: "These are complementary participation proxies. They do not form a combined signal and may have different update times.",
      }
    : {
        eyebrow: "Amplitud de mercado",
        title: "Amplitud de mercado",
        description: "Evalúa si el movimiento del mercado está acompañado por una participación amplia o concentrado en pocos segmentos.",
        status: sectorDataAvailable ? "Datos públicos procesados" : "Datos públicos procesados · parcial",
        showContext: "Mostrar contexto",
        hideContext: "Ocultar contexto",
        positiveSectors: "Sectores positivos",
        sectorTrend: "Sectores sobre media larga",
        methodology: "Fuente y metodología",
        statistical: "Ratios relativos y participación sobre media larga",
        sectors: "Participación de sectores positivos",
        updated: "Actualización",
        unavailable: "Amplitud clásica no disponible todavía",
        unavailableDetail: "No se incluyen avances/descensos ni series de máximos y mínimos porque no existe una fuente automatizada fiable conectada.",
        limitation: "Son proxies complementarios de participación. No forman una señal combinada y pueden tener tiempos de actualización distintos.",
      };
  const explanations = locale === "en"
    ? [
        ["RSP/SPY", "Equal weight versus the S&P 500 indicates whether the average stock is keeping pace with the capitalization-weighted index."],
        ["IWM/SPY", "Small caps versus the S&P 500 helps assess whether risk participation is broadening."],
        ["QQQ/SPY", "Growth and technology versus the S&P 500 provides context on leadership concentration."],
        ["Positive sectors", "Counts sector proxies with a positive return over the current one-week observation."],
        ["Sectors above long average", "Counts sector ETFs trading above the long moving average in the statistical snapshot."],
      ]
    : [
        ["RSP/SPY", "La ponderación equiponderada frente al S&P 500 indica si la acción promedio acompaña al índice ponderado por capitalización."],
        ["IWM/SPY", "Las empresas de menor capitalización frente al S&P 500 ayudan a evaluar si la participación de riesgo se amplía."],
        ["QQQ/SPY", "Crecimiento y tecnología frente al S&P 500 aporta contexto sobre la concentración del liderazgo."],
        ["Sectores positivos", "Cuenta los proxies sectoriales con retorno positivo en la observación actual de una semana."],
        ["Sectores sobre media larga", "Cuenta los ETFs sectoriales que cotizan sobre la media larga en el corte estadístico."],
      ];
  const statisticalSourceName = locale === "en" ? "Processed public market data · own calculations" : statisticalSource.name;
  const sectorSourceName = sectorSource ? (locale === "en" ? translateDashboardText(sectorSource.name) : sectorSource.name) : null;
  const sectorUpdated = sectorSource ? (locale === "en" ? translateDashboardText(sectorSource.updated) : sectorSource.updated) : null;
  const metrics = [
    ["RSP/SPY", values.rspVsSpy],
    ["IWM/SPY", values.iwmVsSpy],
    ["QQQ/SPY", values.qqqVsSpy],
    [copy.positiveSectors, values.positiveSectors],
    [copy.sectorTrend, values.sectorsOverLongAverage],
  ];

  return (
    <article className="min-w-0 border border-line bg-panel px-4 py-5 shadow-[0_14px_32px_rgba(51,45,39,0.05)] sm:px-5 md:px-7 md:py-6" data-market-breadth-module>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={dashboardModuleEyebrowClassName}>{copy.eyebrow}</p>
        <DashboardStatus label={copy.status} tone={sectorDataAvailable ? "positive" : "warning"} />
      </div>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h3 className={dashboardModuleTitleClassName}>{copy.title}</h3>
          <p className="mt-3 text-sm leading-6 text-muted md:text-base">{copy.description}</p>
        </div>
        <DashboardDisclosureButton
          controls={contextId}
          expanded={contextOpen}
          expandedLabel={copy.hideContext}
          collapsedLabel={copy.showContext}
          onClick={() => setContextOpen((open) => !open)}
        />
      </div>
      <div className="mt-5 grid grid-cols-2 border-y border-line md:grid-cols-5" data-breadth-metrics>
        {metrics.map(([label, value], index) => (
          <div key={label} className={metricCellClass(index)}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted sm:text-[11px]">{label}</p>
            <p className="mt-1.5 text-sm font-semibold tabular-nums text-ink sm:text-base">{value}</p>
          </div>
        ))}
      </div>
      {contextOpen ? (
        <div id={contextId} className="mt-5 border-t border-line pt-5" data-breadth-context>
          <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
            {explanations.map(([label, explanation]) => (
              <div key={label} className="border-l border-line pl-3">
                <h4 className="text-sm font-semibold text-ink">{label}</h4>
                <p className="mt-1.5 text-sm leading-6 text-muted">{explanation}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.methodology}</h4>
            <div className="mt-3 grid gap-4 text-xs leading-5 text-muted lg:grid-cols-2">
              <div>
                <p className="font-semibold text-ink">{copy.statistical}</p>
                <p className="mt-1">
                  {statisticalSource.url ? (
                    <a href={statisticalSource.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">{statisticalSourceName}</a>
                  ) : statisticalSourceName}
                </p>
                <p className="mt-1"><span className="font-semibold text-ink">{copy.updated}:</span> {statisticalSource.updated}</p>
              </div>
              <div>
                <p className="font-semibold text-ink">{copy.sectors}</p>
                <p className="mt-1">
                  {sectorSource?.url ? (
                    <a href={sectorSource.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">{sectorSourceName}</a>
                  ) : sectorSourceName ?? copy.unavailable}
                </p>
                {sectorSource ? <p className="mt-1"><span className="font-semibold text-ink">{copy.updated}:</span> {sectorUpdated}</p> : null}
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">{copy.limitation}</p>
          </div>
          <div className="mt-4 bg-panelSoft/35 px-4 py-3 text-xs leading-5 text-muted">
            <p className="font-semibold text-ink">{copy.unavailable}</p>
            <p className="mt-1">{copy.unavailableDetail}</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}
