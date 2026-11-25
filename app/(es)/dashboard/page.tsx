import FinancialEnvironmentCard from "@/components/dashboard/FinancialEnvironmentCard";
import type { OfrFsiSnapshot } from "@/lib/dashboard/ofr-fsi";
import { BtcEtfFlowsModule } from "@/components/dashboard/BtcEtfFlowsModule";
import { DashboardReadingGuide } from "@/components/dashboard/DashboardReadingGuide";
import { DashboardModule } from "@/components/dashboard/DashboardModule";
import { DashboardPresentation } from "@/components/dashboard/DashboardPresentation";
import { DashboardSectionOverview } from "@/components/dashboard/DashboardSectionOverview";
import { flowOverviewItems, flowMonthCaption, type DashboardOverviewItem } from "@/lib/dashboard/dashboard-overview";
import { dashboardText } from "@/lib/dashboard/dashboard-localization";
import { hasVixObservation } from "@/lib/dashboard/vix-presentation";
import { buildQuantRiskPresentation } from "@/lib/dashboard/quant-risk-presentation";
import { GldFlowPressureModule } from "@/components/dashboard/GldFlowPressureModule";
import { IntegratedRegimeModule } from "@/components/dashboard/IntegratedRegimeModule";
import { MarketBreadthPanel } from "@/components/dashboard/MarketBreadthPanel";
import { McClellanPreviewModule } from "@/components/dashboard/McClellanPreviewModule";
import { Sp500EtfFlowsModule } from "@/components/dashboard/Sp500EtfFlowsModule";
import { CapitalFlowPreviewCard } from "@/components/dashboard/CapitalFlowCard";
import type { CapitalFlowAssetPreview } from "@/lib/dashboard/capital-flows-preview-types";
import type { Sp500EtfFlowsPreviewData } from "@/lib/dashboard/sp500-etf-flows-types";
import type { McClellanPreviewData } from "@/lib/dashboard/mcclellan-preview-types";
import { QuantRiskPanel } from "@/components/dashboard/QuantRiskPanel";
import { SectorRotationChart, SectorRotationUnavailable } from "@/components/dashboard/SectorRotationChart";
import { VixModule } from "@/components/dashboard/VixModule";
import { VixTermStructureModule } from "@/components/dashboard/VixTermStructureModule";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { formatCapitalFlowDate } from "@/lib/dashboard/capital-flows-presentation";
import { buildMarketBreadthValues } from "@/lib/dashboard/market-breadth";
import { getRouteMetadata } from "@/lib/seo/site";
import { buildWeeklyReportData } from "@/lib/reports/build-weekly-report-data";

import { connection } from "next/server";

export const revalidate = 3600;

export const metadata = getRouteMetadata("/dashboard");

export default async function DashboardPage() {
  await connection();
  return <DashboardContent locale="es" />;
}

