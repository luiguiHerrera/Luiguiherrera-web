export const portfolioSimulations = [
  { name: "Equal Weight", annualReturn: "8.1%", volatility: "15.4%", maxDrawdown: "-28.0%", sharpe: "0.46", turnover: "18%", concentration: "Baja" },
  { name: "Buy & Hold", annualReturn: "9.0%", volatility: "17.9%", maxDrawdown: "-34.5%", sharpe: "0.43", turnover: "4%", concentration: "Media" },
  { name: "60/40", annualReturn: "6.4%", volatility: "9.8%", maxDrawdown: "-17.2%", sharpe: "0.49", turnover: "8%", concentration: "Media" },
  { name: "TD3 Demo", annualReturn: "10.2%", volatility: "13.1%", maxDrawdown: "-21.6%", sharpe: "0.62", turnover: "31%", concentration: "Controlada" },
];

export const benchmarks = [
  { benchmark: "MSCI World", return: "8.7%", volatility: "16.8%", drawdown: "-33.1%" },
  { benchmark: "S&P 500", return: "10.5%", volatility: "18.4%", drawdown: "-35.0%" },
  { benchmark: "Global Aggregate Bonds", return: "3.2%", volatility: "6.7%", drawdown: "-12.4%" },
];

export const riskMetrics = [
  ["Drawdown", "Cuánto puede doler una mala secuencia."],
  ["Volatilidad", "Qué tan brusco puede ser el camino."],
  ["Concentración", "Cuánto depende todo de pocas posiciones."],
  ["Turnover", "Cuánto se mueve el portafolio y qué costes puede generar."],
  ["Costes", "La fricción silenciosa que reduce el resultado neto."],
  ["Walk-forward", "Prueba fuera de muestra para evitar enamorarse del pasado."],
];
