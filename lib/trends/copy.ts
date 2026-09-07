import type { TrendCategory, TrendEvidence, TrendPhase } from "./catalog.ts";
type TrendsCopy = {
  hero: { eyebrow: string; title: string; subtitle: string; text: string; primary: string; secondary: string; sequence: string };
  current: { title: string; subtitle: string; updated: string; analyze: string; data: string; readings: { id: string; text: string }[]; capital: string; capitalText: string };
  radar: { title: string; text: string; filters: Record<TrendCategory | "all", string>; phase: string; evidence: string; phases: Record<TrendPhase, string>; evidenceLevels: Record<TrendEvidence, string>; explore: string; empty: string; emptyText: string; note: string; count: string };
  capital: { title: string; pending: string; pendingText: string; methodology: string };
  deep: { eyebrow: string; title: string; text: string; cta: string };
};
export const trendsCopy: Record<"es" | "en", TrendsCopy> = {
  es: {
    hero: { eyebrow: "Tendencias", title: "Entiende qué está cambiando antes de invertir en la historia", subtitle: "Una tendencia no es una inversión. Es apenas el inicio de una hipótesis.", text: "Sigue el cambio real, quién podría capturar valor, dónde aparece capital divulgado y qué tendría que ocurrir para que la tesis falle.", primary: "Explorar tendencias", secondary: "Ver coincidencias del capital", sequence: "Evidencia · Capital divulgado · Captura de valor · Riesgo · Vehículos" },
    current: { title: "Qué está cambiando ahora", subtitle: "Lecturas clave del momento.", updated: "Actualizado", analyze: "Ver análisis", data: "Ver datos", capital: "Capital divulgado", capitalText: "Qué compañías aparecen simultáneamente en carteras de gestores distintos. La coincidencia no implica una tesis compartida.", readings: [
      { id: "ai", text: "La adopción avanza; la pregunta es cuánto uso se convierte en ingresos y productividad. Infraestructura y aplicaciones no capturan valor de la misma forma." },
      { id: "energy", text: "La expansión de los centros de datos necesita redes y capacidad eléctrica. Los plazos de conexión pueden importar tanto como la demanda." },
      { id: "longevity", text: "El envejecimiento amplía la necesidad de cuidados. Conviene separar esa demanda de la evidencia clínica de cada tratamiento." },
    ] },
    radar: { title: "Radar de tendencias", text: "Explora los principales cambios estructurales y su estado actual.", filters: { all: "Todas", technology: "Tecnología", resources: "Recursos", health: "Salud", security: "Seguridad", finance: "Finanzas", consumption: "Consumo" }, phase: "Fase", evidence: "Evidencia", phases: { emerging: "Emergente", adoption: "Adopción", monetization: "Monetización", scale: "Escala", mature: "Madura" }, evidenceLevels: { limited: "Limitada", growing: "Creciente", strong: "Fuerte" }, explore: "Explorar", empty: "Sin tendencias en esta categoría", emptyText: "Selecciona otra categoría para continuar.", note: "Fase y evidencia son criterios editoriales sobre el cambio, no sobre su rentabilidad.", count: "tendencias" },
    capital: { title: "Dónde coincide el capital divulgado", pending: "Actualización pendiente", pendingText: "Las posiciones se mostrarán cuando exista un snapshot de SEC EDGAR validado. La ausencia de datos no equivale a ausencia de posiciones.", methodology: "Ver metodología" },
    deep: { eyebrow: "Profundiza", title: "Explora una tendencia en detalle", text: "Cambio, evidencia, cadena de valor, capital divulgado, riesgos y cómo se conecta con el mercado.", cta: "Ver ejemplo: Inteligencia artificial" },
  },
  en: {
    hero: { eyebrow: "Trends", title: "Understand what is changing before investing in the story", subtitle: "A trend is not an investment. It is only the beginning of a hypothesis.", text: "Follow real change, who could capture value, where disclosed capital appears and what would have to happen for the thesis to fail.", primary: "Explore trends", secondary: "View holdings overlap", sequence: "Evidence · Disclosed capital · Value capture · Risk · Vehicles" },
    current: { title: "What is changing now", subtitle: "Key readings for the moment.", updated: "Updated", analyze: "View analysis", data: "View data", capital: "Disclosed capital", capitalText: "Which companies appear in the portfolios of different managers. Overlap does not imply a shared investment thesis.", readings: [
      { id: "ai", text: "Adoption is advancing; the question is how much usage turns into revenue and productivity. Infrastructure and applications capture value differently." },
      { id: "energy", text: "Data center expansion needs grids and electrical capacity. Connection timelines can matter as much as demand." },
      { id: "longevity", text: "Ageing increases the need for care. Separate that demand from the clinical evidence for each treatment." },
    ] },
    radar: { title: "Trend radar", text: "Explore the main structural changes and their current state.", filters: { all: "All", technology: "Technology", resources: "Resources", health: "Health", security: "Security", finance: "Finance", consumption: "Consumption" }, phase: "Phase", evidence: "Evidence", phases: { emerging: "Emerging", adoption: "Adoption", monetization: "Monetization", scale: "Scale", mature: "Mature" }, evidenceLevels: { limited: "Limited", growing: "Growing", strong: "Strong" }, explore: "Explore", empty: "No trends in this category", emptyText: "Select another category to continue.", note: "Phase and evidence are editorial judgments about change, not about investment returns.", count: "trends" },
    capital: { title: "Where disclosed holdings overlap", pending: "Update pending", pendingText: "Positions will appear when a validated SEC EDGAR snapshot is available. Missing data does not mean missing holdings.", methodology: "View methodology" },
    deep: { eyebrow: "Go deeper", title: "Explore a trend in detail", text: "Change, evidence, the value chain, disclosed capital, risks and how it connects to the market.", cta: "View example: Artificial intelligence" },
  },
};
