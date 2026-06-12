"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  td3PerformanceMeta,
  td3PerformanceRows,
  type CashAssumption,
  type QuantPerformanceRow,
  type QuantProfile,
} from "@/lib/quant-lab/td3-performance";

const profileLabels: Record<string, string> = {
  conservative: "Conservador",
  moderate: "Moderado",
  aggressive: "Agresivo",
};

const cashLabels: Record<CashAssumption, string> = {
  "bil-cash": "BIL-CASH",
  "zero-cash": "Zero-CASH",
};

const strategyOrder = [
  "TD3 constrained",
  "Equal Weight",
  "60/40 SPY/TLT",
  "Buy & Hold SPY",
  "Buy & Hold GLD",
  "Buy & Hold TLT",
  "Buy & Hold BTC",
];

const strategyOrderMap = new Map(strategyOrder.map((name, index) => [name, index]));

type Td3PerformanceTableProps = {
  selectedCashParam?: string;
  selectedProfileParam?: string;
};

function getSelectedProfile(profileParam?: string) {
  const profiles = td3PerformanceMeta.availableProfiles;
  if (profileParam && profiles.includes(profileParam)) return profileParam;
  return profiles.includes("moderate") ? "moderate" : profiles[0] ?? "moderate";
}

function getSelectedCash(cashParam?: string) {
  const availableCash = td3PerformanceMeta.availableCashAssumptions as CashAssumption[];
  return cashParam === "zero-cash" && availableCash.includes("zero-cash") ? "zero-cash" : "bil-cash";
}

function performanceHref(profile: string, cash: CashAssumption) {
  return `/quant-lab?profile=${encodeURIComponent(profile)}&cash=${encodeURIComponent(cash)}#td3-performance`;
}

