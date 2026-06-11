"use client";

import { useState } from "react";
import { RiskPill } from "@/components/ui/RiskPill";
import { trackEvent } from "@/lib/analytics/trackEvent";
import { dataStatusLabels } from "@/lib/dashboard/status";
import type { DashboardModuleData } from "@/lib/dashboard/types";

type DashboardModuleProps = DashboardModuleData;

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
}: DashboardModuleProps) {
  const [open, setOpen] = useState(false);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      trackEvent("dashboard_module_opened", { module: id });
    }
  }

  return (
    <section className="border border-line bg-panel p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-ink">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Qué mira: {interpretation.lookingAt}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RiskPill label={status} />
          <RiskPill label={dataStatusLabels[dataStatus]} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 border-y border-line py-4 text-sm leading-6 text-muted md:grid-cols-3">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Fuente conceptual</span>
          {sourceUrl ? (
            <a href={sourceUrl} className="mt-1 inline-block text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
              {sourceName}
            </a>
          ) : (
            <span className="mt-1 block text-ink">{sourceName}</span>
          )}
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Actualización</span>
          <span className="mt-1 block text-ink">{lastUpdated}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Frecuencia esperada</span>
          <span className="mt-1 block text-ink">{updateFrequency}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {observedData.map(([label, value]) => (
          <div key={label} className="border border-line bg-panelSoft p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
            <p className="mt-2 font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <button
        onClick={toggleOpen}
        className="mt-5 border border-line bg-panel px-4 py-2 text-sm font-semibold text-ink transition hover:border-petrol hover:text-petrol"
      >
        {open ? "Ocultar lectura" : "Cómo leerlo"}
      </button>

      {open ? (
        <div className="mt-5 grid gap-4 text-sm leading-6 text-muted lg:grid-cols-4">
          <div className="border border-line bg-panelSoft p-4"><span className="block font-semibold text-ink">Por qué importa</span>{interpretation.why}</div>
          <div className="border border-line bg-panelSoft p-4"><span className="block font-semibold text-ink">Cómo leerlo</span>{interpretation.how}</div>
          <div className="border border-line bg-panelSoft p-4"><span className="block font-semibold text-ink">Qué NO significa</span>{interpretation.whatItDoesNotMean}</div>
          <div className="border border-line bg-panelSoft p-4"><span className="block font-semibold text-ink">Confiabilidad</span>{reliabilityNote}</div>
        </div>
      ) : null}
    </section>
  );
}