export async function DashboardContent({ locale = "es", previewMcClellan = false, mcclellanPreviewData, previewSp500Flows = false, sp500FlowsPreviewData = null, capitalFlowsPreviewData = [], previewEthFlows = false, ethFlowsPreviewData, previewEwjFlows = false, financialEnvironment }: { locale?: "es" | "en"; previewMcClellan?: boolean; mcclellanPreviewData?: McClellanPreviewData; previewSp500Flows?: boolean; sp500FlowsPreviewData?: Sp500EtfFlowsPreviewData | null; capitalFlowsPreviewData?: CapitalFlowAssetPreview[]; previewEthFlows?:boolean; ethFlowsPreviewData?:CapitalFlowAssetPreview; previewEwjFlows?:boolean; financialEnvironment?:OfrFsiSnapshot | null }) {
  const showMcClellanPreview = process.env.NODE_ENV === "development" && previewMcClellan && Boolean(mcclellanPreviewData);
  const showSp500FlowsPreview = process.env.NODE_ENV === "development" && previewSp500Flows;
  const showEthFlowsPreview = process.env.NODE_ENV === "development" && previewEthFlows && Boolean(ethFlowsPreviewData);
  const showEwjFlowsPreview = process.env.NODE_ENV === "development" && previewEwjFlows;
  const dashboardData = await getDashboardData();
  const contextFlows = dashboardData.marketContext?.flows ?? [];
  const publishedFlows = !showSp500FlowsPreview ? contextFlows.filter(data => data.id !== 'ewj' && (!showEthFlowsPreview || data.id !== 'eth')) : [];
  const ewjFlows = (process.env.NODE_ENV === 'development' ? capitalFlowsPreviewData.find(data => data.id === 'ewj') : null) ?? contextFlows.find(data => data.id === 'ewj');
  const mcclellanData = showMcClellanPreview ? mcclellanPreviewData : dashboardData.marketContext?.breadth;
  const { btcEtfFlows, dashboardModules, gldFlowPressure, quantRisk, regimeSummary, sectorModule, sectorRotation, vix, vixTermStructure } = dashboardData;
  const weeklyReportData = await buildWeeklyReportData(dashboardData);
  const remainingModules = dashboardModules.filter((module) => module.id !== "rates" && module.id !== "sectors" && module.id !== "vix" && module.id !== "btc-flows");
  const breadthValues = buildMarketBreadthValues(weeklyReportData, locale);
  const flowModels = [
    ...(showSp500FlowsPreview ? capitalFlowsPreviewData.filter(data => data.id !== 'ewj') : publishedFlows),
    ...(showEthFlowsPreview && ethFlowsPreviewData ? [ethFlowsPreviewData] : []),
    ...(ewjFlows ? [ewjFlows] : []),
  ];
  if (showSp500FlowsPreview) flowModels.unshift({
    id:'sp500', title:'', eyebrow:'', description:'', points:sp500FlowsPreviewData?.points ?? [],
    cutoffDate:sp500FlowsPreviewData?.cutoffDate ?? null, metricBasis:'daily-sum', kind:'estimated',
    vehicles:sp500FlowsPreviewData?.included ?? [], sources:[], notes:[],
  });
  const insufficient = locale === 'en' ? 'Not enough data' : 'Datos insuficientes';
  const t = (value:string) => dashboardText(locale,value);
  const sourceDate = (value:string | null | undefined) => {
    if (!value) return undefined;
    const iso = value.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    return t(formatCapitalFlowDate(iso ?? value.replace(/^[^:]+:\s*/,''),locale));
  };
  const sectorReady = sectorRotation && !['demo','fallback','unavailable','live_pending'].includes(sectorRotation.dataStatus);
  const latestBreadth = mcclellanData?.points.at(-1);
  const signed = (value:number | undefined) => value == null ? insufficient : new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US',{maximumFractionDigits:1,minimumFractionDigits:1,signDisplay:'exceptZero'}).format(value);
  const participationOverview: DashboardOverviewItem[] = [
    { id:'positive-sectors', label:locale === 'en' ? 'Sectors advancing · 1W' : 'Sectores al alza · 1W', value:sectorReady ? breadthValues.positiveSectors : insufficient, date:sectorReady ? sourceDate(sectorRotation.lastUpdated) : undefined },
    { id:'long-average', label:locale === 'en' ? 'Above long-term average' : 'Sobre la media de largo plazo', value:breadthValues.sectorsOverLongAverage, date:sourceDate(weeklyReportData.statisticalSource.updated) },
    { id:'ramo', label:'RAMO', value:signed(latestBreadth?.oscillator), detail:locale === 'en' ? 'Participation momentum' : 'Impulso de la participación', date:sourceDate(mcclellanData?.cutoffDate) },
    { id:'rasi', label:'RASI', value:signed(latestBreadth?.summation), detail:locale === 'en' ? 'Accumulated breadth' : 'Amplitud acumulada', date:sourceDate(mcclellanData?.cutoffDate) },
  ];
  const quantPresentation = quantRisk ? buildQuantRiskPresentation(quantRisk,locale) : null;
  const quantReady = quantRisk && !['demo','fallback','unavailable','live_pending'].includes(quantRisk.dataStatus);
  const quantMetric = (id:string) => quantReady ? quantPresentation?.primaryMetrics.find(metric => metric.id === id)?.value ?? insufficient : insufficient;
  const spot = vix?.spot;
  const riskOverview: DashboardOverviewItem[] = [
    { id:'vix', label:'VIX', value:hasVixObservation(spot) ? new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(spot.latestVix) : insufficient, detail:hasVixObservation(spot) ? t(spot.vixLevelLabel) : undefined, date:sourceDate(spot?.lastObservationDate) },
    { id:'curve', label:locale === 'en' ? 'VIX term structure' : 'Estructura del VIX', value:vixTermStructure && !['pending','unavailable'].includes(vixTermStructure.sourceStatus) ? t(vixTermStructure.classification) : insufficient, date:sourceDate(vixTermStructure?.lastUpdated) },
    { id:'ewma', label:locale === 'en' ? 'EWMA volatility' : 'Volatilidad EWMA', value:quantMetric('ewma'), date:quantReady ? sourceDate(quantRisk.lastUpdated) : undefined },
  ];
  const flowSummaryAsOf = new Date();
  const flowsOverview = flowOverviewItems(flowModels,locale,flowSummaryAsOf);
  if (!flowModels.length) {
    if (gldFlowPressure) flowsOverview.push({ id:'gold',label:locale === 'en' ? 'Gold' : 'Oro',value:locale === 'en' ? 'Not enough monthly data' : 'Datos mensuales insuficientes',date:sourceDate(gldFlowPressure.asOf) });
    if (btcEtfFlows) flowsOverview.push({ id:'btc',label:'Bitcoin',value:locale === 'en' ? 'Not enough monthly data' : 'Datos mensuales insuficientes',date:sourceDate(btcEtfFlows.flows.latestDate) });
  }
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

      <div className="mt-6 md:mt-8" data-market-snapshot={dashboardData.marketContext?.id} data-market-captured-at={dashboardData.marketContext?.capturedAt}>
        {financialEnvironment !== undefined && <FinancialEnvironmentCard locale={locale} snapshot={financialEnvironment} />}
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
          <DashboardSectionOverview id="market-participation-section" title={copy.participationSection} items={participationOverview} />
          <details data-dashboard-section="participation" data-detail-disclosure open={showMcClellanPreview || undefined}>
            <summary>
              <span>{locale === 'en' ? 'View detail' : 'Ver detalle'}</span>
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
                {mcclellanData ? <McClellanPreviewModule data={mcclellanData} localPreview={showMcClellanPreview} locale={locale} /> : <section className="rounded border border-line p-6"><p className="text-xs uppercase tracking-widest text-brass">McClellan</p><h3 className="mt-3 font-serif text-2xl text-ink">{locale === 'en' ? 'Internal breadth of the S&P 500' : 'Amplitud interna del S&P 500'}</h3><p className="mt-3 text-sm text-muted">{locale === 'en' ? 'Data unavailable. The source will be checked again automatically.' : 'Datos no disponibles. La fuente se comprobará de nuevo automáticamente.'}</p></section>}
              </div>
            </div>
          </details>
        </section>
        {quantRisk || vix || vixTermStructure ? (
          <section className="grid min-w-0 gap-3 [&>*]:min-w-0" aria-labelledby="vix-volatility-section">
            <DashboardSectionOverview id="vix-volatility-section" title={copy.vixSection} items={riskOverview} />
            <details data-dashboard-section="vix" data-detail-disclosure>
              <summary>
                <span>{locale === 'en' ? 'View detail' : 'Ver detalle'}</span>
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
        {publishedFlows.length || btcEtfFlows || gldFlowPressure || showSp500FlowsPreview || showEthFlowsPreview || showEwjFlowsPreview ? (
          <section className="grid min-w-0 gap-3 [&>*]:min-w-0" aria-labelledby="capital-flows-section" data-capital-flows-section>
            <DashboardSectionOverview id="capital-flows-section" title={copy.capitalFlows} caption={flowMonthCaption(locale,flowSummaryAsOf)} items={flowsOverview} />
            <details data-dashboard-section="flows" data-detail-disclosure open={showSp500FlowsPreview || showEthFlowsPreview || showEwjFlowsPreview || undefined}>
              <summary>
                <span>{locale === 'en' ? 'View detail' : 'Ver detalle'}</span>
                <span data-dashboard-section-indicator aria-hidden="true" />
              </summary>
              <div data-dashboard-section-body>
                <p className="mb-5 max-w-3xl text-sm leading-6 text-muted">{copy.capitalFlowsSubtitle}</p>
                <div className="grid min-w-0 gap-4 md:gap-5 [&>*]:min-w-0">
                  {showSp500FlowsPreview ? <Sp500EtfFlowsModule data={sp500FlowsPreviewData} /> : null}
                  {showSp500FlowsPreview ? capitalFlowsPreviewData.filter(data => data.id !== 'ewj').map(data => <CapitalFlowPreviewCard key={data.id} data={data} locale={locale} />) : publishedFlows.length ? publishedFlows.map(data => <CapitalFlowPreviewCard key={data.id} data={data} locale={locale} />) : <>
                    {gldFlowPressure ? <GldFlowPressureModule data={gldFlowPressure} locale={locale} /> : null}
                    {btcEtfFlows ? <BtcEtfFlowsModule data={btcEtfFlows} /> : null}
                  </>}
                  {showEthFlowsPreview && ethFlowsPreviewData ? <CapitalFlowPreviewCard data={ethFlowsPreviewData} locale={locale} /> : null}
                  {ewjFlows ? <CapitalFlowPreviewCard data={ewjFlows} locale={locale} /> : null}
                </div>
              </div>
            </details>
          </section>
        ) : null}
        {remainingModules.map((module) => <DashboardModule key={module.id} {...module} locale={locale} />)}
      </div>

      <aside role="note" className="mt-8 border-t border-line pt-5 text-[12px] leading-6 text-muted" data-dashboard-notice>
        <p className="max-w-4xl">{copy.finalDisclaimer}</p>
      </aside>
    </DashboardPresentation>
  );
}
