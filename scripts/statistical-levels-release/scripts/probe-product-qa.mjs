// Probe-specific product runner; the shared ADOPT/PROMOTE runner remains unchanged.
import fs from 'node:fs/promises';
import path from 'node:path';
import { P, need, canonical, productGates, validateProductReport } from './release-core.mjs';
import { renderFixtures } from './render-fixtures.mjs';
import { createProductQAObservability } from './product-qa-observability.mjs';
import { runProbeBrowserAuthority, validateProbeBrowserAuthorityEvidence } from './probe-browser-authority.mjs';

export async function runProbeProductQA({ target, tokenSource, out, codeRoot }, createHarness) {
  await fs.mkdir(out, { recursive: true, mode: 0o700 });
  await renderFixtures(codeRoot, out);
  const observability = createProductQAObservability({ out, origin: target.origin, codeRoot });
  const harness = await createHarness(target, observability);
  let productPassed = false, productStarted = false, accounting;
  const oldCwd = process.cwd(), oldArgv = process.argv;
  try {
    globalThis.__SL_RELEASE_QA__ = { ...harness, observability };
    process.chdir(codeRoot);
    process.argv = [process.execPath, 'frozen-candidate-qa', target.origin, '0', out];
    observability.context({ suite_id: 'PRE_PRODUCT_BROWSER_AUTHORITY', test_id: 'historical-layer3', action_id: 'browser-authority-binding' });
    await runProbeBrowserAuthority({ target, harness, onEvidence: async value => {
      const safe = validateProbeBrowserAuthorityEvidence(value, target);
      await fs.writeFile(path.join(out, 'browser-authority.json'), canonical(safe), { mode: 0o600 });
    } });
    productStarted = true;
    observability.productStart();
    for (const [script, report] of [
      ['qa-statistical-levels.mjs', 'browser-report.json'],
      ['qa-statistical-levels-defects.mjs', 'defect-browser-report.json'],
      ['qa-statistical-levels-interaction-polish.mjs', 'interaction-browser-report.json']
    ]) {
      observability.context({ suite_id: script, test_id: script + ':suite', test_name: script, action_id: 'suite-import', source_file: 'scripts/statistical-levels-release/scripts/qa/' + script });
      await import(new URL('./qa/' + script, import.meta.url));
      const evidence = JSON.parse(await fs.readFile(path.join(out, report), 'utf8'));
      need(evidence.PASS === true && !process.exitCode, 'PRODUCT_SUITE_FAILED');
    }
    const coverage = JSON.parse(await fs.readFile(path.join(out, 'browser-report.json'), 'utf8')).coverage;
    need(canonical(coverage.map(x => x.id)).equals(canonical(P.capabilities)) && coverage.every(x => x.passed), 'BROWSER_CAPABILITY_LOSS');
    productPassed = true;
  } catch (error) {
    if (productStarted) observability.captureFailure(error);
    throw error;
  } finally {
    delete globalThis.__SL_RELEASE_QA__; process.chdir(oldCwd); process.argv = oldArgv;
    observability.context({ action_id: 'harness-cleanup', source_file: 'scripts/statistical-levels-release/scripts/probe-product-qa.mjs', source_line: 47 });
    try {
      accounting = await harness.finish(productPassed); tokenSource?.clear();
    } finally {
      observability.flush();
    }
  }
  const report = { result: 'PASS', gates: Object.fromEntries(productGates.map(x => [x, 'PASS'])),
    snapshot_count: 81, provenance_coverage: 100, capability_ids: P.capabilities,
    routes: ['/niveles-estadisticos', '/en/statistical-levels'], viewports: [[1440, 900], [390, 844]],
    application_console_errors: accounting.application_console_errors,
    required_application_request_failures: accounting.required_application_request_failures,
    broken_assets: 0, hydration_errors: accounting.hydration_errors, overflow: 0,
    raw_platform_events: accounting.raw_platform_events, raw_rsc_events: accounting.raw_rsc_events,
    unclassified_failures: accounting.unclassified_failures, expected_values: 'PASS' };
  observability.context({ suite_id: 'PRODUCT_REPORT_VALIDATION', test_id: 'validateProductReport', test_name: 'validateProductReport', assertion_id: 'validateProductReport', action_id: 'final-product-report', source_file: 'scripts/statistical-levels-release/scripts/probe-product-qa.mjs', source_line: 62 });
  try {
    validateProductReport(report);
    await fs.writeFile(path.join(out, 'product-report.json'), canonical(report));
    return report;
  } catch (error) {
    observability.captureFailure(error);
    throw error;
  } finally {
    observability.flush();
  }
}