function formatPercent(value: number | null) {
  if (value == null) {
    return "N/D";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number | null, digits = 2) {
  if (value == null) {
    return "N/D";
  }
  return value.toFixed(digits);
}

function formatFailedConstraints(value: string | null) {
  if (!value) {
    return null;
  }
  return value
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

function orderRows(rows: QuantPerformanceRow[]) {
  return [...rows].sort((a, b) => {
    const aIndex = strategyOrderMap.get(a.displayName) ?? strategyOrder.length;
    const bIndex = strategyOrderMap.get(b.displayName) ?? strategyOrder.length;
    return aIndex - bIndex || a.displayName.localeCompare(b.displayName);
  });
}

function MandateStatus({ row }: { row: QuantPerformanceRow }) {
  if (row.mandateEligible == null) {
    return <span className="text-muted">N/D</span>;
  }

  const failedConstraints = formatFailedConstraints(row.failedConstraints);

  if (row.mandateEligible) {
    return <span className="font-semibold text-[#557463]">Cumple</span>;
  }

  return (
    <span>
      <span className="font-semibold text-[#8f5f5f]">No cumple</span>
      {failedConstraints ? <span className="mt-1 block text-xs leading-5 text-muted">Falla: {failedConstraints}</span> : null}
    </span>
  );
}

function SharpeDrawdownChart({
  cashLabel,
  profileLabel,
  rows,
}: {
  cashLabel: string;
  profileLabel: string;
  rows: QuantPerformanceRow[];
}) {
  const maxSharpe = Math.max(...rows.map((row) => Math.abs(row.sharpe ?? 0)), 0.01);
  const maxDrawdown = Math.max(...rows.map((row) => Math.abs(row.maxDrawdown ?? 0)), 0.01);

  return (
    <div className="mt-5 border border-line bg-panelSoft p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Comparación Sharpe / Drawdown</h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            Vista activa: {profileLabel} · {cashLabel}. El gráfico se recalcula con el mismo filtro que la tabla.
          </p>
        </div>
        <span className="w-fit border border-line bg-panel px-2.5 py-1 text-xs font-semibold text-muted">
          Orden fijo de benchmarks
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {rows.map((row) => {
          const sharpeWidth = Math.min(Math.abs(row.sharpe ?? 0) / maxSharpe, 1) * 100;
          const drawdownWidth = Math.min(Math.abs(row.maxDrawdown ?? 0) / maxDrawdown, 1) * 100;

          return (
            <div key={`${row.cashAssumption}-${row.profile}-${row.strategyName}`} className="grid gap-2 md:grid-cols-[minmax(10rem,0.9fr)_minmax(0,1fr)] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{row.displayName}</p>
                {row.strategyType === "td3" ? <p className="truncate text-xs text-muted">{row.strategyName}</p> : null}
              </div>
              <div className="grid gap-2">
                <div className="grid grid-cols-[4rem_1fr_3rem] items-center gap-2 text-xs">
                  <span className="text-muted">Sharpe</span>
                  <span className="h-2 bg-panel">
                    <span className="block h-2 bg-[#6f8f7b]" style={{ width: `${sharpeWidth}%` }} />
                  </span>
                  <span className="text-right font-semibold text-ink">{formatNumber(row.sharpe)}</span>
                </div>
                <div className="grid grid-cols-[4rem_1fr_3rem] items-center gap-2 text-xs">
                  <span className="text-muted">DD</span>
                  <span className="h-2 bg-panel">
                    <span className="block h-2 bg-[#a86464]" style={{ width: `${drawdownWidth}%` }} />
                  </span>
                  <span className="text-right font-semibold text-ink">{formatPercent(row.maxDrawdown)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Td3PerformanceTable({ selectedCashParam, selectedProfileParam }: Td3PerformanceTableProps) {
  const selectedProfile = getSelectedProfile(selectedProfileParam);
  const selectedCash = getSelectedCash(selectedCashParam);
  const availableCash = td3PerformanceMeta.availableCashAssumptions as CashAssumption[];

  const rows = useMemo(
    () =>
      orderRows(
        td3PerformanceRows.filter(
          (row) => row.profile === selectedProfile && row.cashAssumption === selectedCash,
        ),
      ),
    [selectedCash, selectedProfile],
  );

  const sourceFiles = useMemo(() => [...new Set(rows.map((row) => row.sourceFile))], [rows]);
  const selectedTd3 = rows.find((row) => row.strategyType === "td3");
  const selectedProfileLabel = profileLabels[selectedProfile] ?? selectedProfile;
  const selectedCashLabel = cashLabels[selectedCash] ?? selectedCash;

  return (
    <div id="td3-performance">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Outputs completos</p>
          <h2 className="mt-2 text-xl font-semibold text-ink md:text-3xl">Tabla de performance completa</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted md:text-base md:leading-7">
            Resultados trazables desde mandate_profile_rankings.csv. Sortino no se muestra porque no está disponible en esta tabla agregada.
          </p>
        </div>
        <span className="w-fit border border-line bg-panelSoft px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Ranking por perfil
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Perfil</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {td3PerformanceMeta.availableProfiles.map((profile) => (
              <Link
                key={profile}
                href={performanceHref(profile, selectedCash)}
                className={`inline-flex min-h-9 items-center border px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-ink/30 ${
                  selectedProfile === profile ? "border-ink bg-ink text-white" : "border-line bg-panelSoft text-ink hover:border-ink"
                }`}
              >
                {profileLabels[profile] ?? profile}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Cash assumption</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["bil-cash", "zero-cash"] as CashAssumption[]).map((cash) => {
              const isAvailable = availableCash.includes(cash);
              const className = `inline-flex min-h-9 items-center border px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-ink/30 ${
                selectedCash === cash ? "border-ink bg-ink text-white" : "border-line bg-panelSoft text-ink hover:border-ink"
              }`;

              return isAvailable ? (
                <Link key={cash} href={performanceHref(selectedProfile, cash)} className={className}>
                  {cashLabels[cash]}
                </Link>
              ) : (
                <span key={cash} className={`${className} cursor-not-allowed opacity-45`}>
                  {cashLabels[cash]}
                </span>
              );
            })}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">
            BIL-CASH usa proxy de cash invertible; Zero-CASH usa cash sintético con retorno cero.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 border border-line bg-panelSoft p-3 text-xs leading-5 text-muted md:grid-cols-[0.55fr_0.55fr_1.4fr]">
        <p>
          <span className="block font-semibold uppercase tracking-[0.12em] text-brass">Perfil activo</span>
          <span className="font-semibold text-ink">{selectedProfileLabel}</span>
        </p>
        <p>
          <span className="block font-semibold uppercase tracking-[0.12em] text-brass">Cash activo</span>
          <span className="font-semibold text-ink">{selectedCashLabel}</span>
        </p>
        <p>
          <span className="block font-semibold uppercase tracking-[0.12em] text-brass">TD3 seleccionado</span>
          <span className="font-semibold text-ink">{selectedTd3?.strategyName ?? "N/D"}</span>
        </p>
      </div>

      {rows.length > 0 ? (
        <>
          <SharpeDrawdownChart
            key={`${selectedProfile}-${selectedCash}`}
            cashLabel={selectedCashLabel}
            profileLabel={selectedProfileLabel}
            rows={rows}
          />

          <div className="mt-6 max-w-full overflow-x-auto [contain:paint]">
            <table className="w-full min-w-[1120px] border-collapse text-left text-[13px]">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="py-2.5 pr-4 font-medium">Benchmark / estrategia</th>
                  <th className="py-2.5 pr-4 font-medium">Retorno anualizado</th>
                  <th className="py-2.5 pr-4 font-medium">Volatilidad anualizada</th>
                  <th className="py-2.5 pr-4 font-medium">Sharpe</th>
                  <th className="py-2.5 pr-4 font-medium">Sortino</th>
                  <th className="py-2.5 pr-4 font-medium">Max drawdown</th>
                  <th className="py-2.5 pr-4 font-medium">Turnover</th>
                  <th className="py-2.5 pr-4 font-medium">Concentración máxima</th>
                  <th className="py-2.5 pr-4 font-medium">N. efectivo de activos</th>
                  <th className="py-2.5 pr-4 font-medium">Cumplimiento de mandato</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.cashAssumption}-${row.profile}-${row.strategyName}`} className="border-b border-line/70 align-top">
                    <td className="py-3 pr-4">
                      <span className="block font-semibold text-ink">{row.displayName}</span>
                      {row.strategyType === "td3" ? <span className="mt-1 block max-w-[18rem] text-xs leading-5 text-muted">{row.strategyName}</span> : null}
                    </td>
                    <td className="py-3 pr-4 text-muted">{formatPercent(row.annualizedReturn)}</td>
                    <td className="py-3 pr-4 text-muted">{formatPercent(row.annualizedVolatility)}</td>
                    <td className="py-3 pr-4 text-muted">{formatNumber(row.sharpe)}</td>
                    <td className="py-3 pr-4 text-muted">N/D</td>
                    <td className="py-3 pr-4 text-muted">{formatPercent(row.maxDrawdown)}</td>
                    <td className="py-3 pr-4 text-muted">{formatPercent(row.averageTurnover)}</td>
                    <td className="py-3 pr-4 text-muted">{formatPercent(row.averageMaxWeight)}</td>
                    <td className="py-3 pr-4 text-muted">{formatNumber(row.effectiveAssets)}</td>
                    <td className="py-3 pr-4 text-muted">
                      <MandateStatus row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-3 text-sm leading-6 text-muted lg:grid-cols-[1fr_1fr]">
            <p className="border border-line bg-panelSoft p-4">
              Estos resultados no implican recomendación ni superioridad futura. La tabla resume métricas históricas del protocolo experimental bajo restricciones específicas.
            </p>
            <p className="border border-line bg-panelSoft p-4">
              Sortino no se muestra porque no está en la tabla agregada usada como fuente principal. Se evita mezclar fuentes no equivalentes.
            </p>
          </div>
          {sourceFiles.length > 0 ? (
            <p className="mt-4 break-all text-xs leading-5 text-muted">
              Fuente estática: {sourceFiles.join(" · ")} · Generado: {new Date(td3PerformanceMeta.generatedAt).toISOString().slice(0, 10)}
            </p>
          ) : null}
        </>
      ) : (
        <div className="mt-6 border border-line bg-panelSoft p-5 text-sm leading-6 text-muted">
          No hay filas disponibles para el perfil y supuesto de cash seleccionados.
        </div>
      )}
    </div>
  );
}
