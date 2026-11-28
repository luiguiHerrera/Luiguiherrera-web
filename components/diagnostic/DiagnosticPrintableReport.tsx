"use client";

import type { DiagnosticLocale, DiagnosticProfile, DiagnosticResult, DiagnosticScoreKey, PaiDimension, PaiMainWeakness, PaiStage, ReadinessLight } from "@/lib/diagnostic/types";
import { DIAGNOSTIC_PROFILE_LABELS } from "@/lib/diagnostic/types";

import styles from "./diagnosticPrint.module.css";

const origin = "luiguiherrera.com";

const copy = {
  es: {
    alerts: "Alertas y tensiones principales",
    behavior: "Conducta",
    baseCapNote: "Aunque hay señales de comprensión inversora, la base de ingresos/liquidez limita la preparación para tomar más riesgo.",
    educationalNotice: "Lectura educativa generada desde tus respuestas. No constituye asesoramiento financiero, recomendación personalizada, evaluación de idoneidad o conveniencia MiFID II ni autorización para operar.",
    financialBase: "Base financiera",
    complexity: "Complejidad a revisar",
    date: "Fecha",
    disclaimer2: "El objetivo es ayudarte a identificar zonas de atención, preparación actual y próximos pasos educativos antes de tomar más riesgo.",
    footer: "luiguiherrera.com · Herramientas educativas para invertir con más criterio.",
    interiorBrief: "Resumen de preparación para invertir",
    internalMap: "Mapa interno resumido",
    intro: "La lectura separa base financiera, administración del dinero y preparación para tomar riesgo.",
    investmentPreparation: "Preparación inversora",
    investmentReadiness: "Preparación para invertir",
    investorDiagnostic: "Diagnóstico del inversionista",
    investorProfile: "Perfil inversor",
    knowledge: "Conceptos comprobados",
    lossCapacity: "Capacidad de pérdida",
    mainWeakness: "Principal punto a reforzar",
    nextStep: "Siguiente paso educativo",
    noteReading: "Nota de lectura",
    observation: "Observación",
    orientation: "Tolerancia declarada",
    profileNote: "Capacidad financiera, tolerancia declarada y respuestas hipotéticas son lecturas separadas. Ninguna describe conducta real observada.",
    profileTensions: "Tolerancia, capacidad y tensiones",
    readinessSignal: "Semáforo de preparación",
    readinessSubtitle: "Primero estructura. Después exposición al riesgo.",
    route: "Ruta sugerida dentro de la web",
    routeNote: "Ábrela después de guardar este resumen para no perder tu resultado.",
    score: "score",
    stage: "Etapa",
    summary: "Resumen de preparación para invertir",
    underPressure: "Respuestas hipotéticas",
  },
  en: {
    alerts: "Main alerts and tensions",
    behavior: "Behavior",
    baseCapNote: "Although there are signs of investment understanding, the income/liquidity base limits readiness to take more risk.",
    educationalNotice: "Educational read generated from your answers. It is not financial advice, a personalized recommendation, a MiFID II suitability or appropriateness assessment or authorization to trade.",
    financialBase: "Financial base",
    complexity: "Complexity to review",
    date: "Date",
    disclaimer2: "The goal is to help you identify attention areas, current readiness and educational next steps before taking more risk.",
    footer: "luiguiherrera.com · Educational tools for more thoughtful investing.",
    interiorBrief: "Investor readiness brief",
    internalMap: "Internal map summary",
    intro: "This read separates financial base, money management and readiness to take risk.",
    investmentPreparation: "Investment preparation",
    investmentReadiness: "Investment readiness",
    investorDiagnostic: "Investor diagnostic",
    investorProfile: "Investor profile",
    knowledge: "Concepts checked",
    lossCapacity: "Loss capacity",
    mainWeakness: "Main area to strengthen",
    nextStep: "Next educational step",
    noteReading: "Reading note",
    observation: "Observation",
    orientation: "Stated tolerance",
    profileNote: "Financial capacity, stated tolerance and hypothetical responses are separate readings. None establishes observed behavior.",
    profileTensions: "Tolerance, capacity and tensions",
    readinessSignal: "Readiness signal",
    readinessSubtitle: "Structure first. Risk exposure after.",
    route: "Suggested path inside the website",
    routeNote: "Open it after saving this summary so you do not lose your result.",
    score: "score",
    stage: "Stage",
    summary: "Investment readiness summary",
    underPressure: "Hypothetical responses",
  },
};

