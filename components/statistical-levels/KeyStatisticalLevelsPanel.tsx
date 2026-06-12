import type { AssetStatRecord, KeyStatisticalLevelSet } from "@/lib/statistical-levels/types";

type KeyStatisticalLevelsPanelProps = {
  asset: AssetStatRecord | null;
};

const levelLabels = {
  weekly: [
    ["WSHE", "Extensión alta + desviación"],
    ["WAHE", "Extensión alta promedio"],
    ["WALE", "Extensión baja promedio"],
    ["WSLE", "Extensión baja + desviación"],
  ],
  monthly: [
    ["MSHE", "Extensión alta + desviación"],
    ["MAHE", "Extensión alta promedio"],
    ["MALE", "Extensión baja promedio"],
    ["MSLE", "Extensión baja + desviación"],
  ],
} as const;

function formatPrice(value: number | null, ticker?: string) {
  if (value === null) return "n/d";
  const maximumFractionDigits = ticker === "BTCUSD" ? 0 : 2;
  return value.toLocaleString("en-US", { maximumFractionDigits, minimumFractionDigits: maximumFractionDigits });
}

function formatPercent(value: number | null) {
  if (value === null) return "n/d";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

function markerPosition(value: number | null, min: number, max: number) {
  if (value === null || max <= min) return 50;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

function LevelLadder({ data, kind, ticker }: { data: KeyStatisticalLevelSet; kind: "weekly" | "monthly"; ticker?: string }) {
  const labels = levelLabels[kind];
  const values = labels
    .map(([key]) => ({ key, value: data.levels[key] ?? null }))
    .filter((item): item is { key: (typeof labels)[number][0]; value: number } => item.value !== null);
  const allValues = [...values.map((item) => item.value), data.lastClose].filter((value): value is number => value !== null);
  const min = allValues.length ? Math.min(...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues) : 1;

  if (!data.available) {
    return (
      <div className="border border-line bg-panelSoft p-4">
        <p className="text-sm font-semibold text-ink">{kind === "weekly" ? "Niveles semanales" : "Niveles mensuales"}</p>
        <p className="mt-2 text-sm leading-6 text-muted">{data.statusNote}</p>
      </div>
    );
  }

  return (
    <div className="border border-line bg-panelSoft p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{kind === "weekly" ? "Weekly" : "Monthly"}</p>
          <h3 className="mt-1 text-lg font-semibold text-ink">{kind === "weekly" ? "Niveles semanales" : "Niveles mensuales"}</h3>
          <p className="mt-1 text-sm text-muted">{data.location}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs uppercase tracking-[0.12em] text-muted">Apertura actual</p>
          <p className="text-base font-semibold text-ink">{formatPrice(data.currentOpen, ticker)}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="relative h-12">
          <div className="absolute left-0 right-0 top-6 h-px bg-line" />
          {values.map((item) => (
            <div key={item.key} className="absolute top-3 -translate-x-1/2" style={{ left: `${markerPosition(item.value, min, max)}%` }}>
              <div className="mx-auto h-6 w-px bg-[#a8a29e]" />
              <p className="mt-1 whitespace-nowrap text-[10px] font-semibold text-muted">{item.key}</p>
            </div>
          ))}
          <div className="absolute top-0 -translate-x-1/2" style={{ left: `${markerPosition(data.lastClose, min, max)}%` }}>
            <div className="mx-auto h-8 w-px bg-ink" />
            <p className="mt-1 whitespace-nowrap text-[10px] font-semibold text-ink">Precio actual</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {labels.map(([key, description]) => (
          <div key={key} className="flex items-center justify-between gap-3 border-t border-line py-2 text-sm">
            <div>
              <p className="font-semibold text-ink">{key}</p>
              <p className="text-xs text-muted">{description}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-ink">{formatPrice(data.levels[key] ?? null, ticker)}</p>
              <p className="text-xs text-muted">{formatPercent(data.distances[key] ?? null)}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">{data.statusNote}</p>
    </div>
  );
}

export function KeyStatisticalLevelsPanel({ asset }: KeyStatisticalLevelsPanelProps) {
  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Niveles estadísticos clave</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{asset ? asset.ticker : "Sin activo seleccionado"}</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-muted">
          Extensiones históricas desde la apertura del periodo. No implican soporte, resistencia ni dirección futura.
        </p>
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <LevelLadder data={asset?.keyStatisticalLevels.weekly ?? fallbackLevels("W")} kind="weekly" ticker={asset?.ticker} />
        <LevelLadder data={asset?.keyStatisticalLevels.monthly ?? fallbackLevels("M")} kind="monthly" ticker={asset?.ticker} />
      </div>
    </section>
  );
}

function fallbackLevels(prefix: "W" | "M"): KeyStatisticalLevelSet {
  const keys = prefix === "W" ? ["WSHE", "WAHE", "WALE", "WSLE"] : ["MSHE", "MAHE", "MALE", "MSLE"];
  return {
    available: false,
    statusNote: "Selecciona un activo con historial suficiente.",
    periods: 0,
    currentOpen: null,
    lastClose: null,
    avgHigherExtension: null,
    stdHigherExtension: null,
    avgLowerExtension: null,
    stdLowerExtension: null,
    levels: Object.fromEntries(keys.map((key) => [key, null])),
    distances: Object.fromEntries(keys.map((key) => [key, null])),
    location: "Historial insuficiente",
  };
}
