"use client";

import { useMemo, useState } from "react";
import {
  HISTORICAL_REPLAY_WINDOWS, analyzePortfolio, changeHolding, concentrationMetrics, covarianceStress,
  directStress, historicalReplay, portfolioRisk, removeHolding, type ReplayWindowId, type HistoryObservation, type Holding,
} from "@/lib/portfolio-fragility/engine";
import { buildDemoHistory, DEMO_HOLDINGS, parseHistoryCsv, parsePortfolioText } from "@/lib/portfolio-fragility/demo-data";

type Locale = "es" | "en";
const copy = {
  es: {
    eyebrow: "Laboratorio cuantitativo · metodología PFL v0.1",
    title: "¿Dónde es más frágil este portafolio de lo que parece?",
    subtitle: "Detecta concentración de capital y de comportamiento histórico antes de explorar el porqué.",
    demo: "Probar ejemplo en un clic", paste: "Pegar activos + pesos", analyze: "Analizar portafolio",
    inputHint: "Una línea por activo: TICKER PESO. No necesitas valor absoluto.",
    history: "Histórico local opcional", historyHint: "CSV: date, asset, value, currency, return_basis. Se procesa solo en este navegador.",
    privacy: "Privado por defecto: sin cuenta, sin subida al servidor, sin almacenamiento y sin telemetría del portafolio.",
    demoLabel: "DEMOSTRACIÓN · DATOS INCLUIDOS", localLabel: "DATOS SUMINISTRADOS POR EL USUARIO", demoRows: "observaciones incluidas", localRows: "observaciones locales",
    first: "Primera lectura", why: "Por qué", deep: "Análisis profundo", whatIf: "Qué pasaría si", stress: "Stress hipotético", replay: "Replay histórico", premortem: "Pre-mortem",
    unavailable: "No disponible con estos datos", holdingsClusters: "activos → grupos", largestCluster: "del portafolio está dentro de un solo grupo de comportamiento histórico.",
    capitalOnly: "La concentración de capital sí puede calcularse. Para una lectura de comportamiento, riesgo, drawdown y replay hace falta histórico compatible.",
    hhi: "HHI", effective: "Posiciones efectivas", top: "Mayor peso", volatility: "Volatilidad anual", diversification: "Ratio de diversificación", drawdown: "Drawdown máximo",
    observable: "Los grupos describen co-movimiento observado. No son causas, factores económicos probados ni apuestas independientes.",
    remove: "Eliminar activo", change: "Cambiar peso", target: "Nuevo peso", before: "Antes", after: "Después",
    counterText: "Si el peso cambia, estos resultados medidos cambian así. No es una recomendación.",
    scenario: "Nombre del escenario", shock: "Shock directo", vol: "Multiplicador de volatilidad", corr: "Convergencia de correlación", custom: "Escenario configurable por el usuario",
    hypothetical: "HIPOTÉTICO · SUPUESTOS CONFIGURABLES · NO ES PRONÓSTICO", historical: "HISTÓRICO · VENTANA VERSIONADA · NO ES UNA DEFINICIÓN UNIVERSAL",
    runReplay: "Calcular replay", noProxy: "No se usó proxy. Un activo sin cobertura queda NO DISPONIBLE; nunca se excluye ni se renormaliza en silencio.",
    premise: "¿Qué supuesto tendría que fallar para que el portafolio decepcione?", concentration: "¿Qué concentración dolería más si cambiaran las relaciones históricas?", loss: "¿Qué pérdida te haría revisar la tesis?", evidence: "¿Qué evidencia te haría revisar la asignación?",
    localOnly: "Estas respuestas viven solo en el estado de esta pestaña.", methodology: "Cálculos independientes en TypeScript conformes con el contrato PFL v0.1.0. Sin datos de mercado en vivo.",
    csvError: "No se pudo leer el CSV", csvInvalid: "Revisa encabezados, columnas, orden de fechas y filas duplicadas.", reset: "Limpiar histórico", loading: "Leyendo archivo…",
    asset: "Activo", return: "Retorno", observations: "Observaciones", group: "Grupo de comportamiento", next: "Entender por qué",
    digest: "Huella del contrato de conformidad",
    missingCoverage: "Faltan observaciones requeridas o una serie completa para uno o más activos. No se excluyó ninguna fecha, activo ni peso.",
    invalidInput: "El histórico contiene una fecha, valor, orden o duplicado inválido. Corrige los datos antes de continuar.",
    fxUnavailable: "Las series usan monedas distintas y no se suministró una conversión cambiaria explícita.",
    priceOnly: "El histórico de solo precio no se trata como retorno total sin consentimiento explícito.",
    assetNotExist: "Uno o más activos no existían durante esta ventana y no se autorizó ningún proxy.",
    insufficientObservations: "No hay suficientes observaciones alineadas para calcular esta lectura.",
    insufficientHoldings: "Los grupos de comportamiento requieren al menos tres posiciones con peso positivo. Las demás métricas históricas disponibles siguen siendo válidas.",
    gapped: "La ventana contiene un intervalo interno superior a siete días y el replay no está disponible.",
    zeroVolatility: "La contribución al riesgo no está disponible para un portafolio sin volatilidad medida.",
    invalidCounterfactual: "Este cambio de peso no puede calcularse con las posiciones actuales.",
    windows: {
      DOTCOM_TECH_UNWIND: "Caída tecnológica puntocom", GFC_HOUSING_CREDIT: "Crisis financiera global",
      COVID_CRASH: "Caída por COVID-19", INFLATION_RATES_2022: "Inflación y tasas 2022",
      "2022_EQUITY_DRAWDOWN_DIAGNOSTIC": "Diagnóstico de caída bursátil 2022",
    },
  },
  en: {
    eyebrow: "Quantitative lab · PFL v0.1 methodology",
    title: "Where is this portfolio more fragile than it looks?",
    subtitle: "Find capital and historical-behavior concentration first, then inspect why.",
    demo: "Try one-click example", paste: "Paste assets + weights", analyze: "Analyze portfolio",
    inputHint: "One holding per line: TICKER WEIGHT. No absolute portfolio value is needed.",
    history: "Optional local history", historyHint: "CSV: date, asset, value, currency, return_basis. It is processed only in this browser.",
    privacy: "Private by default: no account, server upload, storage, or portfolio telemetry.",
    demoLabel: "DEMONSTRATION · BUNDLED DATA", localLabel: "USER-SUPPLIED DATA", demoRows: "bundled observations", localRows: "local observations",
    first: "First insight", why: "Why", deep: "Deep analysis", whatIf: "What if", stress: "Hypothetical stress", replay: "Historical replay", premortem: "Pre-mortem",
    unavailable: "Unavailable with these data", holdingsClusters: "holdings → groups", largestCluster: "of the portfolio sits inside one historical-behavior group.",
    capitalOnly: "Capital concentration is available. Compatible history is required for behavior, risk, drawdown, and replay analysis.",
    hhi: "HHI", effective: "Effective holdings", top: "Largest weight", volatility: "Annual volatility", diversification: "Diversification ratio", drawdown: "Maximum drawdown",
    observable: "Groups describe observed co-movement. They are not causes, proven economic factors, or independent bets.",
    remove: "Remove holding", change: "Change weight", target: "New weight", before: "Before", after: "After",
    counterText: "If the weight changes, these measured outputs change as follows. This is not a recommendation.",
    scenario: "Scenario name", shock: "Direct shock", vol: "Volatility multiplier", corr: "Correlation convergence", custom: "User-configurable scenario",
    hypothetical: "HYPOTHETICAL · CONFIGURABLE ASSUMPTIONS · NOT A FORECAST", historical: "HISTORICAL · VERSIONED WINDOW · NOT A UNIVERSAL DEFINITION",
    runReplay: "Run replay", noProxy: "No proxy was used. Missing coverage remains UNAVAILABLE; assets are never silently excluded or renormalized.",
    premise: "What assumption would have to fail for this portfolio to disappoint?", concentration: "Which concentration would hurt most if historical relationships changed?", loss: "What loss would cause you to revisit the thesis?", evidence: "What evidence would make you revisit the allocation?",
    localOnly: "These answers exist only in this tab's session state.", methodology: "Independent TypeScript calculations conforming to the PFL v0.1.0 contract. No live market data.",
    csvError: "The CSV could not be read", csvInvalid: "Check headers, columns, date order, and duplicate rows.", reset: "Clear history", loading: "Reading file…",
    asset: "Asset", return: "Return", observations: "Observations", group: "Behavior group", next: "See why",
    digest: "Conformance contract digest",
    missingCoverage: "Required observations or a complete series are missing for one or more assets. No date, asset, or weight was excluded.",
    invalidInput: "The history contains an invalid date, value, order, or duplicate. Correct the data before continuing.",
    fxUnavailable: "Series use different currencies and no explicit currency conversion was supplied.",
    priceOnly: "Price-only history is not treated as total return without explicit consent.",
    assetNotExist: "One or more assets did not exist during this window and no proxy was authorized.",
    insufficientObservations: "There are not enough aligned observations to calculate this reading.",
    insufficientHoldings: "Behavior groups require at least three positive-weight holdings. Other available historical metrics remain valid.",
    gapped: "The window contains an internal interval longer than seven days, so replay is unavailable.",
    zeroVolatility: "Risk contribution is unavailable for a portfolio with no measured volatility.",
    invalidCounterfactual: "This weight change cannot be calculated with the current holdings.",
    windows: {
      DOTCOM_TECH_UNWIND: "Dot-com technology unwind", GFC_HOUSING_CREDIT: "Global financial crisis",
      COVID_CRASH: "COVID-19 crash", INFLATION_RATES_2022: "Inflation and rates 2022",
      "2022_EQUITY_DRAWDOWN_DIAGNOSTIC": "2022 equity drawdown diagnostic",
    },
  },
} as const;

