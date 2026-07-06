import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import {
  getStatisticalLevelsAsset,
  getStatisticalLevelsAssetSeasonality,
  getStatisticalLevelsManifest,
} from "@/lib/statistical-levels/get-statistical-levels-data";
import type { AssetStatRecord, AssetStatSummary, DailySeasonalityCell, PresidentialCyclePhase } from "@/lib/statistical-levels/types";

const coreEtfs = ["SPY", "QQQ", "DIA", "IWM"];
const sectorBreadthTickers = ["XLK", "XLF", "XLV", "XLE", "XLY", "XLP", "XLI", "XLB", "XLU", "XLRE", "XLC"];
const statisticalHighlightTickers = [
  "SPY",
  "RSP",
  "IWM",
  "USO",
  "GLD",
  "EWJ",
  "FXI",
  "SMH",
  "BTCUSD",
  "ETHUSD",
  ...sectorBreadthTickers,
];

const roadmapItems = [
  "Inflow/outflow general de ETFs",
  "Mayor premium",
  "Acciones líderes por índice",
  "Acciones del día",
  "WL Momentum",
  "Posiciones HT",
  "Earnings",
  "Fuerza relativa por industria",
];

function dateParts(dateString: string) {
  const date = new Date(`${dateString}T00:00:00Z`);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function presidentialCyclePhase(year: number): PresidentialCyclePhase {
  const offset = ((year % 4) + 4) % 4;
  if (offset === 0) return "election";
  if (offset === 1) return "post_election";
  if (offset === 2) return "midterm";
  return "pre_election";
}

function weekLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()} · Semana ${String(week).padStart(2, "0")}`;
}

function rankedSeasonality(cells: DailySeasonalityCell[], month: number) {
  const monthCells = cells.filter((cell) => cell.month === month && cell.sampleSize >= 5);
  const sorted = [...monthCells].sort((a, b) => (b.averageReturn ?? Number.NEGATIVE_INFINITY) - (a.averageReturn ?? Number.NEGATIVE_INFINITY));
  return {
    best: sorted.slice(0, 5),
    weakest: sorted.slice(-5).reverse(),
  };
}

function cumulativeSeasonalityPath(cells: DailySeasonalityCell[], month: number) {
  let cumulativeReturn = 0;
  const monthCells = cells
    .filter((cell) => cell.month === month && cell.sampleSize >= 5 && cell.averageReturn !== null)
    .sort((a, b) => a.day - b.day);

  return [
    { day: 0, cumulativeReturn: 0 },
    ...monthCells.map((cell) => {
      cumulativeReturn += cell.averageReturn ?? 0;
      return {
        day: cell.day,
        cumulativeReturn,
      };
    }),
  ];
}

function extensionHighlights(assets: AssetStatSummary[], preferredTickers: string[]) {
  const byTicker = new Map(assets.map((asset) => [asset.ticker, asset]));
  return preferredTickers
    .map((ticker) => byTicker.get(ticker))
    .filter((asset): asset is AssetStatSummary => asset !== undefined)
    .map((asset) => ({
      ticker: asset.ticker,
      name: asset.name,
      zScore: asset.extension.zScore5Y,
      percentile: asset.extension.percentile5Y,
      distanceToLongAverage: asset.distanceToMovingAverages.ma200,
      currentDrawdown: asset.extension.currentDrawdownFull,
      returns: asset.returns,
      lastClose: asset.lastClose,
      lastDate: asset.lastDate,
      status: asset.status,
    }));
}

export async function buildWeeklyReportData() {
  const dashboard = await getDashboardData();
  const manifest = await getStatisticalLevelsManifest();
  const assets = await Promise.all(coreEtfs.map((ticker) => getStatisticalLevelsAsset(ticker)));
  const generatedAt = manifest.generatedAt;
  const { day, month, year } = dateParts(generatedAt);
  const cyclePhase = presidentialCyclePhase(year);
  const spySeasonality = await getStatisticalLevelsAssetSeasonality("SPY");
  const seasonalityWindow = spySeasonality?.windows["10Y"] ?? spySeasonality?.windows.Full ?? null;
  const seasonality = seasonalityWindow
    ? {
        currentDay: day,
        month,
        phase: cyclePhase,
        allYears: rankedSeasonality(seasonalityWindow.general, month),
        cycle: rankedSeasonality(seasonalityWindow.presidentialCycle[cyclePhase], month),
        path: cumulativeSeasonalityPath(seasonalityWindow.general, month),
      }
    : null;

  const sectorLeaders = dashboard.sectorRotation
    ? [...dashboard.sectorRotation.sectors].sort((a, b) => b.return1w - a.return1w).slice(0, 5)
    : [];
  const sectorLaggards = dashboard.sectorRotation
    ? [...dashboard.sectorRotation.sectors].sort((a, b) => a.return1w - b.return1w).slice(0, 5)
    : [];

  return {
    generatedAt,
    weekLabel: weekLabel(generatedAt),
    regimeSummary: dashboard.regimeSummary,
    executiveSummary: {
      helped: dashboard.regimeSummary.riskSupportSignals.slice(0, 3),
      weighed: dashboard.regimeSummary.cautionSignals.slice(0, 3),
      riskReading: dashboard.regimeSummary.interpretation,
    },
    coreEtfs: coreEtfs
      .map((ticker) => assets.find((asset) => asset.ticker === ticker))
      .filter((asset): asset is AssetStatRecord => asset !== undefined)
      .map((asset) => ({
        ticker: asset.ticker,
        name: asset.name,
        weeklyReturn: asset.returns["1W"],
        distanceToAth: asset.windows.Full.currentDrawdown,
        distanceToMa20: asset.distanceToMovingAverages.ma20,
        distanceToMa50: asset.distanceToMovingAverages.ma50,
        distanceToMa200: asset.distanceToMovingAverages.ma200,
      })),
    sectors: {
      data: dashboard.sectorRotation,
      leaders: sectorLeaders,
      laggards: sectorLaggards,
    },
    volatility: {
      vix: dashboard.vix,
      termStructure: dashboard.vixTermStructure,
    },
    flows: {
      btcEtfFlows: dashboard.btcEtfFlows,
      ethEtfFlows: dashboard.ethEtfFlows,
      generalEtfFlowsStatus: "Pendiente de fuente automatizada clara.",
    },
    statisticalLevels: extensionHighlights(manifest.summaries, statisticalHighlightTickers),
    seasonality,
    crossSignalRadar: dashboard.crossSignalRadar,
    roadmapItems,
  };
}

export type WeeklyReportData = Awaited<ReturnType<typeof buildWeeklyReportData>>;
