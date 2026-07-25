import { BtcEtfFlowsModule } from "@/components/dashboard/BtcEtfFlowsModule";
import type { Metadata } from "next";
import { DashboardModule } from "@/components/dashboard/DashboardModule";
import { FedWatchModule } from "@/components/dashboard/FedWatchModule";
import { GldFlowPressureModule } from "@/components/dashboard/GldFlowPressureModule";
import { QuantRiskPanel } from "@/components/dashboard/QuantRiskPanel";
import { RegimeBadge } from "@/components/dashboard/RegimeBadge";
import { SectorRotationChart } from "@/components/dashboard/SectorRotationChart";
import { VixModule } from "@/components/dashboard/VixModule";
import { VixTermStructureModule } from "@/components/dashboard/VixTermStructureModule";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { ExpandableInsightCard } from "@/components/ui/ExpandableInsightCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { QuantAnnotation } from "@/components/ui/QuantAnnotation";
import { ReadingCard } from "@/components/seo/ReadingCard";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { dataStatusLabels } from "@/lib/dashboard/status";
import { translateDashboardText, translateRegimeLabel } from "@/lib/dashboard/translate-dashboard-copy";
import { buildWeeklyReportData } from "@/lib/reports/build-weekly-report-data";
import type { RegimeBias } from "@/lib/dashboard/types";
import type { WeeklyReportData } from "@/lib/reports/build-weekly-report-data";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Dashboard de régimen de mercado | VIX, rotación, flujos y GLD",
  description: "Dashboard educativo de régimen de mercado con rotación sectorial, amplitud, VIX, estructura de volatilidad, BTC ETF flows y proxy de presión de flujos en GLD.",
};