const card = "rounded-[6px] border border-line bg-white/80 p-4 shadow-[0_10px_28px_rgba(11,52,54,0.035)]";
const button = "inline-flex min-h-11 items-center justify-center rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol focus-visible:outline focus-visible:outline-2 focus-visible:outline-petrol";
const field = "min-h-11 w-full rounded-[4px] border border-line bg-white px-3 py-2 text-sm text-ink focus:border-petrol focus:outline-none";

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className={card}><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p><p className="mt-2 text-2xl font-semibold text-ink">{value}</p>{detail ? <p className="mt-2 text-xs leading-5 text-muted">{detail}</p> : null}</div>;
}
function UnavailableState({ title, message, code }: { title: string; message: string; code?: string }) {
  return <div className="rounded-[6px] border border-dashed border-brass/45 bg-[#f8f3e9] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brass">{title}{code ? " · " + code : ""}</p><p className="mt-3 text-sm leading-6 text-muted">{message}</p></div>;
}
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-24 border-t border-line py-8 md:py-10"><h2 className="text-2xl font-semibold text-ink md:text-3xl">{title}</h2><div className="mt-5">{children}</div></section>;
}

export function PortfolioFragilityLab({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const formatLocale = locale === "es" ? "es-ES" : "en-US";
  const pct = (value: number) => new Intl.NumberFormat(formatLocale, { style: "percent", maximumFractionDigits: 1 }).format(value);
  const number = (value: number) => new Intl.NumberFormat(formatLocale, { maximumFractionDigits: 2 }).format(value);
  const [portfolioText, setPortfolioText] = useState("SPY 35\nQQQ 35\nTLT 20\nGLD 10");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [history, setHistory] = useState<HistoryObservation[]>([]);
  const [mode, setMode] = useState<"empty" | "demo" | "local">("empty");
  const [csvError, setCsvError] = useState(""); const [loading, setLoading] = useState(false);
  const [operation, setOperation] = useState<"remove" | "change">("change"); const [selected, setSelected] = useState("SPY"); const [target, setTarget] = useState(20);
  const [episode, setEpisode] = useState<ReplayWindowId>("COVID_CRASH"); const [scenarioName, setScenarioName] = useState<string>(t.custom);
  const [shocks, setShocks] = useState<Record<string, number>>({}); const [volMultiplier, setVolMultiplier] = useState(1); const [lambda, setLambda] = useState(0);
  const [notes, setNotes] = useState(["", "", "", ""]);
  function explainUnavailable(result: { reason_code: string }) {
    switch (result.reason_code) {
      case "MISSING_EPISODE_COVERAGE": return t.missingCoverage;
      case "INVALID_INPUT": return t.invalidInput;
      case "FX_UNAVAILABLE": return t.fxUnavailable;
      case "UNADJUSTED_PRICE":
      case "UNAVAILABLE_PRICE_ONLY": return t.priceOnly;
      case "ASSET_NOT_EXIST": return t.assetNotExist;
      case "INSUFFICIENT_OBSERVATIONS": return t.insufficientObservations;
      case "INSUFFICIENT_HOLDINGS": return t.insufficientHoldings;
      case "GAPPED_SERIES": return t.gapped;
      case "ZERO_PORTFOLIO_VOLATILITY": return t.zeroVolatility;
      case "INVALID_COUNTERFACTUAL": return t.invalidCounterfactual;
      default: return t.capitalOnly;
    }
  }
  function revealFirstInsight() {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      document.getElementById("first-insight")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  }
  const analysis = useMemo(() => holdings.length ? analyzePortfolio(holdings, history) : null, [holdings, history]);
  const normalized = analysis?.status === "OK" && analysis.normalization.status === "OK" ? analysis.normalization : null;
  const concentration = analysis?.status === "OK" && analysis.concentration.status === "OK" ? analysis.concentration : null;
  const historical = analysis?.status === "OK" ? analysis.history : null;
  const counterfactual = useMemo(() => {
    if (!normalized) return null;
    return operation === "remove" ? removeHolding(normalized.asset_ids, normalized.normalized_weights, selected) : changeHolding(normalized.asset_ids, normalized.normalized_weights, selected, target / 100);
  }, [normalized, operation, selected, target]);
  const counterMetrics = counterfactual?.status === "OK" ? concentrationMetrics(counterfactual.asset_ids, counterfactual.normalized_weights) : null;
  const counterRisk = counterfactual?.status === "OK" && historical?.status === "OK" && historical.covariance.status === "OK" ? portfolioRisk(counterfactual.asset_ids, counterfactual.normalized_weights, historical.covariance.covariance_annual) : null;
  const direct = normalized ? directStress(normalized.asset_ids, normalized.normalized_weights, normalized.asset_ids.map((id) => (shocks[id] ?? 0) / 100)) : null;
  const covariance = normalized && historical?.status === "OK" && historical.covariance.status === "OK" && historical.correlation.status === "OK"
    ? covarianceStress(normalized.asset_ids, normalized.normalized_weights, historical.covariance.volatility_annual, historical.correlation.correlation, normalized.asset_ids.map(() => volMultiplier), lambda) : null;
  const replay = holdings.length ? historicalReplay(holdings, history, episode) : null;

  function runDemo() {
    setHoldings(DEMO_HOLDINGS); setHistory(buildDemoHistory()); setPortfolioText("SPY 35\nQQQ 35\nTLT 20\nGLD 10"); setMode("demo");
    setSelected("SPY"); setTarget(20); setShocks({ SPY: -20, QQQ: -30, TLT: 5, GLD: 4 }); setVolMultiplier(1.35); setLambda(0.35); setCsvError(""); revealFirstInsight();
  }
  function runLocal() { const parsed = parsePortfolioText(portfolioText); setHoldings(parsed); setHistory([]); setMode("local"); setSelected(parsed[0]?.assetId ?? ""); setShocks({}); setVolMultiplier(1); setLambda(0); revealFirstInsight(); }
  async function upload(file?: File) {
    if (!file) return; setLoading(true); setCsvError("");
    try { setHistory(parseHistoryCsv(await file.text())); setMode("local"); revealFirstInsight(); } catch { setCsvError(t.csvInvalid); }
    finally { setLoading(false); }
  }

  const cluster = historical?.status === "OK" && historical.clustering.status === "OK" ? historical.clustering : null;
  const risk = historical?.status === "OK" && historical.risk.status === "OK" ? historical.risk : null;
  const drawdown = historical?.status === "OK" && historical.drawdown.status === "OK" ? historical.drawdown : null;
  return <div className="mx-auto max-w-7xl px-4 py-8 md:px-5 md:py-12">
    <header className="rounded-[8px] border border-line bg-[linear-gradient(135deg,#f7f3e8_0%,#eef5f2_100%)] px-5 py-8 md:px-8 md:py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">{t.eyebrow}</p>
      <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">{t.title}</h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-muted md:text-lg">{t.subtitle}</p>
      <div className="mt-7 grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
        <button type="button" className={button + " w-full"} onClick={runDemo}>{t.demo}</button>
        <div className={card}>
          <label className="text-sm font-semibold text-ink" htmlFor="pfl-portfolio">{t.paste}</label>
          <textarea id="pfl-portfolio" className={field + " mt-2 min-h-28 font-mono"} value={portfolioText} onChange={(event) => setPortfolioText(event.target.value)} />
          <p className="mt-2 text-xs leading-5 text-muted">{t.inputHint}</p>
          <button type="button" className={button + " mt-3 w-full sm:w-auto"} onClick={runLocal}>{t.analyze}</button>
        </div>
      </div>
      <div className="mt-4 rounded-[5px] border border-petrol/15 bg-white/65 p-4 text-xs leading-5 text-muted"><strong className="text-petrol">{t.privacy}</strong></div>
    </header>

    {analysis ? <>
      <div className="mt-6 flex flex-wrap items-center gap-2"><span className="rounded-full border border-brass/35 bg-[#f8f3e9] px-3 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-brass">{mode === "demo" ? t.demoLabel : t.localLabel}</span>{history.length ? <span className="text-xs text-muted">{history.length.toLocaleString(formatLocale)} {mode === "demo" ? t.demoRows : t.localRows}</span> : null}</div>
      <Section id="first-insight" title={t.first}>
        {analysis.status === "UNAVAILABLE" ? <UnavailableState title={t.unavailable} code={analysis.reason_code} message={explainUnavailable(analysis)} /> : cluster ? <div className="rounded-[7px] border border-petrol/25 bg-[#e9f2ef] p-6 md:p-8"><p className="max-w-4xl text-3xl font-semibold leading-tight text-petrol md:text-5xl">{pct(cluster.largest_cluster_capital_share)} {t.largestCluster}</p><p className="mt-4 text-sm font-semibold text-muted">{cluster.holding_count} {t.holdingsClusters} {cluster.cluster_count}</p><a className={button + " mt-6 w-full sm:w-auto"} href="#why">{t.next} ↓</a></div> : <UnavailableState title={t.unavailable} code={historical?.status === "UNAVAILABLE" ? historical.reason_code : historical?.status === "OK" && historical.clustering.status === "UNAVAILABLE" ? historical.clustering.reason_code : undefined} message={historical?.status === "UNAVAILABLE" ? explainUnavailable(historical) : historical?.status === "OK" && historical.clustering.status === "UNAVAILABLE" ? explainUnavailable(historical.clustering) : t.capitalOnly} />}
      </Section>
      <Section id="why" title={t.why}>
        {cluster ? <><div className="grid gap-3 md:grid-cols-2">{cluster.clusters.map((group) => <div className={card} key={group.cluster_id}><div className="flex items-center justify-between gap-4"><p className="font-semibold text-ink">{t.group} {group.cluster_id.split("_").at(-1)}</p><p className="text-xl font-semibold text-petrol">{pct(group.capital_weight)}</p></div><p className="mt-3 text-sm text-muted">{group.asset_ids.join(" · ")}</p></div>)}</div><p className="mt-4 text-sm leading-6 text-muted">{t.observable}</p></> : <UnavailableState title={t.unavailable} message={historical?.status === "UNAVAILABLE" ? explainUnavailable(historical) : historical?.status === "OK" && historical.clustering.status === "UNAVAILABLE" ? explainUnavailable(historical.clustering) : t.capitalOnly} />}
      </Section>
      <Section id="deep-analysis" title={t.deep}>
        {concentration ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Metric label={t.hhi} value={number(concentration.hhi)} /><Metric label={t.effective} value={number(concentration.effective_holdings)} /><Metric label={t.top} value={pct(concentration.top_n_concentration?.["1"] ?? 0)} />{risk ? <><Metric label={t.volatility} value={pct(risk.portfolio_volatility)} /><Metric label={t.diversification} value={number(risk.diversification_ratio)} /></> : null}{drawdown ? <Metric label={t.drawdown} value={pct(drawdown.maximum_drawdown as number)} /> : null}</div> : null}
        {!risk ? <div className="mt-4"><UnavailableState title={t.unavailable} code={historical?.status === "UNAVAILABLE" ? historical.reason_code : historical?.status === "OK" && historical.risk.status === "UNAVAILABLE" ? historical.risk.reason_code : undefined} message={historical?.status === "UNAVAILABLE" ? explainUnavailable(historical) : historical?.status === "OK" && historical.risk.status === "UNAVAILABLE" ? explainUnavailable(historical.risk) : t.capitalOnly} /></div> : <div className="mt-5 min-w-0 overflow-x-auto"><table className="w-full table-fixed text-left text-xs sm:text-sm"><thead><tr className="border-b border-line text-xs text-muted"><th className="p-2">{t.asset}</th><th className="p-2">MCR</th><th className="p-2">CCR</th><th className="p-2">PCR</th></tr></thead><tbody>{normalized?.asset_ids.map((id, index) => <tr className="border-b border-line/60" key={id}><th className="p-2 text-ink">{id}</th><td className="p-2">{number(risk.marginal_contribution[index])}</td><td className="p-2">{number(risk.component_contribution[index])}</td><td className="p-2">{pct(risk.percentage_contribution[index])}</td></tr>)}</tbody></table></div>}
        <div className={card + " mt-5"}><label className="text-sm font-semibold text-ink" htmlFor="pfl-history">{t.history}</label><input id="pfl-history" type="file" accept=".csv,text/csv" className="mt-3 block w-full text-sm text-muted file:mr-4 file:rounded-[4px] file:border-0 file:bg-petrol file:px-4 file:py-2 file:text-white" onChange={(event) => void upload(event.target.files?.[0])} /><p className="mt-2 text-xs leading-5 text-muted">{loading ? t.loading : t.historyHint}</p>{csvError ? <p role="alert" className="mt-2 text-sm text-red-700">{t.csvError}: {csvError}</p> : null}{history.length && mode === "local" ? <button className="mt-3 text-sm font-semibold text-petrol underline" type="button" onClick={() => setHistory([])}>{t.reset}</button> : null}</div>
      </Section>
      <Section id="what-if" title={t.whatIf}>
        {normalized ? <><p className="mb-4 text-sm leading-6 text-muted">{t.counterText}</p><div className="grid gap-3 sm:grid-cols-3"><select className={field} value={operation} onChange={(event) => setOperation(event.target.value as "remove" | "change")}><option value="change">{t.change}</option><option value="remove">{t.remove}</option></select><select className={field} value={selected} onChange={(event) => setSelected(event.target.value)}>{normalized.asset_ids.map((id) => <option key={id}>{id}</option>)}</select>{operation === "change" ? <label className="text-xs text-muted">{t.target}: {target}%<input className="mt-1 w-full accent-petrol" type="range" min="0" max="100" value={target} onChange={(event) => setTarget(Number(event.target.value))} /></label> : <div />}</div>{counterMetrics?.status === "OK" && concentration ? <div className="mt-5 grid gap-3 sm:grid-cols-2"><Metric label={t.before + " · " + t.effective} value={number(concentration.effective_holdings)} detail={risk ? t.volatility + ": " + pct(risk.portfolio_volatility) : undefined} /><Metric label={t.after + " · " + t.effective} value={number(counterMetrics.effective_holdings)} detail={counterRisk?.status === "OK" ? t.volatility + ": " + pct(counterRisk.portfolio_volatility) : undefined} /></div> : <div className="mt-4"><UnavailableState title={t.unavailable} message={counterfactual?.status === "UNAVAILABLE" ? explainUnavailable(counterfactual) : t.capitalOnly} /></div>}</> : null}
      </Section>
      <Section id="stress" title={t.stress}>
        <div className="rounded-[6px] border-2 border-dashed border-brass/50 bg-[#fbf5e8] p-5"><p className="text-[10px] font-bold tracking-[0.16em] text-brass">{t.hypothetical}</p><label className="mt-4 block text-xs font-semibold text-muted">{t.scenario}<input className={field + " mt-1"} value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} /></label><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{normalized?.asset_ids.map((id) => <label className="text-xs text-muted" key={id}>{id} · {t.shock} %<input className={field + " mt-1"} type="number" min="-100" step="1" value={shocks[id] ?? 0} onChange={(event) => setShocks((current) => ({ ...current, [id]: Number(event.target.value) }))} /></label>)}</div><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-xs text-muted">{t.vol}: {volMultiplier.toFixed(2)}×<input className="mt-2 w-full accent-brass" type="range" min="0" max="3" step="0.05" value={volMultiplier} onChange={(event) => setVolMultiplier(Number(event.target.value))} /></label><label className="text-xs text-muted">{t.corr}: {pct(lambda)}<input className="mt-2 w-full accent-brass" type="range" min="0" max="1" step="0.05" value={lambda} onChange={(event) => setLambda(Number(event.target.value))} /></label></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Metric label={scenarioName + " · " + t.shock} value={direct?.status === "OK" ? pct(direct.portfolio_stress_return) : "—"} /><Metric label={t.vol} value={covariance?.status === "OK" ? pct(covariance.stressed_portfolio_volatility as number) : "—"} /></div></div>
      </Section>
      <Section id="replay" title={t.replay}>
        <div className="rounded-[6px] border-2 border-petrol/30 bg-[#eaf3f1] p-5"><p className="text-[10px] font-bold tracking-[0.16em] text-petrol">{t.historical}</p><select className={field + " mt-4 max-w-xl"} value={episode} onChange={(event) => setEpisode(event.target.value as ReplayWindowId)}>{Object.entries(HISTORICAL_REPLAY_WINDOWS).map(([id, window]) => <option value={id} key={id}>{t.windows[id as ReplayWindowId]} · {window.start} → {window.end}</option>)}</select><p className="mt-3 text-xs leading-5 text-muted">{t.noProxy}</p>{replay?.status === "OK" ? <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label={t.return} value={pct(replay.total_return as number)} /><Metric label={t.drawdown} value={pct((replay.drawdown as Record<string, number>).maximum_drawdown)} /><Metric label={t.observations} value={number(replay.observation_count as number)} /></div> : <div className="mt-5"><UnavailableState title={t.unavailable} code={replay?.status === "UNAVAILABLE" ? replay.reason_code : undefined} message={replay?.status === "UNAVAILABLE" ? explainUnavailable(replay) : t.capitalOnly} /></div>}</div>
      </Section>
      <Section id="premortem" title={t.premortem}>
        <div className="grid gap-4 md:grid-cols-2">{[t.premise, t.concentration, t.loss, t.evidence].map((prompt, index) => <label className={card + " text-sm font-semibold text-ink"} key={prompt}>{prompt}<textarea className={field + " mt-3 min-h-24 font-normal"} value={notes[index]} onChange={(event) => setNotes((current) => current.map((value, position) => position === index ? event.target.value : value))} /></label>)}</div><p className="mt-4 text-xs text-muted">{t.localOnly}</p>
      </Section>
      <footer className="border-t border-line py-6 text-xs leading-5 text-muted"><p>{t.methodology}</p><p className="mt-2 break-all">{t.digest}: 258ed43a62d88b1f568c0a8bafdbe9f2cc7e7a737a82b8f264bb9a5fa9cb42f6</p></footer>
    </> : null}
  </div>;
}
