import type { AssetStatRecord, KeyStatisticalLevelSet } from "@/lib/statistical-levels/types";

type KeyStatisticalLevelsPanelProps = {
  asset: AssetStatRecord | null;
  frequency?: "weekly" | "monthly";
};

const levelLabels = {
  weekly: [
    ["WSHE", "Extensión alta fuerte", "Extremo superior"],
    ["WAHE", "Extensión alta promedio", "Promedio superior"],
    ["WALE", "Extensión baja promedio", "Promedio inferior"],
    ["WSLE", "Extensión baja fuerte", "Extremo inferior"],
  ],
  monthly: [
    ["MSHE", "Extensión alta fuerte", "Extremo superior"],
    ["MAHE", "Extensión alta promedio", "Promedio superior"],
    ["MALE", "Extensión baja promedio", "Promedio inferior"],
    ["MSLE", "Extensión baja fuerte", "Extremo inferior"],
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
  return Math.min(88, Math.max(12, ((value - min) / (max - min)) * 100));
}

const monthlyScriptUrl = "https://www.tradingview.com/script/ziflzOXv-Monthly-Statistical-Levels/";

function levelTone(key: string) {
  if (key.includes("SHE")) return "border-[#6f8f7b]/40 bg-[#6f8f7b]/10 text-[#47604f]";
  if (key.includes("AHE")) return "border-[#b6905b]/40 bg-[#b6905b]/10 text-[#76562d]";
  if (key.includes("ALE")) return "border-[#b6905b]/40 bg-[#b6905b]/10 text-[#76562d]";
  return "border-[#a86464]/40 bg-[#a86464]/10 text-[#7b3f3f]";
}

function LevelLadder({ data, kind, ticker }: { data: KeyStatisticalLevelSet; kind: "weekly" | "monthly"; ticker?: string }) {
  const labels = levelLabels[kind];
  const values = labels
    .map(([key]) => ({ key, value: data.levels[key] ?? null }))
    .filter((item): item is { key: (typeof labels)[number][0]; value: number } => item.value !== null);
  const allValues = [...values.map((item) => item.value), data.lastClose].filter((value): value is number => value !== null);
  const min = allValues.length ? Math.min(...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues) : 1;
  const rangeLabel = allValues.length ? `${formatPrice(min, ticker)} - ${formatPrice(max, ticker)}` : "n/d";

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

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <div className="border border-line bg-panel px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Apertura</p>
          <p className="mt-1 font-semibold text-ink">{formatPrice(data.currentOpen, ticker)}</p>
        </div>
        <div className="border border-ink bg-ink px-3 py-2 text-white">
          <p className="text-[11px] uppercase tracking-[0.12em] text-white/70">Precio actual</p>
          <p className="mt-1 font-semibold">{formatPrice(data.lastClose, ticker)}</p>
        </div>
        <div className="border border-line bg-panel px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Rango visual</p>
          <p className="mt-1 font-semibold text-ink">{rangeLabel}</p>
        </div>
      </div>

      <div className="mt-5 max-w-full overflow-x-auto [contain:paint]">
        <div className="relative h-32 min-w-[760px] px-14">
          <div className="absolute left-12 right-12 top-14 h-px bg-line" />
          <div className="absolute left-12 top-[3.15rem] h-4 w-px bg-line" />
          <div className="absolute right-12 top-[3.15rem] h-4 w-px bg-line" />
          <span className="absolute left-12 top-[4.35rem] text-[10px] font-semibold text-muted">{formatPrice(min, ticker)}</span>
          <span className="absolute right-12 top-[4.35rem] -translate-x-full text-[10px] font-semibold text-muted">{formatPrice(max, ticker)}</span>

          {values.map((item, index) => {
            const meta = labels.find(([key]) => key === item.key);
            return (
              <div key={item.key} className="absolute top-9 -translate-x-1/2" style={{ left: `${markerPosition(item.value, min, max)}%` }}>
                <div className="mx-auto h-9 w-px bg-[#a8a29e]" />
                <div className={`mt-1 w-28 border bg-panel px-2 py-1 text-center shadow-[0_8px_18px_rgba(31,35,40,0.06)] ${levelTone(item.key)} ${index % 2 === 0 ? "" : "translate-y-6"}`}>
                  <p className="whitespace-nowrap text-[11px] font-semibold">{item.key}</p>
                  <p className="mt-0.5 whitespace-nowrap text-[10px] opacity-80">{meta?.[1] ?? "Nivel estadístico"}</p>
                </div>
              </div>
            );
          })}

          <div className="absolute top-0 -translate-x-1/2" style={{ left: `${markerPosition(data.lastClose, min, max)}%` }}>
            <div className="mx-auto border border-ink bg-ink px-2.5 py-1 text-center text-white shadow-[0_10px_24px_rgba(31,35,40,0.14)]">
              <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em] text-white/70">Precio actual</p>
              <p className="whitespace-nowrap text-xs font-semibold">{formatPrice(data.lastClose, ticker)}</p>
            </div>
            <div className="mx-auto h-14 w-px bg-ink" />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {labels.map(([key, description, group]) => (
          <div key={key} className="flex items-center justify-between gap-3 border border-line bg-panel px-3 py-2 text-sm">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink">{key}</p>
                <span className={`border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${levelTone(key)}`}>{group}</span>
              </div>
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
      {kind === "monthly" ? (
        <a
          href={monthlyScriptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex border border-ink bg-ink px-3 py-2 text-xs font-semibold text-white transition hover:bg-panel hover:text-ink"
        >
          Ver script Monthly Statistical Levels
        </a>
      ) : null}
    </div>
  );
}

export function KeyStatisticalLevelsPanel({ asset, frequency }: KeyStatisticalLevelsPanelProps) {
  const ladders = frequency
    ? [frequency]
    : (["weekly", "monthly"] as const);

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
        {ladders.map((kind) => (
          <LevelLadder
            key={kind}
            data={kind === "weekly" ? asset?.keyStatisticalLevels.weekly ?? fallbackLevels("W") : asset?.keyStatisticalLevels.monthly ?? fallbackLevels("M")}
            kind={kind}
            ticker={asset?.ticker}
          />
        ))}
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
