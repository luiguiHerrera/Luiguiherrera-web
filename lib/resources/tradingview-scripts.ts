export type TradingViewScript = {
  id: string;
  title: string;
  category: string;
  markets: string[];
  description: string;
  useCase: string;
  tradingViewUrl: string | null;
  status: "Publicado" | "Pendiente";
};

export const tradingViewScripts: TradingViewScript[] = [
  {
    id: "market-regime-context",
    title: "Market Regime Context",
    category: "Régimen",
    markets: ["Acciones", "ETFs", "Futuros"],
    description: "Lectura visual compacta para ubicar volatilidad, tendencia y sesgo general.",
    useCase: "Pendiente de enlace público estable.",
    tradingViewUrl: null,
    status: "Pendiente",
  },
  {
    id: "monthly-statistical-levels",
    title: "Monthly Statistical Levels",
    category: "Niveles",
    markets: ["Acciones", "ETFs", "Futuros", "Cripto", "FX"],
    description: "Indicador open-source que proyecta niveles mensuales de referencia usando extensiones históricas desde la apertura mensual.",
    useCase: "Ayuda a ubicar el precio actual frente a su rango mensual histórico: apertura, extensión alta promedio, extensión baja promedio y zonas fuertes calculadas con desviación estándar.",
    tradingViewUrl: "https://www.tradingview.com/script/ziflzOXv-Monthly-Statistical-Levels/",
    status: "Publicado",
  },
  {
    id: "jpm-collar-levels-spx",
    title: "JPM Collar Levels - SPX",
    category: "Estructura de mercado",
    markets: ["SPX", "Índices", "Opciones"],
    description: "Visualiza niveles trimestrales del collar JPM sobre SPX, con modo activo, histórico y alertas de toque. Herramienta de contexto; no señal de compra o venta.",
    useCase: "Sirve para ubicar zonas institucionales de referencia sobre SPX y separarlas de niveles propios de ETFs como SPY o VOO.",
    tradingViewUrl: "https://www.tradingview.com/script/IwGynP3T-JPM-Collar-Levels-SPX/",
    status: "Publicado",
  },
  {
    id: "risk-checklist-overlay",
    title: "Risk Checklist Overlay",
    category: "Riesgo",
    markets: ["Acciones", "ETFs"],
    description: "Marcadores simples para revisar extensión, momentum y zonas de atención.",
    useCase: "Pendiente de enlace público estable.",
    tradingViewUrl: null,
    status: "Pendiente",
  },
  {
    id: "weekly-process-template",
    title: "Weekly Process Template",
    category: "Proceso",
    markets: ["Acciones", "ETFs", "Futuros", "Cripto", "FX"],
    description: "Plantilla de seguimiento semanal para registrar contexto, hipótesis y gestión.",
    useCase: "Pendiente de enlace público estable.",
    tradingViewUrl: null,
    status: "Pendiente",
  },
];
