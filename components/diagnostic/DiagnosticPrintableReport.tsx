"use client";

import type { DiagnosticLocale, DiagnosticResult, DiagnosticScoreKey, PaiDimension, PaiMainWeakness, PaiStage, ReadinessLight } from "@/lib/diagnostic/types";
import { DIAGNOSTIC_PROFILE_LABELS } from "@/lib/diagnostic/types";

const origin = "luiguiherrera.com";

const copy = {
  es: {
    alerts: "Alertas y tensiones principales",
    behavior: "Conducta",
    baseCapNote: "Aunque hay señales de comprensión inversora, la base de ingresos/liquidez limita la preparación para tomar más riesgo.",
    educationalNotice: "Lectura educativa generada desde tus respuestas. No constituye asesoramiento financiero, recomendación personalizada ni evaluación regulatoria formal.",
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
    knowledge: "Conocimiento validado",
    lossCapacity: "Capacidad de pérdida",
    mainWeakness: "Principal punto a reforzar",
    nextStep: "Siguiente paso educativo",
    noteReading: "Nota de lectura",
    observation: "Observación",
    orientation: "Perfil orientativo",
    profileNote: "El perfil orientativo resume patrones de respuesta. El perfil bajo presión pesa más cuando aparecen pérdidas, liquidez, tiempo y conducta.",
    profileTensions: "Perfil y tensiones principales",
    readinessSignal: "Semáforo de preparación",
    readinessSubtitle: "Primero estructura. Después exposición al riesgo.",
    route: "Ruta sugerida dentro de la web",
    routeNote: "Ábrela después de guardar este resumen para no perder tu resultado.",
    score: "score",
    stage: "Etapa",
    summary: "Resumen de preparación para invertir",
    underPressure: "Perfil bajo presión",
  },
  en: {
    alerts: "Main alerts and tensions",
    behavior: "Behavior",
    baseCapNote: "Although there are signs of investment understanding, the income/liquidity base limits readiness to take more risk.",
    educationalNotice: "Educational read generated from your answers. It is not financial advice, a personalized recommendation or a formal regulatory assessment.",
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
    knowledge: "Validated knowledge",
    lossCapacity: "Loss capacity",
    mainWeakness: "Main area to strengthen",
    nextStep: "Next educational step",
    noteReading: "Reading note",
    observation: "Observation",
    orientation: "Orientative profile",
    profileNote: "The orientative profile summarizes response patterns. The under-pressure profile matters more when losses, liquidity, time and behavior appear.",
    profileTensions: "Profile and main tensions",
    readinessSignal: "Readiness signal",
    readinessSubtitle: "Structure first. Risk exposure after.",
    route: "Suggested path inside the website",
    routeNote: "Open it after saving this summary so you do not lose your result.",
    score: "score",
    stage: "Stage",
    summary: "Investment readiness summary",
    underPressure: "Under-pressure profile",
  },
};

const stageLabels: Record<PaiStage, Record<DiagnosticLocale, string>> = {
  orden: { es: "Orden", en: "Order" },
  preparacion: { es: "Preparación", en: "Preparation" },
  expansion: { es: "Expansión", en: "Expansion" },
};

