import type { Metadata } from "next";
import {
  bilingualRoutePairs,
  getTranslatedPathname,
} from "../i18n/language-pairs.ts";

export const SITE_URL = "https://www.luiguiherrera.com";
export const SITE_NAME = "Luigui Herrera";

export type SeoLanguage = "es" | "en";
export type SeoPageType = "website" | "article";

export type SeoRouteDefinition = {
  pathname: string;
  language: SeoLanguage;
  title: string;
  description: string;
  alternatePathname?: string;
  type?: SeoPageType;
  socialTitle?: string;
  socialDescription?: string;
};

const seoRouteContent: readonly Omit<SeoRouteDefinition, "alternatePathname">[] = [
  {
    pathname: "/",
    language: "es",
    title: "Herramientas para inversionistas | Riesgo, mercado y finanzas personales",
    description:
      "Herramientas educativas para ordenar presupuesto, deudas, perfil de riesgo, protección del capital, informes de mercado, dashboard, niveles estadísticos e investigación cuantitativa.",
  },
  {
    pathname: "/en",
    language: "en",
    title: "Investor tools | Risk, markets and personal finance",
    description:
      "Educational tools for budgeting, debt, investor diagnostics, capital protection, market reports, statistical levels and quantitative research.",
  },
  {
    pathname: "/empezar",
    language: "es",
    title: "Empezar a invertir | Ruta guiada de preparación financiera",
    description:
      "Ruta guiada para ordenar presupuesto, deudas, diagnóstico, protección y prácticas antes de invertir.",
  },
  {
    pathname: "/en/start",
    language: "en",
    title: "Start investing | A guided financial foundation",
    description:
      "A guided path to organize your investor diagnostic, budget, debt and financial protection before investing.",
  },
  {
    pathname: "/presupuesto",
    language: "es",
    title: "Presupuesto personal | Simulador de ingresos, gastos y ahorro",
    description:
      "Simulador de presupuesto personal para distribuir ingresos, detectar gastos no mensuales, calcular gastos hormiga y ordenar ahorro, protección financiera e inversión.",
  },
  {
    pathname: "/en/budget",
    language: "en",
    title: "Personal budget planner | Income, expenses and savings",
    description:
      "Plan income and expenses, account for non-monthly costs, estimate small recurring expenses and organize saving, protection and investing.",
  },
  {
    pathname: "/deudas",
    language: "es",
    title: "Gestión de deudas | Avalancha, bola de nieve y flujo mensual",
    description:
      "Herramienta educativa para evaluar deudas, pagos mínimos, flujo mensual, avalancha, bola de nieve, abonos extraordinarios y rentabilidad mínima comparable.",
  },
  {
    pathname: "/en/debt",
    language: "en",
    title: "Debt management | Avalanche, snowball and cash flow",
    description:
      "Compare debt payoff methods, minimum payments, extra contributions and the return an investment would need to justify delaying repayment.",
  },
  {
    pathname: "/diagnostico",
    language: "es",
    title: "Diagnóstico del inversionista | Riesgo, horizonte y capacidad",
    description:
      "Diagnóstico educativo para ordenar horizonte, liquidez, experiencia, tolerancia psicológica, sesgos y capacidad real antes de invertir.",
  },
  {
    pathname: "/en/diagnostic",
    language: "en",
    title: "Investor diagnostic | Risk, horizon and capacity",
    description:
      "Organize your time horizon, liquidity, experience, psychological tolerance, behavioral biases and real capacity for investment risk.",
  },
  {
    pathname: "/inversionista",
    language: "es",
    title: "Área inversionista | Mercado, informes y análisis cuantitativo",
    description:
      "Acceso educativo a dashboard de mercado, informes, niveles estadísticos, tendencias e investigación cuantitativa para inversionistas.",
  },
  {
    pathname: "/en/investor",
    language: "en",
    title: "Investor area | Markets, reports and quantitative research",
    description:
      "Explore the market dashboard, reports, statistical levels, trends and quantitative research without treating them as automatic signals.",
  },
  {
    pathname: "/proteccion",
    language: "es",
    title: "Simulador de decisiones financieras | Protección",
    description:
      "Simulador educativo de decisiones financieras para revisar deuda, productos con referidos, finca raíz, ETF, portafolio familiar y señales de alerta antes de invertir.",
  },
  {
    pathname: "/en/protection",
    language: "en",
    title: "Financial decision simulator | Risk protection",
    description:
      "Practice educational cases involving debt, referral products, real estate, ETFs, family portfolios and warning signs before committing capital.",
  },
  {
    pathname: "/protege-tu-dinero",
    language: "es",
    title: "Alertas para tu dinero | Checklist antes de invertir",
    description:
      "Checklist educativo basado en criterios públicos de protección al inversor para revisar entidad, producto, documentación, presión comercial, promesas y señales de alerta.",
  },
  {
    pathname: "/en/protect-your-money",
    language: "en",
    title: "Money warning signs | Checklist before investing",
    description:
      "An educational checklist for reviewing entities, products, documentation, custody, promises, commercial pressure, liquidity and exit rights.",
  },
  {
    pathname: "/dashboard",
    language: "es",
    title: "Dashboard de régimen de mercado | VIX, rotación, flujos y GLD",
    description:
      "Dashboard educativo de régimen de mercado con rotación sectorial, amplitud, VIX, estructura de volatilidad, BTC ETF flows y proxy de presión de flujos en GLD.",
  },
  {
    pathname: "/en/dashboard",
    language: "en",
    title: "Market regime dashboard | VIX, rotation, flows and GLD",
    description:
      "An educational market regime dashboard covering sector rotation, breadth, VIX structure, Bitcoin ETF flows and a GLD flow-pressure proxy.",
  },
  {
    pathname: "/informes",
    language: "es",
    title: "Archivo de informes | Luigui Herrera",
    description: "Archivo de informes de mercado multi-activo con lecturas editoriales por mes.",
    socialDescription: "Lecturas de mercado cargadas por mes, con informes actuales y archivados.",
  },
  {
    pathname: "/en/weekly-report",
    language: "en",
    title: "Weekly market report | Multi-asset context and scenarios",
    description:
      "A weekly educational reading of market regime, ETFs, sectors, volatility, flows, statistical levels, seasonality and upcoming events.",
  },
  {
    pathname: "/niveles-estadisticos",
    language: "es",
    title: "Niveles estadísticos | Percentiles, z-scores y estacionalidad",
    description:
      "Laboratorio de niveles estadísticos para comparar activos por percentil, z-score, extensión, rango histórico, drawdown y estacionalidad.",
  },
  {
    pathname: "/en/statistical-levels",
    language: "en",
    title: "Statistical levels | Percentiles, z-scores and seasonality",
    description:
      "Compare assets with their own history using percentiles, z-scores, extensions, historical ranges, drawdowns and seasonality.",
  },
  {
    pathname: "/tendencias",
    language: "es",
    title: "Tendencias | Hipótesis de inversión prudentes",
    description:
      "Marco educativo para convertir tendencias como inteligencia artificial, robótica, energía, ciberseguridad, cripto e infraestructura en hipótesis de inversión prudentes.",
  },
  {
    pathname: "/en/trends",
    language: "en",
    title: "Trends: from the world to the portfolio | Market Lab",
    description:
      "Explore what is changing in the world and turn trends into educational hypotheses without confusing narrative with investment.",
  },
  {
    pathname: "/recursos",
    language: "es",
    title: "Recursos para inversionistas | Scripts TradingView y herramientas",
    description:
      "Catálogo de recursos públicos para inversionistas, incluyendo scripts open-source de TradingView para niveles estadísticos y contexto de mercado.",
  },
  {
    pathname: "/en/resources",
    language: "en",
    title: "Investor resources | TradingView scripts and tools",
    description:
      "A catalog of public investor resources, including open-source TradingView scripts for statistical levels and market context.",
  },
  {
    pathname: "/metodologia",
    language: "es",
    title: "Metodología | Fuentes, límites y trazabilidad",
    description:
      "Cómo se construyen las lecturas de mercado, qué datos usan, qué límites tienen y qué no promete la plataforma.",
  },
  {
    pathname: "/en/methodology",
    language: "en",
    title: "Methodology | Sources, limits and traceability",
    description:
      "How the market readings and tools are built, which data sources they use, what their limits are and what the platform does not promise.",
  },
  {
    pathname: "/investigacion/td3",
    language: "es",
    title: "Evaluación realista de claims DRL | Market Lab",
    description:
      "Paper interactivo sobre evaluación TD3 con costes, cash explícito, benchmarks comparables y validación estadística.",
    type: "article",
  },
  {
    pathname: "/en/research/td3",
    language: "en",
    title: "Realistic evaluation of DRL portfolio claims | Market Lab",
    description:
      "Interactive paper on TD3 evaluation with costs, explicit cash, matched benchmarks and statistical validation.",
    type: "article",
  },
  {
    pathname: "/legal",
    language: "es",
    title: "Aviso legal | Privacidad, fuentes y límites de uso",
    description:
      "Consulta el alcance educativo del sitio, el tratamiento de datos, las fuentes utilizadas, los enlaces externos y los límites de responsabilidad.",
  },
  {
    pathname: "/en/legal",
    language: "en",
    title: "Legal notice | Privacy, sources and limits of use",
    description:
      "Read the site's educational scope, data handling, source policy, external-link terms and limits of responsibility.",
  },
];

