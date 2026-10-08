// Executable specification only. No raw-data engine, network, application imports or runtime integration.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const read = name => JSON.parse(readFileSync(path.join(directory, name), 'utf8'));
const table = read('decision-table.json');
const registry = read('feature-registry.json');
const dependencies = read('dependency-map.json');
const parameters = read('parameters.json');
const ledger = read('source-ledger.json');
const tests = [];
function check(name, fn) { fn(); tests.push({ name, status: 'PASS' }); }
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = Object.keys(table.input_vocabularies);
const combinations = entries => entries.reduce((rows, [key, values]) => rows.flatMap(row => values.map(value => ({ ...row, [key]: value }))), [{}]);

function equity(participation, leadership) {
  if ([participation, leadership].includes('UNAVAILABLE')) return 'UNAVAILABLE';
  if (participation === 'FAVORABLE' && leadership === 'FAVORABLE') return 'FAVORABLE';
  if ([participation, leadership].includes('ADVERSE') && ![participation, leadership].includes('FAVORABLE')) return 'ADVERSE';
  return 'MIXED';
}

function adjudicate(input) {
  // Whitelist the conceptual core vocabulary. Extra satellite/score/presentation fields are not read.
  const core = Object.fromEntries(inputs.map(key => {
    assert(table.input_vocabularies[key].includes(input[key]), `Invalid or absent ${key}`);
    return [key, input[key]];
  }));
  core.equity = equity(core.participation, core.leadership);
  const rule = table.rules.find(candidate => Object.entries(candidate.when).every(([key, allowed]) =>
    key === 'any_unavailable' ? allowed.some(field => core[field] === 'UNAVAILABLE') : allowed.includes(core[key])));
  assert(rule, 'Uncovered state');
  return { regime: rule.regime, reading_status: rule.reading_status, rule_id: rule.id };
}

function descriptors(core) {
  const a = equity(core.participation, core.leadership);
  const c = core.fragility;
  let eq = 'MIXED';
  if (a === 'UNAVAILABLE' || c === 'UNAVAILABLE') eq = null;
  else if (a === 'FAVORABLE' && c === 'HIGH') eq = 'MIXED';
  else if (a === 'ADVERSE' || c === 'HIGH') eq = 'ADVERSE';
  else if (a === 'FAVORABLE' && c === 'LOW') eq = 'FAVORABLE';
  const vol = ({ BENIGN: 'FAVORABLE', WATCH: 'MIXED', ADVERSE: 'ADVERSE', STRESS: 'ADVERSE', UNAVAILABLE: null })[core.volatility];
  return { equity_price_complex: eq, implied_volatility_complex: vol };
}

function concordance(core) {
  const [eq, vol] = Object.values(descriptors(core));
  if (eq === null || vol === null) return null;
  if (eq === 'MIXED' || vol === 'MIXED') return 'MEDIUM';
  return eq === vol ? 'HIGH' : 'LOW';
}

function uncertainty(core) {
  if (adjudicate(core).regime === null) return { level: null, plausible: [] };
  const alternatives = {
    participation: core.participation === 'MIXED' ? ['FAVORABLE', 'MIXED', 'ADVERSE'] : [core.participation],
    leadership: core.leadership === 'MIXED' ? ['FAVORABLE', 'MIXED', 'ADVERSE'] : [core.leadership],
    volatility: core.volatility === 'WATCH' ? ['BENIGN', 'WATCH', 'ADVERSE'] : [core.volatility],
    fragility: core.fragility === 'RISING' ? ['LOW', 'RISING', 'HIGH'] : [core.fragility],
  };
  const states = new Set(combinations(Object.entries(alternatives)).map(value => adjudicate(value).regime));
  const plausible = table.regime_vocabulary.filter(value => states.has(value));
  return { level: plausible.length === 1 ? 'LOW' : plausible.length === 2 ? 'MEDIUM' : 'HIGH', plausible };
}

