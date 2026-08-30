import { BtcEtfFlowsModule } from "@/components/dashboard/BtcEtfFlowsModule";
import { dashboardModuleEyebrowClassName, dashboardModuleTitleClassName } from "@/components/dashboard/DashboardPrimitives";
import { DashboardReadingGuide } from "@/components/dashboard/DashboardReadingGuide";
import { DashboardModule } from "@/components/dashboard/DashboardModule";
import { GldFlowPressureModule } from "@/components/dashboard/GldFlowPressureModule";
import { IntegratedRegimeModule } from "@/components/dashboard/IntegratedRegimeModule";
import { QuantRiskPanel } from "@/components/dashboard/QuantRiskPanel";
import { SectorRotationChart } from "@/components/dashboard/SectorRotationChart";
import { VixModule } from "@/components/dashboard/VixModule";
import { VixTermStructureModule } from "@/components/dashboard/VixTermStructureModule";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { getRouteMetadata } from "@/lib/seo/site";
import { buildWeeklyReportData } from "@/lib/reports/build-weekly-report-data";
import type { WeeklyReportData } from "@/lib/reports/build-weekly-report-data";

export const revalidate = 86400;

export const metadata = getRouteMetadata("/dashboard");

function MarketBreadthPanel({ data, locale }: { data: WeeklyReportData; locale: "es" | "en" }) {
  const statsByTicker = new Map(data.statisticalLevels.map((asset) => [asset.ticker, asset]));
  const spyLevel = statsByTicker.get("SPY");
  const rspLevel = statsByTicker.get("RSP");
  const iwmLevel = statsByTicker.get("IWM");
  const qqqLevel = statsByTicker.get("QQQ");
  const sectorStats = data.statisticalLevels.filter((asset) => asset.ticker.startsWith("XL"));
  const sectorsPositive = data.sectors.data?.sectors.filter((sector) => (sector.return1w ?? 0) > 0).length ?? null;
  const sectorsNegative = data.sectors.data?.sectors.filter((sector) => (sector.return1w ?? 0) < 0).length ?? null;
  const sectorTotal = data.sectors.data?.sectors.length ?? sectorStats.length;
  const sectorsOverLongAverage = sectorStats.filter((asset) => (asset.distanceToLongAverage ?? -Infinity) > 0).length;
  const copy = locale === "en"
    ? {
        eyebrow: "Market breadth",
        title: "Market breadth",
        subtitle: "It looks for whether the index is rising with broad participation or being held up by a few leaders.",
        rsp: "RSP/SPY",
        rspHelp: "Equal weight versus the S&P 500. It checks whether the average stock is keeping up with the capitalization-weighted index.",
        iwm: "IWM/SPY",
        iwmHelp: "Small caps versus the S&P 500. It checks whether risk appetite is broadening.",
        qqq: "QQQ/SPY",
        qqqHelp: "Technology/growth versus the S&P 500. It checks concentration in growth and technology.",
        sectorParticipation: "Positive sectors",
        sectorParticipationHelp: "How many sectors are participating.",
        sectorTrend: "Sectors above long average",
        sectorTrendHelp: "Trend health by sector.",
        classicTitle: "Next classic breadth block",
        classicSubtitle: "Pending automated source for advances/declines and 52-week highs/lows.",
        classicDetail: "Prepared for the advance-decline line, McClellan oscillator and net 52-week highs once reliable data is available.",
        pending: "pending",
        flat: "flat",
      }
    : {
        eyebrow: "Amplitud de mercado",
        title: "Amplitud de mercado",
        subtitle: "Busca responder si el índice sube acompañado o sostenido por pocos líderes.",
        rsp: "RSP/SPY",
        rspHelp: "Equal weight contra S&P 500. Mide si la acción promedio acompaña al índice ponderado por capitalización.",
        iwm: "IWM/SPY",
        iwmHelp: "Small caps contra S&P 500. Mide si el apetito por riesgo se ensancha.",
        qqq: "QQQ/SPY",
        qqqHelp: "Tecnología/growth contra S&P 500. Mide concentración en crecimiento y tecnología.",
        sectorParticipation: "Sectores positivos",
        sectorParticipationHelp: "Cuántos sectores acompañan.",
        sectorTrend: "Sectores sobre media larga",
        sectorTrendHelp: "Salud de tendencia por sector.",
        classicTitle: "Próximo bloque de amplitud clásica",
        classicSubtitle: "Pendiente de fuente automatizada para avances/descensos y máximos/mínimos de 52 semanas.",
        classicDetail: "Queda preparado para línea de avance-declive, oscilador McClellan y nuevos máximos netos cuando haya datos confiables.",
        pending: "pendiente",
        flat: "plano",
      };
  const metrics = [
    {
      label: copy.rsp,
      value: spyLevel && rspLevel ? formatDashboardPpSpread(rspLevel.returns["1W"], spyLevel.returns["1W"], copy.pending, copy.flat) : copy.pending,
      helper: copy.rspHelp,
    },
    {
      label: copy.iwm,
      value: spyLevel && iwmLevel ? formatDashboardPpSpread(iwmLevel.returns["1W"], spyLevel.returns["1W"], copy.pending, copy.flat) : copy.pending,
      helper: copy.iwmHelp,
    },
    {
      label: copy.qqq,
      value: spyLevel && qqqLevel ? formatDashboardPpSpread(qqqLevel.returns["1W"], spyLevel.returns["1W"], copy.pending, copy.flat) : copy.pending,
      helper: copy.qqqHelp,
    },
    {
      label: copy.sectorParticipation,
      value: sectorsPositive !== null && sectorsNegative !== null && sectorTotal ? `${sectorsPositive}/${sectorTotal}` : copy.pending,
      helper: copy.sectorParticipationHelp,
    },
    {
      label: copy.sectorTrend,
      value: sectorStats.length ? `${sectorsOverLongAverage}/${sectorStats.length}` : copy.pending,
      helper: copy.sectorTrendHelp,
    },
  ];

  return (
    <section className="estate-card border border-line p-4 md:p-5">
      <div>
        <p className={dashboardModuleEyebrowClassName}>{copy.eyebrow}</p>
        <h2 className={`mt-3 ${dashboardModuleTitleClassName}`}>{copy.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{copy.subtitle}</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="border border-line bg-panelSoft p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{metric.label}</p>
            <p className="mt-2 font-semibold text-ink">{metric.value}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{metric.helper}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 border-t border-line pt-5">
        <div className="border border-line bg-white/70 p-4">
          <p className="text-sm font-semibold text-ink">{copy.classicTitle}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{copy.classicSubtitle}</p>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-muted">{copy.classicDetail}</p>
        </div>
      </div>
    </section>
  );
}

function formatDashboardPpSpread(value: number | null | undefined, benchmark: number | null | undefined, pending: string, flat: string) {
  if (value === null || value === undefined || benchmark === null || benchmark === undefined) return pending;
  const spread = (value - benchmark) * 100;
  if (Math.abs(spread) < 0.05) return flat;
  return `${spread > 0 ? "+" : ""}${spread.toFixed(1)} pp`;
}

export default async function DashboardPage() {
  return <DashboardContent locale="es" />;
}

export async function DashboardContent({ locale = "es" }: { locale?: "es" | "en" }) {
  const [{ btcEtfFlows, dashboardModules, gldFlowPressure, quantRisk, regimeSummary, sectorRotation, vix, vixTermStructure }, weeklyReportData] = await Promise.all([
    getDashboardData(),
    buildWeeklyReportData(),
  ]);
  const remainingModules = dashboardModules.filter((module) => module.id !== "rates" && module.id !== "sectors" && module.id !== "vix" && module.id !== "btc-flows");
  const copy = locale === "en"
    ? {
        eyebrow: "Regime read",
        title: "Market Regime Dashboard",
        subtitle: "This dashboard organizes volatility, sector rotation and flows into a compact market context view.",
        disclaimer: "Educational market-context reading. It summarizes public data and does not provide execution instructions.",
        finalDisclaimer: "This panel organizes public market readings. It does not forecast prices, recommend trades or replace personalized analysis.",
        capitalFlows: "Capital flows",
        capitalFlowsTitle: "Flow map",
        capitalFlowsSubtitle: "A comparative view of inflows, outflows, and flow pressure across different assets.",
        vixSection: "VIX / Volatility",
        vixSectionSubtitle: "Current level and term structure of implied volatility.",
      }
    : {
        eyebrow: "Lectura de régimen",
        title: "Dashboard de régimen de mercado",
        subtitle: "Ordena volatilidad, rotación sectorial, amplitud, VIX, BTC ETF flows y presión de flujos en GLD en una lectura común.",
        disclaimer: "Esta lectura no anticipa el mercado. Resume datos de fuentes abiertas para entender el contexto.",
        finalDisclaimer: "Este panel organiza lecturas públicas de mercado. No anticipa precios, no recomienda operaciones con activos y no sustituye un análisis personalizado.",
        capitalFlows: "Flujos de capital",
        capitalFlowsTitle: "Mapa de flujos",
        capitalFlowsSubtitle: "Lectura comparada de entradas, salidas y presión de flujos en distintos activos.",
        vixSection: "VIX / Volatilidad",
        vixSectionSubtitle: "Nivel actual y estructura temporal de la volatilidad implícita.",
      };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-5 md:py-14">
      <InstitutionalHero
        description={copy.subtitle}
        eyebrow={copy.eyebrow}
        note={copy.disclaimer}
        title={copy.title}
        variant="executive"
      />

      <div className="mt-6 md:mt-8">
        <IntegratedRegimeModule
          data={regimeSummary}
          locale={locale}
          provenance={[
            ...(sectorRotation ? [{
              pillar: "sectorRotation" as const,
              sourceName: sectorRotation.sourceName,
              sourceUrl: sectorRotation.sourceUrl,
              lastUpdated: sectorRotation.lastUpdated,
              dataStatus: sectorRotation.dataStatus,
            }] : []),
            ...(vix ? [{
              pillar: "vix" as const,
              sourceName: vix.spot.sourceName,
              sourceUrl: vix.spot.sourceUrl,
              lastUpdated: vix.spot.lastUpdated,
              dataStatus: vix.spot.dataStatus,
            }] : []),
            ...(btcEtfFlows ? [{
              pillar: "btcFlows" as const,
              sourceName: btcEtfFlows.flows.sourceName,
              sourceUrl: btcEtfFlows.flows.sourceUrl,
              lastUpdated: btcEtfFlows.flows.lastUpdated,
              dataStatus: btcEtfFlows.flows.dataStatus,
            }] : []),
          ]}
        />
      </div>

      <DashboardReadingGuide locale={locale} />

      <div className="mt-6 space-y-4 md:mt-8 md:space-y-6">
        {sectorRotation ? <SectorRotationChart data={sectorRotation} /> : null}
        <MarketBreadthPanel data={weeklyReportData} locale={locale} />
        {quantRisk ? <QuantRiskPanel data={quantRisk} locale={locale} /> : null}
        {vix || vixTermStructure ? (
          <section className="grid min-w-0 gap-3 [&>*]:min-w-0" aria-labelledby="vix-volatility-section">
            <div className="border-l-2 border-brass/50 pl-4">
              <h2 id="vix-volatility-section" className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">{copy.vixSection}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{copy.vixSectionSubtitle}</p>
            </div>
            <div className="grid min-w-0 gap-4 md:gap-5 [&>*]:min-w-0">
              {vix ? <VixModule data={vix} /> : null}
              {vixTermStructure ? <VixTermStructureModule data={vixTermStructure} /> : null}
            </div>
          </section>
        ) : null}
        {btcEtfFlows || gldFlowPressure ? (
          <section className="warm-section grid min-w-0 gap-4 rounded-[6px] border border-line p-4 md:p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-petrol">{copy.capitalFlows}</p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{copy.capitalFlowsTitle}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{copy.capitalFlowsSubtitle}</p>
            </div>
            {gldFlowPressure ? <GldFlowPressureModule data={gldFlowPressure} locale={locale} /> : null}
            {btcEtfFlows ? <BtcEtfFlowsModule data={btcEtfFlows} /> : null}
          </section>
        ) : null}
        {remainingModules.map((module) => <DashboardModule key={module.id} {...module} locale={locale} />)}
      </div>

      <div className="mt-6">
        <DisclaimerBox>
          {copy.finalDisclaimer}
        </DisclaimerBox>
      </div>
    </div>
  );
}
