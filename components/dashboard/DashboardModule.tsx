"use client";

import { useState } from "react";
import { RiskPill } from "@/components/ui/RiskPill";
import { DashboardModuleId, trackEvent } from "@/lib/analytics/trackEvent";

type DashboardModuleProps = {
  id: DashboardModuleId;
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
    <section className="border border-line bg-panel p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-ink">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Qué mira: {lookingAt}</p>
        </div>
        <RiskPill label={status} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.map(([label, value]) => (
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
        <div className="mt-5 grid gap-4 text-sm leading-6 text-muted lg:grid-cols-3">
          <div className="border border-line bg-panelSoft p-4"><span className="block font-semibold text-ink">Por qué importa</span>{why}</div>
          <div className="border border-line bg-panelSoft p-4"><span className="block font-semibold text-ink">Cómo leerlo</span>{how}</div>
          <div className="border border-line bg-panelSoft p-4"><span className="block font-semibold text-ink">Qué NO significa</span>{notMeaning}</div>
        </div>
      ) : null}
    </section>
  );
}
