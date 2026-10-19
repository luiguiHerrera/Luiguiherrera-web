import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { securityCases, runSecurityCase, verifyProject, extract, dependencyPaths } = require('../scripts/verify-braces-patch-attestation.cjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const bundle = 'scripts/statistical-levels-release/';
const installed = path.join(root, 'node_modules/braces');
const policy = JSON.parse(fs.readFileSync(path.join(root, bundle, 'braces-patch-attestation.json')));
const audit = policy.REGRESSION_AUDIT_REPORT;
const clone = value => JSON.parse(JSON.stringify(value));
const parsedCases = securityCases();
assert.equal(parsedCases.length, 57);
for (const c of parsedCases) test('braces security: ' + c.id, () => {
  const observed = runSecurityCase(installed, c.id);
  assert.equal(observed.result, c.want, JSON.stringify(observed));
  if (c.want === 'REJECTED') { assert.equal(observed.stackExhaustion, false); assert.match(observed.message, /exceeds max depth/); }
});
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-braces-regression-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const name of ['package.json', 'package-lock.json', 'vendor/braces-3.0.3-sl-backport.tgz', bundle + 'braces-patch-attestation.json', bundle + 'vendor/braces/npm-braces-3.0.3.tgz', bundle + 'vendor/braces/ghsa-vfj7-8cjw-p6xm-upstream.patch', bundle + 'vendor/braces/ghsa-vfj7-8cjw-p6xm-backport.patch']) {
    const dest = path.join(dir, name); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(root, name), dest);
  }
  for (const name of ['braces', 'fill-range', 'to-regex-range', 'is-number']) fs.cpSync(path.join(root, 'node_modules', name), path.join(dir, 'node_modules', name), { recursive: true });
  for (const name of ['tailwindcss', 'chokidar', 'micromatch', 'fast-glob', 'eslint-config-next', '@next/eslint-plugin-next']) {
    const dest = path.join(dir, 'node_modules', name, 'package.json'); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(root, 'node_modules', name, 'package.json'), dest);
  }
  return dir;
}
function vulnerableBase(t) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-braces-vulnerable-')); t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const base = extract(path.join(root, bundle, 'vendor/braces/npm-braces-3.0.3.tgz'), tmp);
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(base, 'node_modules'), 'dir'); return base;
}
for (const id of ['str:compile:braces', 'ast:compile:root::lib']) test('braces vulnerable base: ' + id, t => {
  const observed = runSecurityCase(vulnerableBase(t), id); assert.equal(observed.result, 'REJECTED'); assert.equal(observed.stackExhaustion, true, JSON.stringify(observed));
});
test('braces escapeInvalid remains authenticated npm behavior', t => {
  const base = require(vulnerableBase(t)), patched = require(installed);
  for (const pattern of ['{a}', '{a..e..2}', '{1..3}', '{a,b}', 'a{b}c', '{01..10}']) {
    for (const opts of [{ escapeInvalid: true }, { expand: true, escapeInvalid: true }, {}]) {
      for (const method of ['stringify', 'compile', 'expand', 'create']) assert.deepEqual(patched[method](pattern, opts), base[method](pattern, opts), method + ':' + pattern);
      assert.deepEqual(patched(pattern, opts), base(pattern, opts));
    }
  }
});
function editJSON(file, update) { const value = JSON.parse(fs.readFileSync(file)); update(value); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }
function addSource(report, name, severity) {
  const source = { source: 9999999, name, dependency: name, title: 'Synthetic unexpected advisory', url: 'https://github.com/advisories/GHSA-other', severity, range: '*' };
  if (name === 'braces') {
    report.vulnerabilities.braces.via.push(source);
    if (severity === 'critical') { report.vulnerabilities.braces.severity = 'critical'; report.metadata.vulnerabilities.high--; report.metadata.vulnerabilities.critical++; }
  } else {
    report.vulnerabilities[name] = { name, severity, via: [source], effects: [], range: '*', nodes: [], fixAvailable: false };
    report.metadata.vulnerabilities[severity]++;
  }
}
const mutations = [
  ['exact authenticated patched tuple', () => {}, true],
  ['unpatched braces 3.0.3', (dir, report, t) => { const base = vulnerableBase(t); for (const name of fs.readdirSync(path.join(base, 'lib'))) fs.copyFileSync(path.join(base, 'lib', name), path.join(dir, 'node_modules/braces/lib', name)); }],
  ['wrong npm base', dir => fs.appendFileSync(path.join(dir, bundle, 'vendor/braces/npm-braces-3.0.3.tgz'), 'wrong')],
  ['wrong backport', dir => fs.appendFileSync(path.join(dir, bundle, 'vendor/braces/ghsa-vfj7-8cjw-p6xm-backport.patch'), 'wrong')],
  ['wrong patched result', dir => fs.appendFileSync(path.join(dir, 'vendor/braces-3.0.3-sl-backport.tgz'), 'wrong')],
  ['changed braces version', dir => editJSON(path.join(dir, 'package-lock.json'), value => { value.packages['node_modules/braces'].version = '3.0.4'; })],
  ['different advisory', (dir, report) => { report.vulnerabilities.braces.via[0].url = 'https://github.com/advisories/GHSA-other'; }],
  ['other braces high', (dir, report) => addSource(report, 'braces', 'high')],
  ['other braces critical', (dir, report) => addSource(report, 'braces', 'critical')],
  ['unrelated high', (dir, report) => addSource(report, 'unrelated', 'high')],
  ['unrelated critical', (dir, report) => addSource(report, 'unrelated', 'critical')],
  ['wrong upstream patch', dir => fs.appendFileSync(path.join(dir, bundle, 'vendor/braces/ghsa-vfj7-8cjw-p6xm-upstream.patch'), 'wrong')],
  ['wrong policy tuple', dir => editJSON(path.join(dir, bundle, 'braces-patch-attestation.json'), value => { value.BACKPORT_SHA256 = '0'.repeat(64); })],
  ['wrong test evidence', dir => editJSON(path.join(dir, bundle, 'braces-patch-attestation.json'), value => { Object.values(value.REQUIRED_EVIDENCE)[0].sha256 = '0'.repeat(64); })],
  ['wrong installed bytes', dir => fs.appendFileSync(path.join(dir, 'node_modules/braces/lib/constants.js'), '\n// changed\n')],
  ['unlisted physical braces', dir => { const dest = path.join(dir, 'node_modules/other/node_modules/braces'); fs.mkdirSync(dest, { recursive: true }); fs.copyFileSync(path.join(dir, 'node_modules/braces/package.json'), path.join(dest, 'package.json')); }],
  ['audit endpoint error', (dir, report) => { report.error = { code: 'EAUDIT', summary: 'error' }; }],
  ['missing audit metadata', (dir, report) => { delete report.metadata; }],
  ['inconsistent audit accounting', (dir, report) => { report.metadata.vulnerabilities.high = 0; }],
  ['changed advisory range', (dir, report) => { report.vulnerabilities.braces.via[0].range = '*'; }]
];
assert.equal(mutations.length, 20);
for (const [name, mutate, accepted = false] of mutations) test('braces exact attestation: ' + name, t => {
  const dir = fixture(t), report = clone(audit); mutate(dir, report, t);
  const result = verifyProject(dir, report); assert.equal(result.verdict, accepted ? 'PASS_ATTESTED' : 'FAIL_CLOSED', JSON.stringify(result));
  if (accepted) assert.ok(dependencyPaths(dir).every(row => row.resolved === path.join(dir, 'node_modules/braces')));
});
