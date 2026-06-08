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
    <section className="rounded-lg border border-line bg-panel p-5 shadow-quiet md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Qué mira: {lookingAt}</p>
        </div>
        <RiskPill label={status} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.map(([label, value]) => (
          <div key={label} className="rounded border border-line bg-panelSoft p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
            <p className="mt-2 font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <button
        onClick={toggleOpen}
        className="mt-5 rounded border border-line bg-ink/20 px-4 py-2 text-sm font-semibold text-sage transition hover:border-petrol hover:text-white"
      >
        {open ? "Ocultar lectura" : "Cómo leerlo"}
      </button>

      {open ? (
        <div className="mt-5 grid gap-4 text-sm leading-6 text-muted lg:grid-cols-3">
          <div className="rounded border border-line bg-ink/35 p-4"><span className="block text-white">Por qué importa</span>{why}</div>
          <div className="rounded border border-line bg-ink/35 p-4"><span className="block text-white">Cómo leerlo</span>{how}</div>
          <div className="rounded border border-line bg-ink/35 p-4"><span className="block text-white">Qué NO significa</span>{notMeaning}</div>
        </div>
      ) : null}
    </section>
  );
}
