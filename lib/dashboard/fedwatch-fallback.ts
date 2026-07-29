import type { DashboardModuleData } from "@/lib/dashboard/types";

export const fedWatchFallbackModule: DashboardModuleData = {
  id: "rates",
  title: "Tasas / FedWatch",
  status: "Datos demo",
  sourceName: "CME FedWatch Tool",
  sourceUrl: "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html",
  lastUpdated: "Demo manual: 2026-06-07",
  updateFrequency: "Cuando se automatice: intradía o cierre diario",
  dataStatus: "demo",
  reliabilityNote: "Valores de ejemplo para diseñar lectura. No provienen de una consulta actual a CME.",
  observedData: [
    ["Dato observado", "Probabilidades implícitas de tasa a partir de futuros Fed Funds"],
    ["Próxima reunión", "31 Jul 2026"],
    ["Mantener tasa", "58%"],
    ["Recorte", "35%"],
    ["Subida", "7%"],
    ["Cambio manual observado", "+6 pp en probabilidad de recorte vs muestra previa"],
  ],
  interpretation: {
    lookingAt: "Probabilidades implícitas de tasa derivadas de futuros Fed Funds.",
    why: "Importa porque el costo del dinero influye en valoración de activos, liquidez y apetito por riesgo.",
    how: "Más probabilidad de recortes puede sugerir expectativa de condiciones menos restrictivas; más probabilidad de subidas puede sugerir una lectura de política más exigente.",
    whatItDoesNotMean: "No es una instrucción operativa, no anticipa por sí sola el mercado y no sustituye análisis de escenario.",
  },
};