const stageLabels: Record<PaiStage, Record<DiagnosticLocale, string>> = {
  orden: { es: "Orden", en: "Order" },
  preparacion: { es: "Preparación", en: "Preparation" },
  expansion: { es: "Expansión", en: "Expansion" },
};

const lightLabels: Record<ReadinessLight, Record<DiagnosticLocale, string>> = {
  red: { es: "Prioridad de revisión", en: "Priority for review" },
  yellow: { es: "Preparar antes de avanzar", en: "Prepare before moving forward" },
  green: { es: "Base más sólida", en: "Stronger base" },
};

const paiDimensionLabels: Record<PaiDimension, Record<DiagnosticLocale, string>> = {
  producir: { es: "Producir", en: "Produce" },
  administrar: { es: "Administrar", en: "Manage" },
  invertir: { es: "Invertir", en: "Invest" },
};

const weaknessLabels: Record<PaiMainWeakness, Record<DiagnosticLocale, string>> = {
  liquidity: { es: "liquidez", en: "liquidity" },
  expensive_debt: { es: "deuda cara", en: "high-cost debt" },
  income_fragility: { es: "ingresos frágiles", en: "income fragility" },
  low_surplus: { es: "excedente insuficiente", en: "insufficient surplus" },
  low_emergency_fund: { es: "fondo de emergencia bajo", en: "low emergency fund" },
  unclear_horizon: { es: "horizonte poco claro", en: "unclear horizon" },
  unrealistic_expectations: { es: "expectativas exigentes", en: "demanding expectations" },
  low_product_understanding: { es: "comprensión de productos", en: "product understanding" },
  impulsivity: { es: "impulsividad", en: "impulsivity" },
  concentration: { es: "concentración", en: "concentration" },
  none: { es: "sin tensión dominante", en: "no dominant tension" },
};

const scoreLabels: Record<DiagnosticScoreKey, Record<DiagnosticLocale, string>> = {
  incomeStability: { es: "Estabilidad de ingresos", en: "Income stability" },
  surplusCashFlow: { es: "Capacidad de excedente", en: "Surplus capacity" },
  expensiveDebtControl: { es: "Control de deuda cara", en: "High-cost debt control" },
  goalClarity: { es: "Claridad de objetivos", en: "Goal clarity" },
  financialCapacity: { es: "Capacidad financiera", en: "Financial capacity" },
  liquidityStrength: { es: "Liquidez", en: "Liquidity" },
  timeHorizon: { es: "Horizonte real", en: "Real horizon" },
  emotionalTolerance: { es: "Tolerancia declarada", en: "Stated tolerance" },
  patience: { es: "Paciencia", en: "Patience" },
  fomoSensitivity: { es: "Sensibilidad FOMO", en: "FOMO sensitivity" },
  euphoriaRisk: { es: "Riesgo de euforia", en: "Euphoria risk" },
  knowledgeValidated: { es: "Conceptos comprobados", en: "Concepts checked" },
  experienceReal: { es: "Experiencia declarada", en: "Self-reported experience" },
  expectationRealism: { es: "Realismo de expectativas", en: "Expectation realism" },
  consistency: { es: "Consistencia", en: "Consistency" },
  productComplexity: { es: "Complejidad de productos", en: "Product complexity" },
  overconfidence: { es: "Sobreconfianza", en: "Overconfidence" },
  calibration: { es: "Calibración", en: "Calibration" },
};

const complexityLabels: Record<string, Record<DiagnosticLocale, string>> = {
  Básica: { es: "Simple", en: "Simple" },
  Intermedia: { es: "Moderada", en: "Moderate" },
  Alta: { es: "Avanzada", en: "Advanced" },
  Compleja: { es: "Avanzada", en: "Advanced" },
  excessive: { es: "Excesiva por ahora", en: "Too high for now" },
};

const translatedResultLabels: Record<string, string> = {
  "Frágil": "Fragile",
  "Limitada": "Limited",
  "Suficiente": "Sufficient",
  "Robusta": "Robust",
  "Inicial": "Initial",
  "Básico": "Basic",
  "Intermedio": "Intermediate",
  "Alto en estas preguntas": "High on these questions",
  "Básica declarada": "Basic self-reported",
  "Intermedia declarada": "Intermediate self-reported",
  "Amplia declarada": "Extensive self-reported",
};

