"use client";

import { useMemo, useState } from "react";
import { PresidentialCycleSeasonality } from "@/components/statistical-levels/PresidentialCycleSeasonality";
import { SeasonalityHeatmap } from "@/components/statistical-levels/SeasonalityHeatmap";
import { SeasonalityMonthExplorer } from "@/components/statistical-levels/SeasonalityMonthExplorer";
import type { AssetCatalogItem, DailySeasonalityData, PresidentialCyclePhase, SeasonalityWindow } from "@/lib/statistical-levels/types";

type DailySeasonalityPanelProps = {
  catalog: AssetCatalogItem[];
  data: DailySeasonalityData[];
  generatedAt: string;
  initialTicker: string | null;
};

const windowOptions: SeasonalityWindow[] = ["3Y", "5Y", "10Y", "Full"];
const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function monthFromGeneratedAt(generatedAt: string) {
  const parsed = new Date(`${generatedAt}T00:00:00Z`);
  const month = parsed.getUTCMonth() + 1;
  return Number.isFinite(month) && month >= 1 && month <= 12 ? month : 1;
}

export function DailySeasonalityPanel({ catalog, data, generatedAt, initialTicker }: DailySeasonalityPanelProps) {
  const availableTickers = useMemo(() => new Set(data.map((item) => item.asset)), [data]);
  const defaultTicker = initialTicker && availableTickers.has(initialTicker) ? initialTicker : data[0]?.asset ?? "";
  const [ticker, setTicker] = useState(defaultTicker);
  const [window, setWindow] = useState<SeasonalityWindow>("5Y");
  const [month, setMonth] = useState(monthFromGeneratedAt(generatedAt));
  const [phase, setPhase] = useState<PresidentialCyclePhase>("all");

  const selected = data.find((item) => item.asset === ticker) ?? data[0] ?? null;
  const windowData = selected?.windows[window] ?? null;
  const selectedAsset = catalog.find((asset) => asset.ticker === selected?.asset);

  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Estacionalidad diaria</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">Patrones históricos por día del mes</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Muestra patrones históricos por día del mes. Úsalo como contexto, junto con régimen, riesgo y precio actual.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[34rem]">
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Activo
            <select
              value={selected?.asset ?? ""}
              onChange={(event) => setTicker(event.target.value)}
              className="border border-line bg-panelSoft px-3 py-2 text-sm font-semibold normal-case tracking-normal text-ink outline-none transition focus:border-petrol"
            >
              {catalog.filter((asset) => availableTickers.has(asset.ticker)).map((asset) => (
                <option key={asset.ticker} value={asset.ticker}>{asset.ticker}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Ventana
            <select
              value={window}
              onChange={(event) => setWindow(event.target.value as SeasonalityWindow)}
              className="border border-line bg-panelSoft px-3 py-2 text-sm font-semibold normal-case tracking-normal text-ink outline-none transition focus:border-petrol"
            >
              {windowOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Mes
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="border border-line bg-panelSoft px-3 py-2 text-sm font-semibold normal-case tracking-normal text-ink outline-none transition focus:border-petrol"
            >
              {monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-y border-line py-3 text-sm leading-6 text-muted md:grid-cols-3">
        <p><span className="font-semibold text-ink">Activo:</span> {selectedAsset ? `${selectedAsset.ticker} · ${selectedAsset.name}` : selected?.asset ?? "n/d"}</p>
        <p><span className="font-semibold text-ink">Ventana histórica:</span> {window}</p>
        <p><span className="font-semibold text-ink">Mes:</span> {monthNames[month - 1]}</p>
      </div>

      {windowData ? (
        <div className="mt-5 grid gap-5">
          <SeasonalityMonthExplorer cells={windowData.general} month={month} />
          <div className="border border-line bg-panelSoft p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Heatmap</p>
              <h3 className="mt-2 text-lg font-semibold text-ink">Retorno promedio diario por mes</h3>
            </div>
            <SeasonalityHeatmap cells={windowData.general} />
          </div>
          <PresidentialCycleSeasonality cells={windowData.presidentialCycle} month={month} phase={phase} setPhase={setPhase} />
        </div>
      ) : (
        <div className="mt-5 border border-line bg-panelSoft p-4 text-sm leading-6 text-muted">
          Historial insuficiente para construir estacionalidad diaria de este activo.
        </div>
      )}
    </section>
  );
}
