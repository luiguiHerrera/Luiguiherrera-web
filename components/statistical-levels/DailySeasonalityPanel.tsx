"use client";

import { useMemo, useState } from "react";
import { PresidentialCycleSeasonality } from "@/components/statistical-levels/PresidentialCycleSeasonality";
import { SeasonalityHeatmap } from "@/components/statistical-levels/SeasonalityHeatmap";
import { SeasonalityMonthExplorer } from "@/components/statistical-levels/SeasonalityMonthExplorer";
import { ExpandableInsightCard } from "@/components/ui/ExpandableInsightCard";
import type { AssetCatalogItem, DailySeasonalityData, PresidentialCyclePhase, SeasonalityWindow } from "@/lib/statistical-levels/types";

type DailySeasonalityPanelProps = {
  catalog: AssetCatalogItem[];
  data: DailySeasonalityData | null;
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
  const [window, setWindow] = useState<SeasonalityWindow>("5Y");
  const [month, setMonth] = useState(monthFromGeneratedAt(generatedAt));
  const [phase, setPhase] = useState<PresidentialCyclePhase>("all");

  const selectedAsset = useMemo(() => catalog.find((asset) => asset.ticker === (data?.asset ?? initialTicker)), [catalog, data?.asset, initialTicker]);
  const windowData = data?.windows[window] ?? null;
  const monthCells = windowData?.general.filter((cell) => cell.month === month && cell.sampleSize > 0) ?? [];
  const averageMonthReturn =
    monthCells.length > 0 ? monthCells.reduce((sum, cell) => sum + (cell.averageReturn ?? 0), 0) / monthCells.length : null;
  const medianSample = monthCells.length > 0 ? Math.round(monthCells.reduce((sum, cell) => sum + cell.sampleSize, 0) / monthCells.length) : 0;

  function formatPercent(value: number | null) {
    if (value === null) return "n/d";
    return `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
  }

  return (
    <ExpandableInsightCard
      eyebrow="Estacionalidad diaria"
      title="Patrones históricos por día del mes"
      reading="Ubica el comportamiento diario del activo seleccionado por ventana histórica y mes calendario."
      status={selectedAsset ? selectedAsset.ticker : data?.asset ?? "n/d"}
      metrics={[
        { label: "Ventana", value: window },
        { label: "Mes", value: monthNames[month - 1] },
        { label: "Promedio diario del mes", value: formatPercent(averageMonthReturn), tone: averageMonthReturn !== null && averageMonthReturn >= 0 ? "sage" : "danger" },
        { label: "Muestra media", value: medianSample ? `N ${medianSample}` : "n/d" },
      ]}
      summaryExtra={
        <div className="grid gap-2.5 sm:grid-cols-2 xl:max-w-[24rem]">
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
      }
    >

      <div className="mt-4 grid gap-3 border-y border-line py-3 text-sm leading-6 text-muted md:grid-cols-3">
        <p><span className="font-semibold text-ink">Activo:</span> {selectedAsset ? `${selectedAsset.ticker} · ${selectedAsset.name}` : data?.asset ?? "n/d"}</p>
        <p><span className="font-semibold text-ink">Ventana histórica:</span> {window}</p>
        <p><span className="font-semibold text-ink">Mes:</span> {monthNames[month - 1]}</p>
      </div>

      {windowData ? (
        <div className="mt-4 grid gap-4 md:mt-5 md:gap-5">
          <SeasonalityMonthExplorer cells={windowData.general} month={month} />
          <div className="border border-line bg-panelSoft p-3.5 md:p-4">
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
    </ExpandableInsightCard>
  );
}