check('Registry: thirteen required fields, unique IDs and known source references', () => {
  const required = ['feature_id', 'name', 'family', 'source', 'economic_meaning', 'transform', 'window', 'freshness', 'minimum_history', 'dependency_group', 'required_or_optional', 'missing_behavior', 'existing_or_new'];
  assert.equal(new Set(registry.features.map(f => f.feature_id)).size, registry.features.length);
  const known = new Set(ledger.sources.map(source => source.source_id));
  for (const feature of registry.features) {
    for (const key of required) assert(feature[key], `${feature.feature_id}: ${key}`);
    assert(feature.source.audit_ids.length > 0);
    assert(feature.source.providers.length > 0);
    feature.source.audit_ids.forEach(id => assert(known.has(id), `Unknown source ${id}`));
    assert(registry.family_vocabulary.includes(feature.family));
    assert(dependencies.concordance_units.some(unit => unit.dependency_group === feature.dependency_group));
  }
});

check('Dependency graph: all parents resolve, same group, no cycles, exact registry edge set', () => {
  const nodes = new Map([...dependencies.raw_nodes.map(node => [node.id, node]), ...registry.features.map(f => [f.feature_id, f])]);
  assert.equal(nodes.size, dependencies.raw_nodes.length + registry.features.length);
  const visiting = new Set(); const visited = new Set();
  function visit(id) {
    assert(nodes.has(id), `Unknown parent ${id}`);
    assert(!visiting.has(id), `Cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const parent of nodes.get(id).depends_on ?? []) {
      assert(nodes.has(parent), `Unknown parent ${parent}`);
      assert.equal(nodes.get(parent).dependency_group, nodes.get(id).dependency_group);
      visit(parent);
    }
    visiting.delete(id); visited.add(id);
  }
  for (const id of nodes.keys()) visit(id);
  const expected = registry.features.flatMap(f => f.depends_on.map(p => `${p}->${f.feature_id}`)).sort();
  assert.deepEqual(dependencies.edges.map(edge => `${edge.from}->${edge.to}`).sort(), expected);
});

check('Core grouping: only two nonduplicated units; satellites and PFL have zero votes', () => {
  const coreFeatures = registry.features.filter(f => f.required_or_optional === 'REQUIRED_CORE');
  const units = features => [...new Set(features.map(f => f.dependency_group))].sort();
  assert.deepEqual(units(coreFeatures), ['equity_price_complex', 'implied_volatility_complex']);
  assert.deepEqual(units([...coreFeatures, ...coreFeatures, ...coreFeatures]), units(coreFeatures));
  for (const unit of dependencies.concordance_units) {
    assert.equal(unit.core_vote_limit, units(coreFeatures).includes(unit.dependency_group) ? 1 : 0);
  }
  assert.equal(registry.features.find(f => f.feature_id === 'legacy_fragility_score').required_or_optional, 'EXCLUDED');
});

check('Optional quality profile: only declared optional evidence, no silently activated parked signal', () => {
  for (const id of registry.initial_profile_optional_features) {
    assert.equal(registry.features.find(f => f.feature_id === id)?.required_or_optional, 'OPTIONAL_EVIDENCE');
  }
});

check('Unbound parameters: gate closed and no runtime/defaults', () => {
  assert.equal(parameters.builder_ready, false);
  assert.equal(parameters.default_values_allowed, false);
  assert.equal(registry.runtime_enabled, false);
  assert.equal(parameters.parameters.length, 9);
  for (const parameter of parameters.parameters) {
    assert.equal(parameter.value, null);
    assert.equal(parameter.blocking_builder, true);
    assert.equal(parameter.status, 'PARAMETER_REQUIRES_VALIDATION');
    assert(parameter.domain && parameter.resolution_evidence);
  }
});

check('Decision table: closed vocabulary, canonical precedence, technical missing outside regime enum', () => {
  assert.deepEqual(table.regime_vocabulary, ['RISK_ON_BROAD', 'RISK_ON_SELECTIVE', 'TRANSITION', 'DEFENSIVE', 'STRESS']);
  assert.equal(table.match_policy, 'FIRST_MATCH');
  assert.deepEqual(table.rules.map(rule => rule.id), ['R00', 'R01', 'R02', 'R03', 'R04', 'R05', 'R06']);
  assert.deepEqual(table.rules[0].when.any_unavailable, inputs);
  assert.deepEqual(table.rules.at(-1).when, {});
  for (const rule of table.rules) {
    assert(rule.regime === null || table.regime_vocabulary.includes(rule.regime));
    for (const [key, allowed] of Object.entries(rule.when)) {
      assert(Array.isArray(allowed) && allowed.length > 0);
      if (key === 'any_unavailable') continue;
      const vocabulary = key === 'equity' ? table.input_vocabularies.participation : table.input_vocabularies[key];
      assert(vocabulary, `Unexpected rule input: ${key}`);
      allowed.forEach(value => assert(vocabulary.includes(value)));
    }
  }
});

const all = combinations(Object.entries(table.input_vocabularies));
const counts = Object.fromEntries([...table.regime_vocabulary, 'INCOMPLETE'].map(state => [state, 0]));
const rulesUsed = new Set();
check('Exhaustive abstract coverage: 320 configurations, 108 complete and 212 incomplete', () => {
  assert.equal(all.length, 320);
  for (const core of all) {
    const result = adjudicate(core);
    assert.deepEqual(result, adjudicate(structuredClone(core)));
    assert.deepEqual(result, adjudicate(Object.fromEntries(Object.entries(core).reverse())));
    assert.equal(result.regime === null, Object.values(core).includes('UNAVAILABLE'));
    counts[result.regime ?? 'INCOMPLETE'] += 1;
    rulesUsed.add(result.rule_id);
  }
  assert.equal(counts.INCOMPLETE, 212);
  assert.equal(all.length - counts.INCOMPLETE, 108);
  assert.deepEqual([...rulesUsed].sort(), table.rules.map(rule => rule.id));
});

check('Every declared market state has a conceptual witness with the expected rule', () => {
  for (const witness of table.witnesses) {
    const result = adjudicate(witness);
    assert.equal(result.regime, witness.expected);
    assert.equal(result.rule_id, witness.rule);
  }
  assert.deepEqual([...new Set(table.witnesses.map(row => row.expected))].sort(), [...table.regime_vocabulary].sort());
});

check('Missing is not neutral: each critical dimension independently makes reading incomplete', () => {
  const favorable = table.witnesses[0];
  for (const key of inputs) {
    assert.equal(adjudicate({ ...favorable, [key]: 'UNAVAILABLE' }).regime, null);
    assert.equal(uncertainty({ ...favorable, [key]: 'UNAVAILABLE' }).level, null);
    assert.equal(concordance({ ...favorable, [key]: 'UNAVAILABLE' }), null);
    for (const invalid of [null, undefined, '', 0, 50, NaN, 'NEUTRAL']) assert.throws(() => adjudicate({ ...favorable, [key]: invalid }));
  }
});

check('Shock precedence respects missing gate and bypasses all complete-state alternatives', () => {
  for (const core of all.filter(core => core.volatility === 'STRESS')) {
    const incomplete = Object.values(core).includes('UNAVAILABLE');
    assert.equal(adjudicate(core).regime, incomplete ? null : 'STRESS');
  }
});

check('Contradictions: weak breadth/benign VIX/rising fragility stays transition', () => {
  const awkward = { participation: 'ADVERSE', leadership: 'MIXED', volatility: 'BENIGN', fragility: 'RISING' };
  assert.equal(adjudicate(awkward).regime, 'TRANSITION');
  assert.equal(concordance(awkward), 'LOW');
  assert.equal(adjudicate({ participation: 'FAVORABLE', leadership: 'FAVORABLE', volatility: 'ADVERSE', fragility: 'LOW' }).regime, 'TRANSITION');
  assert.equal(adjudicate({ participation: 'FAVORABLE', leadership: 'FAVORABLE', volatility: 'BENIGN', fragility: 'HIGH' }).regime, 'TRANSITION');
});

check('Satellite isolation across the entire table: extreme, absent and stale enrichment ignored', () => {
  for (const core of all) {
    const expected = { decision: adjudicate(core), concordance: concordance(core), uncertainty: uncertainty(core) };
    for (const satellite of [{ btc: -1e12, gld: -1e12 }, { btc: 1e12, gld: 1e12 }, { btc: null, gld: null }, { btc: { status: 'STALE' }, gld: { status: 'DEMO' } }]) {
      const enriched = { ...core, ...satellite };
      assert.deepEqual({ decision: adjudicate(enriched), concordance: concordance(enriched), uncertainty: uncertainty(enriched) }, expected);
    }
  }
});

check('Qualitative dimensions: full vocabulary reachable; observed regime always plausible', () => {
  const concordances = new Set(); const uncertainties = new Set();
  for (const core of all) {
    const c = concordance(core); const u = uncertainty(core); const result = adjudicate(core);
    concordances.add(c); uncertainties.add(u.level);
    assert([null, 'HIGH', 'MEDIUM', 'LOW'].includes(c));
    assert([null, 'LOW', 'MEDIUM', 'HIGH'].includes(u.level));
    if (result.regime !== null) assert(u.plausible.includes(result.regime));
    else assert.deepEqual(u.plausible, []);
  }
  assert.deepEqual([...concordances].sort(), ['HIGH', 'LOW', 'MEDIUM', null].sort());
  assert.deepEqual([...uncertainties].sort(), ['HIGH', 'LOW', 'MEDIUM', null].sort());
  const shock = table.witnesses.at(-1);
  assert.equal(concordance(shock), 'LOW');
  assert.equal(uncertainty(shock).level, 'LOW');
});

check('Source audit is pinned to the inspected local bytes', () => {
  for (const source of ledger.sources) assert.equal(hash(readFileSync(path.join(root, source.path))), source.sha256, source.path);
});

check('Historical V1 integrity: frozen files retain their existing hashes and values', () => {
  const base = path.join(root, 'lib/reports/snapshots/primer-informe-septiembre-2026');
  const integrity = JSON.parse(readFileSync(path.join(base, 'integrity.json'), 'utf8'));
  for (const [name, expected] of Object.entries(integrity.files)) assert.equal(hash(readFileSync(path.join(base, name))), expected, name);
  const automatic = JSON.parse(readFileSync(path.join(base, 'automatic.json'), 'utf8'));
  assert.deepEqual([automatic.regime.label, automatic.regime.score, automatic.regime.confidence], ['Risk-on selectivo', 74, 88]);
  assert.equal(integrity.asOf, '2026-09-04');
  assert.equal(integrity.capturedAt, '2026-09-06');
});

check('V1 conceptual maximum remains below the constructive threshold after rounding', () => {
  const maximum = 83 * .45 + 78 * .4 + 74 * .15;
  assert(Math.abs(maximum - 79.65) < 1e-12);
  assert.equal(Math.round(maximum), 80);
  assert(!(Math.round(maximum) > 80));
});

const report = {
  scope: 'PROTOTYPE_CONTRACT_ONLY',
  spec_version: 'regime-v2-prototype/1.0.0',
  feature_count: registry.features.length,
  raw_node_count: dependencies.raw_nodes.length,
  abstract_configurations: all.length,
  abstract_occupancy_not_historical_frequency: counts,
  checks_passed: tests.length,
  checks_total: tests.length,
  checks: tests,
  conceptual_reachability: 'PASS',
  raw_input_reachability: 'NOT_VALIDATED',
  parameter_validation: 'NOT_VALIDATED',
  historical_point_in_time_replay: 'NOT_RUN',
  production_satellite_isolation: 'NOT_RUN',
  production_dependency_sweep: 'NOT_RUN',
  historical_benchmark_comparison: 'NOT_RUN',
  production_engine: 'NOT_IMPLEMENTED',
  typecheck: 'NOT_RUN_DOCUMENTATION_ONLY',
  build: 'NOT_RUN_DOCUMENTATION_ONLY',
  lint: 'NOT_RUN_DOCUMENTATION_ONLY',
  visual_qa: 'NOT_APPLICABLE',
  builder_ready: false,
  release_candidate: false,
  unresolved_parameters: parameters.parameters.filter(item => item.value === null).map(item => item.id),
  artifacts_sha256: Object.fromEntries(['README.md', 'feature-registry.json', 'dependency-map.json', 'parameters.json', 'decision-table.json', 'specification.md', 'acceptance-contract.md', 'source-audit.md', 'source-ledger.json', 'prototype-check.mjs'].map(name => [name, hash(readFileSync(path.join(directory, name)))])),
};
if (process.argv.includes('--write')) writeFileSync(path.join(directory, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, checks: undefined, artifacts_sha256: undefined }, null, 2));
