"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import type { TrendItem, TrendObservableVehicleKind, TrendRisk, TrendRole, TrendVehicle, TrendsContent } from "@/lib/trends/trends-content";

const vehicleLabels: Record<TrendsContent["locale"], Record<TrendVehicle, string>> = {
  es: {
    "indice amplio": "Índice amplio",
    "ETF sectorial": "ETF sectorial",
    "ETF tematico": "ETF temático",
    "accion individual": "Acción individual",
    "empresa privada": "Empresa privada",
    infraestructura: "Infraestructura",
    observacion: "Observación",
  },
  en: {
    "indice amplio": "Broad index",
    "ETF sectorial": "Sector ETF",
    "ETF tematico": "Thematic ETF",
    "accion individual": "Individual stock",
    "empresa privada": "Private company",
    infraestructura: "Infrastructure",
    observacion: "Observation",
  },
};

const roleLabels: Record<TrendsContent["locale"], Record<TrendRole, string>> = {
  es: {
    nucleo: "Núcleo",
    satelite: "Satélite",
    apuesta: "Apuesta",
    "todavia no invertible": "Todavía no invertible",
  },
  en: {
    nucleo: "Core",
    satelite: "Satellite",
    apuesta: "Bet",
    "todavia no invertible": "Not investable yet",
  },
};

const riskLabels: Record<TrendsContent["locale"], Record<TrendRisk, string>> = {
  es: {
    valoracion: "Valoración",
    hype: "Hype",
    regulacion: "Regulación",
    competencia: "Competencia",
    concentracion: "Concentración",
    timing: "Timing",
    liquidez: "Liquidez",
  },
  en: {
    valoracion: "Valuation",
    hype: "Hype",
    regulacion: "Regulation",
    competencia: "Competition",
    concentracion: "Concentration",
    timing: "Timing",
    liquidez: "Liquidity",
  },
};

const observableKindLabels: Record<TrendsContent["locale"], Record<TrendObservableVehicleKind, string>> = {
  es: {
    "indice amplio": "Índice amplio",
    "ETF dedicado": "ETF dedicado",
    "ETF sectorial": "ETF sectorial",
    "ETF tematico": "ETF temático",
    "accion liquida": "Acciones líquidas para observación",
    infraestructura: "Infraestructura",
    observacion: "Observación",
  },
  en: {
    "indice amplio": "Broad index",
    "ETF dedicado": "Dedicated ETF",
    "ETF sectorial": "Sector ETF",
    "ETF tematico": "Thematic ETF",
    "accion liquida": "Liquid stocks for observation",
    infraestructura: "Infrastructure",
    observacion: "Observation",
  },
};

const observableCopy = {
  es: {
    label: "Ejemplos observables, no recomendaciones.",
    openLevels: "Ver niveles",
  },
  en: {
    label: "Observable examples, not recommendations.",
    openLevels: "View levels",
  },
};

function Pill({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "strong" }) {
  return (
    <span
      className={
        tone === "strong"
          ? "inline-flex rounded-[4px] border border-petrol/25 bg-[#eef5f2] px-2.5 py-1 text-xs font-semibold text-petrol"
          : "inline-flex rounded-[4px] border border-line bg-white/65 px-2.5 py-1 text-xs font-medium text-muted"
      }
    >
      {children}
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-line/80 pb-4 last:border-b-0 last:pb-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-petrol">{label}</p>
      <div className="mt-2 text-sm leading-6 text-muted">{children}</div>
    </div>
  );
}

function TrendCard({
  content,
  isSelected,
  onSelect,
  trend,
}: {
  content: TrendsContent;
  isSelected: boolean;
  onSelect: () => void;
  trend: TrendItem;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`group flex min-h-[17rem] w-full flex-col rounded-[6px] border bg-white/72 p-4 text-left shadow-[0_10px_28px_rgba(11,52,54,0.035)] transition hover:border-petrol hover:bg-white sm:p-5 ${
        isSelected ? "border-petrol ring-2 ring-petrol/10" : "border-line"
      }`}
    >
      <div className="flex min-w-0 flex-col flex-wrap items-start gap-3">
        <span className="inline-flex w-fit max-w-full self-start whitespace-normal break-words rounded-[4px] border border-petrol/20 bg-paper px-2 py-1 text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-petrol [overflow-wrap:anywhere]">
          {trend.educationalState}
        </span>
        <h3 className="min-w-0 w-full whitespace-normal break-words text-lg font-semibold leading-tight text-ink">{trend.name}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{trend.short}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {trend.primaryRisks.slice(0, 3).map((risk) => (
          <Pill key={risk}>{riskLabels[content.locale][risk]}</Pill>
        ))}
      </div>
      <span className="mt-auto pt-5 text-sm font-semibold text-petrol transition group-hover:translate-x-0.5">
        {content.map.cta} &rarr;
      </span>
    </button>
  );
}

