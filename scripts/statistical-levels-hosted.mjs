import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { setTimeout as pause } from 'node:timers/promises';
import { createEngine, generateSnapshots, verifyArchive, configPath, projectRoot } from './statistical-levels-offline.mjs';
import { S3Store, runtimeConfig, newRunId, hash, jsonBytes, requireValue, assertNoSecrets } from './statistical-levels-storage.mjs';
import { runPrefix, sealArchive, readSealedArchive } from './statistical-levels-archive.mjs';
import { admitDaily, stateBucket } from './statistical-levels-daily.mjs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const source = () => fs.readFileSync(path.join(projectRoot, 'scripts/build-statistical-levels.mjs'), 'utf8');
const expectedFiles = universe => ['manifest.json', ...universe.flatMap(a => [`assets/${a.ticker}.json`, `seasonality/${a.ticker}.json`])].sort();
const fileList = directory => fs.readdirSync(directory, { recursive: true, withFileTypes: true }).filter(e => e.isFile()).map(e => path.relative(directory, path.join(e.parentPath, e.name))).sort();
export const MAX_PROVIDER_BYTES = 20 * 1024 * 1024;
const observe = (callback, value) => { try { callback(Object.freeze({ ...value })); } catch { /* Diagnostics cannot alter acquisition or mask its failure. */ } };
function cancelBody(body) {
  try { Promise.resolve(body?.cancel()).catch(() => {}); } catch { /* Cancellation cannot mask the original rejection. */ }
}
const transportCode = error => ['AbortError', 'TimeoutError'].includes(error?.name) ? 'PROVIDER_TIMEOUT_OR_ABORT' : 'PROVIDER_BODY_READ_FAILED';

// Count actual bytes as they arrive, before copying or concatenating them.
// Content-Length is never authority for size or body integrity.
export async function readBoundedProviderBody(response, { limit = MAX_PROVIDER_BYTES, onProgress = () => {} } = {}) {
  requireValue(Number.isSafeInteger(limit) && limit > 0 && limit <= MAX_PROVIDER_BYTES, 'PROVIDER_BODY_LIMIT');
  requireValue(response.body && typeof response.body.getReader === 'function', 'PROVIDER_BODY_UNAVAILABLE');
  // One fixed bounded allocation also avoids unbounded per-chunk bookkeeping
  // when a valid body is split into tiny or zero-length chunks.
  const buffer = Buffer.alloc(limit), reader = response.body.getReader();
  let retained = 0, completed = false;
  try {
    for (;;) {
      let item;
      try { item = await reader.read(); } catch (error) { throw new Error(transportCode(error)); }
      requireValue(typeof item?.done === 'boolean', 'PROVIDER_BODY_READ_FAILED');
      if (item.done) break;
      requireValue(item.value instanceof Uint8Array, 'PROVIDER_BODY_READ_FAILED');
      const observed = retained + item.value.byteLength;
      observe(onProgress, { bytes_observed: observed, bytes_retained: retained });
      requireValue(observed < limit, 'PROVIDER_SIZE_REJECTED');
      buffer.set(item.value, retained); retained = observed;
    }
    requireValue(retained > 0, 'PROVIDER_SIZE_REJECTED');
    completed = true;
    observe(onProgress, { bytes_observed: retained, bytes_retained: retained });
    return buffer.subarray(0, retained);
  } finally {
    if (!completed) cancelBody(reader);
    try { reader.releaseLock(); } catch { /* No retry or replacement body. */ }
  }
}

export function assertProviderUniverse(universe) {
  requireValue(Array.isArray(universe) && universe.length === 40 && new Set(universe.map(asset => asset.ticker)).size === 40 &&
    universe.every(asset => typeof asset.ticker === 'string' && /^[A-Z0-9]+$/.test(asset.ticker) && typeof asset.yahooSymbol === 'string' && asset.yahooSymbol.length > 0), 'PROVIDER_UNIVERSE_BUDGET');
}

