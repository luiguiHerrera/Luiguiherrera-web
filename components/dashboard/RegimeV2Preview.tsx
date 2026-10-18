/** Imported only after the development-only route guard. Fixtures stay on server. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { RegimeOutput } from "@/lib/regime-engine-v2/engine";
import type { RegimeSummary } from "@/lib/dashboard/types";
import { buildRegimeV2View } from "@/lib/dashboard/regime-v2-presentation";
import { DashboardRegimeV1 } from "./DashboardRegimeV1";
import { RegimeV2Surface } from "./RegimeV2Surface";
import styles from "./regime-v2.module.css";

const scenarios = [
  ["broad-complete", "Risk-on amplio · datos completos", "Broad risk-on · complete data"],
  ["selective-partial", "Risk-on selectivo · datos parciales", "Selective risk-on · partial data"],
  ["transition-conflict", "Transición · fuerzas contrapuestas", "Transition · conflicting forces"],
  ["transition-watch", "Transición · volatilidad en vigilancia", "Transition · volatility watch"],
  ["transition-fragility", "Transición · un único soporte", "Transition · one support"],
  ["defensive-complete", "Defensivo", "Defensive"],
  ["stress-absolute", "Stress · nivel de VIX", "Stress · VIX level"],
  ["stress-joint", "Stress · choque conjunto", "Stress · joint shock"],
  ["incomplete-missing-core", "Incompleta · fuente pendiente", "Incomplete · pending source"],
  ["incomplete-unknown-calendar", "Incompleta · calendario no acreditado", "Incomplete · unverified calendar"],
  ["incomplete-stale", "Incompleta · evidencia antigua", "Incomplete · stale evidence"],
  ["incomplete-with-shock", "Incompleta · shock sin datos suficientes", "Incomplete · shock with insufficient data"],
] as const;
type Query = { preview?: string; fixture?: string; edge?: string };
export async function RegimeV2Preview({ locale, query }: { locale: "es" | "en"; query: Query }) {
  const t = (es: string, en: string) => locale === "es" ? es : en;
  const selected = scenarios.find(item => item[0] === query.fixture) ?? scenarios[9];
  const v2 = query.preview === "v2";
  const directory = path.join(process.cwd(), "docs/regime-engine-v2/designer");
  const reference = JSON.parse(await readFile(path.join(directory, "v1-reference.json"), "utf8")) as { regimeSummary: RegimeSummary };
  const fixture = v2 ? JSON.parse(await readFile(path.join(directory, "fixtures", selected[0] + ".json"), "utf8")) as { id: string; output: RegimeOutput } : null;
  const view = fixture ? buildRegimeV2View(fixture.output, locale) : null;
  if (view && query.edge === "long") {
    // Layout-only stress test. Original engine output and numerical values stay untouched.
    const extension = t(" Esta explicación extensa repite la misma evidencia para verificar su lectura y expansión en pantallas estrechas; no añade una inferencia sobre el mercado.", " This long explanation repeats the same evidence to test reading and expansion on narrow screens; it adds no market inference.");
    for (const group of [view.supports, view.brakes, view.watch]) if (group[0]) group[0].text += extension;
    if (view.sources[0]) view.sources[0].label += t(" · identificación de fuente deliberadamente extensa para la prueba de composición y trazabilidad", " · deliberately long source identification for layout and traceability testing");
    view.methodology.paragraphs.push(extension.repeat(8));
  }
  const base = locale === "es" ? "/internal/regime-v2" : "/en/internal/regime-v2";
  const link = (preview: string, language = locale) => `${language === "es" ? "/internal/regime-v2" : "/en/internal/regime-v2"}?preview=${preview}&fixture=${selected[0]}`;
  return <div data-design-preview className={`mx-auto max-w-7xl px-4 py-6 md:px-5 md:py-9 ${styles.preview}`}>
    <aside className={styles.previewBanner} aria-label={t("Entorno de revisión", "Review environment")}>
      <div><p>{t("DEV / PREVIEW INTERNA", "DEV / INTERNAL PREVIEW")}</p><strong>{t("Candidato de diseño · no es el mercado actual", "Design candidate · not the current market")}</strong><span>{v2 ? t("Fixture determinístico V2. Datos sintéticos; ninguna captura live completa.", "Deterministic V2 fixture. Synthetic data; no complete live capture.") : t("V1 actual con datos de prueba controlados. Componente público conservado.", "Current V1 with controlled test data. Public component preserved.")}</span></div>
      <nav aria-label={t("Comparación visual", "Visual comparison")}>
        <a href={link("v1")} aria-current={!v2 ? "page" : undefined}>V1 {t("actual", "current")}</a><a href={link("v2")} aria-current={v2 ? "page" : undefined}>V2 {t("candidato", "candidate")}</a>
        <a href={link(v2 ? "v2" : "v1", locale === "es" ? "en" : "es")} lang={locale === "es" ? "en" : "es"}>{locale === "es" ? "English" : "Español"}</a>
      </nav>
    </aside>
    <details className={styles.previewControls}><summary>{t("Escenario de revisión", "Review scenario")}: {v2 ? selected[locale === "es" ? 1 : 2] : "V1"} <span aria-hidden="true">⌄</span></summary>
      <form action={base} method="get"><input type="hidden" name="preview" value="v2" /><label>{t("Fixture de diseño", "Design fixture")}<select name="fixture" defaultValue={selected[0]}>{scenarios.map(item => <option key={item[0]} value={item[0]}>{item[locale === "es" ? 1 : 2]}</option>)}</select></label><label className={styles.edgeChoice}><input type="checkbox" name="edge" value="long" defaultChecked={query.edge === "long"} />{t("Prueba de textos extensos", "Long-copy test")}</label><button type="submit">{t("Ver escenario", "View scenario")}</button></form>
      {v2 ? <p>DESIGN_TEST · {selected[0]} · {fixture!.output.asOf} · {t("Shadow continúa OFF por defecto", "Shadow still defaults to OFF")}</p> : null}
    </details>
    {query.edge === "long" && v2 ? <p className={styles.edgeNote}>{t("PRUEBA DE COMPOSICIÓN: textos alargados; ninguna modificación del output del motor.", "LAYOUT TEST: extended copy; no engine output modification.")}</p> : null}
    <div data-design-surface={v2 ? "v2" : "v1"}>{view ? <RegimeV2Surface view={view} /> : <DashboardRegimeV1 regimeSummary={reference.regimeSummary} locale={locale} />}</div>
    <p className={styles.previewEnd}>{t("Fin de la superficie en revisión. El Dashboard público conserva sus módulos de investigación, navegación e informes.", "End of the surface under review. The public Dashboard retains its research modules, navigation and reports.")}</p>
  </div>;
}
