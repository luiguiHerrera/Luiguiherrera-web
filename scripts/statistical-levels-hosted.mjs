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

// Accept only an uncompressed successful response from the exact provider URL.
// No normalization, fallback provider, redirect or retry can replace its bytes.
export async function fetchRaw(asset) {
  const params = new URLSearchParams({ period1: '0', period2: String(Math.floor(Date.now() / 1000)), interval: '1d', events: 'history', includeAdjustedClose: 'true' });
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.yahooSymbol)}?${params}`;
  await pause(250);
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000), headers: { Accept: 'application/json', 'Accept-Encoding': 'identity', 'User-Agent': 'luiguiherrera-market-lab/1.0 educational static data build' } });
  requireValue(response.status === 200 && ['identity', null].includes(response.headers.get('content-encoding')), 'PROVIDER_RESPONSE_REJECTED');
  const bytes = Buffer.from(await response.arrayBuffer());
  requireValue(bytes.length > 0 && bytes.length < 20 * 1024 * 1024, 'PROVIDER_SIZE_REJECTED');
  return { bytes, url, fetchedAt: new Date().toISOString() };
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

export async function prepareHosted({ store, storageConfig, directory, gitSha, assertRuntime, runId = newRunId(), fetcher = fetchRaw, generate = generateSnapshots, validate = validateCandidate, existingAuthority = null }) {
  assertRuntime();
  await store.identity(); // Before reservation and before any provider access.
  requireValue(/^[a-f0-9]{40}$/.test(gitSha), 'GENERATOR_COMMIT_REQUIRED');
  const e = createEngine(source(), new Date().toISOString()).engine;
  if (existingAuthority) {
    requireValue(existingAuthority.runId === runId && existingAuthority.prefix === runPrefix('raw-authority', runId), 'REUSE_ARCHIVE_SCOPE');
  }
  const prefix = runPrefix('raw-authority', runId);
  const authority = existingAuthority ?? await sealArchive({ store, prefix, runId, expectedCount: 40,
    produce: async function* () {
      for (const asset of e.universe) {
        const response = await fetcher(asset);
        yield { name: `raw/${asset.ticker}.json`, asset, ...response };
      }
    },
    describe: (item, archived) => {
      const result = JSON.parse(archived).chart?.result?.[0], rows = e.parseYahooChart(archived.toString()).rows;
      requireValue(result?.meta?.symbol === item.asset.yahooSymbol && rows.length > 0, 'ARCHIVED_PROVIDER_IDENTITY_INVALID');
      return { ASSET: item.asset.ticker, SOURCE_FILE: item.name, SHA256: hash(archived), BYTES: archived.length, RAW_TIMESTAMP_COUNT: result.timestamp.length, ROW_COUNT: rows.length, FIRST_DATE: rows[0].date, LAST_DATE: rows.at(-1).date, SOURCE_URL: item.url, FETCHED_AT: item.fetchedAt };
    },
    provenance: { PROVIDER: 'Yahoo', GENERATOR_COMMIT: gitSha, IDENTITY: 'GITHUB_OIDC', ARCHIVE_REGION: storageConfig.region, ARCHIVE_BUCKET: storageConfig.bucket, ARCHIVE_PREFIX: prefix } });
  const archive = path.join(directory, 'archived-input'), output = path.join(directory, 'candidate');
  const sealed = await readSealedArchive(store, authority, archive);
  const baseline = read(configPath);
  const config = { ...baseline, BASELINE_ID: runId, SNAPSHOT_CUTOFF: sealed.SNAPSHOT_CUTOFF, GENERATED_AT: sealed.SNAPSHOT_CUTOFF,
    RAW_MANIFEST_SHA256: sealed.OBJECTS['raw-manifest.json'].SHA256, RAW_ARCHIVE_MANIFEST_SHA256: sealed.OBJECTS.SHA256SUMS.SHA256,
    RAW_ARCHIVE_ACCESS_CLASS: 'PRIVATE_S3_DURABLE', RAW_ARCHIVE_RELATIVE_PATH: prefix, RAW_ARCHIVE_BUCKET: storageConfig.bucket, RAW_ARCHIVE_REGION: storageConfig.region,
    RAW_ARCHIVE_SEAL_SHA256: authority.sealSHA256, RAW_ARCHIVE_SEAL_VERSION: authority.sealVersion,
    GENERATOR_COMMIT: gitSha, SOURCE_STATE: 'COMMITTED', PREVIOUS_BASELINE_ID: baseline.BASELINE_ID,
    FOUNDER_DECISION: 'Scheduled durable raw authority updates authorized after provisioning pass' };
  generate({ archive, output, config });
  const validation = validate(output, config, archive);
  const candidate = { output, archive, config, gitSha, validation, authority: { prefix, runId, sealSHA256: authority.sealSHA256, sealVersion: authority.sealVersion } };
  fs.writeFileSync(path.join(directory, 'candidate.json'), jsonBytes(candidate), { flag: 'wx', mode: 0o600 });
  return candidate;
}

export function preflightSource(git, gitSha) {
  requireValue(/^[a-f0-9]{40}$/.test(gitSha), 'GENERATOR_COMMIT_REQUIRED');
  requireValue(git(['rev-parse', 'HEAD']).trim() === gitSha, 'SOURCE_HEAD_CHANGED');
  requireValue(git(['status', '--porcelain']).trim() === '', 'DIRTY_PUBLICATION_WORKTREE');
  requireValue(git(['ls-remote', 'origin', 'refs/heads/vercel-deployment']).trim() === `${gitSha}\trefs/heads/vercel-deployment`, 'PREFETCH_REMOTE_ADVANCED');
}

export function publishCandidate(candidate, { git, install, validate = validateCandidate }) {
  validate(candidate.output, candidate.config, candidate.archive);
  requireValue(git(['rev-parse', 'HEAD']).trim() === candidate.gitSha, 'SOURCE_HEAD_CHANGED');
  requireValue(git(['status', '--porcelain']).trim() === '', 'DIRTY_PUBLICATION_WORKTREE');
  git(['fetch', 'origin', 'vercel-deployment']);
  requireValue(git(['rev-parse', 'origin/vercel-deployment']).trim() === candidate.gitSha, 'PUBLICATION_OVERLAP_REMOTE_ADVANCED');
  install();
  validate(path.join(projectRoot, 'lib/statistical-levels/generated'), candidate.config, candidate.archive);
  const paths = ['lib/statistical-levels/generated', 'lib/statistical-levels/generated-provenance.json'];
  git(['add', '--', ...paths]);
  const staged = git(['diff', '--cached', '--name-only']).trim().split('\n');
  requireValue(staged.includes(paths[1]) && staged.every(p => p === paths[1] || /^lib\/statistical-levels\/generated\/(?:manifest\.json|(?:assets|seasonality)\/[A-Z0-9]+\.json)$/.test(p)), 'ATOMIC_SIDECAR_STAGING_REQUIRED');
  git(['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'commit', '-m', 'Update statistical levels snapshot with durable raw provenance']);
  git(['push', 'origin', 'HEAD:vercel-deployment']); // execFileSync throws on failed commit; no force push.
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let store, state, phase = 'RUNTIME_PREFLIGHT';
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
    } catch { console.error('HOSTED_FAILURE_DIAGNOSTIC_UNAVAILABLE'); }
    console.error('HOSTED_RAW_AUTHORITY_FAILED_CLOSED:' + code); process.exitCode = 1;
  }
  finally { store?.close(); state?.close(); }
}
