import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as repairs from '../lib/statistical-levels/defect-repairs.mjs';
import { completedDailyRows, completedPeriod } from '../lib/statistical-levels/baseline-policy.mjs';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const configPath = path.join(projectRoot, 'lib/statistical-levels/baseline-config.json');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));

export function verifyArchive(archive, config) {
  for (const key of ['BASELINE_ID', 'SNAPSHOT_CUTOFF', 'RAW_MANIFEST_SHA256', 'RAW_ARCHIVE_MANIFEST_SHA256', 'GENERATOR_COMMIT', 'GENERATED_AT', 'SCHEMA_VERSION', 'POLICY_VERSION']) {
    if (typeof config[key] !== 'string' || !config[key]) throw new Error(`Missing provenance input: ${key}`);
  }
  if (!Number.isFinite(Date.parse(config.GENERATED_AT)) || !Number.isFinite(Date.parse(config.SNAPSHOT_CUTOFF))) throw new Error('Invalid provenance timestamp');
  const bytes = fs.readFileSync(path.join(archive, 'raw-manifest.json'));
  if (sha256(bytes) !== config.RAW_MANIFEST_SHA256) throw new Error('Raw manifest identity mismatch');
  const manifest = JSON.parse(bytes), sums = fs.readFileSync(path.join(archive, 'SHA256SUMS'));
  if (sha256(sums) !== config.RAW_ARCHIVE_MANIFEST_SHA256) throw new Error('Archive manifest identity mismatch');
  if (manifest.records?.length !== 40 || new Set(manifest.records.map(r => r.ASSET)).size !== 40) throw new Error('Incomplete raw authority');
  const expectedSums = Object.fromEntries(sums.toString().trim().split('\n').map(line => { const [hash, name] = line.split('  '); return [name, hash]; }));
  if (Object.keys(expectedSums).length !== 41 || expectedSums['raw-manifest.json'] !== config.RAW_MANIFEST_SHA256) throw new Error('Incomplete archive checksum binding');
  for (const entry of manifest.records) {
    if (entry.SOURCE_FILE !== `raw/${entry.ASSET}.json` || !/^[A-Z0-9]+$/.test(entry.ASSET)) throw new Error('Invalid raw authority path');
    const raw = fs.readFileSync(path.join(archive, entry.SOURCE_FILE));
    if (sha256(raw) !== entry.SHA256 || expectedSums[entry.SOURCE_FILE] !== entry.SHA256) throw new Error(`Raw identity mismatch: ${entry.ASSET}`);
  }
  return manifest;
}

// The recovered formula source is evaluated without imports, provider calls or
// output-writing loops. Both counterfactual and repaired runs receive this exact
// completed-history adapter. It changes sample admission, never the formulas.
export function createEngine(source, cutoff, mode = 'repaired') {
  const fixed = Date.parse(cutoff);
  class SemanticDate extends Date { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } }
  let networkAttempts = 0;
  const context = vm.createContext({ path, process: { cwd: () => '/offline' }, console, URLSearchParams, setTimeout, clearTimeout, Date: SemanticDate,
    ...(mode === 'repaired' ? repairs : {}), fetch: () => { networkAttempts++; throw new Error('Provider access forbidden during offline generation'); } });
  const start = source.indexOf('const outputPath'), end = source.indexOf('\nconst assets = [];');
  if (start < 0 || end < start) throw new Error('Unsupported formula source boundary');
  let body = source.slice(start, end);
  if (!body.includes('function createSnapshotManifest(')) {
    const footerStart = source.indexOf('const latestDates = assets'), footerEnd = source.indexOf('\nawait mkdir(');
    if (footerStart < 0 || footerEnd < footerStart) throw new Error('Missing legacy manifest construction');
    body += '\nfunction createSnapshotManifest(assets,dailySeasonality,correlationSources){' + source.slice(footerStart, footerEnd) + '\nreturn manifest;}';
  }
  vm.runInContext(body + '\nglobalThis.engine={universe,parseYahooChart,aggregateRows,buildAssetRecord,buildKeyLevels,buildDailySeasonalityData,buildCorrelationSource,createSnapshotManifest,seasonalityObservations,seasonalitySessions,buildDailySeasonalityCells,buildWeeklySeasonalityCells,buildMonthlySeasonalityCells,drawdownSeries,normalizeRow,correlation:typeof correlation === "function"?correlation:null};', context);
  const engine = context.engine, aggregateAll = engine.aggregateRows;
  context.aggregateRows = (rows, frequency) => aggregateAll(rows, frequency).filter(row => completedPeriod(row.periodEnd, frequency, cutoff));
  engine.aggregateCompletedRows = context.aggregateRows;
  return { engine, aggregateAll, context, networkAttempts: () => networkAttempts };
}

