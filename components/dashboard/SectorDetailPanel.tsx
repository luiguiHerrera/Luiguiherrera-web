import type { SectorEtfSnapshot } from "@/lib/dashboard/types";
import { translateDashboardText } from "@/lib/dashboard/translate-dashboard-copy";

type SectorDetailPanelProps = {
  sector: SectorEtfSnapshot;
  selectedPeriod: "1W" | "1M" | "3M";
  selectedRank: number | null;
  locale?: "es" | "en";
};

const detailPeriodMap = {
  "1W": "30d",
  "1M": "63d",
  "3M": "252d",
} as const;

function formatPercent(value: number | null, locale: "es" | "en" = "es") {
  if (value === null) return locale === "en" ? "Not enough data" : "Pendiente de datos suficientes";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function trendLabel(trend: SectorEtfSnapshot["trend"], locale: "es" | "en" = "es") {
  if (trend === "up") return locale === "en" ? "Uptrend" : "Ascendente";
  if (trend === "down") return locale === "en" ? "Downtrend" : "Descendente";
  return locale === "en" ? "Sideways" : "Lateral";
}

function trendFromValues(values: number[]): SectorEtfSnapshot["trend"] {
  if (values.length < 10) return "flat";
  const start = values.slice(0, 5).reduce((sum, value) => sum + value, 0) / 5;
  const end = values.slice(-5).reduce((sum, value) => sum + value, 0) / 5;
  const change = ((end / start) - 1) * 100;

  if (change > 1) return "up";
  if (change < -1) return "down";
  return "flat";
}

function MiniReturnChart({ label, values, locale = "es" }: { label: string; values: number[]; locale?: "es" | "en" }) {
  if (values.length < 2) {
    return (
      <div className="bg-panel px-4 py-4 text-sm text-muted">
        {locale === "en" ? "Not enough history for this view" : "Historial insuficiente para esta vista"}
      </div>
    );
  }

  const base = values[0] || 1;
  const returns = values.map((value) => ((value / base) - 1) * 100);
  const min = Math.min(...returns);
  const max = Math.max(...returns);
  const middle = (min + max) / 2;
  const range = max - min || 1;
  const chartLeft = 34;
  const chartRight = 174;
  const chartTop = 10;
  const chartBottom = 70;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;
  const points = returns
    .map((value, index) => {
      const x = chartLeft + (index / Math.max(returns.length - 1, 1)) * chartWidth;
      const y = chartBottom - ((value - min) / range) * chartHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const finalValue = returns[returns.length - 1];
  const finalX = chartRight;
  const finalY = chartBottom - ((finalValue - min) / range) * chartHeight;
  const yFor = (value: number) => chartBottom - ((value - min) / range) * chartHeight;

  return (
    <div className="bg-panel px-3 py-3">
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.12em] text-muted">
        <span>{label}</span>
        <span className="font-semibold text-ink">{formatPercent(finalValue, locale)}</span>
      </div>
      <svg viewBox="0 0 190 92" className="h-32 w-full text-petrol" role="img" aria-label="Retorno acumulado de los cierres diarios mostrados">
        {[max, middle, min].map((tick) => (
          <g key={tick}>
            <line x1={chartLeft} x2={chartRight} y1={yFor(tick)} y2={yFor(tick)} stroke="currentColor" strokeOpacity="0.12" vectorEffect="non-scaling-stroke" />
            <text x="2" y={yFor(tick) + 3} className="fill-muted text-[9px]">{formatPercent(tick, locale)}</text>
          </g>
        ))}
        <line x1={chartLeft} x2={chartLeft} y1={chartTop} y2={chartBottom} stroke="currentColor" strokeOpacity="0.18" vectorEffect="non-scaling-stroke" />
        <line x1={chartLeft} x2={chartRight} y1={chartBottom} y2={chartBottom} stroke="currentColor" strokeOpacity="0.18" vectorEffect="non-scaling-stroke" />
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {returns.map((value, index) => {
          if (index % 5 !== 0 && index !== returns.length - 1) return null;

          const x = chartLeft + (index / Math.max(returns.length - 1, 1)) * chartWidth;
          const y = chartBottom - ((value - min) / range) * chartHeight;
          return <circle key={`${index}-${value}`} cx={x} cy={y} r="1.2" fill="currentColor" opacity="0.55" />;
        })}
        <circle cx={finalX} cy={finalY} r="3" fill="currentColor" />
        <text x={chartLeft} y="88" className="fill-muted text-[9px]">-{values.length} {locale === "en" ? "sessions" : "sesiones"}</text>
        <text x={chartRight - 16} y="88" className="fill-muted text-[9px]">{locale === "en" ? "Today" : "Hoy"}</text>
      </svg>
    </div>
  );
}

export function SectorDetailPanel({ sector, selectedPeriod, selectedRank, locale = "es" }: SectorDetailPanelProps) {
  const t = (value: string | null | undefined) => locale === "en"
    ? translateDashboardText(value)
    : value === "Utilities"
      ? "Servicios públicos"
      : value === "Real Estate"
        ? "Inmobiliario"
        : value ?? "";
  const selectedSeries = sector.detailSeries.find((series) => series.period === detailPeriodMap[selectedPeriod]);
  const detailPoints = selectedSeries?.points ?? sector.sparkline30d;
  const trend = trendFromValues(detailPoints);
  const trendLabelText =
    selectedPeriod === "1W"
      ? locale === "en" ? "30-session trend" : "Tendencia 30 sesiones"
      : selectedPeriod === "1M"
        ? locale === "en" ? "63-session trend" : "Tendencia 63 sesiones"
        : selectedSeries && selectedSeries.availableSessions >= 252
          ? locale === "en" ? "252-session trend" : "Tendencia 252 sesiones"
          : locale === "en" ? "Available-history trend" : "Tendencia historial disponible";

  return (
    <section className="bg-panelSoft/35 px-4 py-4" data-selected-sector-detail>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">{locale === "en" ? "Selected sector detail" : "Detalle del sector seleccionado"}</p>
          <h3 className="mt-1 font-serif text-lg font-semibold text-ink">{t(sector.sectorName)}</h3>
          <p className="mt-1 text-sm text-muted">{sector.etfTicker} {locale === "en" ? "as sector proxy" : "como proxy sectorial"}</p>
        </div>
        <p className="text-sm font-semibold text-ink">
          {locale === "en" ? "Current rank" : "Ranking actual"}: {selectedRank ?? (locale === "en" ? "Not enough data" : "Pendiente de datos suficientes")}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 border-y border-line text-sm lg:grid-cols-5">
        <div>
          <span className="block text-xs uppercase tracking-[0.14em] text-muted">{locale === "en" ? "Latest close" : "Último cierre"}</span>
          <span className="mt-1 block font-semibold text-ink">{formatCurrency(sector.latestClose)}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-[0.14em] text-muted">1W</span>
          <span className="mt-1 block font-semibold text-ink">{formatPercent(sector.return1w, locale)}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-[0.14em] text-muted">1M</span>
          <span className="mt-1 block font-semibold text-ink">{formatPercent(sector.return1m, locale)}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-[0.14em] text-muted">3M</span>
          <span className="mt-1 block font-semibold text-ink">{formatPercent(sector.return3m, locale)}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-[0.14em] text-muted">{trendLabelText}</span>
          <span className="mt-1 block font-semibold text-ink">{trendLabel(trend, locale)}</span>
        </div>
      </div>

      <div className="mt-4">
        <MiniReturnChart label={selectedSeries?.label ?? (locale === "en" ? "Available history" : "Historial disponible")} values={detailPoints} locale={locale} />
      </div>

      <p className="mt-4 text-sm leading-6 text-muted">
        {locale === "en"
          ? "Trend is calculated on daily closes, comparing the first segment with the final segment of the displayed period. Sector proxy for context."
          : "Tendencia calculada sobre cierres diarios, comparando el tramo inicial con el tramo final del periodo mostrado. Proxy sectorial para contexto, no personalizado."}
      </p>
    </section>
  );
}
