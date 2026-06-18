export type TradingViewScript = {
  title: string;
  description: string;
  status: "public" | "pending";
  href: string | null;
};

export const tradingViewScripts: TradingViewScript[] = [
  {
    title: "Market Regime Context",
    description: "Lectura visual compacta para ubicar volatilidad, tendencia y sesgo general.",
    status: "pending",
    href: null,
  },
  {
    title: "Statistical Levels Helper",
    description: "Bandas y referencias descriptivas para comparar precio actual contra su historial.",
    status: "pending",
    href: null,
  },
  {
    title: "Risk Checklist Overlay",
    description: "Marcadores simples para revisar extensión, momentum y zonas de atención.",
    status: "pending",
    href: null,
  },
  {
    title: "Weekly Process Template",
    description: "Plantilla de seguimiento semanal para registrar contexto, hipótesis y gestión.",
    status: "pending",
    href: null,
  },
];
