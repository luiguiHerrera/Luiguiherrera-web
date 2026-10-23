import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { S3Store, runtimeConfig, hash, requireValue, assertNoSecrets } from '../statistical-levels-storage.mjs';
import { readSealedArchive } from '../statistical-levels-archive.mjs';

const REPOSITORY = 'luiguiHerrera/Luiguiherrera-web';
const REPOSITORY_ID = '1263772150';
const WORKFLOW_ID = 306145344;
const METADATA = ['RESERVATION', 'raw-manifest.json', 'provenance-manifest.json', 'SHA256SUMS', 'SEALED'];
const shaPattern = /^[a-f0-9]{40}$/;

// This is a post-publication readback. It cannot publish, mint credentials,
// change S3, or export the private raw response bodies.
export async function createReceipt({ env, git, store, candidate, destination, clock = () => new Date(), dailyAdmission = null }) {
  requireValue(env.GITHUB_REPOSITORY === REPOSITORY && env.GITHUB_REPOSITORY_ID === REPOSITORY_ID, 'RECEIPT_REPOSITORY');
  requireValue(env.GITHUB_REF === 'refs/heads/vercel-deployment' && env.GITHUB_WORKFLOW === 'Update statistical levels', 'RECEIPT_WORKFLOW');
  requireValue(env.GITHUB_WORKFLOW_REF === `${REPOSITORY}/.github/workflows/update-statistical-levels.yml@refs/heads/vercel-deployment`, 'RECEIPT_WORKFLOW_REF');
  requireValue(['schedule', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME), 'RECEIPT_EVENT');
  requireValue(/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID ?? '') && /^[1-9][0-9]*$/.test(env.GITHUB_RUN_ATTEMPT ?? ''), 'RECEIPT_RUN');
  requireValue(env.GITHUB_WORKFLOW_SHA === env.GITHUB_SHA, 'RECEIPT_WORKFLOW_SHA');
  requireValue(Number.isSafeInteger(Number(env.GITHUB_RUN_ID)) && Number.isSafeInteger(Number(env.GITHUB_RUN_ATTEMPT)), 'RECEIPT_RUN_RANGE');
  requireValue(shaPattern.test(env.GITHUB_SHA ?? '') && candidate.gitSha === env.GITHUB_SHA, 'RECEIPT_SOURCE');
  const published = git(['rev-parse', 'HEAD']).trim();
  requireValue(shaPattern.test(published) && published !== env.GITHUB_SHA, 'RECEIPT_PUBLISHED_SHA');
  requireValue(git(['show', '-s', '--format=%P', published]).trim() === env.GITHUB_SHA, 'RECEIPT_PARENT');
  requireValue(git(['status', '--porcelain']).trim() === '', 'RECEIPT_DIRTY');
  const expectedRemote = `${published}\trefs/heads/vercel-deployment`;
  requireValue(git(['ls-remote', 'origin', 'refs/heads/vercel-deployment']).trim() === expectedRemote, 'RECEIPT_REF_MOVED');
  const provenanceBytes = Buffer.from(git(['show', `${published}:lib/statistical-levels/generated-provenance.json`]));
  const provenance = JSON.parse(provenanceBytes);
  requireValue(provenance.GENERATOR_COMMIT === env.GITHUB_SHA && provenance.SOURCE_STATE === 'COMMITTED', 'RECEIPT_PROVENANCE_SOURCE');
  requireValue(JSON.stringify(provenance.CONFIG) === JSON.stringify(candidate.config), 'RECEIPT_CONFIG');
  const config = runtimeConfig(env, true);
  const identity = store.cli('sts', 'get-caller-identity', []);
  const expectedPrincipal = `arn:aws:sts::${config.account}:assumed-role/LuiguiHerreraStatisticalLevelsRawAuthority/sl-raw-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`;
  requireValue(identity.Account === config.account && identity.Arn === expectedPrincipal, 'RECEIPT_S3_SESSION');
  const authority = candidate.authority;
  requireValue(authority.prefix === provenance.RAW_ARCHIVE_RELATIVE_PATH && authority.runId === provenance.BASELINE_ID, 'RECEIPT_ARCHIVE');
  requireValue(authority.sealSHA256 === candidate.config.RAW_ARCHIVE_SEAL_SHA256 && authority.sealVersion === candidate.config.RAW_ARCHIVE_SEAL_VERSION, 'RECEIPT_SEAL');
  fs.mkdirSync(destination, { recursive: false, mode: 0o700 });
  const readback = path.join(destination, 'private-readback');
  const seal = await readSealedArchive(store, authority, readback);
  requireValue(Object.keys(seal.OBJECTS).length === 44, 'RECEIPT_ARCHIVE_COUNT');
  const metadata = Object.fromEntries(METADATA.map(name => {
    const bytes = fs.readFileSync(path.join(readback, name));
    const version = name === 'SEALED' ? authority.sealVersion : seal.OBJECTS[name].VERSION_ID;
    return [name, { utf8: bytes.toString('utf8'), sha256: hash(bytes), bytes: bytes.length, version }];
  }));
  let daily = null;
  if (dailyAdmission !== null) {
    requireValue(['FETCH_NEW', 'REUSE_SEALED'].includes(dailyAdmission.mode), 'RECEIPT_DAILY_MODE');
    const binding = dailyAdmission.selection;
    requireValue(binding && binding.key === `statistical-levels/raw-authority/daily/${dailyAdmission.day}/SELECTED.json` &&
      /^[a-f0-9]{64}$/.test(binding.sha256) && typeof binding.version === 'string', 'RECEIPT_DAILY_SELECTION');
    const selected = await store.get(binding.key, binding.version);
    requireValue(selected.version === binding.version && selected.bytes.toString('utf8') === binding.utf8 && hash(selected.bytes) === binding.sha256, 'RECEIPT_DAILY_READBACK');
    const selection = JSON.parse(binding.utf8);
    requireValue(selection.run_id === authority.runId && selection.source_sha === env.GITHUB_SHA &&
      selection.day === dailyAdmission.day && candidate.config.SNAPSHOT_CUTOFF.slice(0, 10) === selection.day, 'RECEIPT_DAILY_BINDING');
    if (dailyAdmission.mode === 'FETCH_NEW') requireValue(selection.producer_run_id === env.GITHUB_RUN_ID &&
      selection.producer_attempt === env.GITHUB_RUN_ATTEMPT, 'RECEIPT_DAILY_CURRENT_RUN');
    daily = { mode: dailyAdmission.mode, day: dailyAdmission.day, selection: binding };
  }
  const tree = git(['rev-parse', `${published}^{tree}`]).trim();
  requireValue(shaPattern.test(tree), 'RECEIPT_TREE');
  // Recheck after the complete S3 read; stale evidence never gets uploaded.
  requireValue(git(['rev-parse', 'HEAD']).trim() === published, 'RECEIPT_LOCAL_REF_MOVED');
  requireValue(git(['ls-remote', 'origin', 'refs/heads/vercel-deployment']).trim() === expectedRemote, 'RECEIPT_REF_MOVED');
  const receipt = {
    schema: 'statistical-levels.hosted-publication-receipt.v1',
    repository: REPOSITORY, repository_id: Number(REPOSITORY_ID), workflow_id: WORKFLOW_ID,
    workflow_path: '.github/workflows/update-statistical-levels.yml',
    event: env.GITHUB_EVENT_NAME, branch: 'vercel-deployment',
    run_id: Number(env.GITHUB_RUN_ID), run_attempt: Number(env.GITHUB_RUN_ATTEMPT),
    source_sha: env.GITHUB_SHA, published_sha: published, published_tree: tree,
    provenance_sha256: hash(provenanceBytes), created_at: clock().toISOString(),
    s3: {
      bucket: config.bucket, region: config.region, prefix: authority.prefix,
      baseline: authority.runId, seal_sha256: authority.sealSHA256, seal_version: authority.sealVersion,
      principal: identity.Arn, exact_version_read_count: 45,
      evidence_class: 'AUTHENTICATED_PRODUCER_EXACT_VERSION_READBACK',
    },
    metadata_objects: metadata,
  };
  if (daily) receipt.daily_admission = daily;
  const artifact = path.join(destination, 'artifact');
  fs.mkdirSync(artifact, { mode: 0o700 });
  const serialized = JSON.stringify(receipt, null, 2) + '\n';
  assertNoSecrets(serialized, env);
  fs.writeFileSync(path.join(artifact, 'publication-receipt.json'), serialized, { flag: 'wx', mode: 0o600 });
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let store;
  try {
    const env = process.env;
    const config = runtimeConfig(env, true);
    requireValue(path.isAbsolute(env.RUNNER_TEMP ?? ''), 'RECEIPT_TEMP');
    const candidate = JSON.parse(fs.readFileSync(path.join(env.RUNNER_TEMP, 'statistical-levels-authority/candidate.json'), 'utf8'));
    store = new S3Store(config);
    const receipt = await createReceipt({
      env, store, candidate,
      dailyAdmission: JSON.parse(fs.readFileSync(path.join(env.RUNNER_TEMP, 'statistical-levels-authority/daily-admission.json'), 'utf8')),
      destination: path.join(env.RUNNER_TEMP, 'statistical-levels-ci-receipt'),
      git: args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
    });
    console.log(JSON.stringify({ status: 'EXACT_PUBLICATION_RECEIPT_READY', run_id: receipt.run_id, run_attempt: receipt.run_attempt, source_sha: receipt.source_sha, published_sha: receipt.published_sha, seal_sha256: receipt.s3.seal_sha256 }));
  } catch (error) {
    const code = /^[A-Z][A-Z0-9_]{0,100}$/.test(error.message) ? error.message : 'RECEIPT_FAILED_CLOSED';
    console.error(code);
    process.exitCode = 1;
  } finally { store?.close(); }
}
