"use client";

import { usePathname } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { td3Editorial } from "@/lib/research/td3-editorial";
import { tomDecayEditorial } from "@/lib/research/tom-decay/editorial";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildWebApplicationJsonLd, buildWebPageJsonLd, type SchemaLanguage } from "@/lib/seo/structured-data";

type RouteKind = "application" | "collection" | "page" | "tech";
type EditorialRecord = { headline: string; publishedAt: string; modifiedAt: string };
type RouteSchema = {
  name: string;
  description: string;
  kind: RouteKind;
  category?: "FinanceApplication" | "EducationalApplication";
  editorial?: EditorialRecord;
  about?: string[];
};

const td3About = ["reinforcement learning", "TD3", "portfolio allocation", "transaction costs", "walk-forward validation", "backtesting", "risk constraints"];
const tomDecayAbout = ["turn-of-the-month effect", "calendar anomalies", "alpha decay", "market microstructure", "HAC inference", "independent replication", "reproducible research"];

const routes: Record<string, RouteSchema> = {
  "/empezar": { name: "Finanzas personales", description: "Ruta guiada para elegir un primer paso entre presupuesto, deudas, fondo de emergencia y preparación para invertir.", kind: "page" },
  "/presupuesto": { name: "Presupuesto personal", description: "Simulador educativo para ordenar ingresos, gastos, ahorro, inversión, protección financiera y gastos no mensuales.", kind: "application", category: "FinanceApplication" },
  "/deudas": { name: "Gestión de deudas", description: "Herramienta educativa para comparar pagos de deuda, avalancha, bola de nieve, flujo mensual y abonos extraordinarios.", kind: "application", category: "FinanceApplication" },
  "/diagnostico": { name: "Diagnóstico del inversionista", description: "Diagnóstico educativo para ordenar horizonte, liquidez, experiencia, comportamiento y capacidad para asumir riesgo.", kind: "application", category: "FinanceApplication" },
  "/inversionista": { name: "Área inversionista", description: "Ruta educativa hacia herramientas de mercado e investigación.", kind: "page" },
  "/proteccion": { name: "Simulador de decisiones financieras", description: "Simulador educativo de decisiones financieras con casos sobre liquidez, deuda, productos, finca raíz, ETF y portafolio.", kind: "application", category: "FinanceApplication" },
  "/protege-tu-dinero": { name: "Alertas para tu dinero", description: "Checklist educativo de señales de alerta antes de evaluar una entidad, producto o propuesta de inversión.", kind: "application", category: "FinanceApplication" },
  "/dashboard": { name: "Dashboard de régimen de mercado", description: "Dashboard educativo para ordenar señales de régimen de mercado, volatilidad, rotación, amplitud, flujos BTC ETF y proxy GLD.", kind: "application", category: "EducationalApplication" },
  "/informes": { name: "Informes de mercado", description: "Archivo de informes de mercado multi-activo.", kind: "collection" },
  "/niveles-estadisticos": { name: "Niveles estadísticos", description: "Laboratorio educativo de niveles estadísticos por activo usando percentiles, z-scores, extensiones, rangos y drawdowns.", kind: "application", category: "EducationalApplication" },
  "/tendencias": { name: "Tendencias", description: "Herramienta educativa para convertir tendencias de mercado en hipótesis prudentes de observación.", kind: "application", category: "EducationalApplication" },
  "/recursos": { name: "Recursos", description: "Catálogo de recursos públicos y scripts open-source para inversionistas.", kind: "collection" },
  "/metodologia": { name: "Metodología", description: "Trazabilidad de fuentes, límites y métodos de las herramientas educativas.", kind: "page" },
  "/investigacion": { name: "Investigación cuantitativa", description: "Índice de estudios cuantitativos reproducibles con método, datos derivados y límites publicados.", kind: "collection" },
  "/investigacion/td3": { name: td3Editorial.es.headline, description: "Nota técnica de investigación sobre TD3, costes, cash, benchmarks y validación estadística.", kind: "tech", editorial: td3Editorial.es, about: td3About },
  "/investigacion/el-fantasma-de-una-anomalia": { name: tomDecayEditorial.es.headline, description: "Nota técnica de investigación sobre el decay del efecto turn-of-the-month, replicación independiente y estabilidad temporal.", kind: "tech", editorial: tomDecayEditorial.es, about: tomDecayAbout },
  "/legal": { name: "Legal", description: "Información legal y límites de uso de la plataforma.", kind: "page" },
};