const lightLabels: Record<ReadinessLight, Record<DiagnosticLocale, string>> = {
  red: { es: "Primero ordenar", en: "Organize first" },
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
  emotionalTolerance: { es: "Tolerancia emocional", en: "Emotional tolerance" },
  patience: { es: "Paciencia", en: "Patience" },
  fomoSensitivity: { es: "Sensibilidad FOMO", en: "FOMO sensitivity" },
  euphoriaRisk: { es: "Riesgo de euforia", en: "Euphoria risk" },
  knowledgeValidated: { es: "Conocimiento validado", en: "Validated knowledge" },
  experienceReal: { es: "Experiencia real", en: "Real experience" },
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
  "Validado alto": "High validated",
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
    scores: ["incomeStability", "surplusCashFlow", "expensiveDebtControl", "liquidityStrength", "timeHorizon"],
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

function profileText(locale: DiagnosticLocale, profile: DiagnosticResult["profile"]) {
  return DIAGNOSTIC_PROFILE_LABELS[profile][locale];
}

function complexityText(locale: DiagnosticLocale, result: DiagnosticResult) {
  if (result.flags.includes("product_mismatch")) return complexityLabels.excessive[locale];
  return complexityLabels[result.complexity.band]?.[locale] ?? result.complexity.band;
}

function localizedResultLabel(locale: DiagnosticLocale, value: string) {
  return locale === "en" ? translatedResultLabels[value] ?? value : value;
}

function routeHref(locale: DiagnosticLocale, href: string) {
  if (locale === "es") return href;
  if (href === "/protege-tu-dinero") return "/en/protect-your-money";
  if (href === "/dashboard") return "/en/dashboard";
  if (href === "/niveles-estadisticos") return "/en/statistical-levels";
  if (href === "/mercado") return "/en/market";
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
    <div className="print-executive-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Page({ children, generatedAt, headerTitle, title }: { children: React.ReactNode; generatedAt?: Date; headerTitle?: string; title?: string }) {
  return (
    <section className="print-sheet">
      {headerTitle || title ? (
        <header className="print-section-header">
          <p>{origin}</p>
          {headerTitle ? <p>{headerTitle}</p> : null}
          {generatedAt ? <p>{formatShortDate(generatedAt)}</p> : null}
        </header>
      ) : null}
      {title ? (
        <header className="print-title-header">
          {title ? <h2>{title}</h2> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="print-bar-row">
      <div className="print-bar-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="print-bar-track">
        <div className="print-bar-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function KeyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-key-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function PaiScoreCard({ insight, label, score, status }: { insight: string; label: string; score: number; status: string }) {
  return (
    <div className="print-pai-card">
      <div className="print-pai-card-top">
        <span>{label}</span>
        <strong>{score}</strong>
      </div>
      <em>{status}</em>
      <div className="print-bar-track">
        <div className="print-bar-fill" style={{ width: `${score}%` }} />
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
  }).slice(0, 7).map((alert) => ({
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
  const capNote = result.paiReadiness.investingCappedByBase ? result.paiReadiness.baseLimitNote ?? text.baseCapNote : null;

  return (
    <article className="print-only diagnostic-print-report" aria-label={locale === "es" ? "Resumen educativo del diagnóstico" : "Educational diagnostic summary"}>
      <Page>
        <div className="print-cover">
          <section className="print-cover-hero">
            <div className="print-cover-topline">
              <p className="print-brand">{origin}</p>
              <p>{text.date}: {formatDate(locale, generatedAt)}</p>
            </div>
            <div className="print-cover-title">
              <h1>{text.investorDiagnostic}</h1>
              <p>{text.summary}</p>
            </div>
            <div className="print-cover-technical-line" />
          </section>
          <section className="print-cover-summary">
            <div className="print-cover-notice">
              <span>{locale === "es" ? "Nota educativa" : "Educational note"}</span>
              <p>{text.educationalNotice}</p>
            </div>
            <dl className="print-cover-executive-table">
              <ExecutiveItem label={text.orientation} value={profileText(locale, result.profile)} />
              <ExecutiveItem label={text.stage} value={stageLabels[result.paiReadiness.stage][locale]} />
              <ExecutiveItem label={text.readinessSignal} value={lightLabels[result.paiReadiness.light][locale]} />
              <ExecutiveItem label={text.mainWeakness} value={weaknessLabels[result.paiReadiness.mainWeakness][locale]} />
              <ExecutiveItem label={text.nextStep} value={result.paiReadiness.nextEducationalStep} />
            </dl>
          </section>
        </div>
      </Page>

      <Page generatedAt={generatedAt} headerTitle={text.interiorBrief} title={text.investmentReadiness}>
        <p className="print-kicker">{text.readinessSubtitle}</p>
        <p className="print-copy">{text.intro}</p>
        <div className="print-pai-row">
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
          <div className="print-reading-note">
            <span>{text.noteReading}</span>
            <p>{capNote}</p>
          </div>
        ) : null}
        <div className="print-wide-next-step">
          <span>{text.nextStep}</span>
          <p>{result.paiReadiness.nextEducationalStep}</p>
        </div>
        <p className="print-disclaimer-small">{text.disclaimer2}</p>
      </Page>

      <Page generatedAt={generatedAt} headerTitle={text.interiorBrief} title={text.profileTensions}>
        <div className="print-profile-layout">
          <div className="print-profile-summary">
            <p className="print-copy">{text.profileNote}</p>
            <div className="print-profile-main">
              <span>{text.orientation}</span>
              <strong>{profileText(locale, result.profile)}</strong>
            </div>
            <dl className="print-key-facts">
              <KeyFact label={text.underPressure} value={profileText(locale, result.pressureProfile)} />
              <KeyFact label={text.lossCapacity} value={localizedResultLabel(locale, result.lossCapacity.label)} />
              <KeyFact label={text.knowledge} value={localizedResultLabel(locale, result.knowledge.label)} />
              <KeyFact label={text.complexity} value={complexityText(locale, result)} />
            </dl>
          </div>
          <div className="print-alert-panel">
            <h3>{text.alerts}</h3>
            <ul className="print-alert-list">
              {alerts.map((alert, index) => (
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
        <div className="print-map-grid">
          {internalMapGroups.map((group) => (
            <div key={group.key} className="print-map-group">
              <h3>{text[group.key]}</h3>
              {group.scores.map((key) => (
                <ScoreBar key={key} label={scoreLabels[key][locale]} value={result.scores[key]} />
              ))}
            </div>
          ))}
        </div>
        <div className="print-route-card">
          <span>{text.route}</span>
          <strong>{result.route.label}</strong>
          <p>{result.route.note}</p>
          <p>{text.routeNote}</p>
          <em>{readableRoute(locale, result.route.href)}</em>
        </div>
        <footer className="print-footer">{text.footer}</footer>
      </Page>
    </article>
  );
}
