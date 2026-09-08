"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { HISTORICAL_REPLAY_WINDOWS, historicalReplay, type Unavailable, type ReplayWindowId } from "@/lib/portfolio-fragility/engine";
import { analyzePortfolioForDisplay, experimentResult, historyEvidence, largestPositions, scenarioResult } from "@/lib/portfolio-fragility/analysis-view";
import { buildDemoHistory, parseHistoryCsv } from "@/lib/portfolio-fragility/demo-data";
import { createFormatters, type Locale } from "@/lib/portfolio-fragility/format";
import { activeHistory, hasUnanalyzedChanges, initialSession, scenarioValues, sessionReducer, validateHistoryReplacement } from "@/lib/portfolio-fragility/session";
import { type PortfolioPreview } from "@/lib/portfolio-fragility/holdings-input";
import { p0Copy, type P0Copy } from "./copy";

const card = "min-w-0 rounded-md border border-line bg-white/85 p-4";
const button = "inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-petrol bg-petrol px-4 py-2 text-sm font-semibold text-white hover:bg-panel hover:text-petrol focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol disabled:cursor-not-allowed disabled:opacity-45";
const field = "min-h-11 min-w-0 w-full rounded border border-line bg-white px-3 py-2 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-petrol";
const details = "mt-3 text-sm leading-6 text-muted [&_summary]:min-h-11 [&_summary]:cursor-pointer [&_summary]:py-2 [&_summary]:font-semibold";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-title`} className="min-w-0 scroll-mt-24 border-t border-line py-8"><h2 id={`${id}-title`} tabIndex={-1} className="scroll-mt-24 text-2xl font-semibold text-ink focus:outline-petrol">{title}</h2><div className="mt-5 space-y-4">{children}</div></section>;
}
function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className={card}><p className="text-xs font-semibold text-muted">{label}</p><p className="mt-2 break-words text-2xl font-semibold text-ink">{value}</p>{detail && <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>}</div>;
}
function Compare({ title, before, after, delta, t }: { title: string; before: string; after: string; delta: string; t: P0Copy }) {
  return <div className={card}><h3 className="font-semibold text-ink">{title}</h3><dl className="mt-3 grid gap-3 sm:grid-cols-3">{[[t.baseline, before], [t.result, after], [t.change, delta]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 break-words text-lg font-semibold text-ink">{value}</dd></div>)}</dl></div>;
}
function reasonCopy(reason: Unavailable | null | undefined, t: P0Copy, supplied: boolean) {
  switch (reason?.reason_code) {
    case "MISSING_EPISODE_COVERAGE": return supplied ? t.missing : t.noHistory;
    case "INVALID_INPUT": return t.invalidHistory;
    case "FX_UNAVAILABLE": return t.fx;
    case "UNADJUSTED_PRICE": case "UNAVAILABLE_PRICE_ONLY": return t.price;
    case "INSUFFICIENT_OBSERVATIONS": return t.insufficient;
    case "INSUFFICIENT_HOLDINGS": return t.few;
    case "DEGENERATE_CORRELATION": case "ZERO_PORTFOLIO_VOLATILITY": return t.degenerate;
    case "GAPPED_SERIES": return t.gapReplay;
    case "ASSET_NOT_EXIST": return t.inception;
    case "INVALID_COUNTERFACTUAL": return t.invalidExperiment;
    default: return t.noHistory;
  }
}
function Limitation({ reason, t, supplied }: { reason?: Unavailable | null; t: P0Copy; supplied: boolean }) {
  return <div className="rounded border border-brass/40 bg-[#f8f3e9] p-4 text-sm leading-6 text-muted"><p>{reasonCopy(reason, t, supplied)}</p>{reason && <details className={details}><summary>{t.technical}</summary><p className="break-words font-mono text-xs">{reason.reason_code}</p><p className="break-words">{reason.affected_asset_ids.join(" · ")}</p></details>}</div>;
}
function Normalization({ preview, t, f }: { preview: PortfolioPreview; t: P0Copy; f: ReturnType<typeof createFormatters> }) {
  return <div className="rounded border border-petrol/20 bg-[#eef5f2] p-4 text-sm leading-6 text-ink">
    <p><strong>{t.entered}: {f.precise(preview.enteredTotal)}{preview.draft.unit === "percentages" ? " %" : ""}</strong> · {t.unit}: {t[preview.draft.unit]}</p>
    <p className="mt-1">{preview.rescaled ? t.rescale : preview.draft.unit === "percentages" ? t.unitConversion : preview.draft.unit === "relative" ? t.relativeRule : t.noRescale}</p>
    {preview.draft.unit === "relative" && preview.rescaled && <p>{t.relativeRule}</p>}
    {preview.engineNormalization && <p>{t.normalizationRecorded}</p>}
    <p className="mt-1"><strong>{t.finalTotal}: {f.precisePct(preview.normalizedTotal)}</strong></p>
  </div>;
}

export function PortfolioFragilityLab({ locale: initialLocale }: { locale: Locale }) {
  const pathname = usePathname();
  const locale: Locale = pathname === "/fragilidad-de-portafolio" ? "es" : pathname === "/en/portfolio-fragility" ? "en" : initialLocale;
  const t = p0Copy[locale]; const f = useMemo(() => createFormatters(locale), [locale]);
  const [state, dispatch] = useReducer(sessionReducer, initialLocale, initialSession);
  const readToken = useRef(0);
  const [notes, setNotes] = useState(["", "", "", ""]);

  // These two pages have different root layouts. Switch this same bilingual tool in place,
  // using Next's native History API integration. Only a static route is written, never user data.
  useEffect(() => {
    const paths = ["/en/portfolio-fragility", "/fragilidad-de-portafolio"];
    const switchLanguage = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || !paths.includes(location.pathname) || !paths.includes(url.pathname) || url.pathname === location.pathname) return;
      event.preventDefault(); event.stopImmediatePropagation(); window.history.pushState(null, "", url.pathname);
    };
    document.addEventListener("click", switchLanguage, true);
    return () => document.removeEventListener("click", switchLanguage, true);
  }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  const history = useMemo(() => activeHistory(state), [state.historyKind, state.importedHistory, state.demoHistory, state.portfolioSource]); // eslint-disable-line react-hooks/exhaustive-deps
  const analysis = useMemo(() => state.committed ? analyzePortfolioForDisplay(state.committed.holdings, history) : null, [state.committed, history]);
  const n = analysis?.status === "OK" && analysis.normalization.status === "OK" ? analysis.normalization : null;
  const capital = analysis?.status === "OK" && analysis.concentration.status === "OK" ? analysis.concentration : null;
  const h = analysis?.status === "OK" ? analysis.history : null;
  const group = h?.status === "OK" && h.clustering.status === "OK" ? h.clustering : null;
  const risk = h?.status === "OK" && h.risk.status === "OK" ? h.risk : null;
  const drawdown = h?.status === "OK" && h.drawdown.status === "OK" ? h.drawdown : null;
  const evidence = useMemo(() => historyEvidence(analysis, history), [analysis, history]);
  const synthetic = state.historyKind === "demo" || !!evidence?.synthetic || history.some((r) => /synthetic|sint[eé]tic/i.test(r.source + " " + r.provenance));
  const largest = n ? largestPositions(n.asset_ids, n.normalized_weights) : null;
  const stress = useMemo(() => n ? scenarioResult(n.asset_ids, n.normalized_weights, state.scenario, h) : null, [n, state.scenario, h]);
  const experiment = useMemo(() => experimentResult(analysis, state.experiment.operation, state.experiment.selected, state.experiment.target, state.scenario), [analysis, state.experiment, state.scenario]);
  const replay = useMemo(() => state.committed && state.requestedEpisode ? historicalReplay(state.committed.holdings, history, state.requestedEpisode) : null, [state.committed, history, state.requestedEpisode]);
  const historyFailure = h?.status === "UNAVAILABLE" ? h : h?.status === "OK" && h.clustering.status === "UNAVAILABLE" ? h.clustering : null;
  const unknowns = [!group && t.coMovement, !risk && t.contributions, !risk && t.diversification, !drawdown && t.drawdown, replay?.status !== "OK" && t.replay].filter(Boolean);
  const scenarioValid = !!n && !!scenarioValues(state.scenarioDraft, n.asset_ids);
  const pendingScenario = state.scenario.applied && (JSON.stringify(state.scenario.shocks) !== JSON.stringify(state.scenarioDraft.shocks) || state.scenario.multiplier !== state.scenarioDraft.multiplier || state.scenario.lambda !== state.scenarioDraft.lambda);
  const activeIds = new Set(n?.asset_ids ?? []); const loadedIds = [...new Set(history.map((r) => r.assetId))];
  const missingIds = [...activeIds].filter((id) => !loadedIds.includes(id)); const inactiveIds = loadedIds.filter((id) => !activeIds.has(id));
  const badge = synthetic ? <p className="rounded border border-brass/40 bg-[#fbf5e8] p-3 text-xs font-bold text-ink">{t.synthetic}</p> : null;

  function focusAfter(id: string) { requestAnimationFrame(() => { const el = document.getElementById(id); el?.focus({ preventScroll: true }); el?.scrollIntoView({ block: "start", behavior: "instant" }); }); }
  function preview() { dispatch({ type: "preview" }); requestAnimationFrame(() => focusAfter(document.getElementById("pfl-input-errors") ? "pfl-input-errors" : "pfl-preview-title")); }
  function commit() { readToken.current++; dispatch({ type: "commit" }); focusAfter("first-insight-title"); }
  async function upload(file?: File) {
    if (!file) return;
    const token = ++readToken.current; const request = state.importRequest + 1;
    dispatch({ type: "import-start" });
    try {
      const rows = parseHistoryCsv(await file.text()); validateHistoryReplacement(rows);
      if (token === readToken.current) dispatch({ type: "import-success", request, dataset: { rows, kind: "local", name: file.name } });
    } catch { if (token === readToken.current) dispatch({ type: "import-failure", request }); }
  }
  const sourceLabel = (value: string) => value === "User-supplied local CSV" ? t.sourceUnknown : value;
  const ppCompare = (title: string, before: number, after: number, beforeDetail = "", afterDetail = "", experimentLabel = false) => <Compare key={title} title={title} before={`${beforeDetail}${f.pct(before)}`} after={`${afterDetail}${f.pct(after)}`} delta={f.points(after - before)} t={experimentLabel ? { ...t, result: t.experimentResult } : t} />;

  return <div className="mx-auto min-w-0 max-w-6xl break-words px-4 py-8 text-ink md:px-6" data-pfl-locale={locale}>
    <header className="rounded-lg border border-line bg-[linear-gradient(135deg,#f7f3e8_0%,#eef5f2_100%)] p-4 sm:p-7">
      <p className="text-xs font-semibold tracking-wide text-brass">{t.eyebrow}</p><h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">{t.title}</h1><p className="mt-4 max-w-3xl leading-7 text-muted">{t.subtitle}</p>
      <div className="mt-6 space-y-4"><h2 className="text-xl font-semibold">{t.inputTitle}</h2><div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">{t.format}<select id="pfl-number-format" aria-label={t.format} className={field + " mt-2"} value={state.draft.numberFormat} onChange={(e) => dispatch({ type: "draft", draft: { ...state.draft, numberFormat: e.target.value as "dot" | "comma" } })}><option value="dot">{t.dot}</option><option value="comma">{t.comma}</option></select></label>
        <label className="text-sm font-semibold">{t.unit}<select id="pfl-weight-unit" aria-label={t.unit} className={field + " mt-2"} value={state.draft.unit} onChange={(e) => dispatch({ type: "draft", draft: { ...state.draft, unit: e.target.value as "percentages" | "fractions" | "relative" } })}>{(["percentages", "fractions", "relative"] as const).map((unit) => <option value={unit} key={unit}>{t[unit]}</option>)}</select></label>
      </div><label className="block text-sm font-semibold" htmlFor="pfl-portfolio">{t.input}</label><textarea id="pfl-portfolio" aria-describedby="pfl-input-hint" className={field + " min-h-32 font-mono"} value={state.draft.text} onChange={(e) => dispatch({ type: "draft", draft: { ...state.draft, text: e.target.value } })} /><p id="pfl-input-hint" className="text-sm leading-6 text-muted">{t.hint}</p>
        {!!state.issues.length && <div id="pfl-input-errors" role="alert" tabIndex={-1} className="rounded border border-red-300 bg-white p-4 text-sm text-red-800"><strong>{t.errors}</strong><ul className="mt-2 list-disc space-y-2 pl-5">{state.issues.map((issue, i) => <li key={i}>{issue.line ? `${t.line} ${issue.line}: ` : ""}{issue.code === "row" ? t.rowError : issue.code === "number" ? t.numberError : issue.code === "duplicate" ? t.duplicateError : issue.code === "empty" ? t.emptyError : t.rangeError}{issue.token ? ` (${issue.token})` : ""}</li>)}</ul></div>}
        <div className="flex flex-wrap gap-3"><button className={button} type="button" onClick={preview}>{t.preview}</button><button className={button + " bg-white !text-petrol"} type="button" onClick={() => { readToken.current++; dispatch({ type: "demo", history: buildDemoHistory() }); focusAfter("first-insight-title"); }}>{t.demo}</button></div>
      </div><p className="mt-5 text-xs leading-6 text-muted">{t.privacy}</p>
    </header>

    <div className="sr-only" role="status" aria-live="polite">{state.preview && state.preview !== state.committed ? t.previewAnnouncement : state.committed ? t.readyAnnouncement : ""}</div>
    {state.preview && <Section id="pfl-preview" title={t.previewTitle}><div className="grid gap-3 md:grid-cols-2">{state.preview.rows.map((row) => <article className={card} key={row.assetId}><dl className="grid grid-cols-1 gap-2 text-sm"><div><dt className="text-muted">{t.ticker}</dt><dd className="font-semibold">{row.assetId}</dd></div><div><dt className="text-muted">{t.original}</dt><dd className="break-all font-mono">{row.input}</dd></div><div><dt className="text-muted">{t.interpreted} · {t[state.preview!.draft.unit]}</dt><dd className="break-all">{f.precise(row.interpreted)}</dd></div><div><dt className="text-muted">{t.normalized}</dt><dd className="text-lg font-semibold">{f.previewPct(row.normalized)}</dd></div></dl>{row.interpreted === 0 && <p className="mt-2 text-xs">{t.zero}</p>}{row.originalId !== row.assetId && <p className="mt-2 text-xs">{row.originalId} → {row.assetId}. {t.identity}</p>}<details className={details}><summary>{t.precision}</summary><p className="break-all">{t.normalized}: {f.precise(row.normalized)} × 100%</p></details></article>)}</div><Normalization preview={state.preview} t={t} f={f} /></Section>}
    <button type="button" className={button + " my-5 w-full sm:w-auto"} disabled={!state.preview} onClick={commit}>{t.analyze}</button>
    {hasUnanalyzedChanges(state) && <p role="status" className="mb-5 rounded border border-brass/30 bg-[#fbf5e8] p-4 text-sm">{state.portfolioSource === "demo" ? t.demoPending : t.pending}</p>}

    {state.committed && n && capital && largest && <>
      <Section id="first-insight" title={t.first}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{state.portfolioSource === "demo" ? t.demoPortfolio : t.personal}</p>{badge}
        {group ? <div className="rounded-lg border border-petrol/25 bg-[#e9f2ef] p-4 sm:p-6"><p className="text-2xl font-semibold leading-tight text-petrol sm:text-4xl">{f.pct(group.largest_cluster_capital_share)} {t.historyHeadline}.</p><p className="mt-3 font-semibold">{group.holding_count} {t.holdings} → {group.cluster_count} {t.groups}</p><p className="mt-3"><strong>{t.members}:</strong> {group.clusters[0].asset_ids.join(" · ")}</p><p className="mt-3 text-sm leading-6">{t.observed}</p>{group.cluster_count === group.holding_count && <p className="mt-2 text-sm">{t.singletons}</p>}</div>
          : <div className="rounded-lg border border-petrol/25 bg-[#e9f2ef] p-4 sm:p-6"><p className="text-2xl font-semibold leading-tight text-petrol sm:text-4xl">{largest.ids.length > 1 ? t.tie : t.largestSentence}: {largest.ids.join(" · ")} — {f.pct(largest.weight)} {t.capitalShare}.</p><p className="mt-3">{n.asset_ids.length} {t.holdings} · {f.number(capital.effective_holdings)} {t.effective.toLowerCase()} · HHI {f.hhi(capital.hhi)}</p></div>}
        {evidence && <div className={card + " space-y-2 text-sm leading-6"}><h3 className="font-semibold">{t.evidence}</h3><p>{t.sample}: <strong>{evidence.start} → {evidence.end}</strong></p><p>{t.aligned}: <strong>{evidence.count}</strong></p><p>{t.basis}: <strong>{evidence.currency} · {t.totalReturn}</strong></p><p>{t.source}: {evidence.sources.map(sourceLabel).join(" · ")}</p><p>{synthetic ? t.synthetic : t.dataNature}</p><p>{t.allCapital}</p>{evidence.lowSample && <p>{t.lowSample}</p>}{!!evidence.gaps.length && <p>{t.gaps}: {evidence.gaps.join(", ")}</p>}<p>{t.sampleEnd}</p>{!synthetic && <p>{t.unknownMetadata}</p>}<details className={details}><summary>{t.provenance}</summary>{evidence.provenance.map((p) => <p key={p} className="break-words">{p}</p>)}</details></div>}
        {group && <div className="grid gap-3 sm:grid-cols-3"><Metric label={t.largest} value={`${largest.ids.join(" / ")} · ${f.pct(largest.weight)}`} /><Metric label={t.effective} value={f.number(capital.effective_holdings)} /><Metric label={t.hhi} value={f.hhi(capital.hhi)} /></div>}<p className="leading-7">{t.effectiveExplanation}</p><p className="text-sm leading-6 text-muted">{t.capitalEvidence}</p><details className={details}><summary>{t.technical}</summary><p>{t.hhiExplanation}</p><p>{t.effective}: {f.precise(capital.effective_holdings)}</p></details>
        <details className={details}><summary>{t.normalized}</summary><Normalization preview={state.committed} t={t} f={f} /><ul>{state.committed.rows.map((r) => <li key={r.assetId}>{r.assetId}: {f.precisePct(r.normalized)}{r.normalized === 0 ? ` · ${t.zero}` : ""}</li>)}</ul></details>
        {state.committed.rescaled && <Normalization preview={state.committed} t={t} f={f} />}
        {!!unknowns.length && <div className={card}><h3 className="font-semibold">{t.historyUnknown}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{unknowns.map((name) => <li key={String(name)}>{name}</li>)}</ul>{!group && <p className="mt-3 text-sm leading-6">{reasonCopy(historyFailure, t, !!history.length)}</p>}</div>}
        {!group && <p className="text-sm leading-6">{t.historyHelp}</p>}<div className="flex flex-wrap gap-3"><a className={button} href="#history-import">{t.addHistory}</a><a className={button + " bg-white !text-petrol"} href="#stress">{t.chooseStress}</a></div>
      </Section>

      <Section id="history-import" title={t.history}><label htmlFor="pfl-history" className="block text-sm font-semibold">{t.addHistory}</label><input className="block min-h-11 w-full min-w-0 text-sm file:mr-2 file:min-h-11 file:rounded file:border-0 file:bg-petrol file:px-3 file:text-white" id="pfl-history" type="file" accept=".csv,text/csv" aria-describedby="pfl-history-help" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} /><p id="pfl-history-help" className="text-sm leading-6 text-muted">{t.historyHint}</p><p className="text-sm leading-6">{t.historyLimit}</p><div role="status" className="text-sm leading-6">{state.loading ? t.loading : state.historyNotice ? t[state.historyNotice] : ""}</div>{state.importError && <p role="alert" className="rounded border border-red-300 p-3 text-sm text-red-800">{t.importRejected}</p>}
        {state.historyKind === "local" && state.importedHistory && <p className="text-sm">{t.imported}: {state.importedHistory.name}</p>}{state.historyKind === "demo" && state.importedHistory && <p className="text-sm">{t.storedPersonal}</p>}
        {!!history.length && <div className={card + " space-y-2 text-sm"}><p>{t.activeSeries}: {loadedIds.filter((id) => activeIds.has(id)).join(" · ") || t.noMissing}</p><p>{t.missingSeries}: {missingIds.join(" · ") || t.noMissing}</p>{!!inactiveIds.length && <p>{t.inactiveSeries}: {inactiveIds.join(" · ")}</p>}<button className={button + " mt-2"} type="button" onClick={() => { readToken.current++; dispatch({ type: "clear-history" }); }}>{t.clear}</button></div>}
        {historyFailure && <Limitation reason={historyFailure} t={t} supplied={!!history.length} />}
      </Section>

      {group && <Section id="behaviour-groups" title={t.groups}><div className="grid gap-3 sm:grid-cols-2">{group.clusters.map((g, i) => <div key={g.cluster_id} className={card}><h3 className="font-semibold">{t.group} {i + 1} · {f.pct(g.capital_weight)}</h3><p className="mt-2">{g.asset_ids.join(" · ")}</p></div>)}</div></Section>}
      <Section id="risk" title={t.riskTitle}>{badge}{risk ? <>
        <div className="grid gap-3 sm:grid-cols-3"><Metric label={t.volatility} value={f.pct(risk.portfolio_volatility)} /><Metric label={t.ratio} value={f.number(risk.diversification_ratio)} />{drawdown && <Metric label={t.drawdown} value={f.pct(drawdown.maximum_drawdown as number)} />}</div><p className="text-sm leading-6">{t.riskExplanation}</p>
        <div className="grid gap-3 md:grid-cols-2">{n.asset_ids.map((id, i) => ({ id, i })).sort((a, b) => risk.percentage_contribution[b.i] - risk.percentage_contribution[a.i] || a.i - b.i).map(({ id, i }, rank) => <article key={id} className={card}><h3 className="font-semibold">{rank + 1}. {id}</h3><p className="text-xs text-muted">{t.riskRank}: {rank + 1}</p><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-muted">{t.capitalWeight}</dt><dd>{f.pct(n.normalized_weights[i])}</dd></div><div><dt className="text-muted">{t.volatilityShare}</dt><dd className="text-xl font-semibold">{f.signedPct(risk.percentage_contribution[i])}</dd></div><div><dt className="text-muted">{t.component}</dt><dd>{f.points(risk.component_contribution[i])}</dd></div></dl><p className="mt-3 text-sm leading-6">{risk.percentage_contribution[i] < 0 ? t.negative : t.positive}</p><details className={details}><summary>{t.technical}</summary><p>MCR: {f.precise(risk.marginal_contribution[i])}</p><p>CCR: {f.precise(risk.component_contribution[i])}</p><p>PCR: {f.precise(risk.percentage_contribution[i])}</p></details></article>)}</div>
      </> : <Limitation t={t} supplied={!!history.length} reason={h?.status === "UNAVAILABLE" ? h : h?.status === "OK" && h.risk.status === "UNAVAILABLE" ? h.risk : null} />}</Section>

      <Section id="stress" title={t.stress}><p className="font-semibold text-brass">{t.hypothetical}</p>{badge}<p className="text-sm">{t.neutral}</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{n.asset_ids.map((id) => <label className="text-sm" key={id}>{id} · {t.shock}<input data-shock={id} className={field + " mt-2"} type="text" inputMode="decimal" value={state.scenarioDraft.shocks[id] ?? "0"} onChange={(e) => dispatch({ type: "scenario-draft", scenario: { ...state.scenarioDraft, shocks: { ...state.scenarioDraft.shocks, [id]: e.target.value } } })} /></label>)}</div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">{t.volMultiplier}: {f.multiplier(state.scenarioDraft.multiplier)}<input className="block min-h-11 w-full accent-petrol" type="range" min="0" max="3" step="0.05" value={state.scenarioDraft.multiplier} onChange={(e) => dispatch({ type: "scenario-draft", scenario: { ...state.scenarioDraft, multiplier: Number(e.target.value) } })} /></label><label className="text-sm">{t.convergence}: {f.pct(state.scenarioDraft.lambda)}<input className="block min-h-11 w-full accent-petrol" type="range" min="0" max="1" step="0.05" value={state.scenarioDraft.lambda} onChange={(e) => dispatch({ type: "scenario-draft", scenario: { ...state.scenarioDraft, lambda: Number(e.target.value) } })} /></label></div>{!scenarioValid && <p role="alert" className="text-sm text-red-800">{t.stressInvalid}</p>}<button className={button} disabled={!scenarioValid} onClick={() => dispatch({ type: "apply-scenario" })}>{t.applyStress}</button>{pendingScenario && <p role="status" className="text-sm">{t.stressPending}</p>}
        {!state.scenario.applied ? <p className="text-sm">{t.noStress}</p> : <>
          <p className="text-sm"><strong>{t.appliedAssumptions}:</strong> {t.volMultiplier} {f.multiplier(state.scenario.multiplier)} · {t.convergence} {f.pct(state.scenario.lambda)}</p>
          {stress?.direct?.status === "OK" && <><Compare title={t.directTitle} before="100" after={f.number(stress.direct.stressed_portfolio_value_per_unit * 100)} delta={f.signedPct(stress.direct.portfolio_stress_return)} t={t} /><p className="text-sm"><strong>{t.why}:</strong> {t.directWhy}</p><ul className="space-y-2 text-sm">{n.asset_ids.map((id, i) => <li key={id}>{id}: {f.pct(n.normalized_weights[i])} × {state.scenario.shocks[id] ?? "0"}% → <strong>{f.points(stress.direct!.status === "OK" ? stress.direct!.asset_contributions[i] : 0)}</strong></li>)}</ul></>}
          {risk && stress?.covariance?.status === "OK" ? <>{ppCompare(t.covarianceTitle, risk.portfolio_volatility, stress.covariance.stressed_portfolio_volatility as number)}{stress.stressedRisk?.status === "OK" && <Compare title={t.ratio} before={f.number(risk.diversification_ratio)} after={f.number(stress.stressedRisk.diversification_ratio)} delta={f.number(stress.stressedRisk.diversification_ratio - risk.diversification_ratio)} t={t} />}<p className="text-sm leading-6"><strong>{t.why}:</strong> {t.correlationWhy}</p>{state.scenario.multiplier === 1 && <p className="text-sm">{t.correlationOnly}</p>}{state.scenario.lambda === 1 && <p className="text-sm">{t.fullConvergence}</p>}{n.asset_ids.length > 1 && h?.status === "OK" && h.correlation.status === "OK" && <p className="text-sm">{t.pair}: {n.asset_ids[0]} / {n.asset_ids[1]} · {f.number(h.correlation.correlation[0][1])} → {f.number((stress.covariance.stressed_correlation as number[][])[0][1])}</p>}<p className="text-sm">{t.correlationFormula}</p></> : <Limitation t={t} supplied={!!history.length} reason={h?.status === "UNAVAILABLE" ? h : null} />}
          <p className="text-sm leading-6">{t.separateStress}</p>
        </>}
      </Section>

      <Section id="what-if" title={t.whatIf}><p className="font-semibold text-brass">{t.experiment}</p>{badge}<p className="text-sm leading-6">{t.experimentHelp}</p><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">{t.action}<select className={field + " mt-2"} value={state.experiment.operation} onChange={(e) => dispatch({ type: "experiment", experiment: { ...state.experiment, operation: e.target.value as "remove" | "change" } })}><option value="change">{t.setWeight}</option><option value="remove">{t.remove}</option></select></label><label className="text-sm">{t.asset}<select className={field + " mt-2"} value={state.experiment.selected} onChange={(e) => dispatch({ type: "experiment", experiment: { ...state.experiment, selected: e.target.value } })}>{n.asset_ids.map((id) => <option key={id}>{id}</option>)}</select></label>{state.experiment.operation === "change" && <label className="text-sm">{t.target}: {f.pct(state.experiment.target / 100)}<input className="min-h-11 w-full accent-petrol" type="range" min="0" max="100" value={state.experiment.target} onChange={(e) => dispatch({ type: "experiment", experiment: { ...state.experiment, target: Number(e.target.value) } })} /></label>}</div><p className="text-sm leading-6">{t.redistribution}</p>
        {experiment?.changed.status === "OK" && experiment.concentration?.status === "OK" && experiment.largest ? <><div className={card}><h3 className="font-semibold">{t.resulting}</h3><ul className="mt-3 space-y-1 text-sm">{experiment.changed.asset_ids.map((id, i) => <li key={id}>{id}: <strong>{f.previewPct(experiment.changed.status === "OK" ? experiment.changed.normalized_weights[i] : 0)}</strong></li>)}</ul></div>{ppCompare(t.largest, largest.weight, experiment.largest.weight, `${largest.ids.join(" / ")} · `, `${experiment.largest.ids.join(" / ")} · `, true)}<Compare title={t.effective} before={f.number(capital.effective_holdings)} after={f.number(experiment.concentration.effective_holdings)} delta={f.number(experiment.concentration.effective_holdings - capital.effective_holdings)} t={{ ...t, result: t.experimentResult }} />
          {group && experiment.groups?.status === "OK" ? <>{ppCompare(t.groupShare, group.largest_cluster_capital_share, experiment.groups.largest_cluster_capital_share, group.clusters[0].asset_ids.join(" / ") + " · ", experiment.groups.clusters[0].asset_ids.join(" / ") + " · ", true)}</> : <div className={card}><h3 className="font-semibold">{t.groupShare}</h3><p className="mt-2 text-sm">{reasonCopy(experiment.groups?.status === "UNAVAILABLE" ? experiment.groups : historyFailure, t, !!history.length)}</p></div>}
          {risk && experiment.risk?.status === "OK" ? ppCompare(t.volatility, risk.portfolio_volatility, experiment.risk.portfolio_volatility, "", "", true) : <div className={card}><h3 className="font-semibold">{t.volatility}</h3><p className="mt-2 text-sm">{reasonCopy(experiment.risk?.status === "UNAVAILABLE" ? experiment.risk : h?.status === "UNAVAILABLE" ? h : null, t, !!history.length)}</p></div>}
          {state.scenario.applied && stress?.direct?.status === "OK" && experiment.stress?.direct?.status === "OK" ? ppCompare(t.stressReturn, stress.direct.portfolio_stress_return, experiment.stress.direct.portfolio_stress_return, "", "", true) : <p className="text-sm">{t.chooseStressCompare}</p>}
          {state.scenario.applied && stress?.covariance?.status === "OK" && experiment.stress?.covariance?.status === "OK" && ppCompare(t.covarianceTitle, stress.covariance.stressed_portfolio_volatility as number, experiment.stress.covariance.stressed_portfolio_volatility as number, "", "", true)}<p className="text-sm leading-6 text-muted">{t.fixedSample}</p>
        </> : <Limitation t={t} supplied={!!history.length} reason={experiment?.changed.status === "UNAVAILABLE" ? experiment.changed : null} />}
      </Section>

      <Section id="replay" title={t.replay}>{badge}<p className="text-sm leading-6">{t.replaySemantics}</p><label className="block text-sm">{t.episode}<select className={field + " mt-2"} value={state.episode} onChange={(e) => dispatch({ type: "episode", episode: e.target.value as ReplayWindowId | "" })}><option value="">{t.selectEpisode}</option>{Object.entries(HISTORICAL_REPLAY_WINDOWS).map(([id, window]) => <option value={id} key={id}>{t.windows[id as ReplayWindowId]} · {window.start} → {window.end}</option>)}</select></label><button className={button} disabled={!state.episode} onClick={() => dispatch({ type: "run-replay" })}>{t.runReplay}</button>{!replay ? <p className="text-sm">{t.replayNotRequested}</p> : replay.status === "OK" ? <div className="grid gap-3 sm:grid-cols-3"><Metric label={t.return} value={f.pct(replay.total_return as number)} /><Metric label={t.drawdown} value={f.pct((replay.drawdown as Record<string, number>).maximum_drawdown)} /><Metric label={t.observations} value={f.number(replay.observation_count as number)} /></div> : <Limitation reason={replay} t={t} supplied={!!history.length} />}</Section>
      <Section id="premortem" title={t.premortem}><div className="grid gap-4 sm:grid-cols-2">{[t.premise, t.concentrationQuestion, t.lossQuestion, t.evidenceQuestion].map((prompt, i) => <label className={card + " text-sm font-semibold"} key={i}>{prompt}<textarea className={field + " mt-3 min-h-24 font-normal"} value={notes[i]} onChange={(e) => setNotes((current) => current.map((value, index) => index === i ? e.target.value : value))} /></label>)}</div><p className="text-xs text-muted">{t.localNotes}</p></Section>
    </>}
    <footer className="border-t border-line py-6 text-xs text-muted"><p>{t.methodology}</p><p className="mt-2 break-all">{t.digest}: 258ed43a62d88b1f568c0a8bafdbe9f2cc7e7a737a82b8f264bb9a5fa9cb42f6</p><a className="inline-flex min-h-11 min-w-11 items-center underline" href={locale === "en" ? "/fragilidad-de-portafolio" : "/en/portfolio-fragility"}>{locale === "en" ? "Español" : "English"}</a></footer>
  </div>;
}
