import type { AssetStatRecord, KeyStatisticalLevelSet } from "@/lib/statistical-levels/types";
import { displayStatTicker } from "@/lib/statistical-levels/display";

type KeyStatisticalLevelsPanelProps = {
  asset: AssetStatRecord | null;
  frequency?: "weekly" | "monthly";
  locale?: "es" | "en";
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

function formatPercent(value: number | null, locale: "es" | "en") {
  if (value === null || !Number.isFinite(value)) return "n/d";
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", { style: "percent", signDisplay: "exceptZero", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

const monthlyScriptUrl = "https://www.tradingview.com/script/89W4VF7T/";

function levelTone(key: string) {
  return key.endsWith("HE")
    ? "border-[#aac4af] bg-[#eaf2eb] text-[#41664d]"
    : "border-[#d8b6b4] bg-[#f6e8e7] text-[#8a4d4c]";
}

function LevelDistances({ priceDistance, level, opening, locale }: { priceDistance: number | null; level: number | null; opening: number | null; locale: "es" | "en" }) {
  const fromOpen = level !== null && Number.isFinite(level) && opening !== null && Number.isFinite(opening) && opening > 0 ? level / opening - 1 : null;
  return <div className="mt-2 space-y-1 text-[11px] leading-4 text-muted">
    <p><span className="font-medium">{formatPercent(priceDistance, locale)}</span> · {locale === "es" ? "precio actual vs. nivel" : "current price vs. level"}</p>
    <p><span className="font-medium">{formatPercent(fromOpen, locale)}</span> · {locale === "es" ? "nivel desde apertura" : "level from open"}</p>
  </div>;
}

function translateLevelText(value: string, locale: "es" | "en") {
  if (locale === "es") return value;
  const translations: Record<string, string> = {
    "Extensión alta fuerte": "Strong high extension",
    "Extensión alta promedio": "Average high extension",
    "Extensión baja promedio": "Average low extension",
    "Extensión baja fuerte": "Strong low extension",
    "Extremo superior": "Upper extreme",
    "Promedio superior": "Upper average",
    "Promedio inferior": "Lower average",
    "Extremo inferior": "Lower extreme",
    "Último cierre disponible": "Latest available close",
    "Acá estamos": "We are here",
    "Historial insuficiente": "Not enough history",
    "Selecciona un activo con historial suficiente.": "Select an asset with enough history.",
    "Historial insuficiente para calcular niveles de extensión.": "Not enough history to calculate extension levels.",
  };
  return translations[value] ?? value.replace(/^Calculado con (\d+) periodos completados\.$/, "Calculated with $1 completed periods.");
}

function translateLocation(value: string, kind: "weekly" | "monthly", locale: "es" | "en") {
  if (locale === "es") return kind === "weekly" ? value.replaceAll("por semana", "semanal") : value;
  const spanishPeriod = kind === "weekly" ? "por semana" : "mensual";
  const englishPeriod = kind === "weekly" ? "weekly" : "monthly";
  return value
    .replace(`Por encima de extensión ${spanishPeriod} extrema`, `Above the extreme ${englishPeriod} extension`)
    .replace(`Cerca de extensión ${spanishPeriod} alta`, `Near the high ${englishPeriod} extension`)
    .replace(`Por debajo de extensión ${spanishPeriod} extrema`, `Below the extreme ${englishPeriod} extension`)
    .replace(`Cerca de extensión ${spanishPeriod} baja`, `Near the low ${englishPeriod} extension`)
    .replace(`Dentro del rango ${spanishPeriod} medio`, `Inside the average ${englishPeriod} range`)
    .replace("Historial insuficiente", "Not enough history");
}

function LevelLadder({ data, kind, locale, ticker }: { data: KeyStatisticalLevelSet; kind: "weekly" | "monthly"; locale: "es" | "en"; ticker?: string }) {
  const labels = levelLabels[kind];
  const copy = locale === "en"
    ? {
        weeklyLevels: "Weekly levels",
        monthlyLevels: "Monthly levels",
        currentOpen: "Current open",
        open: "Open",
        currentPrice: "Current price",
        visualRange: "Visual range",
        priceScale: "Price-ordered scale",
      }
    : {
        weeklyLevels: "Niveles semanales",
        monthlyLevels: "Niveles mensuales",
        currentOpen: "Apertura actual",
        open: "Apertura",
        currentPrice: "Precio actual",
        visualRange: "Rango visual",
        priceScale: "Escala ordenada por precio",
      };
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
        description: translateLevelText(meta?.[1] ?? "Nivel estadístico", locale),
        group: translateLevelText(meta?.[2] ?? "Nivel", locale),
        distance: data.distances[item.key] ?? null,
        tone: levelTone(item.key),
        type: "level" as const,
      };
    }),
    ...(data.lastClose === null
      ? []
      : [
          {
            key: copy.currentPrice,
            value: data.lastClose,
            description: translateLevelText("Último cierre disponible", locale),
            group: translateLevelText("Acá estamos", locale),
            distance: null,
            tone: "border-ink bg-ink text-white",
            type: "price" as const,
          },
        ]),
  ].sort((left, right) => left.value - right.value);

  if (!data.available) {
    return (
      <div className="sl-level-ladder rounded-[3px] border-[1.5px] border-[#bdb4a4] bg-panelSoft p-4 md:p-5">
        <p className="text-sm font-semibold text-ink">{kind === "weekly" ? copy.weeklyLevels : copy.monthlyLevels}</p>
        <p className="mt-2 text-sm leading-6 text-muted">{translateLevelText(data.statusNote, locale)}</p>
      </div>
    );
  }

  return (
    <div className="sl-level-ladder rounded-[3px] border-[1.5px] border-[#bdb4a4] bg-panelSoft p-4 md:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{kind === "weekly" ? copy.weeklyLevels : copy.monthlyLevels}</h3>
          <p className="mt-1 text-sm text-muted">{translateLocation(data.location, kind, locale)}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs uppercase tracking-[0.12em] text-muted">{copy.currentOpen}</p>
          <p className="text-base font-semibold text-ink">{formatPrice(data.currentOpen, ticker)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <div className="border border-line bg-panel px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{copy.open}</p>
          <p className="mt-1 font-semibold text-ink">{formatPrice(data.currentOpen, ticker)}</p>
        </div>
        <div className="border border-ink bg-ink px-3 py-2 text-white">
          <p className="text-[11px] uppercase tracking-[0.12em] text-white/70">{copy.currentPrice}</p>
          <p className="mt-1 font-semibold">{formatPrice(data.lastClose, ticker)}</p>
        </div>
        <div className="border border-line bg-panel px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{copy.visualRange}</p>
          <p className="mt-1 font-semibold text-ink">{rangeLabel}</p>
        </div>
      </div>

      <div className="mt-5 min-w-0 max-w-full">
        <div className="w-full min-w-0 border border-line bg-panel p-4">
          <div className="flex items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            <span>{formatPrice(min, ticker)}</span>
            <span>{copy.priceScale}</span>
            <span>{formatPrice(max, ticker)}</span>
          </div>
          <div className="mt-5">
            <div
              className="grid items-start gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(8.5rem, 100%), 1fr))' }}
            >
              {markers.map((marker) => (
                <div key={marker.key} className="min-w-0 text-center">
                  <div className={`mx-auto h-3 w-3 rotate-45 border ${marker.type === "price" ? "border-ink bg-ink" : marker.tone}`} />
                  <div className={`mx-auto h-8 w-px ${marker.type === "price" ? "bg-ink" : "bg-[#a8a29e]"}`} />
                  <div className="h-px bg-line" />
                  <div className="mt-3 min-w-0">
                    <p className={`text-xs font-semibold ${marker.type === "price" ? "text-ink" : "text-ink"}`}>{marker.key}</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{formatPrice(marker.value, ticker)}</p>
                    <p className="mt-1 text-[11px] leading-4 text-muted">{marker.description}</p>
                    <span className={`mt-2 inline-flex border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${marker.tone}`}>
                      {marker.group}
                    </span>
                    {marker.type === "level" ? <LevelDistances priceDistance={marker.distance} level={marker.value} opening={data.currentOpen} locale={locale} /> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {labels.map(([key, description, group]) => (
          <div key={key} className="flex flex-col justify-between gap-3 border border-line bg-panel px-3 py-2 text-sm sm:flex-row sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink">{key}</p>
                <span className={`border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${levelTone(key)}`}>{translateLevelText(group, locale)}</span>
              </div>
              <p className="text-xs text-muted">{translateLevelText(description, locale)}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-semibold text-ink">{formatPrice(data.levels[key] ?? null, ticker)}</p>
              <LevelDistances priceDistance={data.distances[key] ?? null} level={data.levels[key] ?? null} opening={data.currentOpen} locale={locale} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">{translateLevelText(data.statusNote, locale)}</p>
      {kind === "monthly" ? (
        <a
          href={monthlyScriptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex border border-ink bg-ink px-3 py-2 text-xs font-semibold text-white transition hover:bg-panel hover:text-ink"
        >
          {locale === "en" ? "Open Monthly Statistical Levels on TradingView" : "Abrir Monthly Statistical Levels en TradingView"}
        </a>
      ) : null}
    </div>
  );
}

export function KeyStatisticalLevelsPanel({ asset, frequency, locale = "es" }: KeyStatisticalLevelsPanelProps) {
  const ladders = frequency
    ? [frequency]
    : (["weekly", "monthly"] as const);

  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">{locale === "en" ? "Key statistical levels" : "Niveles estadísticos clave"}</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{asset ? displayStatTicker(asset.ticker) : locale === "en" ? "No asset selected" : "Sin activo seleccionado"}</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-muted">
          {locale === "en"
            ? "Historical extensions from the period open. They help locate the current price against its own history."
            : "Extensiones históricas desde la apertura del periodo. No implican soporte, resistencia ni dirección futura."}
        </p>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-6">
        {ladders.map((kind) => (
          <LevelLadder
            key={kind}
            data={kind === "weekly" ? asset?.keyStatisticalLevels.weekly ?? fallbackLevels("W") : asset?.keyStatisticalLevels.monthly ?? fallbackLevels("M")}
            kind={kind}
            locale={locale}
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
