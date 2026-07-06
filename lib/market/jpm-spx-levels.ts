export type JpmSpxLevelsContext = {
  applicableTickers: string[];
  instrument: "SPX";
  sourceStatus: "prepared";
  title: string;
  statusText: string;
  clarification: string;
  nextStep: string;
};

export const jpmSpxLevelsContext: JpmSpxLevelsContext = {
  applicableTickers: ["SPY", "VOO"],
  instrument: "SPX",
  sourceStatus: "prepared",
  title: "Niveles JPM/SPX",
  statusText: "No hay fuente interna vigente cargada para niveles JPM/SPX.",
  clarification: "La estructura queda preparada para niveles sobre SPX; no son niveles propios de SPY ni VOO.",
  nextStep: "Integrar una fuente interna validada en lib/market/jpm-spx-levels.ts antes de mostrar niveles numéricos.",
};

export function shouldShowJpmSpxLevels(ticker: string) {
  return jpmSpxLevelsContext.applicableTickers.includes(ticker);
}
