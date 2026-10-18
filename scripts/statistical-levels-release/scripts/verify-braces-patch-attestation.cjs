/* eslint-disable @typescript-eslint/no-require-imports -- The authorized verifier path is a Node CommonJS module. */
'use strict';
// One exact security-only backport; every other high/critical advisory fails.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const TUPLE = Object.freeze({
  PACKAGE: 'braces', UPSTREAM_VERSION: '3.0.3', ADVISORY: 'GHSA-vfj7-8cjw-p6xm',
  ADVISORY_RANGE: '<=3.0.3', AUDIT_LEVEL: 'high',
  NPM_BASE_TARBALL_SHA256: '1cd18e862c8640b4568b1425a7df4ee030ff201d45b2da8f9f222d2987494ffc',
  UPSTREAM_PATCH_SHA256: '152af73bccc5e483ea0212ab795495e80e2903d92794f3e45baa81002f39dcec',
  BACKPORT_SHA256: '879ca37d09e6650f1add0455a5049e793f548f62434da32f268e9d36db224d8d',
  PATCHED_RESULT_SHA256: '4e9550f8c4b0e4cfff73bd0c55cabbae0277acff892eb499313776f5a3e44428',
  PATCHED_RESULT_INTEGRITY: 'sha512-LKMNO6Xo5rhsqTCOY0q5K/g85IqoS65EUBRCJNhtiYbsJK5gPFSRXPeZ948cApRAwzXwCeTr3vO3dYndBc9xEQ==',
  PATCHED_FILE_MANIFEST_SHA256: '2cfe87c8ef5498c59b2046c57699a055849592adbae7206dfd3921d4d4ee4bfb',
  LOCK_RESOLVED: 'file:vendor/braces-3.0.3-sl-backport.tgz'
});
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const CHILD_CASE_SOURCE = "// one case per process: node case.cjs <root> <caseId>\nconst root=process.argv[1],id=process.argv[2];\nconst b=require(root),parse=require(root+'/lib/parse'),L={compile:require(root+'/lib/compile'),expand:require(root+'/lib/expand'),stringify:require(root+'/lib/stringify')};\nconst nest=(o,c,n,mid='a')=>o.repeat(n)+mid+c.repeat(n);\nconst ast=(n,rootType='root',type='brace')=>{let a={type:'text',value:'a'};for(let i=0;i<n;i++)a={type,nodes:[a]};return rootType?{type:rootType,nodes:[a]}:a};\nconst P={braces:nest('{','}',4000),parens:nest('(',')',4000),commasets:'{a,'.repeat(3000)+'b'+'}'.repeat(3000),mixed:'{('.repeat(2400)+'a'+')}'.repeat(2400)};\nconst [kind,...a]=id.split(':');let fn;\nif(kind==='parse')fn=()=>parse(P[a[0]]);\nelse if(kind==='str')fn=()=>({call:()=>b(P[a[1]]),expand:()=>b.expand(P[a[1]]),compile:()=>b.compile(P[a[1]]),create:()=>b.create(P[a[1]],{expand:true}),stringify:()=>b.stringify(P[a[1]])})[a[0]]();\nelse if(kind==='ast'){const t={root:()=>ast(4000),nonroot:()=>ast(4000,null),paren:()=>ast(4000,'root','paren'),cyclic:()=>{const c={type:'root',nodes:[]},i={type:'brace',nodes:[{type:'text',value:'a'}]};i.nodes.push(i);c.nodes.push(i);return c}}[a[1]]();const o=a[2]==='big'?{maxDepth:1e6}:a[2]==='inf'?{maxDepth:Infinity}:undefined;fn=a[3]==='public'?()=>b[a[0]](t,o||{}):()=>L[a[0]](t,o)}\nelse if(kind==='astdepth')fn=()=>L[a[0]](ast(+a[1]));\nelse if(kind==='bparse')fn=()=>parse(nest(a[0]==='b'?'{':'(',a[0]==='b'?'}':')',+a[1]));\nelse if(kind==='bcall')fn=()=>b[a[0]](nest('{','}',+a[1],'a,b'));\nelse if(kind==='opt'){const v={one:1,big:1e6,inf:Infinity,nan:NaN,str:'1000',nul:null,neg:-1}[a[0]];fn=()=>parse(a[1]==='d1'?'{a,b}':a[1]==='d2'?'{{a,b},c}':nest('{','}',101),{maxDepth:v})}\nelse if(kind==='shape'){const s=(a[0].repeat(+a[2])+'x'+a[1].repeat(+a[2])).slice(0,10000);fn=[()=>b(s),()=>b.expand(s),()=>b.compile(s),()=>b.stringify(s),()=>b(s,{expand:true,nodupes:true}),()=>b(s,{escapeInvalid:true})][+a[3]]}\ntry{const v=fn();console.log(JSON.stringify({result:'ACCEPTED',size:Array.isArray(v)?v.length:(typeof v==='string'?v.length:undefined)}))}catch(e){console.log(JSON.stringify({result:'REJECTED',error:e.name,message:String(e.message).slice(0,80),stackExhaustion:/Maximum call stack/.test(e.message)}))}\n";
function runSecurityCase(packageRoot, id) {
  const result = spawnSync(process.execPath, ['--max-old-space-size=256', '-e', CHILD_CASE_SOURCE, path.resolve(packageRoot), id], { encoding: 'utf8', timeout: 8000, maxBuffer: 1048576 });
  if (result.status !== 0 || result.error || result.signal) return { result: 'PROCESS_FAILURE', status: result.status, signal: result.signal, error: result.error?.message };
  return JSON.parse(result.stdout.trim());
}
function securityCases() {
  const cases = [], add = (id, want) => cases.push({ id, want });
  for (const m of ['compile', 'expand', 'stringify']) {
    for (const shape of ['braces', 'parens', 'mixed']) add(`str:${m}:${shape}`, 'REJECTED');
    for (const t of ['root', 'nonroot', 'paren', 'cyclic']) add(`ast:${m}:${t}::lib`, m === 'expand' && t === 'cyclic' ? 'ACCEPTED' : 'REJECTED');
    for (const v of ['big', 'inf']) add(`ast:${m}:root:${v}:lib`, 'REJECTED');
    add(`ast:${m}:root::public`, 'REJECTED');
    for (const d of [99, 100, 101]) add(`astdepth:${m}:${d}`, d <= 100 ? 'ACCEPTED' : 'REJECTED');
    for (const d of [100, 101]) add(`bcall:${m}:${d}`, d <= 100 ? 'ACCEPTED' : 'REJECTED');
  }
  for (const k of ['b', 'p']) for (const d of [100, 101]) add(`bparse:${k}:${d}`, d <= 100 ? 'ACCEPTED' : 'REJECTED');
  for (const v of ['big', 'inf', 'nan', 'str', 'nul', 'neg']) add(`opt:${v}:d101`, 'REJECTED');
  add('opt:one:d1', 'ACCEPTED'); add('opt:one:d2', 'REJECTED');
  return cases;
}
function requireCondition(value, code) { if (!value) throw new Error(code); }
function regular(root, relative) {
  const file = path.join(root, relative), parts = relative.split('/'); let current = root;
  requireCondition(!path.isAbsolute(relative) && !parts.some(p => ['', '.', '..'].includes(p)), 'UNSAFE_ASSET_PATH');
  for (const part of parts) { current = path.join(current, part); requireCondition(!fs.lstatSync(current).isSymbolicLink(), 'LINKED_ASSET'); }
  requireCondition(fs.statSync(file).isFile(), 'ASSET_NOT_REGULAR'); return file;
}
function fileHashes(directory) {
  const result = {};
  const walk = (dir, prefix = '') => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const relative = prefix + entry.name, file = path.join(dir, entry.name);
      requireCondition(!entry.isSymbolicLink(), 'LINKED_PACKAGE_BYTES');
      if (entry.isDirectory()) walk(file, relative + '/');
      else { requireCondition(entry.isFile(), 'NONREGULAR_PACKAGE_BYTES'); result[relative] = sha(fs.readFileSync(file)); }
    }
  };
  walk(directory); return result;
}
function manifestHash(hashes) { return sha(Buffer.from(Object.keys(hashes).sort().map(p => `${hashes[p]}  ./${p}\n`).join(''))); }
function extract(tarball, output) {
  const result = spawnSync('tar', ['-xzf', tarball, '-C', output], { encoding: 'utf8', timeout: 10000 });
  requireCondition(result.status === 0 && !result.error, 'TARBALL_EXTRACTION_FAILED'); return path.join(output, 'package');
}
function resolvePackage(name, parent) {
  const req = createRequire(path.join(parent, '__braces_resolution__.cjs'));
  for (const dir of req.resolve.paths(name) || []) {
    const file = path.join(dir, name, 'package.json');
    if (fs.existsSync(file)) { requireCondition(!fs.lstatSync(path.dirname(file)).isSymbolicLink(), 'LINKED_RESOLVED_PACKAGE'); return path.dirname(file); }
  }
  throw new Error('UNRESOLVED_PACKAGE:' + name);
}
function dependencyPaths(root) {
  const chains = [ ['tailwindcss', 'chokidar', 'braces'], ['tailwindcss', 'micromatch', 'braces'], ['tailwindcss', 'fast-glob', 'micromatch', 'braces'], ['eslint-config-next', '@next/eslint-plugin-next', 'fast-glob', 'micromatch', 'braces'] ];
  return chains.map(chain => { let current = root; for (const name of chain) current = resolvePackage(name, current); return { chain: chain.join('>'), resolved: current }; });
}
function assessAudit(report) {
  requireCondition(report && report.auditReportVersion === 2 && !report.error && report.metadata?.vulnerabilities && report.vulnerabilities && !Array.isArray(report.vulnerabilities), 'INVALID_AUDIT_REPORT');
  const entries = Object.entries(report.vulnerabilities), highs = entries.filter(([, v]) => ['high', 'critical'].includes(v.severity));
  for (const level of ['high', 'critical']) requireCondition(report.metadata.vulnerabilities[level] === entries.filter(([, v]) => v.severity === level).length, 'AUDIT_ACCOUNTING_MISMATCH');
  const isExact = source => source && source.name === TUPLE.PACKAGE && source.dependency === TUPLE.PACKAGE && source.url === 'https://github.com/advisories/' + TUPLE.ADVISORY && source.range === TUPLE.ADVISORY_RANGE && source.severity === 'high';
  const sources = [];
  for (const [name, entry] of entries) {
    requireCondition(entry.name === name && Array.isArray(entry.via), 'INVALID_AUDIT_ENTRY');
    for (const via of entry.via) { requireCondition(typeof via === 'string' || (via && typeof via === 'object' && !Array.isArray(via)), 'INVALID_AUDIT_SOURCE'); if (typeof via === 'object' && ['high', 'critical'].includes(via.severity)) sources.push(via); }
  }
  requireCondition(sources.length === 1 && isExact(sources[0]), 'UNATTESTED_HIGH_CRITICAL_ADVISORY');
  const roots = (name, seen = new Set()) => {
    requireCondition(!seen.has(name) && report.vulnerabilities[name], 'INVALID_AUDIT_DEPENDENCY_GRAPH');
    const next = new Set(seen); next.add(name);
    return report.vulnerabilities[name].via.flatMap(v => typeof v === 'string' ? roots(v, next) : [v]);
  };
  for (const [name] of highs) {
    const causes = roots(name).filter(v => ['high', 'critical'].includes(v.severity));
    requireCondition(causes.length > 0 && causes.every(isExact), 'UNATTESTED_HIGH_CRITICAL_ENTRY:' + name);
  }
  return { raw_high: report.metadata.vulnerabilities.high, raw_critical: report.metadata.vulnerabilities.critical, solely_attested_advisory: TUPLE.ADVISORY };
}
function verifyProject(root, report) {
  let temporary;
  try {
    root = path.resolve(root);
    const base = 'scripts/statistical-levels-release/', policy = JSON.parse(fs.readFileSync(regular(root, base + 'braces-patch-attestation.json')));
    requireCondition(policy.schema === 'statistical-levels.braces-patch-attestation.v1', 'ATTESTATION_SCHEMA');
    for (const [key, value] of Object.entries(TUPLE)) requireCondition(policy[key] === value, 'ATTESTATION_TUPLE:' + key);
    requireCondition(policy.PR_BASE_EQUALS_NPM_BASE === 'NO' && policy.ESCAPE_INVALID_INCLUDED_IN_FINAL_BACKPORT === 'NO' && policy.UNRELATED_BACKPORT_CHANGE_COUNT === 0, 'NON_SECURITY_BACKPORT');
    const assets = [ [base + 'vendor/braces/npm-braces-3.0.3.tgz', 'NPM_BASE_TARBALL_SHA256'], [base + 'vendor/braces/ghsa-vfj7-8cjw-p6xm-upstream.patch', 'UPSTREAM_PATCH_SHA256'], [base + 'vendor/braces/ghsa-vfj7-8cjw-p6xm-backport.patch', 'BACKPORT_SHA256'], ['vendor/braces-3.0.3-sl-backport.tgz', 'PATCHED_RESULT_SHA256'] ];
    for (const [relative, binding] of assets) requireCondition(sha(fs.readFileSync(regular(root, relative))) === TUPLE[binding], 'ASSET_HASH:' + binding);
    const npmBase = path.join(root, assets[0][0]);
    requireCondition('sha512-' + crypto.createHash('sha512').update(fs.readFileSync(npmBase)).digest('base64') === policy.NPM_TARBALL_INTEGRITY, 'NPM_BASE_INTEGRITY');
    const lock = JSON.parse(fs.readFileSync(regular(root, 'package-lock.json'))), manifest = JSON.parse(fs.readFileSync(regular(root, 'package.json')));
    requireCondition(manifest.devDependencies?.braces === TUPLE.LOCK_RESOLVED && manifest.overrides?.braces === '$braces' && lock.packages?.['']?.devDependencies?.braces === TUPLE.LOCK_RESOLVED, 'DEPENDENCY_MECHANISM');
    const bracesEntries = Object.entries(lock.packages).filter(([key]) => /(^|\/)node_modules\/braces$/.test(key));
    requireCondition(bracesEntries.length === 1 && bracesEntries[0][0] === 'node_modules/braces', 'LOCK_BRACES_INVENTORY');
    const installedLock = bracesEntries[0][1];
    requireCondition(installedLock.version === TUPLE.UPSTREAM_VERSION && installedLock.resolved === TUPLE.LOCK_RESOLVED && installedLock.integrity === TUPLE.PATCHED_RESULT_INTEGRITY, 'LOCK_BRACES_IDENTITY');
    temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-braces-attestation-'));
    for (const folder of ['base', 'result']) fs.mkdirSync(path.join(temporary, folder));
    const derived = extract(npmBase, path.join(temporary, 'base')), packed = extract(path.join(root, assets[3][0]), path.join(temporary, 'result'));
    requireCondition(JSON.stringify(fileHashes(derived), Object.keys(policy.NPM_PACKAGE_FILE_SHA256).sort()) === JSON.stringify(policy.NPM_PACKAGE_FILE_SHA256, Object.keys(policy.NPM_PACKAGE_FILE_SHA256).sort()), 'NPM_BASE_FILES');
    const apply = spawnSync('git', ['apply', path.join(root, assets[2][0])], { cwd: derived, encoding: 'utf8', timeout: 10000 });
    requireCondition(apply.status === 0 && !apply.error, 'BACKPORT_DERIVATION');
    for (const directory of [derived, packed]) requireCondition(manifestHash(fileHashes(directory)) === TUPLE.PATCHED_FILE_MANIFEST_SHA256, 'PATCHED_PACKAGE_MANIFEST');
    const copies = [], scan = directory => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === '.bin') continue;
        const file = path.join(directory, entry.name);
        if (entry.isSymbolicLink()) { requireCondition(!fs.statSync(file).isDirectory(), 'LINKED_DEPENDENCY_DIRECTORY'); continue; }
        if (!entry.isDirectory()) continue;
        const metadata = path.join(file, 'package.json');
        if (fs.existsSync(metadata) && JSON.parse(fs.readFileSync(metadata)).name === TUPLE.PACKAGE) copies.push(file);
        scan(file);
      }
    };
    scan(path.join(root, 'node_modules'));
    const installed = path.join(root, 'node_modules/braces');
    requireCondition(copies.length === 1 && copies[0] === installed, 'PHYSICAL_BRACES_INVENTORY');
    requireCondition(manifestHash(fileHashes(installed)) === TUPLE.PATCHED_FILE_MANIFEST_SHA256, 'INSTALLED_PACKAGE_MANIFEST');
    requireCondition(fs.readFileSync(path.join(installed, 'package.json')).equals(fs.readFileSync(path.join(packed, 'package.json'))), 'PACKAGE_METADATA');
    const chains = dependencyPaths(root); requireCondition(chains.length === 4 && chains.every(c => c.resolved === installed), 'BRACES_DEPENDENCY_PATHS');
    requireCondition(Object.keys(policy.REQUIRED_EVIDENCE).length === 2, 'MISSING_TEST_EVIDENCE');
    let full = false, targeted = false;
    for (const [file, evidence] of Object.entries(policy.REQUIRED_EVIDENCE)) {
      const bytes = Buffer.from(evidence.base64, 'base64'); requireCondition(sha(bytes) === evidence.sha256, 'TEST_EVIDENCE_HASH:' + file);
      const result = JSON.parse(bytes);
      if (result.stats) { requireCondition(result.stats.tests === 769 && result.stats.passes === 769 && result.stats.failures === 0, 'UPSTREAM_TEST_EVIDENCE'); full = true; }
      else { requireCondition(result.total === 57 && result.pass === 57 && result.fail === 0, 'TARGETED_TEST_EVIDENCE'); targeted = true; }
    }
    requireCondition(full && targeted, 'INCOMPLETE_TEST_EVIDENCE');
    for (const key of ['NPM_BASE_TARBALL_SHA256', 'BACKPORT_SHA256', 'PATCHED_RESULT_SHA256']) requireCondition(policy.EVIDENCE_RESULT_BINDING[key] === TUPLE[key], 'UNBOUND_TEST_RESULT');
    for (const c of securityCases()) {
      const observed = runSecurityCase(installed, c.id);
      requireCondition(observed.result === c.want && (c.want === 'ACCEPTED' || (!observed.stackExhaustion && /exceeds max depth/.test(observed.message))), 'SECURITY_CASE:' + c.id);
    }
    const audit = assessAudit(report);
    return { verdict: 'PASS_ATTESTED', fails: [], package: TUPLE.PACKAGE, version: TUPLE.UPSTREAM_VERSION, advisory: TUPLE.ADVISORY, security_cases: 57, all_four_paths_identical: true, audit_level: 'high', ...audit };
  } catch (error) { return { verdict: 'FAIL_CLOSED', fails: [String(error.message)], audit_level: 'high' }; }
  finally { if (temporary) fs.rmSync(temporary, { recursive: true, force: true }); }
}
function main() {
  requireCondition(process.argv.length === 2, 'GOVERNED_GATE_ACCEPTS_NO_OVERRIDES');
  const root = path.resolve(__dirname, '../../..');
  const output = process.env.CI_EVIDENCE ? path.resolve(process.env.CI_EVIDENCE) : fs.mkdtempSync(path.join(os.tmpdir(), 'sl-braces-audit-'));
  fs.mkdirSync(output, { recursive: true });
  const raw = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['audit', '--audit-level=high', '--json'], { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 16777216 });
  fs.writeFileSync(path.join(output, 'braces-raw-npm-audit.json'), raw.stdout || ''); fs.writeFileSync(path.join(output, 'braces-raw-npm-audit.stderr'), raw.stderr || '');
  fs.writeFileSync(path.join(output, 'braces-raw-npm-audit-exit.json'), JSON.stringify({ status: raw.status, signal: raw.signal, error: raw.error?.message || null }) + '\n');
  let result;
  try { requireCondition(!raw.error && !raw.signal && [0, 1].includes(raw.status), 'AUDIT_PROCESS_FAILURE'); result = verifyProject(root, JSON.parse(raw.stdout)); }
  catch (error) { result = { verdict: 'FAIL_CLOSED', fails: [error.message], audit_level: 'high' }; }
  fs.writeFileSync(path.join(output, 'braces-patch-attestation-result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ ...result, raw_audit_result: path.join(output, 'braces-raw-npm-audit.json') })); process.exitCode = result.verdict === 'PASS_ATTESTED' ? 0 : 1;
}
module.exports = { TUPLE, sha, fileHashes, manifestHash, extract, runSecurityCase, securityCases, assessAudit, dependencyPaths, verifyProject };
if (require.main === module) main();
