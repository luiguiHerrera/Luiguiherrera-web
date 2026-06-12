export const td3Project = {
  repoUrl: "https://github.com/luiguiHerrera/portfolio_drl_td3",
  title: "Robust TD3 Portfolio Allocation under Realistic Trading Frictions",
  description: "Master's thesis research code for TD3-based Deep Reinforcement Learning in portfolio allocation.",
  focus:
    "El proyecto no busca presentar un trading bot. Evalúa si una política TD3 de asignación continua puede ser creíble cuando se incorporan costes, cash, concentración, drawdown, turnover, benchmarks, regímenes e incertidumbre estadística.",
  conclusion:
    "TD3 es competitivo y a veces aparece arriba en rankings, pero no supera pruebas de superioridad estadística frente a benchmarks limpios. La contribución principal es el marco de evaluación y el protocolo corregido.",
};

export const correctedProtocol = {
  assets: ["SPY", "TLT", "GLD", "BTC-USD", "CASH"],
  portfolio: "weekly, long-only, fully invested",
  costs: ["SPY/TLT/GLD: 2 bps", "BTC-USD: 10 bps", "CASH synthetic: 0 bps"],
  bilRobustness: "BIL proxy return, 2 bps cost on CASH sleeve",
  reward: "net-return-first",
  risk: "drawdown penalty active in reward; turnover and concentration evaluated through diagnostics",
  macro: "clean vintage/as-of FRED macro",
  mandate: ["maximum drawdown", "maximum annualized volatility", "minimum effective number of assets", "maximum average turnover"],
};

export const featureFamilies = [
  "V2_reference_full",
  "V3_real_macro_vintage_clean_no_dxy",
  "V4_real_garch_current",
  "V5_no_volatility_block",
  "V6_financial_state",
  "V7_real_macro_vintage_clean_no_dxy_garch",
  "V8_ewma_garch_vol_current",
];

export const capSensitivityResults = [
  {
    cashAssumption: "Zero-CASH",
    model: "V5_no_volatility_block_cap_0p50",
    mandateAwareScore: 0.601124,
    robustScore: 0.696702,
  },
  {
    cashAssumption: "BIL-CASH",
    model: "V8_ewma_garch_vol_current_cap_0p70",
    mandateAwareScore: 0.660435,
    robustScore: 0.749958,
  },
];

export const benchmarkRankingResults = [
  {
    cashAssumption: "Zero-CASH",
    topTd3Model: "V3_real_macro_vintage_clean_no_dxy_cap_0p70",
    benchmarkReference: "trend_spy_cash_12p",
  },
  {
    cashAssumption: "BIL-CASH",
    topTd3Model: "V7_real_macro_vintage_clean_no_dxy_garch_cap_0p80",
    benchmarkReference: "trend_spy_cash_12p",
  },
];

export const statisticalValidation = [
  {
    cashAssumption: "Zero-CASH",
    sharpeDelta: 0.1559,
    bootstrapCi: [-0.6011, 0.9767],
    td3Probability: 0.629,
    wrcPValue: 0.7136,
  },
  {
    cashAssumption: "BIL-CASH",
    sharpeDelta: 0.117,
    bootstrapCi: [-0.7172, 0.9963],
    td3Probability: 0.588,
    wrcPValue: 0.6767,
  },
];

export const evaluationStack = [
  "TD3-only ranking",
  "Benchmark ranking",
  "Bootstrap validation",
  "White Reality Check",
  "Mandate constraints",
  "Regime / Pareto",
];

export const completePerformanceStatus = {
  label: "Pendiente de outputs completos",
  note:
    "La tabla completa de retorno anualizado, volatilidad, Sharpe, Sortino, drawdown, turnover y concentración se cargará desde outputs precalculados reproducibles. No se muestran cifras no trazables.",
};
