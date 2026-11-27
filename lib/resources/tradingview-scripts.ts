export type TradingViewScript = {
  id: string;
  title: string;
  category: string;
  categoryEn: string;
  markets: string[];
  description: string;
  descriptionEn: string;
  useCase: string;
  useCaseEn: string;
  tradingViewUrl: string;
  status: "Publicado";
};

export const tradingViewScripts: TradingViewScript[] = [
  {
    id: "monthly-statistical-levels",
    title: "Monthly Statistical Levels",
    category: "Niveles",
    categoryEn: "Statistical levels",
    markets: ["Acciones", "ETFs", "Futuros", "Cripto", "FX"],
    description: "Desarrollé este indicador para situar niveles mensuales de referencia en el gráfico a partir de las extensiones históricas desde la apertura del mes.",
    descriptionEn: "I developed this indicator to place monthly reference levels on the chart using historical extensions from the monthly open.",
    useCase: "Lo utilizo para ubicar el precio actual frente a su rango mensual histórico: apertura, extensiones promedio y zonas calculadas con desviación estándar.",
    useCaseEn: "I use it to place current price within its historical monthly range: open, average extensions and zones calculated using standard deviation.",
    tradingViewUrl: "https://www.tradingview.com/script/89W4VF7T/",
    status: "Publicado",
  },
  {
    id: "jpm-collar-levels-spx",
    title: "JPM Collar Levels - SPX",
    category: "Estructura de mercado",
    categoryEn: "Market structure",
    markets: ["SPX", "Índices", "Opciones"],
    description: "Con este indicador sigo los niveles trimestrales del collar JPM sobre SPX, con vistas del periodo activo, histórico y alertas de toque.",
    descriptionEn: "I use this indicator to follow quarterly JPM collar levels on SPX, with current and historical views and touch alerts.",
    useCase: "Lo utilizo como referencia de la estructura de opciones de SPX. Sus niveles corresponden al índice; cada ETF, como SPY o VOO, tiene los suyos.",
    useCaseEn: "I use it as a reference for SPX options structure. Its levels apply to the index; each ETF, such as SPY or VOO, has its own.",
    tradingViewUrl: "https://www.tradingview.com/script/IwGynP3T-JPM-Collar-Levels-SPX/",
    status: "Publicado",
  },
];

