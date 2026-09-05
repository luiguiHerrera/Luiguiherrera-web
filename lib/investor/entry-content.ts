export type InvestorRouteOption = {
  id: "dashboard" | "levels" | "trends" | "research";
  label: string;
  title: string;
  description: string;
  outcomes: [string, string, string];
  time: string;
  cta: string;
  href: string;
};

export type InvestorEntryContent = {
  locale: "es" | "en";
  hero: { eyebrow: string; title: string; support: string; cta: string; microcopy: string };
  guided: {
    title: string;
    support: string;
    eyebrow: string;
    timeLabel: string;
    options: [InvestorRouteOption, InvestorRouteOption, InvestorRouteOption, InvestorRouteOption];
  };
  bridges: { title: string; items: { title: string; description: string; cta: string; href: string }[] };
  faq: { title: string; items: { question: string; answer: string }[] };
};

export const investorEntryContent: Record<"es" | "en", InvestorEntryContent> = {
  es: {
    locale: "es",
    hero: {
      eyebrow: "Inversión",
      title: "Decide con criterio antes de mover capital",
      support: "Lee el régimen, revisa niveles y explora tendencias antes de mover capital.",
      cta: "Encontrar mi siguiente paso",
      microcopy: "Sin registro · Herramientas educativas y datos trazables",
    },
    guided: {
      title: "¿Qué merece tu atención hoy?",
      support: "Elige la ruta que mejor encaja con tu intención de hoy.",
      eyebrow: "Tu siguiente paso",
      timeLabel: "Para una primera lectura",
      options: [
        {
          id: "dashboard", label: "Quiero una lectura rápida del mercado.",
          title: "Lee el pulso del mercado",
          description: "Obtén una lectura diaria del régimen, la amplitud, la volatilidad y los flujos.",
          outcomes: ["Qué está favoreciendo o frenando el entorno.", "Cómo está el régimen actual.", "Qué mirar primero hoy."],
          time: "≈5–10 min", cta: "Ver dashboard", href: "/dashboard",
        },
        {
          id: "levels", label: "Quiero conocer las estadísticas de mis activos.",
          title: "Mira tus activos frente a su historia",
          description: "Compara tus activos con su historial y revisa niveles, rangos y caídas antes de decidir.",
          outcomes: ["Dónde se sitúa el precio frente a su historial.", "Qué rangos y caídas ha registrado.", "Cómo cambia su comportamiento según el periodo."],
          time: "≈10–15 min", cta: "Ver estadísticas", href: "/niveles-estadisticos",
        },
        {
          id: "trends", label: "Quiero explorar tendencias e ideas.",
          title: "Conecta tendencias e ideas",
          description: "Explora movimientos del entorno y conviértelos en hipótesis educativas.",
          outcomes: ["Cambios del contexto global.", "Ideas para observar, no para improvisar.", "Puentes entre mercado y narrativa."],
          time: "≈10–20 min", cta: "Explorar tendencias", href: "/tendencias",
        },
        {
          id: "research", label: "Quiero profundizar con investigación cuantitativa.",
          title: "Profundiza con evidencia",
          description: "Accede a informes y piezas de investigación cuantitativa.",
          outcomes: ["Análisis más profundo.", "Modelos y evidencia.", "Más profundidad, menos ruido."],
          time: "≈20–40 min", cta: "Ver investigación", href: "/investigacion",
        },
      ],
    },
    bridges: {
      title: "Continúa desde otro ángulo",
      items: [
        { title: "Recursos", description: "Scripts para TradingView. Próximamente: Python, R, Stata y C++.", cta: "Abrir", href: "/recursos" },
        { title: "Portfolio Fragility Lab", description: "Revisa concentración, prueba escenarios de estrés y compara cambios en tu portafolio.", cta: "Abrir", href: "/fragilidad-de-portafolio" },
        { title: "Volver a finanzas personales", description: "Si necesitas ordenar primero tu base financiera antes de invertir.", cta: "Ir a Finanzas personales", href: "/empezar" },
      ],
    },
    faq: {
      title: "Preguntas frecuentes",
      items: [
        { question: "¿Por dónde empiezo si no sé leer el mercado?", answer: "Empieza por el dashboard. Aprende y familiarízate con los conceptos y su utilidad." },
        { question: "¿El dashboard sustituye una recomendación de inversión?", answer: "No. Ofrece contexto y datos para aprender; no indica qué comprar o vender ni evalúa tu situación personal." },
        { question: "¿Necesito registrarme?", answer: "No. Puedes consultar las herramientas y la investigación de esta ruta sin crear una cuenta." },
        { question: "¿Puedo usar esto aunque todavía esté organizando mis finanzas?", answer: "Sí. Son herramientas educativas para el inversionista, no recomendaciones de inversión. Puedes aprender a tu ritmo; si necesitas ordenar ingresos, gastos o deudas, consulta Finanzas personales." },
      ],
    },
  },
  en: {
    locale: "en",
    hero: {
      eyebrow: "Investing",
      title: "Make informed decisions before moving capital",
      support: "Read the regime, review key levels and explore trends before moving capital.",
      cta: "Find my next step",
      microcopy: "No sign-up · Educational tools and traceable data",
    },
    guided: {
      title: "What deserves your attention today?",
      support: "Choose the path that best matches what you need today.",
      eyebrow: "Your next step",
      timeLabel: "For a first read",
      options: [
        {
          id: "dashboard", label: "I want a quick market read.",
          title: "Read the pulse of the market",
          description: "Get a daily read on regime, breadth, volatility and flows.",
          outcomes: ["What is supporting or pressuring the environment.", "How the current regime looks.", "What to look at first today."],
          time: "≈5–10 min", cta: "Open dashboard", href: "/en/dashboard",
        },
        {
          id: "levels", label: "I want to understand my assets’ statistics.",
          title: "Start with your assets’ statistics",
          description: "Compare your assets with their history and review levels, ranges and drawdowns before deciding.",
          outcomes: ["Where the price stands relative to its history.", "The ranges and drawdowns it has experienced.", "How its behavior changes across periods."],
          time: "≈10–15 min", cta: "View statistics", href: "/en/statistical-levels",
        },
        {
          id: "trends", label: "I want to explore trends and ideas.",
          title: "Connect trends and ideas",
          description: "Explore shifts in the environment and turn them into educational hypotheses.",
          outcomes: ["Changes in the broader context.", "Ideas to observe, not to improvise with.", "Bridges between market and narrative."],
          time: "≈10–20 min", cta: "Explore trends", href: "/en/trends",
        },
        {
          id: "research", label: "I want to go deeper with quantitative research.",
          title: "Go deeper with evidence",
          description: "Access reports and quantitative research pieces.",
          outcomes: ["Deeper analysis.", "Models and evidence.", "More depth, less noise."],
          time: "≈20–40 min", cta: "Open research", href: "/en/research",
        },
      ],
    },
    bridges: {
      title: "Continue from another angle",
      items: [
        { title: "Resources", description: "Scripts for TradingView. Coming soon: Python, R, Stata and C++.", cta: "Open", href: "/en/resources" },
        { title: "Portfolio Fragility Lab", description: "Review concentration, test stress scenarios and compare portfolio changes.", cta: "Open", href: "/en/portfolio-fragility" },
        { title: "Back to personal finance", description: "If you need to organize your financial base before investing.", cta: "Go to personal finance", href: "/en/start" },
      ],
    },
    faq: {
      title: "Frequently asked questions",
      items: [
        { question: "Where should I start if I do not know how to read the market?", answer: "Start with the dashboard. Learn the concepts, get familiar with them and understand how they can help." },
        { question: "Does the dashboard replace investment advice?", answer: "No. It provides context and data for learning; it does not tell you what to buy or sell or assess your personal situation." },
        { question: "Do I need to sign up?", answer: "No. You can use the tools and read the research on this path without creating an account." },
        { question: "Can I use this even if I am still organizing my finances?", answer: "Yes. These are educational tools for investors, not investment recommendations. You can learn at your own pace; if you need to organize income, spending or debt, visit Personal finance." },
      ],
    },
  },
};
