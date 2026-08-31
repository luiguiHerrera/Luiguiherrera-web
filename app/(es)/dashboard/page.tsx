import { BtcEtfFlowsModule } from "@/components/dashboard/BtcEtfFlowsModule";
import { DashboardReadingGuide } from "@/components/dashboard/DashboardReadingGuide";
import { DashboardModule } from "@/components/dashboard/DashboardModule";
import { GldFlowPressureModule } from "@/components/dashboard/GldFlowPressureModule";
import { IntegratedRegimeModule } from "@/components/dashboard/IntegratedRegimeModule";
import { MarketBreadthPanel } from "@/components/dashboard/MarketBreadthPanel";
import { QuantRiskPanel } from "@/components/dashboard/QuantRiskPanel";
import { SectorRotationChart, SectorRotationUnavailable } from "@/components/dashboard/SectorRotationChart";
import { VixModule } from "@/components/dashboard/VixModule";
import { VixTermStructureModule } from "@/components/dashboard/VixTermStructureModule";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { buildMarketBreadthValues } from "@/lib/dashboard/market-breadth";
import { getRouteMetadata } from "@/lib/seo/site";
import { buildWeeklyReportData } from "@/lib/reports/build-weekly-report-data";

export const revalidate = 86400;

export const metadata = getRouteMetadata("/dashboard");

export default async function DashboardPage() {
  return <DashboardContent locale="es" />;
}

export async function DashboardContent({ locale = "es" }: { locale?: "es" | "en" }) {
  const dashboardData = await getDashboardData();
  const { btcEtfFlows, dashboardModules, gldFlowPressure, quantRisk, regimeSummary, sectorModule, sectorRotation, vix, vixTermStructure } = dashboardData;
  const weeklyReportData = await buildWeeklyReportData(dashboardData);
  const remainingModules = dashboardModules.filter((module) => module.id !== "rates" && module.id !== "sectors" && module.id !== "vix" && module.id !== "btc-flows");
  const breadthValues = buildMarketBreadthValues(weeklyReportData, locale);
  const copy = locale === "en"
    ? {
        eyebrow: "Regime read",
        title: "Market Regime Dashboard",
        subtitle: "This dashboard organizes volatility, sector rotation and flows into a compact market context view.",
        disclaimer: "Educational market-context reading. It summarizes public data and does not provide execution instructions.",
        finalDisclaimer: "This panel organizes public market readings. It does not forecast prices, recommend trades or replace personalized analysis.",
        capitalFlows: "CAPITAL FLOWS",
        capitalFlowsSubtitle: "A comparative view of inflows, outflows, and flow pressure across selected assets and vehicles.",
        vixSection: "VIX / Volatility",
        vixSectionSubtitle: "Current level and term structure of implied volatility.",
        participationSection: "MARKET PARTICIPATION",
        participationSectionSubtitle: "Sector leadership shows where relative strength is concentrated; breadth helps assess how many areas of the market are participating.",
      }
    : {
        eyebrow: "Lectura de régimen",
        title: "Dashboard de régimen de mercado",
        subtitle: "Ordena volatilidad, rotación sectorial, amplitud, VIX, BTC ETF flows y presión de flujos en GLD en una lectura común.",
        disclaimer: "Esta lectura no anticipa el mercado. Resume datos de fuentes abiertas para entender el contexto.",
        finalDisclaimer: "Este panel organiza lecturas públicas de mercado. No anticipa precios, no recomienda operaciones con activos y no sustituye un análisis personalizado.",
        capitalFlows: "FLUJOS DE CAPITAL",
        capitalFlowsSubtitle: "Lectura comparada de entradas, salidas y presión de flujos en activos y vehículos seleccionados.",
        vixSection: "VIX / Volatilidad",
        vixSectionSubtitle: "Nivel actual y estructura temporal de la volatilidad implícita.",
        participationSection: "PARTICIPACIÓN DE MERCADO",
        participationSectionSubtitle: "El liderazgo sectorial muestra dónde se concentra la fortaleza relativa; la amplitud ayuda a evaluar cuántas áreas del mercado acompañan el movimiento.",
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
            ...[{
              pillar: "sectorRotation" as const,
              sourceName: sectorRotation?.sourceName ?? sectorModule.sourceName,
              sourceUrl: sectorRotation?.sourceUrl ?? sectorModule.sourceUrl,
              lastUpdated: sectorRotation?.lastUpdated ?? sectorModule.lastUpdated,
              dataStatus: sectorRotation?.dataStatus ?? sectorModule.dataStatus,
            }],
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
        <section className="grid min-w-0 gap-3 [&>*]:min-w-0" aria-labelledby="market-participation-section" data-market-participation-section>
          <div className="border-l-2 border-brass/50 pl-4">
            <h2 id="market-participation-section" className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">{copy.participationSection}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{copy.participationSectionSubtitle}</p>
          </div>
          <div className="grid min-w-0 gap-4 md:gap-5 [&>*]:min-w-0">
            {sectorRotation ? <SectorRotationChart data={sectorRotation} /> : <SectorRotationUnavailable locale={locale} module={sectorModule} />}
            <MarketBreadthPanel
              locale={locale}
              values={breadthValues}
              statisticalSource={{
                name: weeklyReportData.statisticalSource.name,
                url: weeklyReportData.statisticalSource.url,
                updated: weeklyReportData.statisticalSource.updated,
              }}
              sectorSource={{
                name: sectorRotation?.sourceName ?? sectorModule.sourceName,
                url: sectorRotation?.sourceUrl ?? sectorModule.sourceUrl,
                updated: sectorRotation?.lastUpdated ?? sectorModule.lastUpdated,
                status: sectorRotation?.dataStatus ?? sectorModule.dataStatus,
              }}
            />
          </div>
        </section>
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
          <section className="grid min-w-0 gap-3 [&>*]:min-w-0" aria-labelledby="capital-flows-section" data-capital-flows-section>
            <div className="border-l-2 border-brass/50 pl-4">
              <h2 id="capital-flows-section" className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">{copy.capitalFlows}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{copy.capitalFlowsSubtitle}</p>
            </div>
            <div className="grid min-w-0 gap-4 md:gap-5 [&>*]:min-w-0">
              {gldFlowPressure ? <GldFlowPressureModule data={gldFlowPressure} locale={locale} /> : null}
              {btcEtfFlows ? <BtcEtfFlowsModule data={btcEtfFlows} /> : null}
            </div>
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