function TrendDetailPanel({ content, trend }: { content: TrendsContent; trend: TrendItem }) {
  const labels = content.detailLabels;
  const levelsBasePath = content.locale === "en" ? "/en/statistical-levels" : "/niveles-estadisticos";
  const copy = observableCopy[content.locale];

  return (
    <aside className="rounded-[6px] border border-petrol/25 bg-white/82 p-4 shadow-[0_18px_48px_rgba(11,52,54,0.07)] sm:p-5 lg:sticky lg:top-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-petrol">{content.map.selectedLabel}</p>
      <h3 className="mt-3 text-2xl font-semibold leading-tight text-ink">{trend.name}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{trend.short}</p>

      <div className="mt-5 grid gap-4">
        <DetailRow label={labels.changing}>{trend.changing}</DetailRow>
        <DetailRow label={labels.valueChain}>{trend.valueChain}</DetailRow>
        <DetailRow label={labels.capture}>{trend.capture}</DetailRow>
        <DetailRow label={labels.vehicles}>
          <div className="flex flex-wrap gap-2">
            {trend.vehicles.map((vehicle) => (
              <Pill key={vehicle} tone="strong">
                {vehicleLabels[content.locale][vehicle]}
              </Pill>
            ))}
          </div>
          {trend.observableVehicles.length > 0 ? (
            <div className="mt-4 border-t border-line/80 pt-4">
              <p className="text-xs font-semibold leading-5 text-ink">{copy.label}</p>
              <div className="mt-3 grid gap-2">
                {trend.observableVehicles.map((vehicle) => {
                  const href = vehicle.statisticalLevelsSymbol
                    ? `${levelsBasePath}?symbol=${encodeURIComponent(vehicle.statisticalLevelsSymbol)}`
                    : null;
                  const body = (
                    <div className="rounded-[6px] border border-line bg-paper/75 p-3 transition hover:border-petrol">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">
                            {vehicle.ticker} · {vehicle.name}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-petrol">{observableKindLabels[content.locale][vehicle.kind]}</p>
                        </div>
                        {href ? <span className="shrink-0 text-xs font-semibold text-petrol">{copy.openLevels} &rarr;</span> : null}
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted">{vehicle.note}</p>
                    </div>
                  );

                  return href ? (
                    <Link key={`${vehicle.ticker}-${vehicle.kind}`} href={href} className="block">
                      {body}
                    </Link>
                  ) : (
                    <div key={`${vehicle.ticker}-${vehicle.kind}`}>{body}</div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </DetailRow>
        <DetailRow label={labels.role}>
          <Pill tone="strong">{roleLabels[content.locale][trend.role]}</Pill>
        </DetailRow>
        <DetailRow label={labels.bullCase}>{trend.bullCase}</DetailRow>
        <DetailRow label={labels.bearCase}>{trend.bearCase}</DetailRow>
        <DetailRow label={labels.risks}>
          <div className="flex flex-wrap gap-2">
            {trend.risks.map((risk) => (
              <Pill key={risk}>{riskLabels[content.locale][risk]}</Pill>
            ))}
          </div>
        </DetailRow>
        <DetailRow label={labels.failure}>{trend.failure}</DetailRow>
        <DetailRow label={labels.controlQuestion}>
          <strong className="font-semibold text-ink">{trend.controlQuestion}</strong>
        </DetailRow>
        <DetailRow label={labels.nextStep}>{trend.nextStep}</DetailRow>
      </div>
    </aside>
  );
}

export function TrendsExplorer({ content, readingCard }: { content: TrendsContent; readingCard?: React.ReactNode }) {
  const firstTrend = content.trends[0];
  const [selectedId, setSelectedId] = useState(firstTrend?.id ?? "");

  if (!firstTrend) return null;

  const selectedTrend = content.trends.find((trend) => trend.id === selectedId) ?? firstTrend;

  return (
    <div className="min-w-0 max-w-full [overflow-wrap:anywhere]">
      <section className="border-b border-line bg-paper">
        <div className="mx-auto grid min-w-0 max-w-7xl gap-8 px-4 py-10 md:px-5 md:py-16 lg:grid-cols-[0.66fr_0.34fr] lg:items-end">
          <div className="min-w-0">
            <p className="w-fit rounded-full border border-petrol/20 bg-white/65 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-petrol">
              {content.hero.eyebrow}
            </p>
            <h1 className="mt-5 max-w-full break-words text-4xl font-semibold leading-[1.02] text-ink md:max-w-4xl md:text-6xl">
              {content.hero.title}
            </h1>
            <p className="mt-5 max-w-full text-xl leading-8 text-petrol md:max-w-3xl md:text-2xl md:leading-9">
              {content.hero.subtitle}
            </p>
            <p className="mt-5 max-w-full text-base leading-7 text-muted md:max-w-3xl md:text-lg md:leading-8">
              {content.hero.text}
            </p>
          </div>
          <div className="min-w-0 rounded-[6px] border border-line bg-white/75 p-4 shadow-[0_12px_32px_rgba(11,52,54,0.045)] md:p-5">
            <div className="flex flex-wrap gap-2">
              {content.hero.badges.map((badge) => (
                <Pill key={badge} tone={badge === "No recomendación" || badge === "No recommendation" ? "strong" : "neutral"}>
                  {badge}
                </Pill>
              ))}
            </div>
            <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">{content.hero.note}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 md:px-5">{readingCard}</div>

      <section className="border-b border-line bg-white/55">
        <div className="mx-auto max-w-7xl px-4 py-9 md:px-5 md:py-12">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[0.34fr_1fr] lg:items-start">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">{content.system.eyebrow}</p>
              <h2 className="mt-3 break-words text-2xl font-semibold leading-tight text-ink">{content.system.title}</h2>
              <p className="mt-4 text-sm leading-6 text-muted">{content.system.intro}</p>
            </div>
            <div className="grid min-w-0 gap-3 md:grid-cols-3">
              {content.system.items.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[6px] border border-line bg-white/75 p-4 shadow-[0_10px_28px_rgba(11,52,54,0.035)] transition hover:border-petrol hover:bg-white"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-petrol">
                    {String(index + 1).padStart(2, "0")} · {item.label}
                  </p>
                  <p className="mt-4 text-lg font-semibold leading-6 text-ink">{item.question}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-16">
          <div className="grid min-w-0 gap-5 lg:grid-cols-[0.45fr_0.55fr] lg:items-end">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">{content.map.eyebrow}</p>
              <h2 className="mt-3 break-words text-3xl font-semibold leading-tight text-ink">{content.map.title}</h2>
            </div>
            <p className="min-w-0 max-w-full text-base leading-7 text-muted md:max-w-2xl lg:justify-self-end">{content.map.intro}</p>
          </div>

          <div className="mt-8 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(21rem,0.45fr)] lg:items-start">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {content.trends.map((trend) => (
                <TrendCard
                  key={trend.id}
                  content={content}
                  isSelected={trend.id === selectedTrend.id}
                  trend={trend}
                  onSelect={() => setSelectedId(trend.id)}
                />
              ))}
            </div>
            <TrendDetailPanel content={content} trend={selectedTrend} />
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-[#f3efe6]">
        <div className="mx-auto grid min-w-0 max-w-7xl gap-7 px-4 py-10 md:px-5 md:py-14 lg:grid-cols-[0.36fr_1fr]">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">{content.methodology.eyebrow}</p>
            <h2 className="mt-3 break-words text-3xl font-semibold leading-tight text-ink">{content.methodology.title}</h2>
            <p className="mt-4 text-base leading-7 text-muted">{content.methodology.intro}</p>
          </div>
          <div className="min-w-0">
            <div className="grid gap-3 md:grid-cols-2">
              {content.methodology.steps.map((step, index) => (
                <div key={step} className="rounded-[6px] border border-line bg-white/72 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-petrol">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-3 font-semibold leading-6 text-ink">{step}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 rounded-[6px] border border-petrol/25 bg-white/80 p-4 text-base font-semibold leading-7 text-petrol">
              {content.methodology.closing}
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white/55">
        <div className="mx-auto grid min-w-0 max-w-7xl gap-7 px-4 py-10 md:px-5 md:py-14 lg:grid-cols-[0.4fr_0.6fr] lg:items-start">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">{content.tension.title}</p>
            <p className="mt-4 text-lg leading-8 text-ink">{content.tension.text}</p>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            {content.tension.reasons.map((reason) => (
              <div key={reason} className="border-l border-petrol/25 bg-white/50 px-4 py-3">
                <p className="text-sm font-semibold leading-6 text-ink">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
          <div className="grid min-w-0 gap-5 lg:grid-cols-[0.34fr_1fr] lg:items-start">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">{content.sources.eyebrow}</p>
              <h2 className="mt-3 break-words text-3xl font-semibold leading-tight text-ink">{content.sources.title}</h2>
              <p className="mt-4 text-base leading-7 text-muted">{content.sources.intro}</p>
            </div>
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              {content.sources.items.map((item) => (
                <div key={item.source} className="rounded-[6px] border border-line bg-white/72 p-4">
                  <h3 className="font-semibold text-ink">{item.source}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.note}</p>
                </div>
              ))}
              <p className="rounded-[6px] border border-petrol/25 bg-[#eef5f2] p-4 text-sm font-semibold leading-6 text-petrol md:col-span-2">
                {content.sources.creditNote}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
