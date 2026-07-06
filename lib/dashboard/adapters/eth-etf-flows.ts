import type { BtcEtfFlowsDashboardData, BtcEtfFlowsData, DashboardModuleData } from "@/lib/dashboard/types";

const FARSIDE_ETH_URL = "https://farside.co.uk/eth/";

function buildPendingEthFlows(): BtcEtfFlowsData {
  return {
    sourceName: "Farside ETH ETF flows",
    sourceUrl: FARSIDE_ETH_URL,
    lastUpdated: "Pendiente de integración",
    updateFrequency: "Según disponibilidad de la fuente",
    dataStatus: "live_pending",
    reliabilityNote: "Estructura preparada para flujos ETH ETF. No se muestran datos hasta tener parsing server-side estable.",
    latestDate: "Pendiente",
    latestTotalNetFlow: null,
    latestFundFlows: [],
    rolling5dNetFlow: null,
    rolling10dNetFlow: null,
    rolling20dNetFlow: null,
    positiveDaysLast10: 0,
    negativeDaysLast10: 0,
    flowStreak: {
      direction: "none",
      count: 0,
      label: "Pendiente",
    },
    cumulativeNetFlow: null,
    largestInflowFundLatestDay: null,
    largestOutflowFundLatestDay: null,
    dominantFlowDriver: "Flujos ETH ETF pendientes de actualización.",
    breadth: {
      positive: 0,
      negative: 0,
      flatOrMissing: 0,
    },
    dailyLevel: "pending",
    recentTrend: "pending",
    readingLabel: "Pendiente",
    readingSubtext: "Flujos ETH ETF pendientes de actualización.",
    readingSeverity: "pending",
    calculatedTotal: false,
    rowsParsed: 0,
    history: [],
    interpretation: {
      lookingAt: "Flujos netos publicados para ETFs spot de ETH.",
      why: "Ayudan a separar demanda vía vehículo ETF de la lectura de precio spot ETH/USDT.",
      how: "Cuando haya parsing estable, se resumirán último flujo, ventanas acumuladas y contribución por fondo.",
      whatItDoesNotMean: "No representa una señal directa sobre el precio de ETH ni sustituye niveles estadísticos de ETH/USDT.",
    },
  };
}

export async function getEthEtfFlowsData(): Promise<BtcEtfFlowsDashboardData> {
  const flows = buildPendingEthFlows();
  const module: DashboardModuleData = {
    id: "btc-flows",
    title: "ETH ETF flows",
    status: "Pendiente",
    sourceName: flows.sourceName,
    sourceUrl: flows.sourceUrl,
    lastUpdated: flows.lastUpdated,
    updateFrequency: flows.updateFrequency,
    dataStatus: flows.dataStatus,
    reliabilityNote: flows.reliabilityNote,
    observedData: [["Estado", flows.readingSubtext]],
    interpretation: flows.interpretation,
  };

  return { flows, module };
}
