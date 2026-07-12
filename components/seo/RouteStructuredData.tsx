"use client";

import { usePathname } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildWebApplicationJsonLd, buildWebPageJsonLd, type SchemaLanguage } from "@/lib/seo/structured-data";

type RouteKind = "application" | "collection" | "page" | "tech";
type RouteSchema = { name: string; description: string; kind: RouteKind; category?: "FinanceApplication" | "EducationalApplication" };

const routes: Record<string, RouteSchema> = {
  "/empezar": { name: "Empezar simple", description: "Ruta guiada para ordenar las herramientas principales antes de invertir.", kind: "page" },
  "/presupuesto": { name: "Presupuesto personal", description: "Simulador educativo para ordenar ingresos, gastos, ahorro, inversión, protección financiera y gastos no mensuales.", kind: "application", category: "FinanceApplication" },
  "/deudas": { name: "Gestión de deudas", description: "Herramienta educativa para comparar pagos de deuda, avalancha, bola de nieve, flujo mensual y abonos extraordinarios.", kind: "application", category: "FinanceApplication" },
  "/diagnostico": { name: "Diagnóstico del inversionista", description: "Diagnóstico educativo para ordenar horizonte, liquidez, experiencia, comportamiento y capacidad para asumir riesgo.", kind: "application", category: "FinanceApplication" },
  "/inversionista": { name: "Modo inversionista", description: "Ruta educativa hacia herramientas de mercado e investigación.", kind: "page" },
  "/proteccion": { name: "Protección del inversor", description: "Simulador educativo de decisiones financieras con casos sobre liquidez, deuda, productos, finca raíz, ETF y portafolio.", kind: "application", category: "FinanceApplication" },
  "/protege-tu-dinero": { name: "Protege tu dinero", description: "Checklist educativo de señales de alerta antes de evaluar una entidad, producto o propuesta de inversión.", kind: "application", category: "FinanceApplication" },
  "/mercado": { name: "Mercado", description: "Página educativa de contexto de mercado, régimen y niveles estadísticos.", kind: "page" },
  "/dashboard": { name: "Dashboard de régimen de mercado", description: "Dashboard educativo para ordenar señales de régimen de mercado, volatilidad, rotación, amplitud, flujos BTC ETF y proxy GLD.", kind: "application", category: "EducationalApplication" },
  "/informes": { name: "Informes de mercado", description: "Archivo de informes de mercado multi-activo.", kind: "collection" },
  "/niveles-estadisticos": { name: "Niveles estadísticos", description: "Laboratorio educativo de niveles estadísticos por activo usando percentiles, z-scores, extensiones, rangos y drawdowns.", kind: "application", category: "EducationalApplication" },
  "/tendencias": { name: "Tendencias sin hype", description: "Herramienta educativa para convertir tendencias de mercado en hipótesis prudentes de observación.", kind: "application", category: "EducationalApplication" },
  "/recursos": { name: "Recursos", description: "Catálogo de recursos públicos y scripts open-source para inversionistas.", kind: "collection" },
  "/metodologia": { name: "Metodología", description: "Trazabilidad de fuentes, límites y métodos de las herramientas educativas.", kind: "page" },
  "/investigacion": { name: "Investigación cuantitativa", description: "Colección de investigación cuantitativa sobre portafolios, DRL y validación.", kind: "collection" },
  "/investigacion/td3": { name: "Evaluación realista de claims DRL", description: "Nota técnica de investigación sobre TD3, costes, cash, benchmarks y validación estadística.", kind: "tech" },
  "/quant-lab": { name: "TD3 Portfolio Research Lab", description: "Laboratorio técnico de evaluación de TD3 aplicado a asignación de portafolios.", kind: "tech" },
  "/legal": { name: "Legal", description: "Información legal y límites de uso de la plataforma.", kind: "page" },
};

