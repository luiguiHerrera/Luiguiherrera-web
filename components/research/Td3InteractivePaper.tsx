"use client";

import { useState } from "react";
import type { CashProtocol, Td3PaperContent } from "@/lib/research/td3-paper";

type Td3InteractivePaperProps = {
  content: Td3PaperContent;
};

function SectionHeading({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) {
  return (
    <div className="min-w-0">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{eyebrow}</p> : null}
      <h2 className="mt-2 max-w-[20rem] break-words text-2xl font-semibold leading-tight text-ink sm:max-w-[calc(100vw-2rem)] md:max-w-4xl md:text-4xl">{title}</h2>
      {text ? <p className="mt-4 max-w-[20rem] break-words text-sm leading-6 text-muted sm:max-w-[calc(100vw-2rem)] md:max-w-3xl md:text-base md:leading-7">{text}</p> : null}
    </div>
  );
}

function MetricList({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="min-w-0 border border-line bg-white/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-petrol">{title}</p>
      <div className="mt-4 grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-w-0 items-baseline justify-between gap-4 border-b border-line/80 pb-2 last:border-b-0 last:pb-0">
            <span className="min-w-0 text-sm leading-5 text-muted">{label}</span>
            <span className="shrink-0 font-mono text-sm font-semibold text-ink">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProtocolResults({ protocol, locale }: { protocol: CashProtocol; locale: Td3PaperContent["locale"] }) {
  const labels =
    locale === "en"
      ? {
          selected: "Selected TD3",
          comparator: "Comparator",
          td3: "TD3 metrics",
          benchmark: "Comparator metrics",
          validation: "Statistical validation",
          interpretation: "Interpretation",
        }
      : {
          selected: "TD3 seleccionado",
          comparator: "Comparador",
          td3: "Metricas TD3",
          benchmark: "Metricas comparador",
          validation: "Validacion estadistica",
          interpretation: "Interpretacion",
        };

  return (
    <div className="min-w-0 border border-petrol/25 bg-[#fbfaf6] p-4 shadow-[0_18px_45px_rgba(11,52,54,0.055)] md:p-6">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.2fr] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{protocol.label}</p>
          <h3 className="mt-3 text-2xl font-semibold text-ink">{protocol.description}</h3>
          <p className="mt-2 text-sm font-semibold text-petrol">{protocol.cost}</p>
          <p className="mt-4 text-sm leading-6 text-muted">{protocol.message}</p>
          <div className="mt-5 grid gap-3">
            <div className="border-l border-petrol/35 bg-white/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{labels.selected}</p>
              <p className="mt-1 break-words text-sm font-semibold text-ink">{protocol.selectedTd3}</p>
            </div>
            <div className="border-l border-brass/45 bg-white/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{labels.comparator}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{protocol.comparator}</p>
            </div>
          </div>
        </div>
        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          <MetricList title={labels.td3} rows={protocol.td3Metrics} />
          <MetricList title={labels.benchmark} rows={protocol.comparatorMetrics} />
          <div className="md:col-span-2">
            <MetricList title={labels.validation} rows={protocol.validation} />
          </div>
        </div>
      </div>
      <p className="mt-5 border-t border-line pt-4 text-sm font-semibold leading-6 text-petrol">
        {labels.interpretation}: <span className="font-normal text-muted">{protocol.interpretation}</span>
      </p>
    </div>
  );
}

function toneClass(tone: "yes" | "no" | "mixed") {
  if (tone === "yes") return "border-sage/45 bg-[#eef5f2] text-[#3f604f]";
  if (tone === "no") return "border-danger/35 bg-[#f4ece8] text-danger";
  return "border-brass/40 bg-[#f7f0e2] text-brass";
}

export function Td3InteractivePaper({ content }: Td3InteractivePaperProps) {
  const [activeProtocolId, setActiveProtocolId] = useState<CashProtocol["id"]>(content.cash.protocols[0].id);
  const [activeStep, setActiveStep] = useState(0);
  const activeProtocol = content.cash.protocols.find((protocol) => protocol.id === activeProtocolId) ?? content.cash.protocols[0];
  const selectedStep = content.protocol.steps[activeStep] ?? content.protocol.steps[0];
  const labels =
    content.locale === "en"
      ? {
          thesisEyebrow: "Claim stack",
          protocolEyebrow: "Evaluation map",
          universeEyebrow: "Test bed",
          cashEyebrow: "Assumptions",
          resultsEyebrow: "Evidence, not recommendation",
          evidenceClaim: "Claim",
          evidenceState: "Evidence",
          reason: "Why it is included",
          limitation: "Limitation",
          activeStep: "Active layer",
          input: "Input",
          output: "Output",
          robustnessEyebrow: "Robustness",
          finalEyebrow: "Reading",
        }
      : {
          thesisEyebrow: "Claim stack",
          protocolEyebrow: "Mapa de evaluacion",
          universeEyebrow: "Test bed",
          cashEyebrow: "Supuestos",
          resultsEyebrow: "Evidencia, no recomendacion",
          evidenceClaim: "Claim",
          evidenceState: "Evidencia",
          reason: "Por que esta incluido",
          limitation: "Limitacion",
          activeStep: "Capa activa",
          input: "Input",
          output: "Output",
          robustnessEyebrow: "Robustez",
          finalEyebrow: "Lectura",
        };

  return (
    <article className="mx-auto max-w-7xl overflow-x-clip px-4 py-10 md:px-5 md:py-14">
      <section className="grid gap-8 border-b border-line pb-10 lg:grid-cols-[1fr_0.46fr] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{content.hero.eyebrow}</p>
          <h1 className="mt-4 max-w-[18rem] break-words text-3xl font-semibold leading-[1.08] text-ink sm:max-w-[calc(100vw-2rem)] sm:text-4xl md:max-w-5xl md:text-6xl">
            {content.hero.title}
          </h1>
          <p className="mt-6 max-w-[20rem] break-words text-base leading-7 text-muted sm:max-w-[calc(100vw-2rem)] md:max-w-3xl md:text-lg md:leading-8">{content.hero.subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {content.hero.badges.map((badge) => (
              <span key={badge} className="max-w-full break-words rounded-[4px] border border-petrol/20 bg-white/75 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-petrol">
                {badge}
              </span>
            ))}
          </div>
        </div>
        <aside className="max-w-[20rem] break-words border-l border-petrol/35 bg-white/55 p-5 text-sm leading-6 text-muted sm:max-w-[calc(100vw-2rem)] md:max-w-none">
          <p className="font-semibold text-petrol">{content.hero.note}</p>
          <p className="mt-4">{content.protocol.intro}</p>
        </aside>
      </section>

      <section className="py-10 md:py-14">
        <SectionHeading eyebrow={labels.thesisEyebrow} title={content.thesis.title} text={content.thesis.text} />
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {content.thesis.claims.map((claim, index) => (
            <div key={claim.claim} className="min-w-0 border border-line bg-white/75 p-5 shadow-[0_12px_32px_rgba(11,52,54,0.04)]">
              <p className="font-mono text-xs font-semibold text-brass">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-3 text-lg font-semibold text-ink">{claim.claim}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{claim.state}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line py-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-[0.48fr_1fr] lg:items-start">
          <div className="min-w-0">
            <SectionHeading eyebrow={labels.protocolEyebrow} title={content.protocol.title} text={content.protocol.intro} />
            <div className="mt-6 grid gap-3">
              <div className="border border-line bg-white/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{labels.input}</p>
                <p className="mt-2 text-sm font-semibold text-ink">{content.protocol.input}</p>
              </div>
              <div className="border border-petrol/25 bg-petrol p-4 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">{labels.output}</p>
                <p className="mt-2 text-sm font-semibold">{content.protocol.output}</p>
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {content.protocol.steps.map((step, index) => {
                const active = index === activeStep;
                return (
                  <button
                    key={step.label}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    className={`min-h-[6.6rem] min-w-0 border p-4 text-left transition ${
                      active ? "border-petrol bg-white shadow-[0_14px_35px_rgba(11,52,54,0.07)]" : "border-line bg-white/55 hover:border-petrol/40"
                    }`}
                  >
                    <span className="font-mono text-[11px] font-semibold text-brass">{String(index + 1).padStart(2, "0")}</span>
                    <span className="mt-2 block text-sm font-semibold text-ink">{step.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 border border-petrol/25 bg-white/75 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-petrol">{labels.activeStep}</p>
              <h3 className="mt-2 text-lg font-semibold text-ink">{selectedStep.label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{selectedStep.description}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <SectionHeading eyebrow={labels.universeEyebrow} title={content.universe.title} text={content.universe.intro} />
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {content.universe.sleeves.map((sleeve) => (
            <div key={sleeve.ticker} className="min-w-0 border border-line bg-white/75 p-4">
              <p className="font-mono text-lg font-semibold text-petrol">{sleeve.ticker}</p>
              <p className="mt-2 text-sm font-semibold text-ink">{sleeve.role}</p>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{labels.reason}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{sleeve.reason}</p>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{labels.limitation}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{sleeve.limitation}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line py-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-[0.38fr_1fr] lg:items-start">
          <div className="min-w-0">
            <SectionHeading eyebrow={labels.cashEyebrow} title={content.cash.title} text={content.cash.intro} />
            <div className="mt-6 grid grid-cols-2 gap-2 rounded-[4px] border border-line bg-white/65 p-1">
              {content.cash.protocols.map((protocol) => {
                const active = protocol.id === activeProtocolId;
                return (
                  <button
                    key={protocol.id}
                    type="button"
                    onClick={() => setActiveProtocolId(protocol.id)}
                    className={`rounded-[3px] px-3 py-2 text-sm font-semibold transition ${
                      active ? "bg-petrol text-white" : "text-muted hover:bg-panelSoft hover:text-petrol"
                    }`}
                  >
                    {protocol.label}
                  </button>
                );
              })}
            </div>
          </div>
          <ProtocolResults protocol={activeProtocol} locale={content.locale} />
        </div>
      </section>

      <section className="py-10 md:py-14">
        <SectionHeading eyebrow={labels.resultsEyebrow} title={content.results.title} text={content.results.intro} />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {content.cash.protocols.map((protocol) => (
            <ProtocolResults key={protocol.id} protocol={protocol} locale={content.locale} />
          ))}
        </div>
      </section>

      <section className="border-y border-line py-10 md:py-14">
        <SectionHeading title={content.evidence.title} />
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {content.evidence.rows.map((row) => (
            <div key={row.claim} className="min-w-0 border border-line bg-white/75 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{labels.evidenceClaim}</p>
              <h3 className="mt-2 text-sm font-semibold leading-6 text-ink">{row.claim}</h3>
              <div className={`mt-4 inline-flex rounded-[4px] border px-3 py-1.5 text-xs font-semibold ${toneClass(row.tone)}`}>
                {labels.evidenceState}: {row.evidence}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-10 md:py-14">
        <SectionHeading eyebrow={labels.robustnessEyebrow} title={content.robustness.title} />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {content.robustness.layers.map((layer, index) => (
            <div key={layer.title} className="min-w-0 border border-line bg-white/75 p-5 shadow-[0_12px_32px_rgba(11,52,54,0.04)]">
              <p className="font-mono text-xs font-semibold text-brass">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-3 text-xl font-semibold text-ink">{layer.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{layer.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-petrol bg-petrol p-6 text-white shadow-[0_20px_55px_rgba(11,52,54,0.12)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">{labels.finalEyebrow}</p>
        <h2 className="mt-3 max-w-4xl text-2xl font-semibold leading-tight md:text-4xl">{content.final.title}</h2>
        <p className="mt-5 max-w-4xl text-base leading-7 text-white/85 md:text-lg md:leading-8">{content.final.text}</p>
        <p className="mt-5 border-t border-white/20 pt-5 text-sm leading-6 text-white/75">{content.final.note}</p>
      </section>
    </article>
  );
}
