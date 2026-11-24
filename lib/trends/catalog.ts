// Stable IDs and editorial classifications. No investment scores.
export type TrendCategory = "technology" | "resources" | "health" | "security" | "finance" | "consumption";
export type TrendPhase = "emerging" | "adoption" | "monetization" | "scale" | "mature";
export type TrendEvidence = "limited" | "growing" | "strong";
export type TrendDefinition = {
  id: string;
  slug: { es: string; en: string };
  name: { es: string; en: string };
  category: TrendCategory;
  phase: TrendPhase;
  evidence: TrendEvidence;
  reviewedAt: string;
};
export const trendsReviewedAt = "2026-11-24";
export const trendCatalog: TrendDefinition[] = [
  { id: "ai", slug: { es: "inteligencia-artificial", en: "artificial-intelligence" }, name: { es: "Inteligencia artificial", en: "Artificial intelligence" }, category: "technology", phase: "monetization", evidence: "strong", reviewedAt: "2026-11-24" },
  { id: "automation", slug: { es: "automatizacion", en: "automation" }, name: { es: "Automatización", en: "Automation" }, category: "technology", phase: "scale", evidence: "strong", reviewedAt: "2026-11-24" },
  { id: "energy", slug: { es: "energia-e-infraestructura", en: "energy-and-infrastructure" }, name: { es: "Energía e infraestructura", en: "Energy and infrastructure" }, category: "resources", phase: "scale", evidence: "strong", reviewedAt: "2026-11-24" },
  { id: "longevity", slug: { es: "salud-y-longevidad", en: "health-and-longevity" }, name: { es: "Salud y longevidad", en: "Health and longevity" }, category: "health", phase: "adoption", evidence: "growing", reviewedAt: "2026-11-24" },
  { id: "cybersecurity", slug: { es: "ciberseguridad", en: "cybersecurity" }, name: { es: "Ciberseguridad", en: "Cybersecurity" }, category: "security", phase: "scale", evidence: "strong", reviewedAt: "2026-11-24" },
  { id: "defense", slug: { es: "defensa-y-seguridad", en: "defense-and-security" }, name: { es: "Defensa y seguridad", en: "Defense and security" }, category: "security", phase: "scale", evidence: "strong", reviewedAt: "2026-11-24" },
  { id: "fintech", slug: { es: "digitalizacion-financiera", en: "financial-digitization" }, name: { es: "Digitalización financiera", en: "Financial digitization" }, category: "finance", phase: "scale", evidence: "strong", reviewedAt: "2026-11-24" },
  { id: "premium-consumption", slug: { es: "consumo-del-futuro", en: "future-consumption" }, name: { es: "Consumo del futuro", en: "Future consumption" }, category: "consumption", phase: "mature", evidence: "growing", reviewedAt: "2026-11-24" },
  { id: "water-food", slug: { es: "agua-y-alimentos", en: "water-and-food" }, name: { es: "Agua y alimentos", en: "Water and food" }, category: "resources", phase: "adoption", evidence: "growing", reviewedAt: "2026-11-24" },
  { id: "space", slug: { es: "espacio", en: "space" }, name: { es: "Espacio", en: "Space" }, category: "technology", phase: "adoption", evidence: "growing", reviewedAt: "2026-11-24" },
  { id: "critical-materials", slug: { es: "materiales-criticos", en: "critical-materials" }, name: { es: "Materiales críticos", en: "Critical materials" }, category: "resources", phase: "scale", evidence: "strong", reviewedAt: "2026-11-24" },
  { id: "digital-education", slug: { es: "educacion-y-trabajo-del-futuro", en: "education-and-work" }, name: { es: "Educación y trabajo del futuro", en: "Education and work of the future" }, category: "consumption", phase: "adoption", evidence: "growing", reviewedAt: "2026-11-24" },
  { id: "infrastructure", slug: { es: "ciudades-e-infraestructura", en: "cities-and-infrastructure" }, name: { es: "Ciudades e infraestructura", en: "Cities and infrastructure" }, category: "resources", phase: "mature", evidence: "strong", reviewedAt: "2026-11-24" },
  { id: "robotics", slug: { es: "robotica", en: "robotics" }, name: { es: "Robótica", en: "Robotics" }, category: "technology", phase: "adoption", evidence: "growing", reviewedAt: "2026-11-24" },
  { id: "crypto", slug: { es: "blockchain", en: "blockchain" }, name: { es: "Blockchain", en: "Blockchain" }, category: "finance", phase: "adoption", evidence: "growing", reviewedAt: "2026-11-24" },
  { id: "quantum", slug: { es: "computacion-cuantica", en: "quantum-computing" }, name: { es: "Computación cuántica", en: "Quantum computing" }, category: "technology", phase: "emerging", evidence: "limited", reviewedAt: "2026-11-24" },
  { id: "precious-metals", slug: { es: "metales-preciosos", en: "precious-metals" }, name: { es: "Metales preciosos", en: "Precious metals" }, category: "resources", phase: "mature", evidence: "strong", reviewedAt: "2026-11-24" },
];
export function trendsPath(locale: "es" | "en") { return locale === "es" ? "/tendencias" : "/en/trends"; }
export function trendPath(trend: TrendDefinition, locale: "es" | "en") { return `${trendsPath(locale)}/${trend.slug[locale]}`; }
export function trendsMethodologyPath(locale: "es" | "en") { return `${trendsPath(locale)}/${locale === "es" ? "metodologia" : "methodology"}`; }
export function filterTrends<T extends { category: TrendCategory }>(trends: T[], category: TrendCategory | "all"): T[] {
  return category === "all" ? trends : trends.filter((trend) => trend.category === category);
}