const paiInsightLabels: Record<PaiDimension, Record<DiagnosticLocale, string>> = {
  producir: {
    es: "Ingresos y excedente definen la base disponible.",
    en: "Income and surplus define the available base.",
  },
  administrar: {
    es: "Liquidez, deuda y objetivos ordenan el margen de decisión.",
    en: "Liquidity, debt and goals organize the decision margin.",
  },
  invertir: {
    es: "La preparación inversora debe apoyarse en la base previa.",
    en: "Investment readiness should rest on the prior base.",
  },
};

const internalMapGroups: Array<{ key: "financialBase" | "behavior" | "investmentPreparation"; scores: DiagnosticScoreKey[] }> = [
  {
    key: "financialBase",
    scores: ["incomeStability", "surplusCashFlow", "expensiveDebtControl", "goalClarity", "financialCapacity", "liquidityStrength", "timeHorizon"],
  },
  {
    key: "behavior",
    scores: ["emotionalTolerance", "patience", "fomoSensitivity", "euphoriaRisk", "consistency", "overconfidence"],
  },
  {
    key: "investmentPreparation",
    scores: ["knowledgeValidated", "experienceReal", "expectationRealism", "productComplexity", "calibration"],
  },
];

function formatDate(locale: DiagnosticLocale, date: Date) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(date: Date) {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${String(date.getDate()).padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function statusFromScore(score: number, locale: DiagnosticLocale) {
  if (score >= 66) return locale === "es" ? "Fuerte" : "Strong";
  if (score >= 45) return locale === "es" ? "A reforzar" : "Needs work";
  return locale === "es" ? "Zona de atención" : "Attention zone";
}

function profileText(locale: DiagnosticLocale, profile: DiagnosticProfile) {
  return DIAGNOSTIC_PROFILE_LABELS[profile][locale];
}

function complexityText(locale: DiagnosticLocale, result: DiagnosticResult) {
  if (!result.selectedProducts.length) return locale === "es" ? "Sin selección" : "No selection";
  if (result.flags.includes("product_mismatch")) return locale === "es" ? "Brecha por producto" : "Product-specific gap";
  return complexityLabels[result.complexity.band]?.[locale] ?? result.complexity.band;
}

function localizedResultLabel(locale: DiagnosticLocale, value: string) {
  return locale === "en" ? translatedResultLabels[value] ?? value : value;
}

function routeHref(locale: DiagnosticLocale, href: string) {
  if (locale === "es") return href;
  if (href === "/protege-tu-dinero") return "/en/protect-your-money";
  if (href === "/dashboard") return "/en/dashboard";
  if (href === "/analisiscuantitativo") return "/en/quantitative-analysis";
  if (href === "/recursos") return "/en/resources";
  if (href.startsWith("/diagnostico")) return href.replace("/diagnostico", "/en/diagnostic");
  return href;
}

function readableRoute(locale: DiagnosticLocale, href: string) {
  const localizedHref = routeHref(locale, href);
  return `${origin}${localizedHref}`;
}

function ExecutiveItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles["print-executive-item"]}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Page({ children, generatedAt, headerTitle, title }: { children: React.ReactNode; generatedAt?: Date; headerTitle?: string; title?: string }) {
  return (
    <section className={styles["print-sheet"]}>
      {headerTitle || title ? (
        <header className={styles["print-section-header"]}>
          <p>{origin}</p>
          {headerTitle ? <p>{headerTitle}</p> : null}
          {generatedAt ? <p>{formatShortDate(generatedAt)}</p> : null}
        </header>
      ) : null}
      {title ? (
        <header className={styles["print-title-header"]}>
          {title ? <h2>{title}</h2> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles["print-bar-row"]}>
      <div className={styles["print-bar-label"]}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className={styles["print-bar-track"]}>
        <div className={styles["print-bar-fill"]} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function KeyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles["print-key-fact"]}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function PaiScoreCard({ insight, label, score, status }: { insight: string; label: string; score: number; status: string }) {
  return (
    <div className={styles["print-pai-card"]}>
      <div className={styles["print-pai-card-top"]}>
        <span>{label}</span>
        <strong>{score}</strong>
      </div>
      <em>{status}</em>
      <div className={styles["print-bar-track"]}>
        <div className={styles["print-bar-fill"]} style={{ width: `${score}%` }} />
      </div>
      <p>{insight}</p>
    </div>
  );
}

function compactAlerts(result: DiagnosticResult, locale: DiagnosticLocale) {
  const seen = new Set<string>();
  const combined = [...result.alerts, ...result.expectationTensions];
  return combined.filter((alert) => {
    if (seen.has(alert)) return false;
    seen.add(alert);
    return true;
  }).map((alert) => ({
    category: alertCategory(locale, alert),
    text: alert,
  }));
}

function alertCategory(locale: DiagnosticLocale, alert: string) {
  const value = alert.toLowerCase();
  if (
    value.includes("liquidez") ||
    value.includes("horizonte") ||
    value.includes("ingreso") ||
    value.includes("deuda") ||
    value.includes("capital") ||
    value.includes("liquidity") ||
    value.includes("horizon") ||
    value.includes("income") ||
    value.includes("debt") ||
    value.includes("cash")
  ) return locale === "es" ? "Estructura" : "Structure";

  if (
    value.includes("conocimiento") ||
    value.includes("producto") ||
    value.includes("complej") ||
    value.includes("knowledge") ||
    value.includes("product") ||
    value.includes("complex")
  ) return locale === "es" ? "Conocimiento" : "Knowledge";

  return locale === "es" ? "Conducta" : "Behavior";
}

export function DiagnosticPrintableReport({ generatedAt, locale, result }: { generatedAt: Date; locale: DiagnosticLocale; result: DiagnosticResult }) {
  const text = copy[locale];
  const alerts = compactAlerts(result, locale);
  const matrix: Array<[PaiDimension, number]> = [
    ["producir", result.paiReadiness.producirScore],
    ["administrar", result.paiReadiness.administrarScore],
    ["invertir", result.paiReadiness.invertirScore],
  ];
  const capNote = result.paiReadiness.baseLimitNote;

  return (
    <article className={styles.report} aria-label={locale === "es" ? "Resumen educativo del diagnóstico" : "Educational diagnostic summary"}>
      <Page>
        <div className={styles["print-cover"]}>
          <section className={styles["print-cover-hero"]}>
            <div className={styles["print-cover-topline"]}>
              <p className={styles["print-brand"]}>{origin}</p>
              <p>{text.date}: {formatDate(locale, generatedAt)}</p>
            </div>
            <div className={styles["print-cover-title"]}>
              <h1>{text.investorDiagnostic}</h1>
              <p>{text.summary}</p>
            </div>
            <div className={styles["print-cover-technical-line"]} />
          </section>
          <section className={styles["print-cover-summary"]}>
            <div className={styles["print-cover-notice"]}>
              <span>{locale === "es" ? "Nota educativa" : "Educational note"}</span>
              <p>{text.educationalNotice}</p><p>{result.methodologyNote}</p>
            </div>
            <dl className={styles["print-cover-executive-table"]}>
              <ExecutiveItem label={text.orientation} value={profileText(locale, result.declaredProfile)} />
              <ExecutiveItem label={text.stage} value={stageLabels[result.paiReadiness.stage][locale]} />
              <ExecutiveItem label={text.readinessSignal} value={lightLabels[result.paiReadiness.light][locale]} />
              <ExecutiveItem label={text.mainWeakness} value={weaknessLabels[result.paiReadiness.mainWeakness][locale]} />
              <ExecutiveItem label={text.nextStep} value={result.paiReadiness.nextEducationalStep} />
            </dl>
          </section>
        </div>

        <h2 className={styles["print-inline-heading"]}>{text.investmentReadiness}</h2>
        <p className={styles["print-kicker"]}>{text.readinessSubtitle}</p>
        <p className={styles["print-copy"]}>{text.intro}</p>
        <p className={styles["print-scale"]}>{locale === "es" ? "Índices orientativos · 0 a 100" : "Indicative indices · 0 to 100"}</p>
        <div className={styles["print-pai-row"]}>
          {matrix.map(([dimension, score]) => (
            <PaiScoreCard
              key={dimension}
              insight={paiInsightLabels[dimension][locale]}
              label={paiDimensionLabels[dimension][locale]}
              score={score}
              status={statusFromScore(score, locale)}
            />
          ))}
        </div>
        {capNote ? (
          <div className={styles["print-reading-note"]}>
            <span>{text.noteReading}</span>
            <p>{capNote}</p>
          </div>
        ) : null}
        <div className={styles["print-wide-next-step"]}>
          <span>{text.nextStep}</span>
          <p>{result.paiReadiness.nextEducationalStep}</p>
        </div>
        <p className={styles["print-disclaimer-small"]}>{text.disclaimer2}</p>
      </Page>

      <Page generatedAt={generatedAt} headerTitle={text.interiorBrief} title={text.profileTensions}>
        <div className={styles["print-profile-layout"]}>
          <div className={styles["print-profile-summary"]}>
            <p className={styles["print-copy"]}>{result.summary}</p>
            <p className={styles["print-copy"]}>{text.profileNote}</p><p className={styles["print-copy"]}>{result.pressureSummary}</p>
            <div className={styles["print-profile-main"]}>
              <span>{text.orientation}</span>
              <strong>{result.declaredLoss}</strong><p className={styles["print-copy"]}>{profileText(locale, result.declaredProfile)}</p>
            </div>
            <dl className={styles["print-key-facts"]}>
              <KeyFact label={text.underPressure} value={profileText(locale, result.pressureProfile)} />
              <KeyFact label={text.lossCapacity} value={localizedResultLabel(locale, result.lossCapacity.label)} />
              <KeyFact label={text.knowledge} value={localizedResultLabel(locale, result.knowledge.label)} />
              <KeyFact label={text.complexity} value={complexityText(locale, result)} />
              <KeyFact label={locale === "es" ? "Experiencia declarada" : "Self-reported experience"} value={localizedResultLabel(locale, result.experience.label)} />
            </dl>
            <ul className={styles["print-notes"]}>{[result.lossCapacity.note, result.knowledge.note, result.experience.note, result.complexity.note].map((note) => <li key={note}>{note}</li>)}</ul>
          </div>
          <div className={styles["print-alert-panel"]}>
            <h3>{text.alerts}</h3>
            <ul className={styles["print-alert-list"]}>
              {alerts.slice(0, 5).map((alert, index) => (
                <li key={alert.text}>
                  <span>{String(index + 1).padStart(2, "0")} {alert.category}</span>
                  <p>{alert.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Page>

      <Page generatedAt={generatedAt} headerTitle={text.interiorBrief} title={text.internalMap}>
        <p className={styles["print-scale"]}>{locale === "es" ? "Índices orientativos · 0 a 100" : "Indicative indices · 0 to 100"}</p>
        <div className={styles["print-map-grid"]}>
          {internalMapGroups.map((group) => (
            <div key={group.key} className={styles["print-map-group"]}>
              <h3>{text[group.key]}</h3>
              {group.scores.map((key) => (
                <ScoreBar key={key} label={scoreLabels[key][locale]} value={result.scores[key]} />
              ))}
            </div>
          ))}
        </div>
        <div className={styles["print-route-card"]}>
          <span>{text.route}</span>
          <strong>{result.route.label}</strong>
          <p>{result.route.note}</p>
          <p>{text.routeNote}</p>
          <em>{readableRoute(locale, result.route.href)}</em>
        </div>
        <p className={styles["print-disclaimer-small"]}>{result.disclaimer}</p>
        <footer className={styles["print-footer"]}>{text.footer}</footer>
      </Page>
      {alerts.length > 5 || result.constraints.length || result.productChecks.length ? (
        <Page generatedAt={generatedAt} headerTitle={text.interiorBrief}>
          {alerts.length > 5 ? (
            <section>
              <h2 className={styles["print-inline-heading"]}>{text.alerts}</h2>
              <ul className={styles["print-alert-list"]}>{alerts.slice(5).map((item) => (
                <li key={item.text}><span>{item.category}</span><p>{item.text}</p></li>
              ))}</ul>
            </section>
          ) : null}
          {result.constraints.length ? (
            <section>
              <h2 className={styles["print-inline-heading"]}>{locale === "es" ? "Limitaciones identificadas" : "Limitations identified"}</h2>
              <p className={styles["print-copy"]}>{result.methodologyNote}</p>
              <ul className={styles["print-alert-list"]}>{result.constraints.map((item) => (
                <li key={item.id}>
                  <span>{item.label} · {({ general: { es: "Base financiera general", en: "General financial base" }, capital: { es: "Capital evaluado", en: "Capital assessed" }, product: { es: "Producto", en: "Product" }, learning: { es: "Aprendizaje", en: "Learning" } })[item.scope][locale]}</span>
                  <p>{item.note}</p>
                </li>
              ))}</ul>
              <p className={styles["print-disclaimer-small"]}>{result.disclaimer}</p>
            </section>
          ) : null}
          {result.productChecks.length ? (
            <section>
              <h2 className={styles["print-inline-heading"]}>{locale === "es" ? "Comprobaciones por producto" : "Product-specific checks"}</h2>
              <p className={styles["print-copy"]}>{result.experience.note}</p>
              <ul className={styles["print-alert-list"]}>{result.productChecks.map((item) => (
                <li key={item.product}><span>{item.label}</span><p>{item.response}</p><p>{item.note}</p></li>
              ))}</ul>
            </section>
          ) : null}
        </Page>
      ) : null}
    </article>
  );
}
