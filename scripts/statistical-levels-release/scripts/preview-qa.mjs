import fs from 'node:fs/promises';
import path from 'node:path';
import { P, need, sha, canonical, validateTarget, ADOPT, PROMOTE } from './release-core.mjs';
import { createHarness } from './browser-harness.mjs';
import { runReadOnlyQA } from './qa-runner.mjs';

export async function verifyInputs(codeRoot, inputManifest, target) {
  need([ADOPT, PROMOTE].includes(target.operation), 'OPERATION_REQUIRED');
  const adoption = target.operation === ADOPT;
  if (adoption) {
    validateTarget(target);
    need(target.origin === P.production_origin, 'PRODUCTION_ORIGIN');
  }
  if (!adoption) {
    for (const [file, expected] of Object.entries(inputManifest)) {
      need(!file.includes('..') && !path.isAbsolute(file), 'QA_INPUT_PATH');
      const stat = await fs.lstat(path.join(codeRoot, file));
      need(stat.isFile() && !stat.isSymbolicLink(), 'QA_INPUT_SYMLINK');
      need(sha(await fs.readFile(path.join(codeRoot, file))) === expected, 'QA_INPUT_HASH');
    }
  }
  const readData = async file => { const full = path.join(codeRoot, file); const stat = await fs.lstat(full); need(stat.isFile() && !stat.isSymbolicLink(), 'QA_DATA_SYMLINK'); return fs.readFile(full); };
  const provenanceBytes = await readData('lib/statistical-levels/generated-provenance.json');
  if (adoption) need(sha(provenanceBytes) === P.baseline.provenance_sha256, 'BASELINE_PROVENANCE_HASH');
  const provenance = JSON.parse(provenanceBytes);
  const config = provenance.CONFIG;
  need(provenance.SCHEMA_VERSION === 'statistical-levels.provenance.v1' && provenance.SOURCE_STATE === 'COMMITTED' &&
    /^[a-f0-9]{40}$/.test(provenance.GENERATOR_COMMIT) && config.BASELINE_ID === provenance.BASELINE_ID, 'PROVENANCE_AUTHORITY');
  need(sha(JSON.stringify(config)) === provenance.CONFIG_SHA256 && sha(JSON.stringify(provenance.SOURCE_BUNDLE)) === provenance.GENERATOR_SHA256, 'PROVENANCE_SELF_HASH');
  if (adoption) {
    // Only the fixed, authenticated provenance may authorize historical source bytes.
    const root = await fs.realpath(codeRoot);
    for (const { file, SHA256 } of provenance.SOURCE_BUNDLE) {
      need(typeof file === 'string' && !path.isAbsolute(file) && !file.includes('\\') &&
        file.split('/').every(part => part && part !== '.' && part !== '..') &&
        /^[a-f0-9]{64}$/.test(SHA256), 'BASELINE_SOURCE_PATH');
      const parts = file.split('/');
      let full = root;
      for (let index = 0; index < parts.length; index++) {
        full = path.join(full, parts[index]);
        const stat = await fs.lstat(full);
        need(!stat.isSymbolicLink() && (index === parts.length - 1 ? stat.isFile() : stat.isDirectory()), 'BASELINE_SOURCE_SYMLINK');
      }
      need(sha(await fs.readFile(full)) === SHA256, 'BASELINE_SOURCE_HASH');
    }
  } else {
    need(canonical(provenance.SOURCE_BUNDLE).equals(canonical(P.source_bundle)), 'GENERATOR_SOURCE_BUNDLE');
  }
  need(config.RAW_ARCHIVE_BUCKET === P.authority.RAW_ARCHIVE_BUCKET && config.RAW_ARCHIVE_REGION === P.authority.RAW_ARCHIVE_REGION &&
    config.RAW_ARCHIVE_ACCESS_CLASS === 'PRIVATE_S3_DURABLE' && config.SCHEMA_VERSION === P.authority.SCHEMA_VERSION &&
    config.POLICY_VERSION === P.authority.POLICY_VERSION && config.SOURCE_STATE === 'COMMITTED' &&
    config.GENERATOR_COMMIT === provenance.GENERATOR_COMMIT &&
    config.RAW_ARCHIVE_RELATIVE_PATH === 'statistical-levels/raw-authority/' + provenance.BASELINE_ID + '/', 'PROVENANCE_CONFIG');
  for (const key of ['RAW_MANIFEST_SHA256', 'RAW_ARCHIVE_MANIFEST_SHA256', 'RAW_ARCHIVE_SEAL_SHA256']) need(/^[a-f0-9]{64}$/.test(config[key]), 'PROVENANCE_HASH');
  need(Number.isFinite(Date.parse(config.SNAPSHOT_CUTOFF)), 'PROVENANCE_CUTOFF');
  const authority = { authority_run_id: provenance.BASELINE_ID, sealed_manifest_sha256: config.RAW_ARCHIVE_SEAL_SHA256 };
  // Source/component bytes stay pinned; all data hashes come from this candidate's sidecar.
  if (!adoption) need(provenance.BASELINE_ID.slice(0, 8) > P.baseline.authority_run_id.slice(0, 8), 'FUTURE_AUTHORITY_REQUIRED');
  if (target.origin) validateTarget({ ...target, ...authority });
  need(provenance.snapshots.length === 81 && new Set(provenance.snapshots.map(x => x.FILE)).size === 81, 'SNAPSHOT_COVERAGE');
  const expectedPaths = P.allowlist.filter(x => x.startsWith('lib/statistical-levels/generated/')).sort();
  need(canonical(provenance.snapshots.map(x => 'lib/statistical-levels/generated/' + x.FILE).sort()).equals(canonical(expectedPaths)), 'SNAPSHOT_PATH_SET');
  for (const entry of provenance.snapshots) {
    const file = 'lib/statistical-levels/generated/' + entry.FILE;
    for (const key of ['GENERATOR_COMMIT', 'GENERATOR_SHA256', 'CONFIG_SHA256', 'GENERATED_AT']) need(entry[key] === provenance[key], 'SNAPSHOT_PROVENANCE_BINDING');
    need(entry.SNAPSHOT_SHA256 === sha(await readData(file)), 'SNAPSHOT_BYTE_HASH');
    need(entry.INPUTS.length > 0 && entry.INPUTS.every(i => i.RAW_SOURCE_ID.startsWith(provenance.BASELINE_ID + '/raw/') &&
      /^[a-f0-9]{64}$/.test(i.RAW_SHA256) && i.SNAPSHOT_CUTOFF === config.SNAPSHOT_CUTOFF), 'PROVENANCE_INPUT_COVERAGE');
  }
  const manifest = JSON.parse(await readData('lib/statistical-levels/generated/manifest.json'));
  need(manifest.baseline.id === provenance.BASELINE_ID && manifest.catalog.length === 40, 'SNAPSHOT_MANIFEST_AUTHORITY');
  const ledgerFile = await fs.readFile(path.join(codeRoot, 'docs/statistical-levels-capability-ledger.json'));
  need(sha(ledgerFile) === P.ledger_hash, 'CAPABILITY_LEDGER_HASH');
  need(canonical(JSON.parse(ledgerFile).capabilities.map(x => x.ID)).equals(canonical(P.capabilities)), 'CAPABILITY_LEDGER');
  return authority;
}
export async function runCandidateQA(options) {
  await verifyInputs(options.codeRoot, options.inputManifest, options.target);
  return runReadOnlyQA(options, createHarness);
}
