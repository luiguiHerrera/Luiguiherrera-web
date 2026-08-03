import Link from "next/link";
import { ReportSection } from "@/components/reports/ReportSection";
import { formatEditorialDate } from "@/lib/editorial/dates";
import type { HistoricalAutomaticReadingsSnapshot } from "@/lib/reports/historical-automatic-readings";

const indexNames = {
  SPY: "SPDR S&P 500 ETF",
  QQQ: "Invesco QQQ Trust",
  DIA: "SPDR Dow Jones Industrial Average ETF",
  IWM: "iShares Russell 2000 ETF",
};

function formatPercent(value: number, digits = 1) {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function formatNumber(value: number, digits = 1) {
  return value.toFixed(digits);
}

function formatUsdMillions(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(0)} M USD`;
}

function structureLabel(distanceLongAverage: number) {
  if (distanceLongAverage > 5) return "Sobre media larga";
  if (distanceLongAverage > 0) return "Apoyo cercano";
  if (distanceLongAverage > -5) return "Debajo, sin ruptura amplia";
  return "Debilidad frente a media larga";
}

function dashboardButton() {
  return (
    <Link
      className="inline-flex w-fit items-center justify-center rounded-[4px] border border-petrol/40 bg-white/70 px-3 py-2 text-xs font-semibold text-petrol transition hover:border-petrol hover:bg-panel"
      href="/dashboard"
    >
      Ver detalle en Dashboard
    </Link>
  );
}

export function HistoricalAutomaticMarketReadings({ snapshot }: { snapshot: HistoricalAutomaticReadingsSnapshot }) {
  const sectorBars = Array.from(
    { length: snapshot.sectors.totalCount },
    (_, index) => index < snapshot.sectors.positiveCount,
  );
  const vixFilled = snapshot.vix ? (snapshot.vix.level >= 20 ? 5 : snapshot.vix.level >= 16 ? 4 : 3) : 0;
  const vixBars = Array.from({ length: 10 }, (_, index) => index < vixFilled);

  return (
    <section className="border-y border-line py-8 md:py-10">
      <div className="grid gap-5 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">
            Lecturas de mercado al cierre
          </p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">
            Régimen, sectores, volatilidad y flujos
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            Datos disponibles hasta{" "}
            <time dateTime={snapshot.dataDate}>{formatEditorialDate(snapshot.dataDate, "es")}</time>.
          </p>
        </div>
        <div className="grid gap-5">
          <section className="border border-petrol/35 bg-panel p-4 shadow-[0_10px_30px_rgba(31,35,40,0.035)] md:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_0.54fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase text-brass">Régimen</p>
                <h3 className="mt-3 text-2xl font-semibold leading-tight text-ink">{snapshot.regime.label}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{snapshot.regime.interpretation}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Metric
                  label="Datos disponibles hasta"
                  value={<time dateTime={snapshot.dataDate}>{formatEditorialDate(snapshot.dataDate, "es")}</time>}
                />
                <Metric label="Puntuación" value={snapshot.regime.score === null ? "No publicada" : `${snapshot.regime.score}/100`} emphasis />
                <Metric label="Confianza" value={snapshot.regime.confidence === null ? "No publicada" : `${snapshot.regime.confidence}%`} emphasis />
                <Metric label="Sesgo" value={snapshot.regime.bias} />
              </div>
            </div>
          </section>

          <ReportSection eyebrow="Régimen" title="Resumen de señales">
            <div className="grid gap-3 lg:grid-cols-3">
              <SignalList title="Qué impulsó" items={snapshot.regime.support} />
              <SignalList title="Qué frenó" items={snapshot.regime.caution} />
              <SignalList title="Qué vigilar" items={snapshot.regime.watch} />
            </div>
          </ReportSection>

          <ReportSection eyebrow="Índices" title="Índices principales vía ETF">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {snapshot.indices.map((asset) => (
                <article key={asset.ticker} className="border border-line bg-panelSoft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-ink">{asset.ticker}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">{indexNames[asset.ticker]}</p>
                    </div>
                    <span className="text-right text-lg font-semibold text-ink">
                      {formatPercent(asset.return1w)}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm leading-6 text-muted">
                    <p className="font-semibold text-ink">{structureLabel(asset.distanceLongAverage)}</p>
                    <p>
                      Media larga:{" "}
                      <span className="font-semibold text-ink">{formatPercent(asset.distanceLongAverage)}</span>
                    </p>
                    <p>
                      Distancia a máximos:{" "}
                      <span className="font-semibold text-ink">{formatPercent(asset.distanceFromHigh)}</span>
                    </p>
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
                    <p className="mt-1 text-xs leading-5 text-muted">Participación semanal al cierre del informe.</p>
                  </div>
                  <p className="text-lg font-semibold text-ink">
                    {snapshot.sectors.positiveCount} / {snapshot.sectors.totalCount}
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-11 gap-1" aria-hidden="true">
                  {sectorBars.map((isPositive, index) => (
                    <span
                      key={`historical-sector-bar-${index}`}
                      className={isPositive ? "h-2.5 bg-petrol" : "h-2.5 bg-line"}
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-muted">
                  {snapshot.sectors.negativeCount} sectores negativos o rezagados en la ventana semanal.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <CompactList title="Líderes" items={snapshot.sectors.leaders} />
                <CompactList title="Rezagados" items={snapshot.sectors.laggards} />
              </div>
              <div className="lg:col-span-2">
                <div className="flex flex-col gap-3 border border-line bg-panelSoft p-4 md:flex-row md:items-start md:justify-between">
                  <EditorialNote
                    title="Lectura al publicar"
                    body={snapshot.sectors.reading}
                    footer={`Dispersión 1W: ${formatPercent(snapshot.sectors.dispersion1w)}`}
                  />
                  {dashboardButton()}
                </div>
              </div>
            </div>
          </ReportSection>

          <div className="grid gap-5 lg:grid-cols-2">
            <ReportSection eyebrow="VIX" title="Volatilidad">
              {snapshot.vix ? <>
              <div className="grid gap-4">
                <div className="border border-line bg-panelSoft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">Nivel al corte</p>
                      <p className="mt-1 text-xs leading-5 text-muted">Estado: {snapshot.vix.stateLabel}</p>
                    </div>
                    <p className="text-2xl font-semibold leading-none text-ink">{formatNumber(snapshot.vix.level)}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[10px] font-semibold uppercase text-muted">
                    <span>Calma</span>
                    <span>Atención</span>
                    <span>Estrés</span>
                  </div>
                  <div className="mt-2 grid grid-cols-10 gap-1" aria-hidden="true">
                    {vixBars.map((isFilled, index) => (
                      <span
                        key={`historical-vix-bar-${index}`}
                        className={isFilled ? "h-2.5 bg-brass" : "h-2.5 bg-line"}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Metric label="Cambio 1D" value={formatSignedNumber(snapshot.vix.change1d)} />
                  <Metric label="Momentum" value={snapshot.vix.momentum} />
                  <Metric label="Estado" value={snapshot.vix.status} />
                </div>
                <Metric label="Curva VIX" value={snapshot.vix.curve} />
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 md:flex-row md:items-start md:justify-between">
                <p className="text-sm leading-6 text-muted">{snapshot.vix.curveText}</p>
                {dashboardButton()}
              </div></> : <p className="text-sm leading-6 text-muted">No disponible al cierre. El snapshot no se completa con datos vivos posteriores.</p>}
            </ReportSection>

            <ReportSection eyebrow="Flujos" title="BTC ETF flows">
              {snapshot.btcEtfFlows ? <>
              <div className="grid gap-2 sm:grid-cols-2">
                <Metric label="Último día al corte" value={formatUsdMillions(snapshot.btcEtfFlows.lastDayUsdMillions)} emphasis />
                <Metric label="BTC ETF 5D al corte" value={formatUsdMillions(snapshot.btcEtfFlows.rolling5dUsdMillions)} />
                <Metric label="Racha al corte" value={snapshot.btcEtfFlows.streakLabel} />
              </div>
              <p className="mt-4 text-sm leading-6 text-muted">{snapshot.btcEtfFlows.reading}</p></> : <p className="text-sm leading-6 text-muted">No disponible al cierre.</p>}
            </ReportSection>

            <ReportSection eyebrow="Oro" title="Presión de flujos en GLD">
              {snapshot.gldFlowPressure ? <>
              <div className="grid gap-2 sm:grid-cols-2">
                <Metric label="Proxy al corte" value={snapshot.gldFlowPressure.label} emphasis />
                <Metric
                  label="Cambio 5D en participaciones"
                  value={formatPercent(snapshot.gldFlowPressure.sharesChange5dPct, 2)}
                />
                <Metric
                  label="Fecha del dato"
                  value={<time dateTime={snapshot.gldFlowPressure.asOf}>{snapshot.gldFlowPressure.asOf}</time>}
                />
              </div>
              <p className="mt-4 text-sm leading-6 text-muted">{snapshot.gldFlowPressure.summary}</p>
              <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">
                {snapshot.gldFlowPressure.sourceNote}
              </p></> : <p className="text-sm leading-6 text-muted">No disponible al cierre.</p>}
            </ReportSection>
          </div>

          <ReportSection eyebrow="Activos" title="Posición técnica por activo">
            <p className="mb-4 text-sm leading-6 text-muted">
              Percentil, z-score, distancia frente a la media de largo plazo y último cierre disponible.
            </p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {snapshot.statisticalAssets.map((asset) => (
                <article key={asset.label} className="border border-line bg-panelSoft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-ink">{asset.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">{asset.symbol ?? asset.label}</p>
                    </div>
                    <span className="shrink-0 border border-brass/35 bg-white px-2 py-1 text-[11px] font-semibold uppercase text-brass">
                      Dato al corte
                    </span>
                  </div>
                  <StatisticalRangeBar percentile={asset.percentile} />
                  <div className="mt-4 grid gap-2 text-sm text-muted">
                    <p>Percentil <span className="font-semibold text-ink">{asset.percentile.toFixed(1)}</span></p>
                    <p>Z-score <span className="font-semibold text-ink">{asset.zScore.toFixed(2)}</span></p>
                    <p>
                      Distancia a media larga{" "}
                      <span className="font-semibold text-ink">{formatPercent(asset.distanceLongAverage)}</span>
                    </p>
                    <p>
                      Último cierre al corte{" "}
                      <span className="font-semibold text-ink">
                        {formatNumber(asset.lastClose, asset.label === "BTC" ? 0 : 2)}
                      </span>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </ReportSection>
        </div>
      </div>
    </section>
  );
}

function Metric({
  emphasis = false,
  label,
  value,
}: {
  emphasis?: boolean;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border border-line bg-panelSoft px-3 py-2">
      <p className="text-[11px] uppercase text-muted">{label}</p>
      <p className={emphasis ? "mt-1 text-lg font-semibold leading-6 text-ink" : "mt-1 font-semibold leading-6 text-ink"}>
        {value}
      </p>
    </div>
  );
}

function SignalList({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="border border-line bg-panelSoft p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="mt-3 grid gap-2 text-sm leading-6 text-muted">
        {items.map((item, index) => <p key={`${title}-${index}`}>{item}</p>)}
      </div>
    </div>
  );
}

function CompactList({
  items,
  title,
}: {
  items: Array<{ name: string; return1w: number; ticker: string }>;
  title: string;
}) {
  return (
    <div className="border border-line bg-panelSoft p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item.ticker} className="flex items-start justify-between gap-3 text-sm leading-6">
            <span className="text-muted">{item.ticker} · {item.name}</span>
            <span className="shrink-0 font-semibold text-ink">{formatPercent(item.return1w)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditorialNote({ body, footer, title }: { body: string; footer: string; title: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{footer}</p>
    </div>
  );
}

function StatisticalRangeBar({ percentile }: { percentile: number }) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase text-muted">
        <span>Bajo</span>
        <span>Percentil {percentile.toFixed(1)}</span>
        <span>Alto</span>
      </div>
      <div className="relative mt-2 h-2 bg-line" aria-hidden="true">
        <span
          className="absolute top-1/2 h-3 w-1 -translate-x-1/2 -translate-y-1/2 bg-brass"
          style={{ left: `${Math.min(100, Math.max(0, percentile))}%` }}
        />
      </div>
    </div>
  );
}

function formatSignedNumber(value: number, digits = 1) {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}
