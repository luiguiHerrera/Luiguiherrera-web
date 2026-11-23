import { BtcEtfFlowsModule } from "@/components/dashboard/BtcEtfFlowsModule";
import { DashboardReadingGuide } from "@/components/dashboard/DashboardReadingGuide";
import { DashboardModule } from "@/components/dashboard/DashboardModule";
import { DashboardPresentation } from "@/components/dashboard/DashboardPresentation";
import { GldFlowPressureModule } from "@/components/dashboard/GldFlowPressureModule";
import { IntegratedRegimeModule } from "@/components/dashboard/IntegratedRegimeModule";
import { MarketBreadthPanel } from "@/components/dashboard/MarketBreadthPanel";
import { QuantRiskPanel } from "@/components/dashboard/QuantRiskPanel";
import { SectorRotationChart, SectorRotationUnavailable } from "@/components/dashboard/SectorRotationChart";
import { VixModule } from "@/components/dashboard/VixModule";
import { VixTermStructureModule } from "@/components/dashboard/VixTermStructureModule";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { formatCapitalFlowDate } from "@/lib/dashboard/capital-flows-presentation";
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
        disclaimer: "I do not anticipate the market. I summarize data from public sources to understand the context.",
        finalDisclaimer: "This panel organizes public market readings. It does not forecast prices, recommend trades or replace personalized analysis.",
        capitalFlows: "CAPITAL FLOWS",
        capitalFlowsSubtitle: "A comparative view of inflows, outflows, and flow pressure across selected assets and vehicles.",
        vixSection: "Risk",
        vixSectionSubtitle: "Current level and term structure of implied volatility.",
        participationSection: "MARKET PARTICIPATION",
        participationSectionSubtitle: "Sector leadership shows where relative strength is concentrated; breadth helps assess how many areas of the market are participating.",
      }
    : {
        eyebrow: "Lectura de régimen",
        title: "Dashboard de régimen de mercado",
        subtitle: "Ordena volatilidad, rotación sectorial, amplitud, VIX, BTC ETF flows y presión de flujos en GLD en una lectura común.",
        disclaimer: "No anticipo el mercado. Resumo datos de fuentes públicas para entender el contexto.",
        finalDisclaimer: "Este panel organiza lecturas públicas de mercado. No anticipa precios, no recomienda operaciones con activos y no sustituye un análisis personalizado.",
        capitalFlows: "FLUJOS DE CAPITAL",
        capitalFlowsSubtitle: "Lectura comparada de entradas, salidas y presión de flujos en activos y vehículos seleccionados.",
        vixSection: "Riesgo",
        vixSectionSubtitle: "Nivel actual y estructura temporal de la volatilidad implícita.",
        participationSection: "PARTICIPACIÓN DE MERCADO",
        participationSectionSubtitle: "El liderazgo sectorial muestra dónde se concentra la fortaleza relativa; la amplitud ayuda a evaluar cuántas áreas del mercado acompañan el movimiento.",
      };

  return (
    <DashboardPresentation
        description={copy.subtitle}
        eyebrow={copy.eyebrow}
        note={copy.disclaimer}
        title={copy.title}
    >

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
              lastUpdated: btcEtfFlows.flows.latestDate
                ? formatCapitalFlowDate(btcEtfFlows.flows.latestDate, locale)
                : locale === "en" ? "No valid observation" : "Sin observación válida",
              dataStatus: btcEtfFlows.flows.dataStatus,
            }] : []),
          ]}
        />
      </div>

      <DashboardReadingGuide locale={locale} />

      <div className="mt-6 space-y-4 md:mt-8 md:space-y-6">
        <section className="grid min-w-0 gap-3 [&>*]:min-w-0" aria-labelledby="market-participation-section" data-market-participation-section>
          <details data-dashboard-section="participation">
            <summary>
              <h2 id="market-participation-section" className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">{copy.participationSection}</h2>
              <span data-dashboard-section-indicator aria-hidden="true" />
            </summary>
            <div data-dashboard-section-body>
              <p className="mb-5 max-w-3xl text-sm leading-6 text-muted">{copy.participationSectionSubtitle}</p>
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
            </div>
          </details>
        </section>
        {quantRisk || vix || vixTermStructure ? (
          <section className="grid min-w-0 gap-3 [&>*]:min-w-0" aria-labelledby="vix-volatility-section">
            <details data-dashboard-section="vix">
              <summary>
                <h2 id="vix-volatility-section" className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">{copy.vixSection}</h2>
                <span data-dashboard-section-indicator aria-hidden="true" />
              </summary>
              <div data-dashboard-section-body>
                <div className="grid min-w-0 gap-4 md:gap-5 [&>*]:min-w-0">
                  {quantRisk ? <QuantRiskPanel data={quantRisk} locale={locale} /> : null}
                  {vix ? <VixModule data={vix} /> : null}
                  {vixTermStructure ? <VixTermStructureModule data={vixTermStructure} /> : null}
                </div>
              </div>
            </details>
          </section>
        ) : null}
        {btcEtfFlows || gldFlowPressure ? (
          <section className="grid min-w-0 gap-3 [&>*]:min-w-0" aria-labelledby="capital-flows-section" data-capital-flows-section>
            <details data-dashboard-section="flows">
              <summary>
                <h2 id="capital-flows-section" className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">{copy.capitalFlows}</h2>
                <span data-dashboard-section-indicator aria-hidden="true" />
              </summary>
              <div data-dashboard-section-body>
                <p className="mb-5 max-w-3xl text-sm leading-6 text-muted">{copy.capitalFlowsSubtitle}</p>
                <div className="grid min-w-0 gap-4 md:gap-5 [&>*]:min-w-0">
                  {gldFlowPressure ? <GldFlowPressureModule data={gldFlowPressure} locale={locale} /> : null}
                  {btcEtfFlows ? <BtcEtfFlowsModule data={btcEtfFlows} /> : null}
                </div>
              </div>
            </details>
          </section>
        ) : null}
        {remainingModules.map((module) => <DashboardModule key={module.id} {...module} locale={locale} />)}
      </div>

      <div className="mt-6">
        <DisclaimerBox>
          {copy.finalDisclaimer}
        </DisclaimerBox>
      </div>
    </DashboardPresentation>
  );
}
