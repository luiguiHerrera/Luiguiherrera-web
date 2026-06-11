import type { RegimeSummary } from "@/lib/dashboard/types";

// FedWatch can be added to scoring after licensing/usage confirmation.
export const regimeSummary: RegimeSummary = {
  current: "Defensivo",
  bias: "Risk-off",
  confidence: "Media",
  sourceName: "Lectura compuesta manual",
  lastUpdated: "Manual: 2026-06-07",
  updateFrequency: "Cuando se automatice: cierre diario",
  dataStatus: "manual",
  reliabilityNote: "Lectura cualitativa basada en los módulos demo/manuales. Todavía no usa un modelo automatizado ni datos en vivo.",
  riskSupportSignals: [
    {
      label: "Tasas",
      detail: "El escenario demo muestra probabilidad relevante de recortes frente a subidas.",
    },
    {
      label: "BTC ETF flows",
      detail: "Los flujos manuales muestran entradas netas semanales en el vehículo ETF.",
    },
  ],
  cautionSignals: [
    {
      label: "Rotación",
      detail: "Los proxies sectoriales muestran liderazgo defensivo moderado.",
    },
    {
      label: "Volatilidad",
      detail: "La estructura VIX está normal, pero no confirma apetito de riesgo amplio por sí sola.",
    },
  ],
};
