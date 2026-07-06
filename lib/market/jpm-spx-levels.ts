export type JpmSpxLevelsContext = {
  applicableTickers: string[];
  instrument: "SPX";
  sourceStatus: "pending_manual";
  title: string;
  statusText: string;
  clarification: string;
  nextStep: string;
  sourceLabel: string;
  sourceUrl: string;
};

export const jpmSpxLevelsContext: JpmSpxLevelsContext = {
  applicableTickers: ["SPY", "VOO"],
  instrument: "SPX",
  sourceStatus: "pending_manual",
  title: "Niveles JPM/SPX",
  statusText: "Pendiente de carga manual: no hay niveles numéricos internos vigentes para el JPM collar.",
  clarification: "La estructura queda preparada para niveles sobre SPX; no son niveles propios de SPY ni VOO.",
  nextStep: "Integrar una fuente interna validada en lib/market/jpm-spx-levels.ts antes de mostrar niveles numéricos.",
  sourceLabel: "Indicador TradingView JPM Collar Levels SPX",
  sourceUrl: "https://www.tradingview.com/script/IwGynP3T-JPM-Collar-Levels-SPX/",
};

export function shouldShowJpmSpxLevels(ticker: string) {
  return jpmSpxLevelsContext.applicableTickers.includes(ticker);
}
