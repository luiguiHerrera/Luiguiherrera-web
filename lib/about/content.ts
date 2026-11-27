import type { Locale } from "@/lib/i18n/locales";

export const aboutLinks = [
  { id: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/luigui-herrera" },
  { id: "github", label: "GitHub", href: "https://github.com/luiguiHerrera" },
] as const;

export const aboutContent = {
  es: {
    introduction: "Mi nombre es ", name: "Luigui Herrera.",
    education: "Ingeniero químico, máster en Economía, Finanzas y Computación y doctorando.",
    paragraphs: [
      "Veo los mercados como una figura de muchas dimensiones. Cada variable que calculo me da información sobre alguna de sus caras. El juego consiste en acercarme lo más posible a reconocer qué forma tiene la figura en ese momento de tiempo.",
      "Aquí comparto mis observaciones, el análisis que hay detrás y las herramientas que voy construyendo para ver esas caras con más claridad y poner mis ideas a prueba.",
    ],
    linkCaptions: { linkedin: "Trayectoria y formación", github: "Proyectos y código" },
    newTab: "Se abre en una pestaña nueva",
    illustrationAlt: "Figura escultórica con distintas caras y pliegues geométricos en marfil y verde bosque.",
    thinking: "Cómo pienso",
    principles: [
      { title: "Entender el contexto.", text: "Antes de sacar conclusiones, busco entender qué está pasando, qué puede aclararlo, qué información me falta y cuál es la manera más simple de explicarlo." },
      { title: "Cuestionar los supuestos.", text: "Cuando una idea me parece buena, tengo que tener más cuidado. Intento separarla de mis sesgos y preferencias personales. Para eso me pregunto qué podría estar pasando por alto, qué estoy dando por hecho y qué tendría que cambiar para replantearla." },
      { title: "Poner el riesgo sobre la mesa.", text: "Me ocupa entender con claridad qué estoy arriesgando, de dónde viene ese riesgo y qué margen tengo si las cosas no salen como esperaba." },
    ],
    why: "¿Por qué esta página web?",
    closing: [
      "Busco reunir en un mismo lugar lo que uso para hacer seguimiento a mis inversiones: análisis cuantitativo, escenarios y herramientas que voy investigando y construyendo para reconocer patrones en el mercado y entender cómo encajan las distintas caras de esa figura.",
      "También quiero que se entienda de forma sencilla cómo llego a cada observación: qué datos la sostienen, qué límites tiene y qué me llevaría a revisarla.",
    ],
  },
  en: {
    introduction: "My name is ", name: "Luigui Herrera.",
    education: "Chemical engineer, master's degree in Economics, Finance and Computing, and doctoral student.",
    paragraphs: [
      "I see markets as a figure with many dimensions. Each variable I calculate gives me information about one of its faces. The game is to get as close as possible to recognizing what shape the figure has at that moment in time.",
      "Here I share my observations, the analysis behind them and the tools I am building to see those faces more clearly and put my ideas to the test.",
    ],
    linkCaptions: { linkedin: "Background and education", github: "Projects and code" },
    newTab: "Opens in a new tab",
    illustrationAlt: "A sculptural figure with different faces and geometric folds in ivory and forest green.",
    thinking: "How I think",
    principles: [
      { title: "Understand the context.", text: "Before drawing conclusions, I try to understand what is happening, what might clarify it, what information I am missing and the simplest way to explain it." },
      { title: "Question the assumptions.", text: "When an idea seems good to me, I have to be more careful. I try to separate it from my biases and personal preferences. To do that, I ask myself what I might be overlooking, what I am taking for granted and what would have to change for me to rethink it." },
      { title: "Put risk on the table.", text: "I focus on understanding clearly what I am risking, where that risk comes from and how much room I have if things do not turn out as I expected." },
    ],
    why: "Why this website?",
    closing: [
      "I want to bring together in one place what I use to keep track of my investments: quantitative analysis, scenarios and the tools I am researching and building to recognize patterns in the market and understand how the different faces of that figure fit together.",
      "I also want to make it easy to understand how I arrive at each observation: what data supports it, what its limits are and what would lead me to revise it.",
    ],
  },
} satisfies Record<Locale, object>;
