import type { DashboardModuleId } from "@/lib/analytics/trackEvent";

type DashboardModuleMock = {
  id: DashboardModuleId;
  title: string;
  status: string;
  lookingAt: string;
  why: string;
  how: string;
  notMeaning: string;
  data: string[][];
};

export const regimeSummary = {
  current: "Neutral con sesgo defensivo",
  riskOn: 34,
  riskOff: 46,
  mixed: 20,
  confidence: "Media",
  updatedAt: "2026-06-07 18:00 UTC",
};

export const dashboardModules: DashboardModuleMock[] = [
  {
    id: "rates",
    title: "Expectativas de tasas",
    status: "Contexto de liquidez",
    lookingAt: "Probabilidades implícitas para la próxima decisión de política monetaria.",
    why: "Las tasas afectan el costo del dinero, la valoración de activos y el apetito por riesgo.",
    how: "Más probabilidad de recorte puede sugerir condiciones menos restrictivas; más probabilidad de subida suele apuntar a condiciones más exigentes.",
    notMeaning: "No es una instrucción para comprar bonos, acciones, divisas o cualquier otro activo.",
    data: [
      ["Próxima reunión", "31 julio 2026"],
      ["Mantener tasas", "58%"],
      ["Recorte", "35%"],
      ["Subida", "7%"],
      ["Cambio vs semana anterior", "+6 pp en recorte"],
    ],
  },
  {
    id: "sectors",
    title: "Rotación sectorial",
    status: "Lectura mixta",
    lookingAt: "Sectores que lideran y sectores que pierden fuerza en una semana.",
    why: "La rotación sectorial ayuda a ver qué partes del mercado están liderando y cuáles están perdiendo fuerza.",
    how: "Liderazgo defensivo puede sugerir cautela; liderazgo cíclico puede sugerir mayor apetito por actividad económica.",
    notMeaning: "No convierte a un sector ganador en una recomendación ni a un sector rezagado en descarte automático.",
    data: [
      ["Ganadores 1 semana", "Utilities, Salud, Consumo básico"],
      ["Perdedores 1 semana", "Semiconductores, Retail, Small caps"],
      ["Lectura", "Defensiva moderada"],
    ],
  },
  {
    id: "vix",
    title: "VIX Term Structure",
    status: "Contango suave",
    lookingAt: "Relación entre VIX spot y futuros cercanos.",
    why: "La estructura temporal del VIX ayuda a detectar si el mercado está pagando más por protección inmediata.",
    how: "Backwardation suele aparecer en estrés; contango suele asociarse con mercados más ordenados.",
    notMeaning: "No predice la dirección del índice accionario ni marca puntos de entrada o salida.",
    data: [
      ["VIX spot", "17.8"],
      ["Primer futuro", "18.6"],
      ["Segundo futuro", "19.1"],
      ["Estado", "Contango"],
    ],
  },
  {
    id: "btc-flows",
    title: "BTC ETF Flows",
    status: "Entradas moderadas",
    lookingAt: "Flujos netos diarios y semanales en ETF spot de Bitcoin.",
    why: "Los flujos de ETF de Bitcoin pueden servir como proxy de demanda institucional por exposición cripto.",
    how: "Entradas persistentes sugieren demanda por el vehículo; salidas persistentes sugieren menor apetito por esa exposición.",
    notMeaning: "No valida el precio de Bitcoin, no reduce su volatilidad y no es una señal operativa.",
    data: [
      ["Flujo diario neto", "+120 M USD"],
      ["Flujo semanal neto", "+410 M USD"],
      ["Racha", "3 días de entradas"],
    ],
  },
];

export const crossSignalRadar = [
  {
    company: "Acme Cloud",
    shortInterest: "Alto",
    superinvestors: "Presencia media",
    comment: "Caso útil para estudiar tensión entre dudas de mercado y tesis de largo plazo.",
  },
  {
    company: "Northstar Retail",
    shortInterest: "Muy alto",
    superinvestors: "Baja",
    comment: "Interesa revisar deuda, márgenes y narrativa de recuperación antes de sacar conclusiones.",
  },
  {
    company: "Helio Energy",
    shortInterest: "Medio",
    superinvestors: "Alta",
    comment: "La presencia institucional no reduce por sí sola la volatilidad del negocio.",
  },
];