const enRoutes: Record<string, RouteSchema> = Object.fromEntries(Object.entries(routes).map(([path, value]) => [path, value]));
Object.assign(enRoutes, {
  "/en/start": { name: "Personal finance", description: "A guided path for choosing a first step across budgeting, debt, an emergency fund and investment readiness.", kind: "page" },
  "/en/budget": { name: "Personal budget", description: "Educational simulator for organizing income, spending, saving, investing, financial protection and non-monthly expenses.", kind: "application", category: "FinanceApplication" },
  "/en/debt": { name: "Debt management", description: "Educational tool for comparing debt payments, avalanche, snowball, monthly cash flow and extra payments.", kind: "application", category: "FinanceApplication" },
  "/en/diagnostic": { name: "Investor diagnostic", description: "Educational diagnostic for organizing horizon, liquidity, experience, behavior and capacity to take risk.", kind: "application", category: "FinanceApplication" },
  "/en/investor": { name: "Investor area", description: "Educational path to market and research tools.", kind: "page" },
  "/en/protection": { name: "Financial decision simulator", description: "Educational financial-decision simulator covering liquidity, debt, products, real estate, ETFs and portfolios.", kind: "application", category: "FinanceApplication" },
  "/en/protect-your-money": { name: "Money warning signs", description: "Educational red-flag checklist for reviewing an entity, product or investment proposal.", kind: "application", category: "FinanceApplication" },
  "/en/dashboard": { name: "Market Regime Dashboard", description: "Educational dashboard organizing market regime, volatility, rotation, breadth, BTC ETF flows and a GLD proxy.", kind: "application", category: "EducationalApplication" },
  "/en/weekly-report": { name: "Weekly market report", description: "Multi-asset market-report archive.", kind: "collection" },
  "/en/statistical-levels": { name: "Statistical levels", description: "Educational lab using percentiles, z-scores, extensions, ranges and drawdowns by asset.", kind: "application", category: "EducationalApplication" },
  "/en/trends": { name: "Trends", description: "Educational tool for turning market trends into prudent observation hypotheses.", kind: "application", category: "EducationalApplication" },
  "/en/resources": { name: "Resources", description: "Catalog of public resources and open-source scripts for investors.", kind: "collection" },
  "/en/methodology": { name: "Methodology", description: "Traceability for sources, limits and methods used by the educational tools.", kind: "page" },
  "/en/research": { name: "Quantitative research", description: "Index of reproducible quantitative studies with published methods, derived data and limits.", kind: "collection" },
  "/en/research/td3": { name: td3Editorial.en.headline, description: "Technical research note on TD3, costs, cash, benchmarks and statistical validation.", kind: "tech", editorial: td3Editorial.en, about: td3About },
  "/en/research/the-ghost-of-an-anomaly": { name: tomDecayEditorial.en.headline, description: "Technical research note on turn-of-the-month decay, independent replication and temporal stability.", kind: "tech", editorial: tomDecayEditorial.en, about: tomDecayAbout },
  "/en/legal": { name: "Legal", description: "Legal information and platform usage limits.", kind: "page" },
});



export function RouteStructuredData() {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  if (pathname === "/" || pathname === "/en") return null;
  const language: SchemaLanguage = pathname.startsWith("/en/") ? "en" : "es";
  const config = language === "en" ? enRoutes[pathname] : routes[pathname];
  if (!config) return null;
  const input = { pathname, name: config.name, description: config.description, language };
  const breadcrumbs = buildBreadcrumbJsonLd(language, [
    { name: language === "en" ? "Home" : "Inicio", pathname: language === "en" ? "/en" : "/" },
    { name: config.name, pathname },
  ]);
  const schemas: object[] = [buildWebPageJsonLd(input, config.kind === "collection" ? "CollectionPage" : "WebPage"), breadcrumbs];
  if (config.kind === "application") schemas.push(buildWebApplicationJsonLd(input, config.category!));
  if (config.kind === "tech" && config.editorial) {
    schemas.push(buildArticleJsonLd(input, "TechArticle", {
      about: config.about,
      datePublished: config.editorial.publishedAt,
      dateModified: config.editorial.modifiedAt,
      headline: config.editorial.headline,
    }));
  }
  return <JsonLd data={schemas} />;
}