// Accept only an uncompressed successful response from the exact provider URL.
// No normalization, fallback provider, redirect or retry can replace its bytes.
export async function fetchRaw(asset, { request = fetch, wait = pause, onProgress = () => {} } = {}) {
  const params = new URLSearchParams({ period1: '0', period2: String(Math.floor(Date.now() / 1000)), interval: '1d', events: 'history', includeAdjustedClose: 'true' });
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.yahooSymbol)}?${params}`;
  await wait(250);
  let response;
  const diagnostic = { http_status: null, retry_after_seconds_hint: null, bytes_observed: 0, bytes_retained: 0, failure_kind: null };
  try {
    try { response = await request(url, { redirect: 'error', signal: AbortSignal.timeout(30000), headers: { Accept: 'application/json', 'Accept-Encoding': 'identity', 'User-Agent': 'luiguiherrera-market-lab/1.0 educational static data build' } }); }
    catch (error) { throw new Error(['AbortError', 'TimeoutError'].includes(error?.name) ? 'PROVIDER_TIMEOUT_OR_ABORT' : 'PROVIDER_TRANSPORT_FAILED'); }
    diagnostic.http_status = Number.isInteger(response.status) && response.status >= 100 && response.status <= 599 ? response.status : null;
    const hint = response.headers.get('retry-after');
    diagnostic.retry_after_seconds_hint = typeof hint === 'string' && /^\d{1,5}$/.test(hint) && Number(hint) <= 86400 ? Number(hint) : null;
    observe(onProgress, diagnostic);
    requireValue(response.status === 200 && ['identity', null].includes(response.headers.get('content-encoding')), 'PROVIDER_RESPONSE_REJECTED');
    const bytes = await readBoundedProviderBody(response, { onProgress: progress => {
      Object.assign(diagnostic, progress); observe(onProgress, diagnostic);
    } });
    return { bytes, url, fetchedAt: new Date().toISOString() };
  } catch (error) {
    const allowed = new Set(['PROVIDER_RESPONSE_REJECTED', 'PROVIDER_SIZE_REJECTED', 'PROVIDER_BODY_UNAVAILABLE', 'PROVIDER_BODY_READ_FAILED', 'PROVIDER_TIMEOUT_OR_ABORT', 'PROVIDER_TRANSPORT_FAILED']);
    const code = allowed.has(error?.message) ? error.message : 'PROVIDER_TRANSPORT_FAILED';
    diagnostic.failure_kind = code; observe(onProgress, diagnostic); cancelBody(response?.body);
    throw new Error(code); // Raw exception/body/header/URI never crosses this boundary.
  }
}

export function validateCandidate(output, config, archive) {
  const raw = verifyArchive(archive, config);
  const provenance = read(output + '-provenance.json'); // Missing sidecar fails here.
  const e = createEngine(source(), config.SNAPSHOT_CUTOFF).engine;
  const files = expectedFiles(e.universe);
  requireValue(JSON.stringify(fileList(output)) === JSON.stringify(files), 'SNAPSHOT_SET_INVALID');
  requireValue(provenance.SCHEMA_VERSION === 'statistical-levels.provenance.v1' && provenance.snapshots?.length === 81, 'PROVENANCE_SIDECAR_INVALID');
  requireValue(JSON.stringify(provenance.CONFIG) === JSON.stringify(config) && provenance.CONFIG_SHA256 === hash(JSON.stringify(config)), 'PROVENANCE_CONFIG_INVALID');
  for (const field of ['BASELINE_ID', 'RAW_MANIFEST_SHA256', 'RAW_ARCHIVE_MANIFEST_SHA256', 'GENERATOR_COMMIT', 'GENERATED_AT']) requireValue(provenance[field] === config[field], 'PROVENANCE_AUTHORITY_INVALID');
  requireValue(provenance.GENERATOR_SHA256 === hash(JSON.stringify(provenance.SOURCE_BUNDLE)), 'GENERATOR_BINDING_INVALID');
  for (const item of provenance.SOURCE_BUNDLE) requireValue(hash(fs.readFileSync(path.join(projectRoot, item.file))) === item.SHA256, 'GENERATOR_SOURCE_CHANGED');
  requireValue(JSON.stringify(provenance.snapshots.map(s => s.FILE).sort()) === JSON.stringify(files), 'PROVENANCE_COVERAGE_INVALID');
  for (const snapshot of provenance.snapshots) {
    requireValue(hash(fs.readFileSync(path.join(output, snapshot.FILE))) === snapshot.SNAPSHOT_SHA256, 'SNAPSHOT_HASH_INVALID');
    requireValue(snapshot.SCHEMA_VERSION === config.SCHEMA_VERSION, 'SNAPSHOT_SCHEMA_INVALID');
    for (const field of ['GENERATOR_COMMIT', 'GENERATOR_SHA256', 'CONFIG_SHA256', 'GENERATED_AT']) requireValue(snapshot[field] === provenance[field], 'SNAPSHOT_PROVENANCE_INVALID');
    const inputs = snapshot.FILE === 'manifest.json' ? raw.records : raw.records.filter(r => [`assets/${r.ASSET}.json`, `seasonality/${r.ASSET}.json`].includes(snapshot.FILE));
    requireValue(snapshot.INPUTS?.length === inputs.length && inputs.every(r => snapshot.INPUTS.some(i => i.ASSET === r.ASSET && i.RAW_SHA256 === r.SHA256 && i.RAW_SOURCE_ID === `${config.BASELINE_ID}/${r.SOURCE_FILE}` && i.RAW_ROW_COUNT === r.ROW_COUNT && i.SNAPSHOT_CUTOFF === config.SNAPSHOT_CUTOFF)), 'RAW_INPUT_BINDING_INVALID');
    for (const input of snapshot.INPUTS) {
      const record = inputs.find(r => r.ASSET === input.ASSET);
      requireValue(record && input.RAW_FIRST_DATE === record.FIRST_DATE && input.RAW_LAST_DATE === record.LAST_DATE && Number.isFinite(Date.parse(input.CURRENT_MARK_TIMESTAMP)) && Date.parse(input.CURRENT_MARK_TIMESTAMP) <= Date.parse(config.SNAPSHOT_CUTOFF), 'INPUT_DATES_INVALID');
      requireValue(input.COMPLETED_DAILY_ROW_COUNT > 0 && input.COMPLETED_DAILY_ROW_COUNT <= record.ROW_COUNT && ['daily', 'weekly', 'monthly'].every(f => /^\d{4}-\d{2}-\d{2}$/.test(input.LAST_COMPLETED_OBSERVATION?.[f]) && input.LAST_COMPLETED_OBSERVATION[f] <= config.SNAPSHOT_CUTOFF.slice(0, 10)), 'COMPLETED_INPUT_BINDING_INVALID');
    }
  }
  const manifest = read(path.join(output, 'manifest.json'));
  requireValue(manifest.catalog.length === 40 && manifest.baseline.id === config.BASELINE_ID, 'MANIFEST_INVALID');
  requireValue(JSON.stringify(manifest.windows) === JSON.stringify(['1Y', '3Y', '5Y', '10Y', 'Full']) && JSON.stringify(manifest.frequencies) === JSON.stringify(['daily', 'weekly', 'monthly']), 'CAPABILITY_DATA_LOSS');
  for (const asset of e.universe) {
    const data = read(path.join(output, `assets/${asset.ticker}.json`));
    requireValue(data.ticker === asset.ticker && data.dataAuthority.baselineId === config.BASELINE_ID && Number.isFinite(data.lastClose) && data.lastClose > 0, 'ASSET_INVALID');
    for (const frequency of manifest.frequencies) {
      const f = data.frequencies[frequency];
      requireValue(f.periods > 0 && JSON.stringify(Object.keys(f.windows)) === JSON.stringify(manifest.windows), 'FREQUENCY_INVALID');
      for (const metric of Object.values(f.windows).filter(w => w.available)) {
        const selected = f.drawdownHistory.slice(-metric.sessions);
        requireValue(selected.length === metric.sessions, 'DRAWDOWN_N_MISMATCH');
        const dd = e.drawdownSeries(selected.map(p => p.close));
        requireValue(Number(dd.at(-1).toFixed(4)) === metric.currentDrawdown && Number(Math.min(...dd).toFixed(4)) === metric.maxDrawdown, 'DRAWDOWN_METRIC_MISMATCH');
      }
    }
    const seasonality = read(path.join(output, `seasonality/${asset.ticker}.json`));
    requireValue(seasonality.asset === asset.ticker, 'SEASONALITY_INVALID');
    for (const window of Object.values(seasonality.windows)) for (const frequency of manifest.frequencies) for (const cell of window[frequency].general) requireValue(cell.sampleSize > 0 && (cell.winRate === null || cell.winRate >= 0 && cell.winRate <= 1), 'SEASONALITY_SAMPLE_INVALID');
  }
  return { SNAPSHOT_COUNT: files.length, PROVENANCE_COVERAGE: '100%', PROVENANCE_SIDECAR_VALID: true };
}

export async function prepareHosted({ store, storageConfig, directory, gitSha, assertRuntime, runId = newRunId(), fetcher = fetchRaw, generate = generateSnapshots, validate = validateCandidate, existingAuthority = null, onProgress = () => {} }) {
  const progress = { schema: 'statistical-levels.acquisition-observation.v1', stage: 'RUNTIME_PREFLIGHT', fetch_attempts: 0, fetch_completed: 0,
    raw_verified: 0, fetch_limit: 40, retries: 0, quota_scope: 'THIS_RUN_FETCH_INVOCATIONS_ONLY', global_quota: 'UNPROVEN', provider_health: 'UNPROVEN',
    last_asset: null, http_status: null, retry_after_seconds_hint: null, bytes_observed: 0, bytes_retained: 0, failure_kind: null };
  const report = stage => { progress.stage = stage; observe(onProgress, progress); };
  report('RUNTIME_PREFLIGHT');
  assertRuntime();
  report('AWS_IDENTITY');
  await store.identity(); // Before reservation and before any provider access.
  requireValue(/^[a-f0-9]{40}$/.test(gitSha), 'GENERATOR_COMMIT_REQUIRED');
  const e = createEngine(source(), new Date().toISOString()).engine;
  assertProviderUniverse(e.universe); // Enforce the existing 40-input contract before any reservation/fetch.
  if (existingAuthority) {
    requireValue(existingAuthority.runId === runId && existingAuthority.prefix === runPrefix('raw-authority', runId), 'REUSE_ARCHIVE_SCOPE');
  }
  const prefix = runPrefix('raw-authority', runId);
  report(existingAuthority ? 'REUSE_SEALED' : 'RAW_RESERVATION');
  const authority = existingAuthority ?? await sealArchive({ store, prefix, runId, expectedCount: 40,
    produce: async function* () {
      for (const asset of e.universe) {
        progress.fetch_attempts++; progress.last_asset = asset.ticker;
        Object.assign(progress, { http_status: null, retry_after_seconds_hint: null, bytes_observed: 0, bytes_retained: 0, failure_kind: null });
        requireValue(progress.fetch_attempts <= 40, 'PROVIDER_UNIVERSE_BUDGET');
        report('PROVIDER_FETCH');
        const response = await fetcher(asset, { onProgress: detail => {
          progress.http_status = Number.isInteger(detail?.http_status) && detail.http_status >= 100 && detail.http_status <= 599 ? detail.http_status : null;
          progress.retry_after_seconds_hint = Number.isInteger(detail?.retry_after_seconds_hint) && detail.retry_after_seconds_hint >= 0 && detail.retry_after_seconds_hint <= 86400 ? detail.retry_after_seconds_hint : null;
          for (const key of ['bytes_observed', 'bytes_retained']) progress[key] = Number.isSafeInteger(detail?.[key]) && detail[key] >= 0 ? detail[key] : 0;
          progress.failure_kind = ['PROVIDER_RESPONSE_REJECTED', 'PROVIDER_SIZE_REJECTED', 'PROVIDER_BODY_UNAVAILABLE', 'PROVIDER_BODY_READ_FAILED', 'PROVIDER_TIMEOUT_OR_ABORT', 'PROVIDER_TRANSPORT_FAILED'].includes(detail?.failure_kind) ? detail.failure_kind : null;
          report('PROVIDER_FETCH');
        } });
        progress.fetch_completed++; report('RAW_WRITE_AND_READBACK');
        yield { name: `raw/${asset.ticker}.json`, asset, ...response };
      }
    },
    describe: (item, archived) => {
      progress.raw_verified++; report('ARCHIVED_INPUT_DESCRIPTION');
      const result = JSON.parse(archived).chart?.result?.[0], rows = e.parseYahooChart(archived.toString()).rows;
      requireValue(result?.meta?.symbol === item.asset.yahooSymbol && rows.length > 0, 'ARCHIVED_PROVIDER_IDENTITY_INVALID');
      return { ASSET: item.asset.ticker, SOURCE_FILE: item.name, SHA256: hash(archived), BYTES: archived.length, RAW_TIMESTAMP_COUNT: result.timestamp.length, ROW_COUNT: rows.length, FIRST_DATE: rows[0].date, LAST_DATE: rows.at(-1).date, SOURCE_URL: item.url, FETCHED_AT: item.fetchedAt };
    },
    provenance: { PROVIDER: 'Yahoo', GENERATOR_COMMIT: gitSha, IDENTITY: 'GITHUB_OIDC', ARCHIVE_REGION: storageConfig.region, ARCHIVE_BUCKET: storageConfig.bucket, ARCHIVE_PREFIX: prefix } });
  report('SEALED_VERSION_READBACK');
  const archive = path.join(directory, 'archived-input'), output = path.join(directory, 'candidate');
  const sealed = await readSealedArchive(store, authority, archive);
  const baseline = read(configPath);
  const config = { ...baseline, BASELINE_ID: runId, SNAPSHOT_CUTOFF: sealed.SNAPSHOT_CUTOFF, GENERATED_AT: sealed.SNAPSHOT_CUTOFF,
    RAW_MANIFEST_SHA256: sealed.OBJECTS['raw-manifest.json'].SHA256, RAW_ARCHIVE_MANIFEST_SHA256: sealed.OBJECTS.SHA256SUMS.SHA256,
    RAW_ARCHIVE_ACCESS_CLASS: 'PRIVATE_S3_DURABLE', RAW_ARCHIVE_RELATIVE_PATH: prefix, RAW_ARCHIVE_BUCKET: storageConfig.bucket, RAW_ARCHIVE_REGION: storageConfig.region,
    RAW_ARCHIVE_SEAL_SHA256: authority.sealSHA256, RAW_ARCHIVE_SEAL_VERSION: authority.sealVersion,
    GENERATOR_COMMIT: gitSha, SOURCE_STATE: 'COMMITTED', PREVIOUS_BASELINE_ID: baseline.BASELINE_ID,
    FOUNDER_DECISION: 'Scheduled durable raw authority updates authorized after provisioning pass' };
  report('OFFLINE_GENERATION');
  generate({ archive, output, config });
  report('CANDIDATE_VALIDATION');
  const validation = validate(output, config, archive);
  const candidate = { output, archive, config, gitSha, validation, authority: { prefix, runId, sealSHA256: authority.sealSHA256, sealVersion: authority.sealVersion } };
  fs.writeFileSync(path.join(directory, 'candidate.json'), jsonBytes(candidate), { flag: 'wx', mode: 0o600 });
  report('CANDIDATE_PREPARED');
  return candidate;
}

export function preflightSource(git, gitSha) {
  requireValue(/^[a-f0-9]{40}$/.test(gitSha), 'GENERATOR_COMMIT_REQUIRED');
  requireValue(git(['rev-parse', 'HEAD']).trim() === gitSha, 'SOURCE_HEAD_CHANGED');
  requireValue(git(['status', '--porcelain']).trim() === '', 'DIRTY_PUBLICATION_WORKTREE');
  requireValue(git(['ls-remote', 'origin', 'refs/heads/vercel-deployment']).trim() === `${gitSha}\trefs/heads/vercel-deployment`, 'PREFETCH_REMOTE_ADVANCED');
}

export function publishCandidate(candidate, { git, install, validate = validateCandidate, onProgress = () => {} }) {
  const progress = { schema: 'statistical-levels.publication-observation.v1', stage: 'CANDIDATE_VALIDATION', expected_source_sha: /^[a-f0-9]{40}$/.test(candidate.gitSha) ? candidate.gitSha : null,
    observed_remote_sha: null, commit_attempted: false, push_attempted: false, push_command_succeeded: false, publication_readback: 'STILL_REQUIRED' };
  const report = stage => { progress.stage = stage; observe(onProgress, progress); };
  report('CANDIDATE_VALIDATION');
  validate(candidate.output, candidate.config, candidate.archive);
  report('LOCAL_SOURCE_CHECK');
  requireValue(git(['rev-parse', 'HEAD']).trim() === candidate.gitSha, 'SOURCE_HEAD_CHANGED');
  requireValue(git(['status', '--porcelain']).trim() === '', 'DIRTY_PUBLICATION_WORKTREE');
  git(['fetch', 'origin', 'vercel-deployment']);
  const observed = git(['rev-parse', 'origin/vercel-deployment']).trim();
  progress.observed_remote_sha = /^[a-f0-9]{40}$/.test(observed) ? observed : null;
  report('REMOTE_SOURCE_CHECK');
  requireValue(observed === candidate.gitSha, 'PUBLICATION_OVERLAP_REMOTE_ADVANCED');
  report('CANDIDATE_INSTALL');
  install();
  validate(path.join(projectRoot, 'lib/statistical-levels/generated'), candidate.config, candidate.archive);
  const paths = ['lib/statistical-levels/generated', 'lib/statistical-levels/generated-provenance.json'];
  git(['add', '--', ...paths]);
  report('STAGING_VALIDATION');
  const staged = git(['diff', '--cached', '--name-only']).trim().split('\n');
  requireValue(staged.includes(paths[1]) && staged.every(p => p === paths[1] || /^lib\/statistical-levels\/generated\/(?:manifest\.json|(?:assets|seasonality)\/[A-Z0-9]+\.json)$/.test(p)), 'ATOMIC_SIDECAR_STAGING_REQUIRED');
  progress.commit_attempted = true; report('GIT_COMMIT');
  git(['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'commit', '-m', 'Update statistical levels snapshot with durable raw provenance']);
  progress.push_attempted = true; report('GIT_PUSH');
  git(['push', 'origin', 'HEAD:vercel-deployment']); // execFileSync throws on failed commit; no force push.
  progress.push_command_succeeded = true; report('PUSH_COMMAND_SUCCEEDED');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let store, state, phase = 'RUNTIME_PREFLIGHT', progress = null;
  try {
    const storageConfig = runtimeConfig(process.env, true);
    const directory = path.join(process.env.RUNNER_TEMP, 'statistical-levels-authority');
    if (process.argv[2] === 'prepare') {
      fs.mkdirSync(directory, { mode: 0o700 }); // No reuse of another candidate.
      phase = 'SOURCE_PREFLIGHT';
      preflightSource(args => execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), process.env.GITHUB_SHA);
      store = new S3Store(storageConfig);
      state = new S3Store({ ...storageConfig, bucket: stateBucket });
      phase = 'AWS_IDENTITY';
      await store.identity();
      const now = new Date().toISOString();
      phase = 'DAILY_ADMISSION';
      const gate = await admitDaily({ store, state,
        context: { day: now.slice(0, 10), now, runId: newRunId(), gitSha: process.env.GITHUB_SHA,
          producerRunId: process.env.GITHUB_RUN_ID, producerAttempt: process.env.GITHUB_RUN_ATTEMPT },
        currentProvenance: read(path.join(projectRoot, 'lib/statistical-levels/generated-provenance.json')) });
      const outcome = { schema: 'statistical-levels.daily-outcome.v1', repository: process.env.GITHUB_REPOSITORY,
        repository_id: process.env.GITHUB_REPOSITORY_ID, branch: 'vercel-deployment',
        source_sha: process.env.GITHUB_SHA, run_id: process.env.GITHUB_RUN_ID, run_attempt: process.env.GITHUB_RUN_ATTEMPT,
        event: process.env.GITHUB_EVENT_NAME, observed_at: new Date().toISOString(), gate,
        qualification: 'NOT_ISSUED', production_mutated: false, data_promoted: false };
      if (gate.mode === 'GENERATED_NOOP') {
        phase = 'GENERATED_NOOP_VERIFICATION';
        const archive = path.join(directory, 'noop-archive');
        await readSealedArchive(store, gate.authority, archive);
        const config = read(path.join(projectRoot, 'lib/statistical-levels/generated-provenance.json')).CONFIG;
        validateCandidate(path.join(projectRoot, 'lib/statistical-levels/generated'), config, archive);
      }
      if (gate.mode === 'PUBLISHED_NOOP' || gate.mode === 'GENERATED_NOOP') {
        requireValue(execFileSync('git', ['ls-remote', 'origin', 'refs/heads/vercel-deployment'], { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() === `${process.env.GITHUB_SHA}\trefs/heads/vercel-deployment`, 'DAILY_NOOP_REF_MOVED');
        outcome.status = 'NOOP';
      } else {
        phase = 'ARCHIVE_AND_GENERATION';
        const candidate = await prepareHosted({ store, storageConfig, directory, gitSha: process.env.GITHUB_SHA,
          runId: gate.mode === 'FETCH_NEW' ? gate.runId : gate.authority.runId,
          existingAuthority: gate.mode === 'REUSE_SEALED' ? gate.authority : null,
          onProgress: value => { progress = value; },
          assertRuntime: () => runtimeConfig(process.env, true) });
        requireValue(candidate.config.SNAPSHOT_CUTOFF.slice(0, 10) === gate.day, 'DAILY_ARCHIVE_DAY_CHANGED');
        // The post-publication receipt consumes the same authenticated selection.
        fs.writeFileSync(path.join(directory, 'daily-admission.json'), jsonBytes(gate), { flag: 'wx', mode: 0o600 });
        outcome.status = 'PREPARED';
      }
      const text = JSON.stringify(outcome, null, 2) + '\n'; assertNoSecrets(text);
      fs.mkdirSync(path.join(directory, 'daily-artifact'), { mode: 0o700 });
      fs.writeFileSync(path.join(directory, 'daily-artifact/daily-outcome.json'), text, { flag: 'wx', mode: 0o600 });
      requireValue(typeof process.env.GITHUB_OUTPUT === 'string', 'DAILY_OUTPUT_REQUIRED');
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `mode=${outcome.status}\n`);
      console.log(JSON.stringify({ STATE: outcome.status, DAILY_MODE: gate.mode, QUALIFICATION: 'NOT_ISSUED' }));
    } else if (process.argv[2] === 'publish') {
      phase = 'GIT_PUBLICATION';
      const candidate = read(path.join(directory, 'candidate.json'));
      publishCandidate(candidate, {
        onProgress: value => { progress = value; },
        git: args => execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
        install: () => {
          fs.cpSync(candidate.output, path.join(projectRoot, 'lib/statistical-levels/generated'), { recursive: true });
          fs.copyFileSync(candidate.output + '-provenance.json', path.join(projectRoot, 'lib/statistical-levels/generated-provenance.json'));
        } });
      console.log('VALIDATED_SNAPSHOTS_AND_PROVENANCE_COMMITTED_AND_PUSHED');
    } else throw new Error('UNKNOWN_HOSTED_MODE');
  } catch (error) {
    const code = /^[A-Z][A-Z0-9_]{0,100}$/.test(error.message) || ['AccessDenied', 'PreconditionFailed'].includes(error.message) ? error.message : 'UNCLASSIFIED_ERROR';
    // Bounded phase/code diagnostics only. No exception text, raw data, headers,
    // process environment or credentials are serialized. Persistence cannot mask
    // the original failure or enable any retry.
    try {
      requireValue(path.isAbsolute(process.env.RUNNER_TEMP ?? ''), 'DIAGNOSTIC_TEMP');
      const folder = path.join(process.env.RUNNER_TEMP, 'statistical-levels-authority', 'failure-artifact');
      fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
      const metadata = { schema: 'statistical-levels.hosted-failure.v1', phase, code,
        mode: ['prepare', 'publish'].includes(process.argv[2]) ? process.argv[2] : 'UNKNOWN',
        run_id: /^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ID ?? '') ? process.env.GITHUB_RUN_ID : 'UNVERIFIED',
        attempt: /^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ATTEMPT ?? '') ? process.env.GITHUB_RUN_ATTEMPT : 'UNVERIFIED',
        source_sha: /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA ?? '') ? process.env.GITHUB_SHA : 'UNVERIFIED',
        at: new Date().toISOString(), result: 'FAIL_CLOSED', recovery_or_retry_authorized: false };
      const text = JSON.stringify(metadata, null, 2) + '\n'; assertNoSecrets(text);
      fs.writeFileSync(path.join(folder, metadata.mode + '.json'), text, { flag: 'wx', mode: 0o600 });
      if (progress) {
        const safeProgress = JSON.stringify({ ...metadata, schema: 'statistical-levels.hosted-progress-failure.v1', progress }, null, 2) + '\n';
        assertNoSecrets(safeProgress);
        fs.writeFileSync(path.join(folder, metadata.mode + '-progress.json'), safeProgress, { flag: 'wx', mode: 0o600 });
      }
    } catch { console.error('HOSTED_FAILURE_DIAGNOSTIC_UNAVAILABLE'); }
    console.error('HOSTED_RAW_AUTHORITY_FAILED_CLOSED:' + code); process.exitCode = 1;
  }
  finally { store?.close(); state?.close(); }
}