const enRoutes: Record<string, RouteSchema> = Object.fromEntries(Object.entries(routes).map(([path, value]) => [path, value]));
Object.assign(enRoutes, {
  "/en/start": { name: "Start", description: "A guided path through the main educational tools before investing.", kind: "page" },
  "/en/budget": { name: "Personal budget", description: "Educational simulator for organizing income, spending, saving, investing, financial protection and non-monthly expenses.", kind: "application", category: "FinanceApplication" },
  "/en/debt": { name: "Debt management", description: "Educational tool for comparing debt payments, avalanche, snowball, monthly cash flow and extra payments.", kind: "application", category: "FinanceApplication" },
  "/en/diagnostic": { name: "Investor diagnostic", description: "Educational diagnostic for organizing horizon, liquidity, experience, behavior and capacity to take risk.", kind: "application", category: "FinanceApplication" },
  "/en/investor": { name: "Investor mode", description: "Educational path to market and research tools.", kind: "page" },
  "/en/protection": { name: "Investor protection", description: "Educational financial-decision simulator covering liquidity, debt, products, real estate, ETFs and portfolios.", kind: "application", category: "FinanceApplication" },
  "/en/protect-your-money": { name: "Protect your money", description: "Educational red-flag checklist for reviewing an entity, product or investment proposal.", kind: "application", category: "FinanceApplication" },
  "/en/market": { name: "Market", description: "Educational page for market context, regime and statistical levels.", kind: "page" },
  "/en/dashboard": { name: "Market Regime Dashboard", description: "Educational dashboard organizing market regime, volatility, rotation, breadth, BTC ETF flows and a GLD proxy.", kind: "application", category: "EducationalApplication" },
  "/en/weekly-report": { name: "Weekly market report", description: "Multi-asset market-report archive.", kind: "collection" },
  "/en/statistical-levels": { name: "Statistical levels", description: "Educational lab using percentiles, z-scores, extensions, ranges and drawdowns by asset.", kind: "application", category: "EducationalApplication" },
  "/en/trends": { name: "Trends without hype", description: "Educational tool for turning market trends into prudent observation hypotheses.", kind: "application", category: "EducationalApplication" },
  "/en/resources": { name: "Resources", description: "Catalog of public resources and open-source scripts for investors.", kind: "collection" },
  "/en/methodology": { name: "Methodology", description: "Traceability for sources, limits and methods used by the educational tools.", kind: "page" },
  "/en/research": { name: "Quantitative research", description: "Collection of quantitative research on portfolios, DRL and validation.", kind: "collection" },
  "/en/research/td3": { name: "Realistic evaluation of DRL claims", description: "Technical research note on TD3, costs, cash, benchmarks and statistical validation.", kind: "tech" },
  "/en/quant-lab": { name: "TD3 Portfolio Research Lab", description: "Technical lab evaluating TD3 for portfolio allocation.", kind: "tech" },
  "/en/legal": { name: "Legal", description: "Legal information and platform usage limits.", kind: "page" },
});

const researchAbout = ["reinforcement learning", "TD3", "portfolio allocation", "transaction costs", "walk-forward validation", "backtesting", "risk constraints"];

export function RouteStructuredData() {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  if (pathname === "/" || pathname === "/en") return null;
  const language: SchemaLanguage = pathname.startsWith("/en/") ? "en" : "es";
  const config = language === "en" ? enRoutes[pathname] : routes[pathname];
  if (!config) return null;
  const input = { pathname, name: config.name, description: config.description, language };
  const parentResearch = pathname.endsWith("/research/td3") ? "/en/research" : pathname.endsWith("/investigacion/td3") ? "/investigacion" : null;
  const breadcrumbs = buildBreadcrumbJsonLd(language, [
    { name: language === "en" ? "Home" : "Inicio", pathname: language === "en" ? "/en" : "/" },
    ...(parentResearch ? [{ name: language === "en" ? "Research" : "Investigación", pathname: parentResearch }] : []),
    { name: config.name, pathname },
  ]);
  const schemas: object[] = [buildWebPageJsonLd(input, config.kind === "collection" ? "CollectionPage" : "WebPage"), breadcrumbs];
  if (config.kind === "application") schemas.push(buildWebApplicationJsonLd(input, config.category!));
  if (config.kind === "tech") schemas.push(buildArticleJsonLd(input, "TechArticle", { about: researchAbout }));
  if (pathname === "/informes" || pathname === "/en/weekly-report") schemas.push(buildArticleJsonLd(input, "Article", { headline: language === "en" ? "First July market report" : "Primer informe de julio", datePublished: "2026-07-01", about: ["market regime", "volatility", "ETF flows", "gold", "Bitcoin", "sectors", "economic calendar"] }));
  return <JsonLd data={schemas} />;
}