const riskBiasLabels: Record<RegimeBias, string> = {
  favorable: "Favorable",
  neutral: "Neutral",
  cautious: "Cauteloso",
  stress: "Estrés",
};
const englishRiskBiasLabels: Record<RegimeBias, string> = {
  favorable: "Favorable",
  neutral: "Neutral",
  cautious: "Cautious",
  stress: "Stress",
};

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
    <section className="border border-line bg-panel p-4 md:p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-petrol">{copy.eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold text-ink">{copy.title}</h2>
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
  const [{ btcEtfFlows, crossSignalRadar, dashboardModules, fedWatch, gldFlowPressure, quantRisk, regimeSummary, sectorRotation, vix, vixTermStructure }, weeklyReportData] = await Promise.all([
    getDashboardData(),
    buildWeeklyReportData(),
  ]);
  const remainingModules = dashboardModules.filter((module) => module.id !== "rates" && module.id !== "sectors" && module.id !== "vix" && module.id !== "btc-flows");
  const biasLabels = locale === "en" ? englishRiskBiasLabels : riskBiasLabels;
  const t = (value: string | null | undefined) => locale === "en" ? translateDashboardText(value) : value ?? "";
  const copy = locale === "en"
    ? {
        eyebrow: "Regime read",
        title: "Market Regime Dashboard",
        subtitle: "This dashboard organizes volatility, sector rotation and flows into a compact market context view.",
        disclaimer: "Educational market-context reading. It summarizes public data and does not provide execution instructions.",
        integrated: "Integrated regime",
        composite: "Composite market read",
        currentRegime: "Current regime",
        bias: "Bias",
        confidence: "Confidence",
        status: "Status",
        updated: "Updated",
        activeSources: "Active sources",
        fedwatchNote: "FedWatch remains pending and carries no weight in the score while its status is live_pending.",
        supports: "Risk supports",
        cautions: "Caution readings",
        noSupports: "No dominant risk-support readings at this moment.",
        radar: "Radar",
        crossReadings: "Cross-readings",
        radarReading: "Combines short interest, institutional presence and prudent notes to organize follow-up tensions.",
        manualUpdate: "Manual update",
        reviewedTickers: "Reviewed tickers",
        mode: "Mode",
        curated: "Curated",
        use: "Use",
        research: "Research",
        shortInterest: "Reported short interest",
        institutional: "Institutional presence / 13F",
        shortDate: "Short interest date",
        reviewDate: "13F date or latest review",
        note: "Prudent note",
        radarFooter: "Conceptual sources: reported short interest, 13F filings and institutional reports with lag. Coverage can be incomplete and dates can differ by provider.",
        finalDisclaimer: "This panel organizes public market readings. It does not forecast prices, recommend trades or replace personalized analysis.",
        capitalFlows: "Capital flows",
        capitalFlowsTitle: "BTC ETF flows",
        capitalFlowsSubtitle: "Organizes BTC ETF flows and the GLD flow-pressure proxy without mixing them with spot statistical levels.",
      }
    : {
        eyebrow: "Lectura de régimen",
        title: "Dashboard de régimen de mercado",
        subtitle: "Ordena volatilidad, rotación sectorial, amplitud, VIX, BTC ETF flows y presión de flujos en GLD en una lectura común.",
        disclaimer: "Esta lectura no anticipa el mercado. Resume datos de fuentes abiertas para entender el contexto.",
        integrated: "Régimen integrado",
        composite: "Lectura compuesta del mercado",
        currentRegime: "Régimen actual",
        bias: "Sesgo",
        confidence: "Confianza",
        status: "Estado",
        updated: "Actualización",
        activeSources: "Fuentes activas",
        fedwatchNote: "FedWatch permanece pendiente y no aporta peso al score mientras su estado sea live_pending.",
        supports: "Soportes de riesgo",
        cautions: "Lecturas de cautela",
        noSupports: "Sin lecturas dominantes a favor del riesgo en este momento.",
        radar: "Radar",
        crossReadings: "Lecturas cruzadas",
        radarReading: "Cruza short interest, presencia institucional y notas prudentes para ordenar posibles tensiones de seguimiento.",
        manualUpdate: "Actualización manual",
        reviewedTickers: "Tickers revisados",
        mode: "Modo",
        curated: "Curado",
        use: "Uso",
        research: "Investigación",
        shortInterest: "Short interest reportado",
        institutional: "Presencia institucional / 13F",
        shortDate: "Fecha short interest",
        reviewDate: "Fecha 13F o última revisión",
        note: "Nota prudente",
        radarFooter: "Fuentes conceptuales: short interest reportado, formularios 13F e informes institucionales con retraso. La cobertura puede ser incompleta y las fechas pueden diferir entre proveedores.",
        finalDisclaimer: "Este panel organiza lecturas públicas de mercado. No anticipa precios, no recomienda operaciones con activos y no sustituye un análisis personalizado.",
        capitalFlows: "Flujos de capital",
        capitalFlowsTitle: "BTC ETF flows",
        capitalFlowsSubtitle: "Ordena flujos de ETFs BTC y el proxy de presión de flujos en GLD sin mezclarlos con niveles estadísticos spot.",
      };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-5 md:py-14">
      <div className="grid gap-5 md:gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
        <SectionHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          subtitle={copy.subtitle}
        />
        <DisclaimerBox>
          {copy.disclaimer}
        </DisclaimerBox>
      </div>

      <ReadingCard title={locale === "en" ? "Reading card" : "Ficha de lectura"} items={locale === "en" ? [
        { label: "What it is", value: "An educational dashboard that organizes market-regime signals: volatility, sector rotation, breadth, VIX, BTC ETF flows and a GLD flow-pressure proxy." },
        { label: "What it is for", value: "It helps read whether the market looks more offensive, defensive, concentrated or mixed before reviewing specific assets." },
        { label: "Main sources", value: "Alpha Vantage for sector ETFs, FRED/VIX for volatility, Bitbo for BTC ETF flows and State Street / GLD for the GLD flow-pressure proxy." },
        { label: "Limits", value: "It does not predict markets, issue buy or sell signals, and some readings depend on external source availability." },
      ] : [
        { label: "Qué es", value: "Un dashboard educativo que ordena señales de régimen de mercado: volatilidad, rotación sectorial, amplitud, VIX, BTC ETF flows y proxy de presión de flujos en GLD." },
        { label: "Para qué sirve", value: "Sirve para leer si el mercado parece más ofensivo, defensivo, concentrado o mixto antes de revisar activos específicos." },
        { label: "Fuentes principales", value: "Alpha Vantage para ETFs sectoriales, FRED/VIX para volatilidad, Bitbo para BTC ETF flows y State Street / GLD para el proxy de presión de flujos." },
        { label: "Límites", value: "No predice el mercado, no emite señales de compra o venta y algunas lecturas dependen de disponibilidad de fuentes externas." },
      ]} />

      <div className="relative mt-6 md:mt-8">
        <QuantAnnotation variant="underline" className="absolute left-4 top-8 z-10 h-2.5 w-24 text-brass/35 md:left-5 md:top-9" />
        <ExpandableInsightCard
          eyebrow={copy.integrated}
          title={copy.composite}
          reading={t(regimeSummary.interpretation)}
          status={t(dataStatusLabels[regimeSummary.dataStatus])}
          metrics={[
            { label: copy.currentRegime, value: locale === "en" ? translateRegimeLabel(regimeSummary.current) : regimeSummary.current, tone: "sage" },
            { label: copy.bias, value: biasLabels[regimeSummary.bias] },
            { label: "Score", value: `${regimeSummary.regimeScore}/100`, tone: regimeSummary.bias === "stress" || regimeSummary.bias === "cautious" ? "brass" : "sage" },
            { label: copy.confidence, value: `${regimeSummary.confidence}%` },
          ]}
        >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="border border-line bg-panelSoft p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">{copy.currentRegime}</p>
            <div className="mt-3"><RegimeBadge label={locale === "en" ? translateRegimeLabel(regimeSummary.current) : regimeSummary.current} /></div>
          </div>
          <MetricCard label={copy.bias} value={biasLabels[regimeSummary.bias]} emphasis />
          <MetricCard label="Score" value={`${regimeSummary.regimeScore}/100`} emphasis />
          <MetricCard label={copy.confidence} value={`${regimeSummary.confidence}%`} emphasis />
        </div>

        <div className="mt-3 grid gap-3 border-y border-line py-4 text-sm leading-6 text-muted lg:grid-cols-[1.35fr_0.7fr_0.7fr_0.95fr]">
          <p>{t(regimeSummary.interpretation)}</p>
          <p>
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.status}</span>
            <span className="font-semibold text-ink">{t(dataStatusLabels[regimeSummary.dataStatus])}</span>
          </p>
          <p>
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.updated}</span>
            <span className="font-semibold text-ink">{t(regimeSummary.lastUpdated)}</span>
          </p>
          <p>
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.activeSources}</span>
            <span className="font-semibold text-ink">{t(regimeSummary.sourceName)}</span>
          </p>
        </div>

        <p className="mt-3 border border-line bg-panelSoft px-3 py-2 text-xs leading-5 text-muted">
          {copy.fedwatchNote}
        </p>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="border border-line bg-panelSoft p-4">
            <h3 className="text-sm font-semibold text-ink">{copy.supports}</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
              {regimeSummary.riskSupportSignals.length > 0 ? (
                regimeSummary.riskSupportSignals.map((signal, index) => (
                  <li key={`support-${signal.label}-${index}`} className="border-l border-sage/70 pl-3">
                    <span className="font-semibold text-ink">{t(signal.label)}: </span>{t(signal.detail)}
                  </li>
                ))
              ) : (
                <li className="border-l border-line pl-3">
                  {copy.noSupports}
                </li>
              )}
            </ul>
          </div>
          <div className="border border-line bg-panelSoft p-4">
            <h3 className="text-sm font-semibold text-ink">{copy.cautions}</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
              {regimeSummary.cautionSignals.map((signal, index) => (
                <li key={`caution-${signal.label}-${index}`} className="border-l border-brass/70 pl-3">
                  <span className="font-semibold text-ink">{t(signal.label)}: </span>{t(signal.detail)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">
          <p>{t(regimeSummary.dataQualityNote)}</p>
          <p className="mt-2">{t(regimeSummary.reliabilityNote)}</p>
          <p className="mt-2">{t(regimeSummary.whatItDoesNotMean)}</p>
        </div>
        </ExpandableInsightCard>
      </div>

      <div className="mt-6 space-y-4 md:mt-8 md:space-y-6">
        {fedWatch ? <FedWatchModule data={fedWatch} locale={locale} /> : null}
        {sectorRotation ? <SectorRotationChart data={sectorRotation} /> : null}
        <MarketBreadthPanel data={weeklyReportData} locale={locale} />
        {quantRisk ? <QuantRiskPanel data={quantRisk} locale={locale} /> : null}
        {vix ? <VixModule data={vix} /> : null}
        {vixTermStructure ? <VixTermStructureModule data={vixTermStructure} /> : null}
        {btcEtfFlows || gldFlowPressure ? (
          <section className="grid gap-4">
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

      <div id="radar" className="mt-6 scroll-mt-28">
        <ExpandableInsightCard
          eyebrow={copy.radar}
          title={copy.crossReadings}
          reading={copy.radarReading}
          status={copy.manualUpdate}
          metrics={[
            { label: copy.reviewedTickers, value: String(crossSignalRadar.length) },
            { label: copy.mode, value: copy.curated },
            { label: copy.use, value: copy.research },
          ]}
        >
        <p className="mt-4 border border-line bg-panelSoft px-3 py-2 text-xs leading-5 text-muted">
          {locale === "en" ? "Update mode: manual/curated until stable automated sources are active." : "Modo de actualización: manual/curado hasta activar fuentes automatizadas estables."}
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-2.5 pr-4 font-medium">Ticker</th>
                <th className="py-2.5 pr-4 font-medium">{copy.shortInterest}</th>
                <th className="py-2.5 pr-4 font-medium">{copy.institutional}</th>
                <th className="py-2.5 pr-4 font-medium">{copy.shortDate}</th>
                <th className="py-2.5 pr-4 font-medium">{copy.reviewDate}</th>
                <th className="py-2.5 pr-4 font-medium">{copy.status}</th>
                <th className="py-2.5 pr-4 font-medium">{copy.note}</th>
              </tr>
            </thead>
            <tbody>
              {crossSignalRadar.map((row) => (
                <tr key={row.ticker} className="border-b border-line/70">
                  <td className="py-3 pr-4 font-semibold text-ink">{row.ticker}</td>
                  <td className="py-3 pr-4 text-muted">{t(row.shortInterest)}</td>
                  <td className="py-3 pr-4 text-muted">{t(row.institutionalPresence)}</td>
                  <td className="py-3 pr-4 text-muted">{row.shortInterestDate}</td>
                  <td className="py-3 pr-4 text-muted">{row.form13FDate}</td>
                  <td className="py-3 pr-4">
                    <span className="border border-line bg-panelSoft px-2 py-1 text-xs font-semibold text-muted">
                      {copy.manualUpdate}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-muted">{t(row.note)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">
          {copy.radarFooter}
        </p>
        </ExpandableInsightCard>
      </div>

      <div className="mt-6">
        <DisclaimerBox>
          {copy.finalDisclaimer}
        </DisclaimerBox>
      </div>
    </div>
  );
}
