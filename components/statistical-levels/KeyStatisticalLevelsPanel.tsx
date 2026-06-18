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
  const markers = [
    ...values.map((item) => {
      const meta = labels.find(([key]) => key === item.key);
      return {
        key: item.key,
        value: item.value,
        description: meta?.[1] ?? "Nivel estadístico",
        group: meta?.[2] ?? "Nivel",
        distance: data.distances[item.key] ?? null,
        tone: levelTone(item.key),
        type: "level" as const,
      };
    }),
    ...(data.lastClose === null
      ? []
      : [
          {
            key: "Precio actual",
            value: data.lastClose,
            description: "Último cierre disponible",
            group: "Referencia",
            distance: null,
            tone: "border-ink bg-ink text-white",
            type: "price" as const,
          },
        ]),
  ].sort((left, right) => left.value - right.value);

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
        <div className="min-w-[820px] border border-line bg-panel p-4">
          <div className="flex items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            <span>{formatPrice(min, ticker)}</span>
            <span>Escala ordenada por precio</span>
            <span>{formatPrice(max, ticker)}</span>
          </div>
          <div className="relative mt-4">
            <div className="absolute left-8 right-8 top-[5.45rem] h-px bg-line" />
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${Math.max(markers.length, 1)}, minmax(7.5rem, 1fr))` }}
            >
              {markers.map((marker) => (
                <div key={marker.key} className="relative z-10 flex min-h-[9.25rem] min-w-0 flex-col items-center text-center">
                  <div
                    className={`flex min-h-[4.7rem] w-full flex-col justify-center border px-2.5 py-2 shadow-[0_10px_22px_rgba(31,35,40,0.05)] ${marker.tone}`}
                    title={`${marker.key}: ${marker.description}`}
                  >
                    <p className={`text-[11px] font-semibold ${marker.type === "price" ? "text-white" : ""}`}>{marker.key}</p>
                    <p className={`mt-1 text-xs font-semibold ${marker.type === "price" ? "text-white" : "text-ink"}`}>{formatPrice(marker.value, ticker)}</p>
                    <p className={`mt-1 text-[10px] leading-4 ${marker.type === "price" ? "text-white/70" : "opacity-80"}`}>{marker.description}</p>
                  </div>
                  <div className={`mt-3 h-7 w-px ${marker.type === "price" ? "bg-ink" : "bg-[#a8a29e]"}`} />
                  <div className={`h-3 w-3 rotate-45 border ${marker.type === "price" ? "border-ink bg-ink" : "border-line bg-panelSoft"}`} />
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{marker.group}</p>
                  {marker.distance !== null ? <p className="mt-1 text-[11px] text-muted">{formatPercent(marker.distance)}</p> : null}
                </div>
              ))}
            </div>
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