export const seoRouteDefinitions: readonly SeoRouteDefinition[] = seoRouteContent.map((route) => {
  const targetLanguage = route.language === "es" ? "en" : "es";
  const alternatePathname = getTranslatedPathname(route.pathname, targetLanguage);
  return alternatePathname ? { ...route, alternatePathname } : route;
});

export const indexableRoutePaths = seoRouteDefinitions.map(({ pathname }) => pathname);

export const languagePairs = bilingualRoutePairs.map(({ es, en }) => [es, en] as const);

const routesByPathname = new Map(
  seoRouteDefinitions.map((route) => [route.pathname, route]),
);

const socialLocales: Record<SeoLanguage, string> = {
  es: "es_ES",
  en: "en_US",
};

export function absoluteUrl(pathname: string) {
  if (pathname === "/") return SITE_URL;
  return new URL(pathname, SITE_URL).toString();
}

export function getSeoRoute(pathname: string) {
  return routesByPathname.get(pathname);
}

export function languageAlternates(pathname: string) {
  const route = getSeoRoute(pathname);
  if (!route?.alternatePathname) return null;

  const alternate = getSeoRoute(route.alternatePathname);
  if (!alternate) return null;

  const esPathname = route.language === "es" ? route.pathname : alternate.pathname;
  const enPathname = route.language === "en" ? route.pathname : alternate.pathname;

  return {
    es: absoluteUrl(esPathname),
    en: absoluteUrl(enPathname),
    "x-default": absoluteUrl(esPathname),
  };
}

export function buildSeoMetadata(definition: SeoRouteDefinition): Metadata {
  const canonical = absoluteUrl(definition.pathname);
  const alternateRoute = definition.alternatePathname
    ? getSeoRoute(definition.alternatePathname)
    : undefined;
  const languages = languageAlternates(definition.pathname);

  return {
    title: definition.title,
    description: definition.description,
    alternates: {
      canonical,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      siteName: SITE_NAME,
      title: definition.socialTitle ?? definition.title,
      description: definition.socialDescription ?? definition.description,
      url: canonical,
      locale: socialLocales[definition.language],
      ...(alternateRoute
        ? { alternateLocale: [socialLocales[alternateRoute.language]] }
        : {}),
      type: definition.type ?? "website",
    },
    twitter: {
      card: "summary",
      title: definition.socialTitle ?? definition.title,
      description: definition.socialDescription ?? definition.description,
    },
  };
}

export function getRouteMetadata(pathname: string): Metadata {
  const definition = getSeoRoute(pathname);
  if (!definition) throw new Error(`Missing SEO route definition for ${pathname}`);
  return buildSeoMetadata(definition);
}
