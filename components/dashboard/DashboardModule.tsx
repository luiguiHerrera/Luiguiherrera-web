"use client";

import { useState } from "react";
import { RiskPill } from "@/components/ui/RiskPill";
import { trackEvent } from "@/lib/analytics/trackEvent";

type DashboardModuleProps = {
  id: string;
  title: string;
  status: string;
  lookingAt: string;
  why: string;
  how: string;
  notMeaning: string;
  data: string[][];
};

export function DashboardModule({ id, title, status, lookingAt, why, how, notMeaning, data }: DashboardModuleProps) {
  const [open, setOpen] = useState(false);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      trackEvent("dashboard_module_opened", { module: id });
    }
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm text-muted">{lookingAt}</p>
        </div>
        <RiskPill label={status} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map(([label, value]) => (
          <div key={label} className="rounded border border-line bg-panelSoft p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
            <p className="mt-2 font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <button
        onClick={toggleOpen}
        className="mt-5 rounded border border-line px-4 py-2 text-sm font-semibold text-sage transition hover:border-petrol hover:text-white"
      >
        {open ? "Ocultar lectura" : "Cómo leerlo"}
      </button>

      {open ? (
        <div className="mt-5 grid gap-4 text-sm leading-6 text-muted md:grid-cols-3">
          <p><span className="text-white">Por qué importa:</span> {why}</p>
          <p><span className="text-white">Cómo leerlo:</span> {how}</p>
          <p><span className="text-white">Qué NO significa:</span> {notMeaning}</p>
        </div>
      ) : null}
    </section>
  );
}