export function generateSnapshots({ archive, output, config = read(configPath), source, mode = 'repaired' }) {
  if (!archive || !output) throw new Error('Archive and output provenance inputs are required');
  if (mode !== 'repaired' && path.resolve(output) === path.join(projectRoot, 'lib/statistical-levels/generated')) throw new Error('Legacy counterfactual cannot become canonical snapshots');
  const rawManifest = verifyArchive(archive, config);
  source ??= fs.readFileSync(path.join(projectRoot, 'scripts/build-statistical-levels.mjs'), 'utf8');
  const loaded = createEngine(source, config.SNAPSHOT_CUTOFF, mode), e = loaded.engine;
  if (e.universe.length !== 40 || e.universe.some(a => !rawManifest.records.some(r => r.ASSET === a.ticker))) throw new Error('Universe/raw coverage mismatch');
  const assets = [], seasonality = [], correlationSources = new Map(), inputBindings = [];
  for (const asset of e.universe) {
    const input = rawManifest.records.find(r => r.ASSET === asset.ticker);
    const raw = fs.readFileSync(path.join(archive, input.SOURCE_FILE)), result = JSON.parse(raw).chart?.result?.[0];
    if (!result || result.meta.symbol !== asset.yahooSymbol || result.timestamp.length !== input.RAW_TIMESTAMP_COUNT) throw new Error('Provider identity/count mismatch');
    const rows = e.parseYahooChart(raw.toString()).rows;
    if (rows.length !== input.ROW_COUNT || rows[0].date !== input.FIRST_DATE || rows.at(-1).date !== input.LAST_DATE) throw new Error('Parser provenance mismatch');
    if (rows.some((r, i) => i > 0 && r.date <= rows[i - 1].date)) throw new Error('Unordered or duplicate daily observations');
    const markTimestamp = new Date(result.meta.regularMarketTime * 1000).toISOString();
    if (markTimestamp > new Date(config.SNAPSHOT_CUTOFF).toISOString() || rows.at(-1).date > config.SNAPSHOT_CUTOFF.slice(0, 10)) throw new Error('Raw authority exceeds the configured cutoff');
    const completed = completedDailyRows(rows, result.meta, config.SNAPSHOT_CUTOFF);
    if (!completed.length) throw new Error('No completed daily authority');
    const record = e.buildAssetRecord(asset, completed, 'Yahoo Finance fallback');
    // Opening-level distributions already exclude the current period in
    // buildKeyLevels. Preserve its current opening/current-mark capability.
    for (const frequency of ['weekly', 'monthly']) record.keyStatisticalLevels[frequency] = e.buildKeyLevels(loaded.aggregateAll(rows, frequency), frequency);
    const lastCompleted = Object.fromEntries(['daily', 'weekly', 'monthly'].map(f => [f, record.frequencies[f].lastDate]));
    record.currentMark = { value: Number(rows.at(-1).adjustedClose.toFixed(2)), date: rows.at(-1).date, timestamp: markTimestamp };
    record.lastClose = record.currentMark.value; record.lastDate = record.currentMark.date;
    record.dataAuthority = { baselineId: config.BASELINE_ID, rawSha256: input.SHA256, snapshotCutoff: config.SNAPSHOT_CUTOFF, lastCompletedObservation: lastCompleted, historicalDriftCause: 'UNEXPLAINED' };
    assets.push(record);seasonality.push(e.buildDailySeasonalityData(asset.ticker, completed, config.SNAPSHOT_CUTOFF));correlationSources.set(asset.ticker, e.buildCorrelationSource(completed));
    inputBindings.push({ ASSET: asset.ticker, RAW_SOURCE_ID: `${config.BASELINE_ID}/${input.SOURCE_FILE}`, RAW_SHA256: input.SHA256, RAW_ROW_COUNT: rows.length, RAW_FIRST_DATE: input.FIRST_DATE, RAW_LAST_DATE: input.LAST_DATE,
      SNAPSHOT_CUTOFF: config.SNAPSHOT_CUTOFF, CURRENT_MARK_TIMESTAMP: markTimestamp, LAST_COMPLETED_OBSERVATION: lastCompleted, COMPLETED_DAILY_ROW_COUNT: completed.length });
  }
  const manifest = e.createSnapshotManifest(assets, seasonality, correlationSources);
  manifest.sourceUrl = 'https://finance.yahoo.com/';
  manifest.baseline = { id: config.BASELINE_ID, cutoff: config.SNAPSHOT_CUTOFF, rawManifestSha256: config.RAW_MANIFEST_SHA256, schemaVersion: config.SCHEMA_VERSION, historicalDriftCause: 'UNEXPLAINED' };
  for (const summary of manifest.summaries) summary.historicalThroughDate = assets.find(a => a.ticker === summary.ticker).dataAuthority.lastCompletedObservation.daily;
  const outputs = [['manifest.json', manifest], ...assets.map(a => [`assets/${a.ticker}.json`, a]), ...seasonality.map(a => [`seasonality/${a.asset}.json`, a])].map(([file, data]) => ({ file, bytes: JSON.stringify(data) })).sort((a, b) => a.file.localeCompare(b.file));
  if (outputs.length !== 81 || loaded.networkAttempts() !== 0) throw new Error('Incomplete outputs or forbidden network attempt');
  const sourceFiles = ['scripts/build-statistical-levels.mjs', 'scripts/statistical-levels-offline.mjs', 'lib/statistical-levels/baseline-policy.mjs', ...(mode === 'repaired' ? ['lib/statistical-levels/defect-repairs.mjs'] : [])];
  const sourceBundle = sourceFiles.map(file => ({ file, SHA256: sha256(file === 'scripts/build-statistical-levels.mjs' ? source : fs.readFileSync(path.join(projectRoot, file))) }));
  const generatorHash = sha256(JSON.stringify(sourceBundle)), configHash = sha256(JSON.stringify(config));
  const provenance = { SCHEMA_VERSION: 'statistical-levels.provenance.v1', BASELINE_ID: config.BASELINE_ID, RAW_ARCHIVE_ACCESS_CLASS: config.RAW_ARCHIVE_ACCESS_CLASS, RAW_ARCHIVE_RELATIVE_PATH: config.RAW_ARCHIVE_RELATIVE_PATH,
    RAW_ARCHIVE_MANIFEST_SHA256: config.RAW_ARCHIVE_MANIFEST_SHA256, RAW_MANIFEST_SHA256: config.RAW_MANIFEST_SHA256, GENERATOR_COMMIT: config.GENERATOR_COMMIT, SOURCE_STATE: config.SOURCE_STATE, GENERATOR_SHA256: generatorHash, SOURCE_BUNDLE: sourceBundle,
    CONFIG_SHA256: configHash, CONFIG: config, GENERATED_AT: config.GENERATED_AT, GENERATION_TIMESTAMP_SEMANTICS: 'Assigned reproducible candidate build timestamp; actual execution times are retained separately in qualification evidence.', NODE_VERSION: process.version,
    snapshots: outputs.map(({ file, bytes }) => ({ FILE: file, SNAPSHOT_SHA256: sha256(bytes), SCHEMA_VERSION: config.SCHEMA_VERSION, GENERATOR_COMMIT: config.GENERATOR_COMMIT, GENERATOR_SHA256: generatorHash, CONFIG_SHA256: configHash, GENERATED_AT: config.GENERATED_AT,
      INPUTS: file === 'manifest.json' ? inputBindings : inputBindings.filter(r => file === `assets/${r.ASSET}.json` || file === `seasonality/${r.ASSET}.json`) })) };
  verifyArchive(archive, config); // No output is written until the complete corpus and provenance pass.
  for (const { file, bytes } of outputs) { const destination = path.join(output, file);fs.mkdirSync(path.dirname(destination), { recursive: true });fs.writeFileSync(destination, bytes); }
  const provenancePath = output + '-provenance.json';
  fs.writeFileSync(provenancePath, JSON.stringify(provenance, null, 2) + '\n');
  const outputSet = outputs.map(({ file, bytes }) => ({ file, SHA256: sha256(bytes) }));
  const runManifest = { MODE: mode, RAW_MANIFEST_SHA256: config.RAW_MANIFEST_SHA256, CONFIG_SHA256: configHash, GENERATOR_SHA256: generatorHash, SNAPSHOT_COUNT: 81, OUTPUT_SET_SHA256: sha256(JSON.stringify(outputSet)), PROVENANCE_MANIFEST_SHA256: sha256(fs.readFileSync(provenancePath)), NETWORK_ATTEMPTS: 0, INPUTS_CONSUMED: inputBindings, snapshots: outputSet };
  fs.writeFileSync(output + '-run-manifest.json', JSON.stringify(runManifest, null, 2) + '\n');
  return { runManifest, provenance, assets, manifest };
}

export async function runOfflineCli(sourceUrl) {
  const args = process.argv.slice(2), config = read(configPath);
  const value = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
  const archive = value('--archive') ?? path.join(os.homedir(), config.RAW_ARCHIVE_RELATIVE_PATH);
  const output = value('--output') ?? path.join(projectRoot, 'lib/statistical-levels/generated');
  if (args.some((a, i) => i % 2 === 0 && !['--archive', '--output'].includes(a)) || args.length % 2) throw new Error('Usage: build-statistical-levels.mjs [--archive directory] [--output directory]');
  const { runManifest } = generateSnapshots({ archive, output, config, source: fs.readFileSync(fileURLToPath(sourceUrl), 'utf8') });
  console.log(JSON.stringify({ ...runManifest, INPUTS_CONSUMED: undefined, snapshots: undefined }));
}
