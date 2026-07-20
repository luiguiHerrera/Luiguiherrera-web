import { ReportSection } from "@/components/reports/ReportSection";
import { displayStatName, displayStatTicker } from "@/lib/statistical-levels/display";
import type { WeeklyReportData } from "@/lib/reports/build-weekly-report-data";

type AutomaticMarketReadingsProps = {
  data: WeeklyReportData;
};

type StatisticalLevelAsset = WeeklyReportData["statisticalLevels"][number];

function t(value: string | null | undefined) {
  return value ?? "";
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "Pendiente";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`;
}

function formatSectorPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "Pendiente";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "Pendiente";
  return value.toFixed(digits);
}

function formatSignedNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "Pendiente";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function formatUsdMillions(value: number | null | undefined) {
  if (value === null || value === undefined) return "Pendiente";
  return `${value > 0 ? "+" : ""}${value.toFixed(0)} M USD`;
}

function vixTrendLabel(value: string | undefined) {
  if (value === "rising_fast") return "Subiendo rápido";
  if (value === "rising") return "Subiendo";
  if (value === "falling") return "Bajando";
  return "Estable";
}

function structureLabel(distanceToMa200: number | null | undefined) {
  if (distanceToMa200 === null || distanceToMa200 === undefined) return "Estructura pendiente";
  if (distanceToMa200 > 0.05) return "Sobre media larga";
  if (distanceToMa200 > 0) return "Apoyo cercano";
  if (distanceToMa200 > -0.05) return "Debajo, sin ruptura amplia";
  return "Debilidad frente a media larga";
}

function limitItems<T>(items: T[]) {
  return items.slice(0, 3);
}

function vixStateLabel(value: string | undefined) {
  if (value === "low") return "Bajo";
  if (value === "normal") return "Normal";
  if (value === "watch") return "Atención";
  if (value === "elevated") return "Elevado";
  if (value === "stress" || value === "extreme") return "Estrés";
  return "Dato pendiente";
}

function vixScaleFilled(value: number | null | undefined) {
  if (value === null || value === undefined) return 0;
  if (value >= 40) return 10;
  if (value >= 30) return 8;
  if (value >= 25) return 7;
  if (value >= 20) return 5;
  if (value >= 16) return 4;
  if (value >= 12) return 3;
  return 2;
}

function compactSectorName(value: string) {
  return value
    .replace("Consumer Discretionary", "Consumo discrecional")
    .replace("Consumer Staples", "Consumo básico")
    .replace("Communication Services", "Comunicación")
    .replace("Health Care", "Salud")
    .replace("Financials", "Financieras")
    .replace("Industrials", "Industriales")
    .replace("Technology", "Tecnología")
    .replace("Utilities", "Utilities")
    .replace("Energy", "Energía")
    .replace("Materials", "Materiales")
    .replace("Real Estate", "Inmobiliario");
}

function dashboardButton() {
  return (
    <a
      className="inline-flex w-fit items-center justify-center rounded-[4px] border border-petrol/40 bg-white/70 px-3 py-2 text-xs font-semibold text-petrol transition hover:border-petrol hover:bg-panel"
      href="/dashboard"
    >
      Ver detalle en Dashboard
    </a>
  );
}

const reportStatAssets = [
  {
    label: "S&P 500",
    aliases: ["SPY"],
  },
  { label: "GLD", aliases: ["GLD"] },
  { label: "EWJ", aliases: ["EWJ"] },
  { label: "FXI", aliases: ["FXI"] },
  { label: "BTC", aliases: ["BTCUSD", "BTCUSDT"], fallbackTicker: "BTCUSD", fallbackName: "Bitcoin spot" },
  { label: "ETH", aliases: ["ETHUSD", "ETHUSDT"], fallbackTicker: "ETHUSD", fallbackName: "Ethereum spot" },
];

function hasMetric(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function statDataStatus(asset: StatisticalLevelAsset | undefined) {
  if (!asset) return "Sin dato vigente";
  if (hasMetric(asset.percentile) && hasMetric(asset.zScore)) return "Dato vigente";
  if (
    hasMetric(asset.percentile) ||
    hasMetric(asset.zScore) ||
    hasMetric(asset.distanceToLongAverage) ||
    hasMetric(asset.currentDrawdown) ||
    hasMetric(asset.lastClose)
  ) {
    return "Dato parcial";
  }
  return "Sin dato vigente";
}

function hasAnyStatData(asset: StatisticalLevelAsset | undefined) {
  return statDataStatus(asset) !== "Sin dato vigente";
}

function formatStatMetric(value: number | null | undefined, digits: number) {
  return hasMetric(value) ? value.toFixed(digits) : "n/d";
}

export function AutomaticMarketReadings({ data }: AutomaticMarketReadingsProps) {
  const watchItems = limitItems([
    data.volatility.termStructure?.classification ? `Curva VIX: ${data.volatility.termStructure.classification}` : "",
    data.flows.btcEtfFlows?.flows.readingLabel ? `Flujos BTC ETF: ${data.flows.btcEtfFlows.flows.readingLabel}` : "",
    t(data.sectors.data?.metrics.interpretation),
  ].filter(Boolean));
  const statisticalLevelsByTicker = new Map(data.statisticalLevels.map((asset) => [asset.ticker, asset]));
  const selectedStatAssets = reportStatAssets.map((item) => ({
    ...item,
    data: item.aliases.map((ticker) => statisticalLevelsByTicker.get(ticker)).find(Boolean),
  }));
  const sectorList = data.sectors.data?.sectors ?? [];
  const sectorsPositive = sectorList.filter((sector) => sector.return1w > 0).length;
  const sectorsNegative = sectorList.filter((sector) => sector.return1w < 0).length;
  const sectorTotal = sectorList.length;
  const sectorBars = Array.from({ length: Math.max(sectorTotal, 1) }, (_, index) => index < sectorsPositive);
  const vixSpot = data.volatility.vix?.spot;
  const vixFilled = vixScaleFilled(vixSpot?.latestVix);
  const vixBars = Array.from({ length: 10 }, (_, index) => index < vixFilled);

  return (
    <section className="border-y border-line py-8 md:py-10">
      <div className="grid gap-5 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Lecturas del informe</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">
            Régimen, sectores, volatilidad y flujos
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            Resumen compacto de las señales que ayudan a leer el contexto antes de profundizar en Dashboard.
          </p>
        </div>
        <div className="grid gap-5">
          <section className="border border-petrol/35 bg-panel p-4 shadow-[0_10px_30px_rgba(31,35,40,0.035)] md:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_0.54fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase text-brass">Régimen</p>
                <h3 className="mt-3 text-2xl font-semibold leading-tight text-ink">
                  {data.regimeSummary.current}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {data.regimeSummary.interpretation}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Metric label="Fecha de datos" value={data.generatedAt} />
                <Metric label="Score" value={`${data.regimeSummary.regimeScore}/100`} emphasis />
                <Metric label="Confianza" value={`${data.regimeSummary.confidence}%`} emphasis />
                <Metric label="Sesgo" value={data.regimeSummary.bias} />
              </div>
            </div>
          </section>

          <ReportSection eyebrow="Régimen" title="Resumen de señales">
            <div className="grid gap-3 lg:grid-cols-3">
              <SignalList
                title="Qué impulsó"
                items={limitItems(data.executiveSummary.helped.map((signal) => `${signal.label}: ${signal.detail}`))}
              />
              <SignalList
                title="Qué frenó"
                items={limitItems(data.executiveSummary.weighed.map((signal) => `${signal.label}: ${signal.detail}`))}
              />
              <SignalList title="Qué vigilar" items={watchItems} />
            </div>
          </ReportSection>

          <ReportSection eyebrow="Índices" title="Índices principales vía ETF">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {data.coreEtfs.map((asset) => (
                <article key={asset.ticker} className="border border-line bg-panelSoft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-ink">{asset.ticker}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">{asset.name}</p>
                    </div>
                    <span className="text-right text-lg font-semibold text-ink">
                      {formatPercent(asset.weeklyReturn)}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm leading-6 text-muted">
                    <p className="font-semibold text-ink">{structureLabel(asset.distanceToMa200)}</p>
                    <p>Media larga: <span className="font-semibold text-ink">{formatPercent(asset.distanceToMa200)}</span></p>
                    <p>Distancia a máximos: <span className="font-semibold text-ink">{formatPercent(asset.distanceToAth)}</span></p>
                  </div>
                </article>
              ))}
            </div>
          </ReportSection>

          <ReportSection eyebrow="Sectores" title="Rotación sectorial">
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="border border-line bg-panelSoft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Sectores positivos</p>
                    <p className="mt-1 text-xs leading-5 text-muted">Participación semanal por ETF sectorial.</p>
                  </div>
                  <p className="text-lg font-semibold text-ink">
                    {sectorTotal ? `${sectorsPositive} / ${sectorTotal}` : "Pendiente"}
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-11 gap-1" aria-hidden="true">
                  {sectorBars.map((isPositive, index) => (
                    <span
                      key={`sector-bar-${index}`}
                      className={isPositive ? "h-2.5 bg-petrol" : "h-2.5 bg-line"}
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-muted">
                  {sectorTotal ? `${sectorsNegative} sectores negativos o rezagados en la ventana semanal.` : "Dato sectorial pendiente."}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <CompactSectorList
                  title="Líderes"
                  items={limitItems(data.sectors.leaders.map((sector) => ({
                    label: `${sector.etfTicker} · ${compactSectorName(sector.sectorName)}`,
                    value: formatSectorPercent(sector.return1w),
                  })))}
                />
                <CompactSectorList
                  title="Rezagados"
                  items={limitItems(data.sectors.laggards.map((sector) => ({
                    label: `${sector.etfTicker} · ${compactSectorName(sector.sectorName)}`,
                    value: formatSectorPercent(sector.return1w),
                  })))}
                />
              </div>
              <div className="lg:col-span-2">
                <div className="flex flex-col gap-3 border border-line bg-panelSoft p-4 md:flex-row md:items-start md:justify-between">
                  <EditorialNote
                    title="Lectura"
                    body={t(data.sectors.data?.metrics.interpretation) || "Rotación sectorial pendiente."}
                    footer={`Dispersión 1W: ${formatSectorPercent(data.sectors.data?.metrics.sectorDispersion1w)}`}
                  />
                  {dashboardButton()}
                </div>
              </div>
            </div>
          </ReportSection>

          <div className="grid gap-5 lg:grid-cols-2">
            <ReportSection eyebrow="VIX" title="Volatilidad">
              <div className="grid gap-4">
                <div className="border border-line bg-panelSoft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">Nivel actual</p>
                      <p className="mt-1 text-xs leading-5 text-muted">Estado: {vixStateLabel(vixSpot?.vixSeverity)}</p>
                    </div>
                    <p className="text-2xl font-semibold leading-none text-ink">{formatNumber(vixSpot?.latestVix)}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[10px] font-semibold uppercase text-muted">
                    <span>Calma</span>
                    <span>Atención</span>
                    <span>Estrés</span>
                  </div>
                  <div className="mt-2 grid grid-cols-10 gap-1" aria-hidden="true">
                    {vixBars.map((isFilled, index) => (
                      <span
                        key={`vix-bar-${index}`}
                        className={isFilled ? "h-2.5 bg-brass" : "h-2.5 bg-line"}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Metric label="Cambio 1D" value={formatSignedNumber(vixSpot?.change1d)} />
                  <Metric label="Momentum" value={vixTrendLabel(vixSpot?.vixTrend)} />
                  <Metric label="Estado" value={vixSpot?.vixCompositeLabel ?? "Dato pendiente"} />
                </div>
                <Metric label="Curva VIX" value={data.volatility.termStructure?.classification ?? "Pendiente"} />
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 md:flex-row md:items-start md:justify-between">
                <p className="text-sm leading-6 text-muted">
                  {data.volatility.termStructure?.interpretation || data.volatility.vix?.spot.vixCompositeSubtext || "Dato VIX pendiente."}
                </p>
                {dashboardButton()}
              </div>
            </ReportSection>

            <ReportSection eyebrow="Flujos" title="BTC ETF flows">
              <div className="grid gap-2 sm:grid-cols-2">
                <Metric label="Último día" value={formatUsdMillions(data.flows.btcEtfFlows?.flows.latestTotalNetFlow)} emphasis />
                <Metric label="BTC ETF 5D" value={formatUsdMillions(data.flows.btcEtfFlows?.flows.rolling5dNetFlow)} />
                <Metric label="Racha" value={data.flows.btcEtfFlows?.flows.flowStreak.label ?? "Pendiente"} />
              </div>
              <p className="mt-4 text-sm leading-6 text-muted">
                {data.flows.btcEtfFlows?.flows.readingSubtext || "Flujos BTC ETF pendientes de actualización."}
              </p>
            </ReportSection>

            <ReportSection eyebrow="Oro" title="Presión de flujos en GLD">
              <div className="grid gap-2 sm:grid-cols-2">
                <Metric label="Proxy de presión de flujos" value={data.flows.gldFlowPressure.pressureLabel} emphasis />
                <Metric label="Cambio 5D en participaciones" value={formatPercent(data.flows.gldFlowPressure.fiveDayShareChangePct, 2)} />
                <Metric label="Fecha" value={data.flows.gldFlowPressure.asOf ?? "Dato pendiente"} />
              </div>
              <p className="mt-4 text-sm leading-6 text-muted">{data.flows.gldFlowPressure.summary}</p>
              <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">{data.flows.gldFlowPressure.sourceNote}</p>
            </ReportSection>
          </div>

          <ReportSection eyebrow="Activos" title="Lecturas automáticas disponibles">
            <p className="mb-4 text-sm leading-6 text-muted">
              Datos técnicos para los activos con cobertura automática. La lectura completa incluye también stockpicking y el factor dólar.
            </p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {selectedStatAssets.map((item) => (
                <article key={item.label} className="border border-line bg-panelSoft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-ink">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {item.data
                          ? `${displayStatTicker(item.data.ticker)} · ${displayStatName(item.data.ticker, item.data.name)}`
                          : `${displayStatTicker(item.fallbackTicker ?? item.label)} · ${item.fallbackName ?? "Sin dato vigente"}`}
                      </p>
                    </div>
                    {item.data ? (
                      <span className="shrink-0 border border-brass/35 bg-white px-2 py-1 text-[11px] font-semibold uppercase text-brass">
                        {displayStatTicker(item.data.ticker)}
                      </span>
                    ) : null}
                  </div>
                  <StatisticalRangeBar percentile={item.data?.percentile ?? null} status={statDataStatus(item.data)} />
                  <div className="mt-4 grid gap-2 text-sm text-muted">
                    <p>Percentil <span className="font-semibold text-ink">{formatStatMetric(item.data?.percentile, 1)}</span></p>
                    <p>Z-score <span className="font-semibold text-ink">{formatStatMetric(item.data?.zScore, 2)}</span></p>
                    <p>Distancia a media larga <span className="font-semibold text-ink">{hasMetric(item.data?.distanceToLongAverage) ? formatPercent(item.data?.distanceToLongAverage) : "n/d"}</span></p>
                    {hasAnyStatData(item.data) && hasMetric(item.data?.lastClose) ? (
                      <p>Último cierre <span className="font-semibold text-ink">{formatNumber(item.data?.lastClose, item.data?.ticker === "BTCUSD" ? 0 : 2)}</span></p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              Estacionalidad de julio integrada como referencia descriptiva. No predice el siguiente movimiento.
            </p>
          </ReportSection>
        </div>
      </div>
    </section>
  );
}

function Metric({ emphasis = false, label, value }: { emphasis?: boolean; label: string; value: string }) {
  return (
    <div className="border border-line bg-panelSoft px-3 py-2">
      <p className="text-[11px] uppercase text-muted">{label}</p>
      <p className={emphasis ? "mt-1 text-lg font-semibold leading-6 text-ink" : "mt-1 font-semibold leading-6 text-ink"}>{value}</p>
    </div>
  );
}

function SignalList({ items, title }: { title: string; items: string[] }) {
  return (
    <div className="border border-line bg-panelSoft p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="mt-3 grid gap-2 text-sm leading-6 text-muted">
        {items.length ? items.map((item, index) => <p key={`${title}-${index}`} className="border-l border-brass/70 pl-3">{item}</p>) : <p>Sin lecturas destacadas en este bloque.</p>}
      </div>
    </div>
  );
}

function CompactSectorList({ items, title }: { title: string; items: Array<{ label: string; value: string }> }) {
  return (
    <div className="border border-line bg-panelSoft p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.length ? (
          items.map((item) => (
            <div key={`${title}-${item.label}`} className="flex items-start justify-between gap-3 text-sm leading-6">
              <span className="text-muted">{item.label}</span>
              <span className="shrink-0 font-semibold text-ink">{item.value}</span>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-muted">Dato pendiente.</p>
        )}
      </div>
    </div>
  );
}

function EditorialNote({ body, footer, title }: { body: string; footer?: string; title: string }) {
  return (
    <div className="border border-line bg-panelSoft p-4 text-sm leading-6 text-muted">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-2">{body}</p>
      {footer ? <p className="mt-3 border-t border-line pt-3 text-xs font-semibold uppercase text-muted">{footer}</p> : null}
    </div>
  );
}

function StatisticalRangeBar({ percentile, status }: { percentile: number | null; status: string }) {
  const clamped = percentile === null ? null : Math.min(100, Math.max(0, percentile));
  const indicatorLeft = clamped === null ? "50%" : `${clamped}%`;
  const hasPercentile = clamped !== null;
  const isPartial = status === "Dato parcial";

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className={hasPercentile ? "relative h-2.5 border border-line bg-paper" : "relative h-2.5 border border-line bg-paper opacity-60"}>
        <div className="absolute inset-y-0 left-0 w-[33%] bg-petrol/10" />
        <div className="absolute inset-y-0 left-[33%] w-[34%] bg-brass/10" />
        <div className="absolute inset-y-0 right-0 w-[33%] bg-risk/10" />
        <span
          className={hasPercentile ? "absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 bg-petrol shadow-[0_0_0_3px_rgba(11,52,54,0.12)]" : "absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 bg-muted/45"}
          style={{ left: indicatorLeft }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase text-muted">
        <span>Bajo</span>
        <span>Medio</span>
        <span>Alto</span>
      </div>
      {!hasPercentile ? (
        <p className={isPartial ? "mt-2 text-xs font-semibold text-brass" : "mt-2 text-xs font-semibold text-muted"}>
          {status}
        </p>
      ) : (
        <p className="mt-2 text-xs font-semibold text-petrol">{status}</p>
      )}
    </div>
  );
}
