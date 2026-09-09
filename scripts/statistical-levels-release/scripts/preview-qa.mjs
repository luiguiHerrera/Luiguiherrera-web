import fs from 'node:fs/promises';
import path from 'node:path';
import { P, need, sha, canonical, productGates, validateProductReport, validateTarget, ADOPT } from './release-core.mjs';
import { createHarness } from './browser-harness.mjs';
import { renderFixtures } from './render-fixtures.mjs';

export async function verifyInputs(codeRoot, inputManifest, target) {
  for (const [file, expected] of Object.entries(inputManifest)) {
    need(!file.includes('..') && !path.isAbsolute(file), 'QA_INPUT_PATH');
    const stat = await fs.lstat(path.join(codeRoot, file));
    need(stat.isFile() && !stat.isSymbolicLink(), 'QA_INPUT_SYMLINK');
    need(sha(await fs.readFile(path.join(codeRoot, file))) === expected, 'QA_INPUT_HASH');
  }
  const readData = async file => { const full = path.join(codeRoot, file); const stat = await fs.lstat(full); need(stat.isFile() && !stat.isSymbolicLink(), 'QA_DATA_SYMLINK'); return fs.readFile(full); };
  const provenanceBytes = await readData('lib/statistical-levels/generated-provenance.json');
  const provenance = JSON.parse(provenanceBytes);
  const config = provenance.CONFIG;
  need(provenance.SCHEMA_VERSION === 'statistical-levels.provenance.v1' && provenance.SOURCE_STATE === 'COMMITTED' &&
    /^[a-f0-9]{40}$/.test(provenance.GENERATOR_COMMIT) && config.BASELINE_ID === provenance.BASELINE_ID, 'PROVENANCE_AUTHORITY');
  need(sha(JSON.stringify(config)) === provenance.CONFIG_SHA256 && sha(JSON.stringify(provenance.SOURCE_BUNDLE)) === provenance.GENERATOR_SHA256, 'PROVENANCE_SELF_HASH');
  need(canonical(provenance.SOURCE_BUNDLE).equals(canonical(P.source_bundle)), 'GENERATOR_SOURCE_BUNDLE');
  need(config.RAW_ARCHIVE_BUCKET === P.authority.RAW_ARCHIVE_BUCKET && config.RAW_ARCHIVE_REGION === P.authority.RAW_ARCHIVE_REGION &&
    config.RAW_ARCHIVE_ACCESS_CLASS === 'PRIVATE_S3_DURABLE' && config.SCHEMA_VERSION === P.authority.SCHEMA_VERSION &&
    config.POLICY_VERSION === P.authority.POLICY_VERSION && config.SOURCE_STATE === 'COMMITTED' &&
    config.GENERATOR_COMMIT === provenance.GENERATOR_COMMIT &&
    config.RAW_ARCHIVE_RELATIVE_PATH === 'statistical-levels/raw-authority/' + provenance.BASELINE_ID + '/', 'PROVENANCE_CONFIG');
  for (const key of ['RAW_MANIFEST_SHA256', 'RAW_ARCHIVE_MANIFEST_SHA256', 'RAW_ARCHIVE_SEAL_SHA256']) need(/^[a-f0-9]{64}$/.test(config[key]), 'PROVENANCE_HASH');
  need(Number.isFinite(Date.parse(config.SNAPSHOT_CUTOFF)), 'PROVENANCE_CUTOFF');
  const authority = { authority_run_id: provenance.BASELINE_ID, sealed_manifest_sha256: config.RAW_ARCHIVE_SEAL_SHA256 };
  // Source/component bytes stay pinned; all data hashes come from this candidate's sidecar.
  if (target.operation === ADOPT) need(sha(provenanceBytes) === P.baseline.provenance_sha256, 'BASELINE_PROVENANCE_HASH');
  else need(provenance.BASELINE_ID.slice(0, 8) > P.baseline.authority_run_id.slice(0, 8), 'FUTURE_AUTHORITY_REQUIRED');
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
export async function runCandidateQA({ target, tokenSource, out, codeRoot, inputManifest }) {
  await verifyInputs(codeRoot, inputManifest, target);
  await fs.mkdir(out, { recursive: true, mode: 0o700 });
  await renderFixtures(codeRoot, out);
  const harness = await createHarness(target, tokenSource, out);
  let productPassed = false, accounting;
  const oldCwd = process.cwd(), oldArgv = process.argv;
  try {
    globalThis.__SL_RELEASE_QA__ = harness;
    process.chdir(codeRoot);
    process.argv = [process.execPath, 'frozen-candidate-qa', target.origin, '0', out];
    for (const route of ['/niveles-estadisticos', '/en/statistical-levels']) {
      const response = await harness.protectedGet(target.origin + route);
      const html = await response.text();
      need(html.includes(target.authority_run_id), 'SERVED_AUTHORITY_MISMATCH');
    }
    for (const [script, report] of [
      ['qa-statistical-levels.mjs', 'browser-report.json'],
      ['qa-statistical-levels-defects.mjs', 'defect-browser-report.json'],
      ['qa-statistical-levels-interaction-polish.mjs', 'interaction-browser-report.json']
    ]) {
      await import(new URL('./qa/' + script, import.meta.url));
      const evidence = JSON.parse(await fs.readFile(path.join(out, report), 'utf8'));
      need(evidence.PASS === true && !process.exitCode, 'PRODUCT_SUITE_FAILED');
    }
    const coverage = JSON.parse(await fs.readFile(path.join(out, 'browser-report.json'), 'utf8')).coverage;
    need(canonical(coverage.map(x => x.id)).equals(canonical(P.capabilities)) && coverage.every(x => x.passed), 'BROWSER_CAPABILITY_LOSS');
    productPassed = true;
  } finally {
    delete globalThis.__SL_RELEASE_QA__; process.chdir(oldCwd); process.argv = oldArgv;
    accounting = await harness.finish(productPassed); tokenSource?.clear();
  }
  const report = { result: 'PASS', gates: Object.fromEntries(productGates.map(x => [x, 'PASS'])),
    snapshot_count: 81, provenance_coverage: 100, capability_ids: P.capabilities,
    routes: ['/niveles-estadisticos', '/en/statistical-levels'], viewports: [[1440, 900], [390, 844]],
    application_console_errors: accounting.application_console_errors,
    required_application_request_failures: accounting.required_application_request_failures,
    broken_assets: 0, hydration_errors: accounting.hydration_errors, overflow: 0,
    raw_platform_events: accounting.raw_platform_events, raw_rsc_events: accounting.raw_rsc_events,
    unclassified_failures: accounting.unclassified_failures, expected_values: 'PASS' };
  validateProductReport(report);
  await fs.writeFile(path.join(out, 'product-report.json'), canonical(report));
  return report;
}
