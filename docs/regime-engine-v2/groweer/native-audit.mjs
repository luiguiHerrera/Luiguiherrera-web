/** Groweer: preserved native satellites and V1 inventory, without canonical writes. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { evaluateRegime } from '../../../lib/regime-engine-v2/engine.ts';
import { normalizeYahoo, normalizeVixCsv, normalizeVxHistory, normalizeMonthlyCatalog, assembleVx, normalizeBtcTable, normalizeGldRows } from '../../../lib/regime-engine-v2/normalize.ts';
import { secondJuly2026AutomaticReadings, firstAugust2026AutomaticReadings, secondAugust2026AutomaticReadings, firstSeptember2026AutomaticReadings } from '../../../lib/reports/historical-automatic-readings.ts';

const dir = new URL('./', import.meta.url), root = new URL('../../../', dir), p8 = new URL('../p8/', dir);
const sha = b => createHash('sha256').update(b).digest('hex');
const json = (path, base = root) => JSON.parse(readFileSync(new URL(path, base)));
const fileRef = (path, field) => ({ path, field, sha256: sha(readFileSync(new URL(path, root))) });
const save = (name, value) => writeFileSync(new URL(name, dir), JSON.stringify(value, null, 2) + '\n');
const basePath = 'lib/reports/snapshots/primer-informe-septiembre-2026/';
const btcRaw = json(basePath + 'btc-source.json'), dashboard = json(basePath + 'dashboard-evidence.json');
const integrity = json(basePath + 'integrity.json');
for (const name of ['btc-source.json', 'dashboard-evidence.json', 'automatic.json']) assert.equal(sha(readFileSync(new URL(basePath + name, root))), integrity.files[name]);
const nativeMeta = { sourceVersion: 'p8-source-contract/1.0.0', capturedAt: null, availableAt: null, sourcePublishedAt: null, availabilityCertainty: 'UNKNOWN', replayClass: 'R2', status: 'AVAILABLE' };
const btc = normalizeBtcTable(btcRaw, { ...nativeMeta, sourceId: 'BTC_NATIVE' });
const gld = normalizeGldRows(dashboard.gldFlowPressure.history, { ...nativeMeta, sourceId: 'GLD_NATIVE' });
const sourceLedger = [];
function source(name) {
  const metadata = json(`evidence/${name}.metadata.json`, p8);
  const bytes = gunzipSync(readFileSync(new URL(`evidence/${name}.gz`, p8))).toString('utf8');
  assert.equal(sha(bytes), metadata.raw_sha256);
  sourceLedger.push({ path: `docs/regime-engine-v2/p8/evidence/${name}.gz`, rawSha256: metadata.raw_sha256 });
  return { bytes, metadata: { sourceVersion: 'p8-source-contract/1.0.0', capturedAt: metadata.captured_at, availableAt: metadata.available_at, availabilityCertainty: 'CONSERVATIVE_BOUND', sourcePublishedAt: null, vintageHash: metadata.raw_sha256, replayClass: 'R2', status: 'AVAILABLE' } };
}
const tickers = json('selection-protocol.json', p8).data_scope.core_universe;
const equities = {};
for (const ticker of [...tickers, 'SPY']) { const s = source(`yahoo-${ticker}.json`); equities[ticker] = normalizeYahoo(s.bytes, s.metadata, ticker); }
const vs = source('vix-history.csv'), vix = normalizeVixCsv(vs.bytes, vs.metadata);
const cs = source('cfe-contract-index.json'), catalog = normalizeMonthlyCatalog(json('evidence/selected-contracts.json', p8));
const histories = catalog.map(identity => { const s = source(`vx-${identity.expirationDate}.csv`); return normalizeVxHistory(s.bytes, identity, s.metadata); });
const calendar = equities.SPY.rows.map(r => r.observationDate).filter(d => d <= '2026-09-04').sort();
const accepted = new Map(json('docs/regime-engine-v2/sweeper/historical-r2-output.json').map(r => [r.date, r]));
function frame(date) {
  const index = calendar.indexOf(date); assert.ok(index >= 0);
  const sessions = calendar.slice(Math.max(0, index - 63), index + 1), wanted = new Set(sessions);
  const cal = { id: 'P8_SPY_OBSERVED_PROXY', version: 'p8-r2/1', kind: 'R2_OBSERVED_PROXY', timezone: 'America/New_York', replayClass: 'R2', availabilityCertainty: 'UNKNOWN', coverageStart: sessions[0], coverageEnd: date, completeIntervalCoverage: true, sessions: sessions.map(session => ({ session, closedAt: session + 'T23:59:59.999999Z' })) };
  return { mode: 'R2', asOf: date + 'T23:59:59.999999Z', equity: Object.fromEntries(tickers.map(t => [t, { ...equities[t], rows: equities[t].rows.filter(r => wanted.has(r.observationDate)) }])), vix: { ...vix, rows: vix.rows.filter(r => sessions.slice(-6).includes(r.observationDate)) }, vx: assembleVx(date, catalog, cs.metadata, histories), calendars: { equity: cal, vix: cal, vx: cal } };
}
const feature = (output, id) => output.evidence.find(r => r.featureId === id);
const decision = r => ({ regime: r.regime, systemState: r.systemState, pillarStates: r.pillarStates, concordance: r.concordance, uncertainty: r.uncertainty, plausibleRegimes: r.plausibleRegimes, features: r.diagnostics.coreFeatures, missing: r.diagnostics.missingReasons, dependency: r.diagnostics.dependencyContributions, ruleId: r.diagnostics.ruleId, replayClass: r.replayClass });
const coreBytes = input => JSON.stringify({ mode: input.mode, asOf: input.asOf, equity: input.equity, vix: input.vix, vx: input.vx, calendars: { equity: input.calendars.equity, vix: input.calendars.vix, vx: input.calendars.vx } });
function addNative(input) {
  const date = input.asOf.slice(0, 10), result = structuredClone(input);
  result.btc = { ...btc, rows: btc.rows.filter(r => r.observationDate <= date) };
  result.gld = { ...gld, rows: gld.rows.filter(r => r.observationDate <= date) };
  result.calendars.btc = { ...structuredClone(input.calendars.equity), id: 'GROWEER_BTC_SPY_OBSERVED_PROXY', version: 'groweer-native-r2/1' };
  result.calendars.gld = { ...structuredClone(input.calendars.equity), id: 'GROWEER_GLD_SPY_OBSERVED_PROXY', version: 'groweer-native-r2/1' };
  assert.equal(coreBytes(input), coreBytes(result));
  return result;
}
const nativeDates = btc.rows.map(r => r.observationDate);
const rows = [];
for (const date of nativeDates) {
  const input = frame(date), before = coreBytes(input), base = evaluateRegime(input), withNative = addNative(input), out = evaluateRegime(withNative);
  assert.equal(before, coreBytes(input)); assert.equal(before, coreBytes(withNative));
  assert.deepEqual(decision(out), decision(base)); assert.equal(base.regime, accepted.get(date).regime);
  assert.equal(base.diagnostics.inputHash, accepted.get(date).inputHash);
  const names = ['btc_daily', 'btc_rolling_5', 'btc_rolling_20', 'btc_breadth', 'btc_streak', 'gld_shares_change_1', 'gld_shares_change_5', 'gld_shares_change_20', 'gld_pressure_usd_5'];
  rows.push({ date, coreInputSha256: sha(before), acceptedCoreInputHash: base.diagnostics.inputHash, coreDecisionUnchanged: true, regime: out.regime, defaultDataQuality: out.dataQuality, optionalProblems: out.diagnostics.optionalProblems, evidence: Object.fromEntries(names.map(id => [id, feature(out, id)])) });
}
function signSeries(series) {
  const signs = series.map(r => ({ date: r.date, value: r.value, sign: typeof r.value === 'number' && Number.isFinite(r.value) ? Math.sign(r.value) : null }));
  const counts = { positive: 0, negative: 0, zero: 0, missing: 0 }, changes = [], runs = [];
  let eligiblePairs = 0;
  for (let i = 0; i < signs.length; i++) {
    const r = signs[i]; counts[r.sign === null ? 'missing' : r.sign > 0 ? 'positive' : r.sign < 0 ? 'negative' : 'zero']++;
    const prev = signs[i - 1], adjacent = prev && calendar.indexOf(r.date) === calendar.indexOf(prev.date) + 1;
    if (adjacent && r.sign !== null && prev.sign !== null) { eligiblePairs++; if (r.sign !== prev.sign) changes.push({ date: r.date, from: prev.sign, to: r.sign }); }
    if (r.sign === null) continue;
    if (adjacent && prev.sign === r.sign && runs.length) { const run = runs.at(-1); run.end = r.date; run.sessions++; }
    else runs.push({ start: r.date, end: r.date, sign: r.sign, sessions: 1 });
  }
  for (const run of runs) { const i = signs.findIndex(r => r.date === run.start), j = signs.findIndex(r => r.date === run.end); run.leftCensored = i === 0 || signs[i - 1].sign === null; run.rightCensored = j === signs.length - 1 || signs[j + 1].sign === null; }
  const durations = runs.map(r => r.sessions).sort((a, b) => a - b);
  const median = durations.length ? (durations[Math.floor((durations.length - 1) / 2)] + durations[Math.floor(durations.length / 2)]) / 2 : null;
  return { counts, eligiblePairs, signChanges: changes.length, signChangeRate: eligiblePairs ? changes.length / eligiblePairs : null, medianObservedSignRun: median, observedRuns: runs, changes, rows: signs };
}
const seriesFrom = (id, pick = x => x) => rows.map(r => ({ date: r.date, value: pick(r.evidence[id].value) }));
const btcDaily = signSeries(seriesFrom('btc_daily')), btc5 = signSeries(seriesFrom('btc_rolling_5')), btc20 = signSeries(seriesFrom('btc_rolling_20'));
const gld1 = signSeries(seriesFrom('gld_shares_change_1', x => x?.delta ?? null)), gld5 = signSeries(seriesFrom('gld_shares_change_5', x => x?.delta ?? null));
const paired = (a, b) => a.rows.map((r, i) => ({ date: r.date, first: r.sign, second: b.rows[i].sign })).filter(r => r.first !== null && r.second !== null);
const opposing = pairs => ({ pairs: pairs.length, oppositeNonzeroSigns: pairs.filter(r => r.first * r.second === -1).length, zeroVersusNonzero: pairs.filter(r => (r.first === 0) !== (r.second === 0)).length, examples: pairs.filter(r => r.first !== r.second) });
function contextChanges(series) {
  const dates = series.changes.map(change => { const i = rows.findIndex(r => r.date === change.date); return { ...change, priorRegime: rows[i - 1]?.regime ?? null, regime: rows[i].regime, regimeUnchanged: i > 0 && rows[i].regime === rows[i - 1].regime }; });
  return { signChanges: dates.length, whileRegimeUnchanged: dates.filter(r => r.regimeUnchanged).length, observations: dates, inference: 'Instrument-specific context can change while core regime is stable; descriptive distinction alone is not economic utility or statistical independence.' };
}
const fundCells = Object.values(btc.rows.flatMap(r => Object.values(r.funds)));
const sourceEvidence = {
  btc: { ...fileRef(basePath + 'btc-source.json', 'columns, rows[][], retrievedAt, retrievalMethod'), source: btcRaw.source, url: btcRaw.url, retrievalDate: btcRaw.retrievedAt, retrievalMethod: btcRaw.retrievalMethod, nativePacketHash: btc.vintageHash, sourceVersion: nativeMeta.sourceVersion, preservedRows: btc.rows.length, first: btc.rows[0].observationDate, last: btc.rows.at(-1).observationDate, currency: btc.currency, expectedFunds: btc.expectedFunds, totalFundCells: fundCells.length, observedZeroCells: fundCells.filter(v => v === 0).length, missingFundCells: fundCells.filter(v => v === null).length, partialFundRows: btc.rows.filter(r => r.coverage === 'PARTIAL').map(r => r.observationDate), missingTotalRows: btc.rows.filter(r => r.total === null).map(r => r.observationDate), derivedTotalRows: btc.rows.filter(r => r.totalDerived).map(r => r.observationDate), reconciliableCompleteFundRows: btc.rows.filter(r => r.reconciliationDifference !== null).length, maxAbsReconciliationDifference: Math.max(...btc.rows.map(r => Math.abs(r.reconciliationDifference ?? 0))), reconciliationNote: 'Observed totals match complete-fund sums up to floating-point arithmetic. The partial-fund row is not reconciliable from observed funds; reported total remains available and its missing cell is not zero.' },
  gld: { ...fileRef(basePath + 'dashboard-evidence.json', 'gldFlowPressure.history[].date/nav/sharesOutstanding/totalNetAssets'), source: dashboard.gldFlowPressure.source, url: dashboard.gldFlowPressure.sourceUrl, captureDate: integrity.capturedAt, originalWorkbookBytesPreserved: false, nativePacketHash: gld.vintageHash, sourceVersion: nativeMeta.sourceVersion, preservedRows: gld.rows.length, first: gld.rows[0].observationDate, last: gld.rows.at(-1).observationDate, missingNativeCells: gld.rows.flatMap(r => [r.shares, r.nav, r.aum]).filter(v => v === null).length, maxRelativeNavSharesAumDifference: Math.max(...gld.rows.map(r => Math.abs(r.nav * r.shares - r.aum) / r.aum)), availableOneSessionChanges: gld1.counts.positive + gld1.counts.negative + gld1.counts.zero, availableFiveSessionChanges: gld5.counts.positive + gld5.counts.negative + gld5.counts.zero, availableTwentySessionChanges: 0, requiredForTwentySessionDeltaAndCoherenceAudit: 21, presentationTwentyDayScalarExcluded: dashboard.gldFlowPressure.twentyDayShareChange },
};
const satellite = {
  version: 'groweer-native-audit/1.0.0', scope: 'Actual preserved parsed native rows; R2 only; no source fetch, no invented historical rows or publication timestamps. Small local sample cannot establish economic utility or noise frequency generally.',
  sourceEvidence, calendar: { definition: 'Existing observed SPY R2 dates as explicitly labeled source-session proxy, no official prospective calendar claim.', sessionGapsWithinNativeCoverage: { btc: calendar.filter(d => d >= btc.rows[0].observationDate && d <= btc.rows.at(-1).observationDate && !btc.rows.some(r => r.observationDate === d)), gld: calendar.filter(d => d >= gld.rows[0].observationDate && d <= gld.rows.at(-1).observationDate && !gld.rows.some(r => r.observationDate === d)) } },
  temporal: { replayClass: 'R2', pointInTimeOosClaim: false, exactCaptureTimeKnown: false, sourcePublishedAt: null, availableAt: null, currentSourceAvailabilityClaim: false, retrospectiveDatesAreNotAvailabilityTimes: true },
  btc: { verdict: 'KEEP', valueClass: 'CONTEXTUAL_ONLY', evidence: { daily: btcDaily, rolling5: btc5, rolling20: btc20, dailyVersusRolling5: opposing(paired(btcDaily, btc5)), dailyContextVersusCore: contextChanges(btcDaily), fiveSessionContextVersusCore: contextChanges(btc5) }, rationale: 'Reported subscriptions/redemptions provide a distinct instrument-specific demand context. Retain optional zero-vote evidence and missing-fund flags. This 25-session sample does not justify removal, promotion to market core, or a predictive claim.', maintenance: ['Preserve native nulls and expected fund-universe version', 'Capture source bytes/parsed extraction and actual availability time prospectively', 'Do not splice vendors or backfill sessions'] },
  gld: { verdict: 'KEEP', valueClass: 'CONTEXTUAL_ONLY', evidence: { deltaShares1: gld1, deltaShares5: gld5, dailyVersusFiveSession: opposing(paired(gld1, gld5)), dailyContextVersusCore: contextChanges(gld1), fiveSessionContextVersusCore: contextChanges(gld5) }, rationale: 'Native share changes differ economically from gold price/AUM changes and are useful named fund-pressure context. Keep the available 1/5-session evidence with the existing partial-coherence warning. Twenty retained rows cannot supply a 20-session delta. Inflow to gold is not intrinsically risk-on.', maintenance: ['Retain at least 21 native dated rows before claiming a full 20-session change/coherence audit', 'Preserve shares/NAV/AUM units and dated unit-event handling', 'Prospective capture requires official calendar and actual availability provenance'], reportedFundFlowClaim: false },
  narrativeValue: { measurement: 'Potential descriptive refresh opportunities from raw sign changes only. No new thresholds, confidence, headline rules or UI implementation.', actualV2NarrativeAssignmentsAvailable: false, impulseBrakeWatchFrequency: null, unavailableReason: 'The accepted API emits evidence; it does not define a mapping of BTC/GLD signs into Qué impulsa / Qué frena / Qué vigilar. No observed V2 narrative sequence exists.', btcDailySignRefreshOpportunities: btcDaily.signChanges, btcFiveSessionSignRefreshOpportunities: btc5.signChanges, gldOneSessionSignRefreshOpportunities: gld1.signChanges, gldFiveSessionSignRefreshOpportunities: gld5.signChanges, caveat: 'These are descriptive changes of sign, not counts of useful headline changes or noise; frequency denominators and missing-window handling are above. Gold-pressure signs must not be converted into equity-regime direction.' },
  coreIsolation: { publicApi: 'evaluateRegime', dates: rows.length, originalCoreBytesUnchanged: rows.length, exactAcceptedCoreInputHashes: rows.length, decisionFieldsUnchanged: rows.length, satelliteCoreVotes: 0 },
  observations: rows, canonicalEngineModified: false, publicUiChanged: false, rawCoreSources: sourceLedger,
};
save('satellite-review.json', satellite);

const qualityCases = [];
function qualityCase(id, input, expected, kind, notes) {
  const before = coreBytes(input), result = evaluateRegime(input); assert.equal(result.dataQuality, expected); assert.equal(coreBytes(input), before);
  qualityCases.push({ id, kind, date: input.asOf.slice(0, 10), expected, observed: result.dataQuality, profile: result.diagnostics.profile, regime: result.regime, systemState: result.systemState, replayClass: result.replayClass, sourceStatuses: Object.fromEntries(Object.entries(result.sourceStatus).map(([k, v]) => [k, v.status])), optionalProblems: result.diagnostics.optionalProblems, coreMissingReasons: result.diagnostics.missingReasons, evidence: Object.fromEntries(result.diagnostics.profile.map(id => [id, feature(result, id)])), coreInputSha256: sha(before), notes });
}
qualityCase('Q01_FROZEN_DEFAULT_LAST_DATE', json('docs/regime-engine-v2/sweeper/shadow-input-r2.json'), 'PARTIAL', 'PRESERVED_CANONICAL_INPUT', 'Actual accepted default input has complete core and absent satellite sources; vix percentile also lacks declared prefix.');
qualityCase('Q02_ACTUAL_NATIVE_DEFAULT_LAST_DATE', addNative(frame('2026-09-04')), 'PARTIAL', 'ACTUAL_NATIVE_R2_EXTENSION', 'All actual native satellite values are retained; 20-row GLD coherence audit remains partial and VIX percentile prefix remains unavailable.');
qualityCase('Q03_ACTUAL_BTC_FULL_PROFILE', { ...addNative(frame('2026-09-04')), optionalFeatures: ['btc_daily', 'btc_rolling_5'] }, 'COMPLETE', 'EXISTING_PUBLIC_OPTIONAL_PROFILE_WITH_ACTUAL_DATA', 'Existing API accepts an explicit optional profile. All this profile’s actual native observations are complete. This does not claim the initial four-feature profile is complete or recommend altering it.');
qualityCase('Q04_ACTUAL_BTC_PARTIAL_FUND_COVERAGE', { ...addNative(frame('2026-08-07')), optionalFeatures: ['btc_daily', 'btc_rolling_5'] }, 'PARTIAL', 'ACTUAL_NATIVE_MISSING_CELL', 'Farside EZBC dash remains missing while the reported total is still available. Same explicit profile as Q03; PARTIAL is meaningful without changing a regime.');
qualityCase('Q05_ACTUAL_BTC_WINDOW_START', { ...addNative(frame('2026-08-03')), optionalFeatures: ['btc_daily', 'btc_rolling_5'] }, 'PARTIAL', 'ACTUAL_PRESERVED_COVERAGE_EDGE', 'Actual first retained table row gives daily total but not five consecutive totals. Earlier table rows were not invented.');
qualityCase('Q06_ACTUAL_GLD_COHERENCE_WINDOW', { ...addNative(frame('2026-09-04')), optionalFeatures: ['gld_shares_change_5'] }, 'PARTIAL', 'ACTUAL_NATIVE_WINDOW_LIMIT', 'Five-session difference has six actual native rows, while the frozen 21-row coherence audit reports COHERENCE_AUDIT_PARTIAL.');
qualityCase('Q07_ACTUAL_CORE_COVERAGE_EDGE', frame('2018-06-19'), 'INSUFFICIENT', 'ACTUAL_P8_SOURCE_COVERAGE_EDGE_OUTSIDE_1930_BASELINE', 'The preserved Yahoo XLC series starts on this date. A single observed XLC close cannot supply the frozen 22/64-row core windows. No price was removed or invented; this is a source-history warmup example, not an added benchmark period.');
const quality = { version: 'groweer-native-quality/1.0.0', value: 'PASS', semanticsChanged: false, actualHistorical1930DefaultCounts: Object.fromEntries(['COMPLETE', 'PARTIAL', 'INSUFFICIENT'].map(k => [k, [...accepted.values()].filter(r => r.dataQuality === k).length])), actualNative25DefaultCounts: { COMPLETE: 0, PARTIAL: rows.length, INSUFFICIENT: 0 }, cases: qualityCases, verifiedCases: qualityCases.length,
  distinction: 'COMPLETE is quality relative to the active optional profile, not a count of every registry field. PARTIAL leaves an available core regime intact while optional evidence is absent or qualified; INSUFFICIENT means a frozen core input/window is unavailable.',
  initialDefaultCompleteObserved: false, initialDefaultCompleteLimitation: 'The preserved satellite sample contains only 20 GLD rows and the accepted six-row VIX input omits its declared percentile prefix. Do not fabricate a twenty-first GLD row to manufacture a COMPLETE default example.', initialDefaultCompleteContractuallyImpossible: false, feasibilityBasis: 'The frozen implementation requires an available reason-free value for each of four initial optionals. Twenty-one coherent native GLD rows, five complete BTC rows and a complete declared VIX percentile prefix would satisfy these finite requirements; this is a contract deduction, not an observed prospective event.',
  prospectivePartialConditions: ['Complete core before native satellite sources become available: zero carry keeps optional values absent', 'Reported BTC total available while at least one named fund is unreported: actual Q04 analogue', 'A newly retained source does not yet cover its required rolling window: actual Q05 analogue', 'GLD six-row five-session value exists before a complete 21-row coherence audit: actual Q06 analogue', 'An optional source calendar/availability contract cannot be established while core calendars remain valid'], prospectiveFrequency: null, prospectiveFrequencyReason: 'No R0 shadow sequence or actual publication/availability timestamps were collected here. R2 quality frequencies are coverage diagnostics, not live-service reliability estimates.', replayClass: 'R2', pointInTimeOosClaim: false, noSyntheticRows: true, canonicalEngineModified: false };
save('data-quality-audit.json', quality);

const v1Refs = [
  { id: 'segundo-informe-julio-2026', object: secondJuly2026AutomaticReadings, exportName: 'secondJuly2026AutomaticReadings', sourceVersion: 'immutable Vercel deployment commit ce32ff886f04d0a1fd36f9f73a0492a5718d2d23; retained TS comment', sourceEvidenceSha256Claim: 'd653ca10148456dcdf565c62aee0956e6005c92e84e5c00737c0aa575b3b9e70', capturedAt: null },
  { id: 'primer-informe-agosto-2026', object: firstAugust2026AutomaticReadings, exportName: 'firstAugust2026AutomaticReadings', sourceVersion: 'published dashboard snapshot retained in TS; comments identify capture on 2026-08-03 for 2026-07-31 cutoff', capturedAt: '2026-08-03' },
  { id: 'segundo-informe-agosto-2026', object: secondAugust2026AutomaticReadings, exportName: 'secondAugust2026AutomaticReadings', sourceVersion: 'published historical automatic reading retained in TS; source comments identify 2026-08-14 cutoff and 2026-08-16 capture', capturedAt: '2026-08-16' },
  { id: 'primer-informe-septiembre-2026', object: firstSeptember2026AutomaticReadings, exportName: 'firstSeptember2026AutomaticReadings', sourceVersion: 'immutable September report automatic.json; capture recorded in integrity.json', capturedAt: integrity.capturedAt },
];
const v1Rows = v1Refs.map(item => {
  const r = item.object, baseline = accepted.get(r.dataDate), isSeptember = item.id === 'primer-informe-septiembre-2026';
  const sources = isSeptember ? [fileRef(basePath + 'automatic.json', 'dataDate, regime, vix.asOf, btcEtfFlows.asOf, gldFlowPressure.asOf'), fileRef(basePath + 'integrity.json', 'capturedAt, files')] : [fileRef('lib/reports/historical-automatic-readings.ts', item.exportName)];
  return { reportId: item.id, date: r.dataDate, label: r.regime.label, regimeRecord: r.regime, sourceVersion: item.sourceVersion, capturedAt: item.capturedAt, sourceEvidenceSha256Claim: item.sourceEvidenceSha256Claim ?? null, sources, exactDatePairedToV2: !!baseline, v2RegimeOnExactDate: baseline?.regime ?? null, pairingStatus: baseline ? 'DATE_OVERLAP_ONLY_NOT_IDENTICAL_CUTOFF_OR_SOURCE_BASIS' : 'UNPAIRED_NON_SESSION_DATE_NO_AUTOMATIC_PREVIOUS_DAY_SUBSTITUTION', sourceDates: { vix: r.vix?.asOf ?? null, btc: r.btcEtfFlows?.asOf ?? null, gld: r.gldFlowPressure?.asOf ?? null }, actualNarrative: { support: r.regime.support, caution: r.regime.caution, watch: r.regime.watch }, scoreUsedAsObjective: false, confidenceUsedAsProbability: false };
});
const v1 = { version: 'groweer-v1-inventory/1.0.0', benchmark: 'B0_V1', status: 'LIMITED_ACTUAL_OBSERVATIONS', sourceFile: fileRef('lib/reports/historical-automatic-readings.ts', 'four exported HistoricalAutomaticReadingsSnapshot objects and historicalSnapshots map'), observedSnapshots: v1Rows.length, exactDateOverlapWith1930V2: v1Rows.filter(r => r.exactDatePairedToV2).length, matchedSourceCutoffPITPairs: 0, observedContinuousV1SessionPairs: 0, historyReconstructed: false, inventedV1Rows: 0, scoreAsTruth: false, v1ScoreMethodology: 'Existing V1 composite uses rotation 45%, VIX 40%, BTC flows 15%; retained score/confidence are archival output only and are never imported into V2 or a benchmark target.', comparableTurnover: null, comparableDurations: null, comparableFlipFlops: null, occupancy: { scope: 'Only four sparse publication snapshots; not historical session occupancy', labels: Object.fromEntries([...new Set(v1Rows.map(r => r.label))].map(label => [label, v1Rows.filter(r => r.label === label).length])) }, limitations: ['No historical daily V1 regime archive was found in the authoritative preserved report inputs; four sparse published observations cannot estimate turnover, persistence, stress recall or superiority.', 'July 18 is not an observed SPY session; its source records are not silently mapped to July 17.', 'Date overlap alone does not establish common availability cutoffs. August and September captures are later; September VIX is explicitly FRED September 3 versus V2 official Cboe September 4.', 'V1 taxonomy/score/confidence and core weights differ. No numeric or cardinal mapping turns V1 into regime truth.', 'Comments reference an immutable historical deployment for July; that external evidence hash was not newly fetched or validated here. Local retained file bytes are independently hashed.'], rows: v1Rows, v1Preserved: true, sourceFilesVerifiedAgainstSeptemberIntegrity: 3, canonicalEngineModified: false };
save('v1-benchmark-inventory.json', v1);
console.log(JSON.stringify({ status: 'PASS', nativePublicApiDates: rows.length, dataQualityCases: qualityCases.length, v1Snapshots: v1Rows.length, btcDailySignChanges: btcDaily.signChanges, btc5SignChanges: btc5.signChanges, gldDailySignChanges: gld1.signChanges, gld5SignChanges: gld5.signChanges, btcSatellite: 'KEEP', gldSatellite: 'KEEP', dataQualityValue: quality.value }, null, 2));
