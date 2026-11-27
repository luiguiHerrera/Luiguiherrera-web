export type ResourceCategory = {
  id: string;
  name: string;
  status: string;
  description: string;
  href: string;
};

export const resourcesContent = {
  es: {
    title: "Recursos",
    eyebrow: "Recursos públicos",
    description: "Herramientas que he desarrollado Open-Source.",
    sectionId: "herramientas",
    sectionEyebrow: "Tipos de herramienta",
    sectionTitle: "Elige el lenguaje o plataforma",
    published: "Publicado",
    open: "Ver en TradingView",
    readingTitle: "Ficha de lectura",
    reading: [
      { label: "Qué es", value: "Un catálogo de recursos públicos para inversionistas, incluyendo scripts open-source de TradingView y futuras herramientas educativas." },
      { label: "Para qué sirve", value: "Sirve para encontrar herramientas reales publicadas sin enlaces falsos ni categorías infladas." },
      { label: "Límites", value: "Los recursos son educativos y su disponibilidad depende de cada plataforma externa." },
      { label: "Siguiente paso", value: "Explorar los scripts publicados o volver a mercado, niveles estadísticos y metodología." },
    ],
    categories: [
      { id: "tradingview", name: "TradingView", status: "Disponible", description: "Scripts públicos para niveles, contexto de mercado y seguimiento visual.", href: "#tradingview" },
      { id: "python", name: "Python", status: "Próximamente", description: "Cuadernos de investigación, simuladores y herramientas de análisis.", href: "#python" },
      { id: "r", name: "R", status: "Próximamente", description: "Estadística, visualización y análisis reproducible.", href: "#r" },
      { id: "stata", name: "Stata", status: "Próximamente", description: "Econometría aplicada y plantillas académicas.", href: "#stata" },
      { id: "cpp", name: "C++", status: "Próximamente", description: "Herramientas futuras para cálculo eficiente y experimentos de bajo nivel.", href: "#cpp" },
    ] satisfies ResourceCategory[],
  },
  en: {
    title: "Resources",
    eyebrow: "Public resources",
    description: "Open-source tools I have developed.",
    sectionId: "tools",
    sectionEyebrow: "Tool types",
    sectionTitle: "Choose the language or platform",
    published: "Published",
    open: "View on TradingView",
    readingTitle: "Reading card",
    reading: [
      { label: "What it is", value: "A catalog of public resources for investors, including open-source TradingView scripts and future educational tools." },
      { label: "What it is for", value: "It helps find real published tools without fake links or inflated categories." },
      { label: "Limits", value: "The resources are educational and availability depends on each external platform." },
      { label: "Next step", value: "Explore the published scripts or return to market, statistical levels and methodology." },
    ],
    categories: [
      { id: "tradingview", name: "TradingView", status: "Available", description: "Public scripts for levels, market context and visual tracking.", href: "#tradingview" },
      { id: "python", name: "Python", status: "Coming soon", description: "Research notebooks, simulators and analysis utilities.", href: "#python" },
      { id: "r", name: "R", status: "Coming soon", description: "Statistics, visualization and reproducible analysis.", href: "#r" },
      { id: "stata", name: "Stata", status: "Coming soon", description: "Applied econometrics and academic templates.", href: "#stata" },
      { id: "cpp", name: "C++", status: "Coming soon", description: "Future tools for efficient computation and lower-level experiments.", href: "#cpp" },
    ] satisfies ResourceCategory[],
  },
};
