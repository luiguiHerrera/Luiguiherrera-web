"use client";

import { useState } from "react";
import { RiskPill } from "@/components/ui/RiskPill";
import { trackEvent } from "@/lib/analytics/trackEvent";
import { dataStatusLabels } from "@/lib/dashboard/status";
import { translateDashboardText } from "@/lib/dashboard/translate-dashboard-copy";
import type { DashboardModuleData } from "@/lib/dashboard/types";

type DashboardModuleProps = DashboardModuleData & {
  locale?: "es" | "en";
};

export function DashboardModule({
  id,
  title,
  status,
  sourceName,
  sourceUrl,
  lastUpdated,
  updateFrequency,
  dataStatus,
  reliabilityNote,
  observedData,
  interpretation,
  locale = "es",
}: DashboardModuleProps) {
  const [open, setOpen] = useState(false);
  const t = (value: string | null | undefined) => locale === "en" ? translateDashboardText(value) : value ?? "";
  const copy = locale === "en"
    ? {
        lookingAt: "What it watches",
        source: "Conceptual source",
        updated: "Updated",
        frequency: "Expected frequency",
        hide: "Hide read",
        read: "How to read it",
        why: "Why it matters",
        how: "How to read it",
        limit: "Reading limit",
        reliability: "Reliability",
      }
    : {
        lookingAt: "Qué mira",
        source: "Fuente conceptual",
        updated: "Actualización",
        frequency: "Frecuencia esperada",
        hide: "Ocultar lectura",
        read: "Cómo leerlo",
        why: "Por qué importa",
        how: "Cómo leerlo",
        limit: "Qué NO significa",
        reliability: "Confiabilidad",
      };

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      trackEvent("dashboard_module_opened", { module: id });
    }
  }

  return (
    <section className="estate-card border border-line p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink">{t(title)}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{copy.lookingAt}: {t(interpretation.lookingAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RiskPill label={t(status)} />
          <RiskPill label={t(dataStatusLabels[dataStatus])} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 border-y border-line py-4 text-sm leading-6 text-muted md:grid-cols-3">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.source}</span>
          {sourceUrl ? (
            <a href={sourceUrl} className="mt-1 inline-block text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
              {t(sourceName)}
            </a>
          ) : (
            <span className="mt-1 block text-ink">{t(sourceName)}</span>
          )}
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.updated}</span>
          <span className="mt-1 block text-ink">{t(lastUpdated)}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.frequency}</span>
          <span className="mt-1 block text-ink">{t(updateFrequency)}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {observedData.map(([label, value]) => (
          <div key={label} className="border border-line bg-panelSoft p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{t(label)}</p>
            <p className="mt-2 font-semibold text-ink">{t(value)}</p>
          </div>
        ))}
      </div>

      <button
        onClick={toggleOpen}
        className="mt-5 border border-line bg-panel px-4 py-2 text-sm font-semibold text-ink transition hover:border-petrol hover:text-petrol"
      >
        {open ? copy.hide : copy.read}
      </button>

      {open ? (
        <div className="mt-5 grid gap-4 text-sm leading-6 text-muted lg:grid-cols-4">
          <div className="border border-line bg-panelSoft p-4"><span className="block font-semibold text-ink">{copy.why}</span>{t(interpretation.why)}</div>
          <div className="border border-line bg-panelSoft p-4"><span className="block font-semibold text-ink">{copy.how}</span>{t(interpretation.how)}</div>
          <div className="border border-line bg-panelSoft p-4"><span className="block font-semibold text-ink">{copy.limit}</span>{t(interpretation.whatItDoesNotMean)}</div>
          <div className="border border-line bg-panelSoft p-4"><span className="block font-semibold text-ink">{copy.reliability}</span>{t(reliabilityNote)}</div>
        </div>
      ) : null}
    </section>
  );
}
