import type { CrossSignalRadarRow, DashboardModuleData } from "@/lib/dashboard/types";

// Adapters map live, public or vendor data into these same shapes.
// Sector analytics fail closed in their adapter and have no manual/demo entry here.
// BTC ETF flows retain their explicitly labelled presentation fallback.
// Short interest / 13F remain pending until reliable provider contracts are reviewed.

export const dashboardModules: DashboardModuleData[] = [
  {
    id: "btc-flows",
    title: "BTC ETF Flows",
    status: "Datos manuales",
    sourceName: "Farside BTC ETF flows",
    sourceUrl: "https://farside.co.uk/btc/",
    lastUpdated: "Manual: 2026-06-07",
    updateFrequency: "Cuando se automatice: cierre diario",
    dataStatus: "manual",
    reliabilityNote: "Datos manuales de ejemplo para representar el formato; revisar metodología y cobertura antes de automatizar.",
    observedData: [
      ["Flujo diario neto", "+120 M USD"],
      ["Flujo neto del periodo", "+410 M USD"],
      ["Flujo 20 días", "+1.8 B USD"],
      ["Racha", "3 días de entradas"],
      ["Principales contribuyentes", "IBIT +95 M, FBTC +40 M, salidas menores en otros vehículos"],
    ],
    interpretation: {
      lookingAt: "Flujos netos hacia o desde ETFs spot de Bitcoin como proxy de demanda por exposición vía vehículo regulado.",
      why: "Ayuda a observar presión de demanda/salida en productos ETF, separada del precio spot diario.",
      how: "Entradas persistentes sugieren demanda por el vehículo; salidas persistentes sugieren menor apetito por esa exposición.",
      whatItDoesNotMean: "No elimina la volatilidad de Bitcoin, no valida precio y no es una instrucción de ejecución.",
    },
  },
];

export const crossSignalRadar: CrossSignalRadarRow[] = [
  {
    ticker: "SPY",
    shortInterest: "Pendiente de fuente",
    institutionalPresence: "ETF amplio con tenencia institucional reportada vía 13F",
    shortInterestDate: "Pendiente de fuente",
    form13FDate: "Última revisión manual",
    sourceName: "Short interest reportado + 13F agregados",
    lastUpdated: "Última revisión manual",
    updateFrequency: "Manual/curada hasta activar fuentes automatizadas estables",
    dataStatus: "manual",
    reliabilityNote: "Short interest y 13F tienen retrasos, metodologías distintas y no capturan toda la actividad institucional.",
    note: "Referencia amplia de mercado; lectura contextual, no señal operativa.",
  },
  {
    ticker: "QQQ",
    shortInterest: "Pendiente de fuente",
    institutionalPresence: "ETF amplio con exposición growth/tecnología reportada con retraso",
    shortInterestDate: "Pendiente de fuente",
    form13FDate: "Última revisión manual",
    sourceName: "Short interest reportado + 13F agregados",
    lastUpdated: "Última revisión manual",
    updateFrequency: "Manual/curada hasta activar fuentes automatizadas estables",
    dataStatus: "manual",
    reliabilityNote: "La presencia en 13F no revela precio de entrada, tesis completa ni operaciones posteriores.",
    note: "Punto de partida para observar concentración temática y exposición institucional diferida.",
  },
  {
    ticker: "IBIT",
    shortInterest: "No disponible",
    institutionalPresence: "Datos parciales vía informes institucionales con retraso",
    shortInterestDate: "No disponible",
    form13FDate: "Última revisión manual",
    sourceName: "Short interest reportado + 13F agregados",
    lastUpdated: "Última revisión manual",
    updateFrequency: "Manual/curada hasta activar fuentes automatizadas estables",
    dataStatus: "manual",
    reliabilityNote: "La señal cruzada puede cambiar rápido y debe contrastarse con fundamentos, liquidez y eventos corporativos.",
    note: "Lectura parcial de exposición vía ETF spot de Bitcoin; no implica dirección de precio.",
  },
  {
    ticker: "GLD",
    shortInterest: "Pendiente de fuente",
    institutionalPresence: "ETF de oro con presencia reportada en formularios 13F",
    shortInterestDate: "Pendiente de fuente",
    form13FDate: "Última revisión manual",
    sourceName: "Short interest reportado + 13F agregados",
    lastUpdated: "Última revisión manual",
    updateFrequency: "Manual/curada hasta activar fuentes automatizadas estables",
    dataStatus: "manual",
    reliabilityNote: "Los informes institucionales llegan con retraso y no cubren todos los participantes del mercado.",
    note: "Cruce contextual para observar demanda defensiva reportada con retraso.",
  },
];
