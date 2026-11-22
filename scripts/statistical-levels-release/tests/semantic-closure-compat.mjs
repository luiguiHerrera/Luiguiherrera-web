// Compare the old security/QA contract after removing only explicitly authorized additions.
export function withoutReceiptHooks(source) {
  return source.replace(/c\.transitionStart\?\.\('T[1-4]'\),/g,'').replace(/if\(c\.transitionComplete\)await c\.transitionComplete\('T[1-4]'\);/g,'');
}
export function withoutReceiptClass(source) {
  return String(source).replace("event.classification === (kind === 'raw_rsc_events' ? 'rsc_transition_completed_non_application' : 'platform_non_application')", "event.classification === (kind === 'raw_rsc_events' ? 'rsc_non_application' : 'platform_non_application')");
}

// Historical assertions keep their original subjects. Current bytes must first
// match the independently fixed Rprime and the already admitted publication closure.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const digest=value=>createHash('sha256').update(value).digest('hex');
const DX="8ce104066fe968026d24e0f006744f88e338585a", CLOSURE="5c53fa63577c39e8b656b563865cbefd4cd8b524", RPRIME="aec5be3b7207d1023effea78785291df815965b9";
const filePins={
  "release-core.mjs": {
    "8ce104066fe968026d24e0f006744f88e338585a": "c780d2996c3b77f99ed56226ca93317eaa1bdae06890f3d6ab484e97ded441ee",
    "5c53fa63577c39e8b656b563865cbefd4cd8b524": "841304fcab5cd79590259a0b2eaa53255e88950224f218f3cdccf69c2796c692",
    "aec5be3b7207d1023effea78785291df815965b9": "20d75ef381a2c2b488292a9a8c1c1642a1e962b8e9bc874d945053c1afc1964b"
  },
  "runtime-io.mjs": {
    "8ce104066fe968026d24e0f006744f88e338585a": "0c37a3b444a32847f3b9af0de405313d79e765e7e65c33e3ed7e45c9c385d0ef",
    "5c53fa63577c39e8b656b563865cbefd4cd8b524": "983b968d5869ecc3184cdfc7a38916ff444239d572ff2d47d0e7bcbdc6ee3127",
    "aec5be3b7207d1023effea78785291df815965b9": "b0c739e966a4f466dde7747325c05775c392116f6117fb572357520a445d6b0a"
  },
  "cli.mjs": {
    "8ce104066fe968026d24e0f006744f88e338585a": "c353aca844d0d69973d0bcd8abd9bf9539fd908245aca49d0caffcdb4a8c2407",
    "5c53fa63577c39e8b656b563865cbefd4cd8b524": "68eca36d28444373dc1c18580f80c1f26a16189b49c61cda1f4145fe4f152b30",
    "aec5be3b7207d1023effea78785291df815965b9": "5a6603152660040e42fdf7db8d7327487c39c1444acd0355aecbf1c562e8378e"
  },
  "invoke.mjs": {
    "8ce104066fe968026d24e0f006744f88e338585a": "25132f92c007fef6ad503282c0e62c0248887bebec2bac0a76e26e737630de0b",
    "5c53fa63577c39e8b656b563865cbefd4cd8b524": "f149c42fdb206de21448b659479fe6d59716a0d1332002c72e3691a777dc6ed3",
    "aec5be3b7207d1023effea78785291df815965b9": "08b17b6e45d598b69629771c1844ca88c3f10444cf9e5b224d568e907bea5b23"
  },
  "browser-harness.mjs": {
    "8ce104066fe968026d24e0f006744f88e338585a": "2896a2c3f2886321eb47291a007fdf272ec95f4f4a593362d9a4a4ca6f04bf4c",
    "5c53fa63577c39e8b656b563865cbefd4cd8b524": "dc1d4bb7d45dc3a3daa253c5c0c4a74b1c764b110cfb4eb040ef38e6d3217589",
    "aec5be3b7207d1023effea78785291df815965b9": "dc1d4bb7d45dc3a3daa253c5c0c4a74b1c764b110cfb4eb040ef38e6d3217589"
  }
};
function historicalBlob(ref,name,expected) {
  const bytes=execFileSync('git',['--no-optional-locks','show',ref+':'+name],{cwd:repo});
  assert.equal(digest(bytes),expected,'HISTORICAL_SUBJECT_BYTES:'+name);
  return bytes;
}
// The old migration and authorization assertions retain their exact policy.
// Only AC's independently pinned future source/ledger and historical source
// copies may be projected away; production identity and permissions stay exact.
export function historicalPolicyBytes(bytes) {
  const current=JSON.parse(bytes);
  if(!Object.hasOwn(current.baseline,'source_bundle'))return bytes;
  assert.equal(digest(bytes),'8c0d0fe9dfd102506efa88db95d1d55e0f4bdfb8643c2c1f17185a6f3ac40a68','AC_CURRENT_POLICY_BYTES');
  const oldBytes=historicalBlob('fd007159235c306b714789d60786a5733ab7d8f4','scripts/statistical-levels-release/policy.json','d9cf2b483bfea536ca6afdf160ed534e42a96bf175f5b7dd658b0d020b6d40f2');
  const old=JSON.parse(oldBytes);
  assert.deepEqual(current.baseline.source_bundle,old.source_bundle,'AC_BASELINE_SOURCE_COPY');
  assert.equal(current.baseline.ledger_hash,old.ledger_hash,'AC_BASELINE_LEDGER_COPY');
  const normalized=structuredClone(current);
  delete normalized.baseline.source_bundle;delete normalized.baseline.ledger_hash;
  normalized.source_bundle=old.source_bundle;normalized.ledger_hash=old.ledger_hash;
  assert.deepEqual(normalized,old,'AC_POLICY_AUTHORIZATION_UNCHANGED');
  return typeof bytes==='string'?oldBytes.toString():oldBytes;
}

// Exact URL migration only; historical assertions retain every other byte.
const acRouteChanges = {
  "scripts/statistical-levels-release/scripts/release-core.mjs": {
    "git_path": "scripts/statistical-levels-release/scripts/release-core.mjs",
    "previous_sha256": "20d75ef381a2c2b488292a9a8c1c1642a1e962b8e9bc874d945053c1afc1964b",
    "current_sha256": "ebbf1d5099867d0ebcfa1c650b7191f5c2fae273ce4fe2544aa576ab77b3ddfd",
    "changes": [
      {
        "before": "canonical(report.routes).equals(canonical(['/niveles-estadisticos', '/en/statistical-levels']))",
        "after": "(canonical(report.routes).equals(canonical(['/niveles-estadisticos', '/en/statistical-levels'])) || canonical(report.routes).equals(canonical(['/analisiscuantitativo', '/en/quantitative-analysis'])))",
        "count": 1
      }
    ]
  },
  "scripts/statistical-levels-release/scripts/qa-runner.mjs": {
    "git_path": "scripts/statistical-levels-release/scripts/qa-runner.mjs",
    "previous_sha256": "70ffd3c5796f2a432a83347109000a20c326d7d49efee59285a403ab932a69df",
    "current_sha256": "e0d0a8bef8d14f58a86fe21eaf69b6235d04dce3aa697c49dcf254dd245866fa",
    "changes": [
      {
        "before": "import path from 'node:path';",
        "after": "import path from 'node:path';\nimport { qaRoutesForTarget } from './qa-routes.mjs';",
        "count": 1
      },
      {
        "before": "  const harness = await createHarness(target, tokenSource, out);",
        "after": "  const requestedRoutes = qaRoutesForTarget(target, P.source_bundle, P.baseline.source_bundle, P.baseline.authority_run_id);\n  const harness = await createHarness(target, tokenSource, out);",
        "count": 1
      },
      {
        "before": "    globalThis.__SL_RELEASE_QA__ = harness;",
        "after": "    globalThis.__SL_RELEASE_QA__ = harness;\n    globalThis.__SL_QA_SCRIPT_ROUTES__ = {es:requestedRoutes[0],en:requestedRoutes[1]};",
        "count": 1
      },
      {
        "before": "for (const route of ['/niveles-estadisticos', '/en/statistical-levels'])",
        "after": "for (const route of requestedRoutes)",
        "count": 1
      },
      {
        "before": "delete globalThis.__SL_RELEASE_QA__;",
        "after": "delete globalThis.__SL_RELEASE_QA__; delete globalThis.__SL_QA_SCRIPT_ROUTES__;",
        "count": 1
      },
      {
        "before": "routes: ['/niveles-estadisticos', '/en/statistical-levels'],",
        "after": "routes: requestedRoutes,",
        "count": 1
      }
    ]
  },
  "scripts/statistical-levels-release/scripts/browser-harness-base.mjs": {
    "git_path": "scripts/statistical-levels-release/scripts/browser-harness-base.mjs",
    "previous_sha256": "0d839a85f327100b61f97c26f88bbdf0250764b7f34be7c845d4dbdf31128c50",
    "current_sha256": "5d5d371609345271add8e48fbcabdc2b7fc12c09e3caf7dc7c489cd9e66cde09",
    "changes": [
      {
        "before": "['/niveles-estadisticos', '/en/statistical-levels']",
        "after": "['/niveles-estadisticos', '/en/statistical-levels', '/analisiscuantitativo', '/en/quantitative-analysis']",
        "count": 1
      }
    ]
  },
  "scripts/statistical-levels-release/scripts/product-qa-observability.mjs": {
    "git_path": "scripts/statistical-levels-release/scripts/product-qa-observability.mjs",
    "previous_sha256": "9603ae697430dcac01d6e30c1fabcae5d82c38d5213da3c3591b3f82af6a82b8",
    "current_sha256": "c097d1a13043e6436aff53388fc975782d1fb0a6e24f04534d2091dbafbbcd76",
    "changes": [
      {
        "before": "['/niveles-estadisticos', '/en/statistical-levels', '/metodologia', '/en/methodology']",
        "after": "['/niveles-estadisticos', '/en/statistical-levels', '/analisiscuantitativo', '/en/quantitative-analysis', '/metodologia', '/en/methodology']",
        "count": 2
      }
    ]
  },
  "scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs": {
    "git_path": "scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs",
    "previous_sha256": "5ac0b544987fce2d8e2f40e5d26045f1dbb16873185d8f75cb3ce62360a1926f",
    "current_sha256": "8fcc4f719c90b428699fda5bb5bd8668306b2b59146d556b5f2125fa878a30df",
    "changes": [
      {
        "before": "import assert from 'node:assert/strict';",
        "after": "import assert from 'node:assert/strict'; import { qaScriptRoutes } from '../qa-routes.mjs';",
        "count": 1
      },
      {
        "before": "const routes={es:'/niveles-estadisticos',en:'/en/statistical-levels'};",
        "after": "const routes=qaScriptRoutes();",
        "count": 1
      },
      {
        "before": "'/niveles-estadisticos?symbol=BTCUSDT&window=All&frequency=daily'",
        "after": "(routes.es+\"?symbol=BTCUSDT&window=All&frequency=daily\")",
        "count": 3
      },
      {
        "before": "'/niveles-estadisticos?asset=SPY&frequency=weekly&window=5Y&review=1'",
        "after": "(routes.es+\"?asset=SPY&frequency=weekly&window=5Y&review=1\")",
        "count": 3
      },
      {
        "before": "'/niveles-estadisticos'",
        "after": "routes.es",
        "count": 1
      },
      {
        "before": "'/en/statistical-levels'",
        "after": "routes.en",
        "count": 1
      },
      {
        "before": "`/niveles-estadisticos",
        "after": "`${routes.es}",
        "count": 1
      },
      {
        "before": "`/en/statistical-levels",
        "after": "`${routes.en}",
        "count": 3
      },
      {
        "before": "const routes=qaScriptRoutes();",
        "after": "const routes=qaScriptRoutes(); const ac=routes.es==='/analisiscuantitativo';",
        "count": 1
      },
      {
        "before": "c.evaluate('document.fonts.ready'));await sleep(350);",
        "after": "c.evaluate('document.fonts.ready'));if(ac)await open(c,'sl-seasonality-disclosure');await sleep(350);",
        "count": 1
      },
      {
        "before": "    await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L71\",test_name:name,assertion_id:null,action_id:\"sl-main:L71:C11:c-evaluate\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:71,source_column:11}),c.evaluate('document.querySelector(\"#sl-options > summary\").focus()'));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L71\",test_name:name,assertion_id:null,action_id:\"sl-main:L71:C87:c-key\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:71,source_column:87}),c.key('Enter','Enter',13));void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L71\",test_name:name,assertion_id:\"sl-main:L71:C113\",action_id:\"sl-main:L71:C113:assert-ok\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:71,source_column:113}),assert.ok(await c.evaluate('document.querySelector(\"#sl-options\").open')));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L71\",test_name:name,assertion_id:null,action_id:\"sl-main:L71:C193:audit\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:71,source_column:193}),audit(c,name+'/options'));",
        "after": "  if(ac){await c.evaluate('document.querySelector(\"#sl-frequency select\").focus()');assert.equal(await c.evaluate('document.activeElement===document.querySelector(\"#sl-frequency select\")'),true);await audit(c,name+'/frequency-controls');}else{await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L71\",test_name:name,assertion_id:null,action_id:\"sl-main:L71:C11:c-evaluate\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:71,source_column:11}),c.evaluate('document.querySelector(\"#sl-options > summary\").focus()'));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L71\",test_name:name,assertion_id:null,action_id:\"sl-main:L71:C87:c-key\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:71,source_column:87}),c.key('Enter','Enter',13));void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L71\",test_name:name,assertion_id:\"sl-main:L71:C113\",action_id:\"sl-main:L71:C113:assert-ok\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:71,source_column:113}),assert.ok(await c.evaluate('document.querySelector(\"#sl-options\").open')));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L71\",test_name:name,assertion_id:null,action_id:\"sl-main:L71:C193:audit\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:71,source_column:193}),audit(c,name+'/options'));}",
        "count": 1
      },
      {
        "before": "    void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L72\",test_name:name,assertion_id:\"sl-main:L72:C5\",action_id:\"sl-main:L72:C5:assert-deepEqual\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:72,source_column:5}),assert.deepEqual(await c.evaluate('[...document.querySelectorAll(\"#sl-options select:first-of-type option\")].slice(0,3).map(e=>e.value)'),['daily','weekly','monthly']));",
        "after": "  if(ac){assert.deepEqual(await c.evaluate('[...document.querySelectorAll(\"#sl-frequency select option\")].map(e=>e.value)'),['daily','weekly','monthly']);}else{void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L72\",test_name:name,assertion_id:\"sl-main:L72:C5\",action_id:\"sl-main:L72:C5:assert-deepEqual\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:72,source_column:5}),assert.deepEqual(await c.evaluate('[...document.querySelectorAll(\"#sl-options select:first-of-type option\")].slice(0,3).map(e=>e.value)'),['daily','weekly','monthly']));}",
        "count": 1
      },
      {
        "before": "    await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L74\",test_name:name,assertion_id:null,action_id:\"sl-main:L74:C11:c-evaluate\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:74,source_column:11}),c.evaluate('document.querySelector(\"#sl-options > summary\").focus()'));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L74\",test_name:name,assertion_id:null,action_id:\"sl-main:L74:C87:c-key\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:74,source_column:87}),c.key('Enter','Enter',13));",
        "after": "  if(ac){assert.equal(await c.evaluate('document.querySelectorAll(\"#sl-options\").length'),0);}else{await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L74\",test_name:name,assertion_id:null,action_id:\"sl-main:L74:C11:c-evaluate\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:74,source_column:11}),c.evaluate('document.querySelector(\"#sl-options > summary\").focus()'));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L74\",test_name:name,assertion_id:null,action_id:\"sl-main:L74:C87:c-key\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:74,source_column:87}),c.key('Enter','Enter',13));}",
        "count": 1
      },
      {
        "before": "    void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L88\",test_name:name,assertion_id:\"sl-main:L88:C5\",action_id:\"sl-main:L88:C5:assert-ok\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:88,source_column:5}),assert.ok(await c.evaluate('!!document.querySelector(\"#sl-opening\")')));",
        "after": "  if(ac){await open(c,'sl-opening-disclosure');assert.ok(await c.evaluate('!!document.querySelector(\"#sl-opening\")'));}else{void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L88\",test_name:name,assertion_id:\"sl-main:L88:C5\",action_id:\"sl-main:L88:C5:assert-ok\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:88,source_column:5}),assert.ok(await c.evaluate('!!document.querySelector(\"#sl-opening\")')));}",
        "count": 1
      },
      {
        "before": "    const explorer=await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L90\",test_name:name,assertion_id:null,action_id:\"sl-main:L90:C26:c-evaluate\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:90,source_column:26}),c.evaluate('[...document.querySelectorAll(\"#sl-periods button\")].map(e=>e.textContent)'));void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L90\",test_name:name,assertion_id:\"sl-main:L90:C115\",action_id:\"sl-main:L90:C115:assert-equal\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:90,source_column:115}),assert.equal(explorer.length,1));",
        "after": "  if(ac){await open(c,'sl-periods-disclosure');assert.equal(await c.evaluate('document.querySelectorAll(\"#sl-periods .sl-explorer-groups button\").length'),7);}else{const explorer=await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L90\",test_name:name,assertion_id:null,action_id:\"sl-main:L90:C26:c-evaluate\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:90,source_column:26}),c.evaluate('[...document.querySelectorAll(\"#sl-periods button\")].map(e=>e.textContent)'));void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L90\",test_name:name,assertion_id:\"sl-main:L90:C115\",action_id:\"sl-main:L90:C115:assert-equal\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:90,source_column:115}),assert.equal(explorer.length,1));}",
        "count": 1
      },
      {
        "before": "    await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L91\",test_name:name,assertion_id:null,action_id:\"sl-main:L91:C11:c-click\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:91,source_column:11}),c.click('#sl-periods button'));void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L91\",test_name:name,assertion_id:\"sl-main:L91:C41\",action_id:\"sl-main:L91:C41:assert-equal\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:91,source_column:41}),assert.equal(await c.evaluate('document.querySelectorAll(\"#sl-periods button[aria-pressed]\").length'),7));",
        "after": "  if(ac){assert.equal(await c.evaluate('document.querySelector(\"#sl-periods .sl-explorer-groups button[aria-pressed=true]\").textContent'),locale==='en'?'Extreme positive extension':'Extensión positiva extrema');}else{await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L91\",test_name:name,assertion_id:null,action_id:\"sl-main:L91:C11:c-click\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:91,source_column:11}),c.click('#sl-periods button'));void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L91\",test_name:name,assertion_id:\"sl-main:L91:C41\",action_id:\"sl-main:L91:C41:assert-equal\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:91,source_column:41}),assert.equal(await c.evaluate('document.querySelectorAll(\"#sl-periods button[aria-pressed]\").length'),7));}",
        "count": 1
      },
      {
        "before": "    for(let i=1;i<=7;i++){await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L92\",test_name:name,assertion_id:null,action_id:\"sl-main:L92:C33:c-click\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:92,source_column:33}),c.click(`#sl-periods .flex.flex-wrap button:nth-child(${i})`));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L92\",test_name:name,assertion_id:null,action_id:\"sl-main:L92:C101:audit\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:92,source_column:101}),audit(c,`${name}/filter${i}`));}",
        "after": "  if(ac){for(let i=1;i<=7;i++){await c.click('#sl-periods .sl-explorer-groups button:nth-child('+i+')');await audit(c,name+'/filter'+i);}assert.equal(await c.evaluate('document.querySelectorAll(\"#sl-periods tbody tr:not(:has(.sl-explorer-empty))\").length'),10);await c.click('#sl-periods .sl-explorer-footer button');assert.equal(await c.evaluate('document.querySelectorAll(\"#sl-periods tbody tr:not(:has(.sl-explorer-empty))\").length'),20);}else{for(let i=1;i<=7;i++){await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L92\",test_name:name,assertion_id:null,action_id:\"sl-main:L92:C33:c-click\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:92,source_column:33}),c.click(`#sl-periods .flex.flex-wrap button:nth-child(${i})`));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L92\",test_name:name,assertion_id:null,action_id:\"sl-main:L92:C101:audit\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:92,source_column:101}),audit(c,`${name}/filter${i}`));}}",
        "count": 1
      },
      {
        "before": "    if (!await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L93\",test_name:name,assertion_id:null,action_id:\"sl-main:L93:C16:c-evaluate\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:93,source_column:16}),c.evaluate('document.querySelector(\"#sl-calendar button[aria-expanded]\").getAttribute(\"aria-expanded\") === \"true\"'))) await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L93\",test_name:name,assertion_id:null,action_id:\"sl-main:L93:C139:c-click\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:93,source_column:139}),c.click('#sl-calendar button[aria-expanded]'));",
        "after": "  if(ac){await open(c,'sl-calendar-disclosure');assert.equal(await c.evaluate('document.querySelectorAll(\"#sl-calendar button[aria-expanded]\").length'),0);}else{if (!await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L93\",test_name:name,assertion_id:null,action_id:\"sl-main:L93:C16:c-evaluate\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:93,source_column:16}),c.evaluate('document.querySelector(\"#sl-calendar button[aria-expanded]\").getAttribute(\"aria-expanded\") === \"true\"'))) await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L93\",test_name:name,assertion_id:null,action_id:\"sl-main:L93:C139:c-click\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:93,source_column:139}),c.click('#sl-calendar button[aria-expanded]'));}",
        "count": 1
      },
      {
        "before": "    await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L95\",test_name:name,assertion_id:null,action_id:\"sl-main:L95:C11:c-click\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:95,source_column:11}),c.click('#sl-calendar .sl-seasonality-values summary'));",
        "after": "  if(ac){assert.equal(await c.evaluate('document.querySelectorAll(\"#sl-calendar .sl-seasonality-values\").length'),0);}else{await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L95\",test_name:name,assertion_id:null,action_id:\"sl-main:L95:C11:c-click\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:95,source_column:11}),c.click('#sl-calendar .sl-seasonality-values summary'));}",
        "count": 1
      },
      {
        "before": "    void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L96\",test_name:name,assertion_id:\"sl-main:L96:C5\",action_id:\"sl-main:L96:C5:assert-ok\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:96,source_column:5}),assert.ok(await c.evaluate('document.querySelectorAll(\"#sl-calendar .sl-seasonality-values td\").length>0')));",
        "after": "  if(ac){assert.ok(await c.evaluate('document.querySelectorAll(\"#sl-calendar [title]\").length>0'));}else{void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L96\",test_name:name,assertion_id:\"sl-main:L96:C5\",action_id:\"sl-main:L96:C5:assert-ok\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:96,source_column:5}),assert.ok(await c.evaluate('document.querySelectorAll(\"#sl-calendar .sl-seasonality-values td\").length>0')));}",
        "count": 1
      },
      {
        "before": "    await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L102\",test_name:name,assertion_id:null,action_id:\"sl-main:L102:C11:c-evaluate\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:102,source_column:11}),c.evaluate('document.querySelector(\"#sl-distributions [tabindex]\").focus()'));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L102\",test_name:name,assertion_id:null,action_id:\"sl-main:L102:C94:c-key\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:102,source_column:94}),c.key('ArrowRight','ArrowRight',39));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L102\",test_name:name,assertion_id:null,action_id:\"sl-main:L102:C136:audit\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:102,source_column:136}),audit(c,name+'/table-keyboard'));",
        "after": "  if(ac){await open(c,'sl-distributions-disclosure');await c.evaluate('document.querySelector(\"#sl-distributions [tabindex]\").focus()');await c.key('ArrowRight','ArrowRight',39);await audit(c,name+'/table-keyboard');}else{await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L102\",test_name:name,assertion_id:null,action_id:\"sl-main:L102:C11:c-evaluate\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:102,source_column:11}),c.evaluate('document.querySelector(\"#sl-distributions [tabindex]\").focus()'));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L102\",test_name:name,assertion_id:null,action_id:\"sl-main:L102:C94:c-key\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:102,source_column:94}),c.key('ArrowRight','ArrowRight',39));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L102\",test_name:name,assertion_id:null,action_id:\"sl-main:L102:C136:audit\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:102,source_column:136}),audit(c,name+'/table-keyboard'));}",
        "count": 1
      },
      {
        "before": "    if(!await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L119\",test_name:\"product / c.evaluate\",assertion_id:null,action_id:\"sl-main:L119:C15:c-evaluate\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:119,source_column:15}),c.evaluate('document.querySelector(\"#sl-calendar button[aria-expanded]\").getAttribute(\"aria-expanded\")===\"true\"')))await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L119\",test_name:\"product / c.click\",assertion_id:null,action_id:\"sl-main:L119:C135:c-click\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:119,source_column:135}),c.click('#sl-calendar button[aria-expanded]'));",
        "after": "  if(ac){await open(c,'sl-calendar-disclosure');}else{if(!await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L119\",test_name:\"product / c.evaluate\",assertion_id:null,action_id:\"sl-main:L119:C15:c-evaluate\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:119,source_column:15}),c.evaluate('document.querySelector(\"#sl-calendar button[aria-expanded]\").getAttribute(\"aria-expanded\")===\"true\"')))await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L119\",test_name:\"product / c.click\",assertion_id:null,action_id:\"sl-main:L119:C135:c-click\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:119,source_column:135}),c.click('#sl-calendar button[aria-expanded]'));}",
        "count": 1
      },
      {
        "before": "    await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L120\",test_name:\"product / c.click\",assertion_id:null,action_id:\"sl-main:L120:C11:c-click\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:120,source_column:11}),c.click('#sl-calendar .sl-seasonality-values summary'));",
        "after": "  if(ac){assert.equal(await c.evaluate('document.querySelectorAll(\"#sl-calendar .sl-pattern-controls select\").length'),frequency==='monthly'?3:4);}else{await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L120\",test_name:\"product / c.click\",assertion_id:null,action_id:\"sl-main:L120:C11:c-click\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:120,source_column:11}),c.click('#sl-calendar .sl-seasonality-values summary'));}",
        "count": 1
      },
      {
        "before": "  await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L136\",test_name:\"product / open\",assertion_id:null,action_id:\"sl-main:L136:C9:open\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:136,source_column:9}),open(c,'sl-options'));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L136\",test_name:\"product / select\",assertion_id:null,action_id:\"sl-main:L136:C36:select\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:136,source_column:36}),c.transitionStart?.('T3'),select(c,'#sl-options label:first-child select','daily'));await sleep(650);await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L136\",test_name:\"product / metricCheck\",assertion_id:null,action_id:\"sl-main:L136:C116:metricCheck\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:136,source_column:116}),metricCheck(c,'GLD','daily','5Y'));if(c.transitionComplete)await c.transitionComplete('T3');",
        "after": "  if(ac){await select(c,'#sl-frequency select','daily');await waitForAssetTransition(c,{asset:'GLD',pickerTitle:'SPDR Gold Shares',frequency:'daily',window:'5Y'});await metricCheck(c,'GLD','daily','5Y');if(c.transitionComplete)await c.transitionComplete('T3');}else{await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L136\",test_name:\"product / open\",assertion_id:null,action_id:\"sl-main:L136:C9:open\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:136,source_column:9}),open(c,'sl-options'));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L136\",test_name:\"product / select\",assertion_id:null,action_id:\"sl-main:L136:C36:select\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:136,source_column:36}),c.transitionStart?.('T3'),select(c,'#sl-options label:first-child select','daily'));await sleep(650);await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L136\",test_name:\"product / metricCheck\",assertion_id:null,action_id:\"sl-main:L136:C116:metricCheck\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:136,source_column:116}),metricCheck(c,'GLD','daily','5Y'));if(c.transitionComplete)await c.transitionComplete('T3');}",
        "count": 1
      },
      {
        "before": "  if(ac){await select(c,'#sl-frequency select','daily');await waitForAssetTransition(c,{asset:'GLD',pickerTitle:'SPDR Gold Shares',frequency:'daily',window:'5Y'});await metricCheck(c,'GLD','daily','5Y');if(c.transitionComplete)await c.transitionComplete('T3');}else{await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L136\",test_name:\"product / open\",assertion_id:null,action_id:\"sl-main:L136:C9:open\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:136,source_column:9}),open(c,'sl-options'));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L136\",test_name:\"product / select\",assertion_id:null,action_id:\"sl-main:L136:C36:select\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:136,source_column:36}),c.transitionStart?.('T3'),select(c,'#sl-options label:first-child select','daily'));await sleep(650);await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L136\",test_name:\"product / metricCheck\",assertion_id:null,action_id:\"sl-main:L136:C116:metricCheck\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:136,source_column:116}),metricCheck(c,'GLD','daily','5Y'));if(c.transitionComplete)await c.transitionComplete('T3');}",
        "after": "  if(ac){c.transitionStart?.('T3');await select(c,'#sl-frequency select','daily');await waitForAssetTransition(c,{asset:'GLD',pickerTitle:'SPDR Gold Shares',frequency:'daily',window:'5Y'});await metricCheck(c,'GLD','daily','5Y');if(c.transitionComplete)await c.transitionComplete('T3');}else{await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L136\",test_name:\"product / open\",assertion_id:null,action_id:\"sl-main:L136:C9:open\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:136,source_column:9}),open(c,'sl-options'));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L136\",test_name:\"product / select\",assertion_id:null,action_id:\"sl-main:L136:C36:select\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:136,source_column:36}),c.transitionStart?.('T3'),select(c,'#sl-options label:first-child select','daily'));await sleep(650);await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L136\",test_name:\"product / metricCheck\",assertion_id:null,action_id:\"sl-main:L136:C116:metricCheck\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:136,source_column:116}),metricCheck(c,'GLD','daily','5Y'));if(c.transitionComplete)await c.transitionComplete('T3');}",
        "count": 1
      },
      {
        "before": "  await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L137\",test_name:\"product / select\",assertion_id:null,action_id:\"sl-main:L137:C9:select\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:137,source_column:9}),c.transitionStart?.('T4'),select(c,'#sl-options label:nth-child(2) select','Full'));await sleep(650);await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L137\",test_name:\"product / metricCheck\",assertion_id:null,action_id:\"sl-main:L137:C89:metricCheck\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:137,source_column:89}),metricCheck(c,'GLD','daily','Full'));if(c.transitionComplete)await c.transitionComplete('T4');",
        "after": "  if(ac){c.transitionStart?.('T4');await c.click('[data-window=\"Full\"]');await waitForAssetTransition(c,{asset:'GLD',pickerTitle:'SPDR Gold Shares',frequency:'daily',window:'Full'});await metricCheck(c,'GLD','daily','Full');if(c.transitionComplete)await c.transitionComplete('T4');}else{await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L137\",test_name:\"product / select\",assertion_id:null,action_id:\"sl-main:L137:C9:select\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:137,source_column:9}),c.transitionStart?.('T4'),select(c,'#sl-options label:nth-child(2) select','Full'));await sleep(650);await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L137\",test_name:\"product / metricCheck\",assertion_id:null,action_id:\"sl-main:L137:C89:metricCheck\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:137,source_column:89}),metricCheck(c,'GLD','daily','Full'));if(c.transitionComplete)await c.transitionComplete('T4');}",
        "count": 1
      },
      {
        "before": "import { qaScriptRoutes } from '../qa-routes.mjs';",
        "after": "import { qaScriptRoutes } from '../qa-routes.mjs'; import { sanitizeProductQAValue } from '../product-qa-observability.mjs';",
        "count": 1
      },
      {
        "before": "report.failure='PRODUCT_ASSERTION_FAILED';",
        "after": "report.failure='PRODUCT_ASSERTION_FAILED';report.failure_details=sanitizeProductQAValue({name:error.name,code:error.code,message:error.message,actual:error.actual,expected:error.expected,stack:error.stack},base);",
        "count": 1
      },
      {
        "before": "      if(id==='sl-drawdown-history'){await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L84\",test_name:name,assertion_id:null,action_id:\"sl-main:L84:C44:open\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:84,source_column:44}),open(c,'sl-drawdown-data'));void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L84\",test_name:name,assertion_id:\"sl-main:L84:C71\",action_id:\"sl-main:L84:C71:assert-equal\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:84,source_column:71}),assert.equal(await c.evaluate('document.querySelectorAll(\"#sl-drawdown-data tbody tr\").length'),(await readJson('lib/statistical-levels/generated/assets/SPY.json')).frequencies.weekly.windows['5Y'].sessions));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L84\",test_name:name,assertion_id:null,action_id:\"sl-main:L84:C285:audit\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:84,source_column:285}),audit(c,name+'/dated-drawdowns'));}",
        "after": "      if(ac){if(id==='sl-drawdown-history'){assert.equal(await c.evaluate('Number(document.querySelector(\"#sl-drawdown-history [role=slider]\").getAttribute(\"aria-valuemax\"))+1'),(await readJson('lib/statistical-levels/generated/assets/SPY.json')).frequencies.weekly.windows['5Y'].sessions);assert.equal(await c.evaluate('document.querySelectorAll(\"#sl-drawdown-data\").length'),0);await audit(c,name+'/dated-drawdowns');}}else{if(id==='sl-drawdown-history'){await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L84\",test_name:name,assertion_id:null,action_id:\"sl-main:L84:C44:open\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:84,source_column:44}),open(c,'sl-drawdown-data'));void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L84\",test_name:name,assertion_id:\"sl-main:L84:C71\",action_id:\"sl-main:L84:C71:assert-equal\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:84,source_column:71}),assert.equal(await c.evaluate('document.querySelectorAll(\"#sl-drawdown-data tbody tr\").length'),(await readJson('lib/statistical-levels/generated/assets/SPY.json')).frequencies.weekly.windows['5Y'].sessions));await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L84\",test_name:name,assertion_id:null,action_id:\"sl-main:L84:C285:audit\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:84,source_column:285}),audit(c,name+'/dated-drawdowns'));}}",
        "count": 1
      },
      {
        "before": "if(ac){await open(c,'sl-opening-disclosure');assert.ok",
        "after": "if(ac){for(const id of ['sl-levels-disclosure','sl-returns-disclosure']){await open(c,id);await audit(c,name+'/'+id);}await open(c,'sl-opening-disclosure');assert.ok",
        "count": 1
      },
      {
        "before": "    if(frequency==='daily')void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L113\",test_name:\"product / assert.ok\",assertion_id:\"sl-main:L113:C28\",action_id:\"sl-main:L113:C28:assert-ok\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:113,source_column:28}),assert.ok(await c.evaluate('!!document.querySelector(\"#sl-extremes\")')));",
        "after": "    if(ac&&frequency==='daily'){await open(c,'sl-extremes-disclosure');assert.ok(await c.evaluate('!!document.querySelector(\"#sl-extremes\")'));await audit(c,frequency+'/'+window+'/calendar-extremes');}else{if(frequency==='daily')void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-main\",test_id:\"sl-main:L113\",test_name:\"product / assert.ok\",assertion_id:\"sl-main:L113:C28\",action_id:\"sl-main:L113:C28:assert-ok\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs\",source_line:113,source_column:28}),assert.ok(await c.evaluate('!!document.querySelector(\"#sl-extremes\")')));}",
        "count": 1
      },
      {
        "before": "if(ac){c.transitionStart?.('T3');",
        "after": "if(ac){globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:'sl-main',test_id:'sl-main:L136',action_id:'sl-main:L136:C36:select'});c.transitionStart?.('T3');",
        "count": 1
      },
      {
        "before": "if(ac){c.transitionStart?.('T4');",
        "after": "if(ac){globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:'sl-main',test_id:'sl-main:L137',action_id:'sl-main:L137:C9:select'});c.transitionStart?.('T4');",
        "count": 1
      }
    ]
  },
  "scripts/statistical-levels-release/scripts/qa/qa-statistical-levels-defects.mjs": {
    "git_path": "scripts/statistical-levels-release/scripts/qa/qa-statistical-levels-defects.mjs",
    "previous_sha256": "9b4b29d603c0a1b7a6aa2334f7b1610f2cb201a419c27b4ee37480d7b1479379",
    "current_sha256": "03acf1dcbf0d1390052c71fa1221d05fbd3837aa30b81c162e90d13df7077568",
    "changes": [
      {
        "before": "import assert from 'node:assert/strict';",
        "after": "import assert from 'node:assert/strict'; import { qaScriptRoutes } from '../qa-routes.mjs';",
        "count": 1
      },
      {
        "before": "const routes={es:'/niveles-estadisticos',en:'/en/statistical-levels'};",
        "after": "const routes=qaScriptRoutes();",
        "count": 1
      },
      {
        "before": "const routes=qaScriptRoutes();",
        "after": "const routes=qaScriptRoutes(); const ac=routes.es==='/analisiscuantitativo';",
        "count": 1
      },
      {
        "before": "c.evaluate('document.fonts.ready'));await sleep(350);",
        "after": "c.evaluate('document.fonts.ready'));if(ac)await open(c,'sl-seasonality-disclosure');await sleep(350);",
        "count": 1
      },
      {
        "before": "import { qaScriptRoutes } from '../qa-routes.mjs';",
        "after": "import { qaScriptRoutes } from '../qa-routes.mjs'; import { sanitizeProductQAValue } from '../product-qa-observability.mjs';",
        "count": 1
      },
      {
        "before": "report.failure='PRODUCT_ASSERTION_FAILED';",
        "after": "report.failure='PRODUCT_ASSERTION_FAILED';report.failure_details=sanitizeProductQAValue({name:error.name,code:error.code,message:error.message,actual:error.actual,expected:error.expected,stack:error.stack},base);",
        "count": 1
      }
    ]
  },
  "scripts/statistical-levels-release/scripts/qa/qa-statistical-levels-interaction-polish.mjs": {
    "git_path": "scripts/statistical-levels-release/scripts/qa/qa-statistical-levels-interaction-polish.mjs",
    "previous_sha256": "a178bbf89455ec600cdbe1ab8ab4c03ab93a23bc2012ecec2734401cd4765b5e",
    "current_sha256": "7368b204ccdd8029520eae7b0942056b14ca60446368dc2553b8127a119eb54e",
    "changes": [
      {
        "before": "import assert from 'node:assert/strict'; import { weeklyReturnDisplay } from './weekly-return-display-contract.mjs';",
        "after": "import assert from 'node:assert/strict'; import { weeklyReturnDisplay } from './weekly-return-display-contract.mjs'; import { qaScriptRoutes } from '../qa-routes.mjs';",
        "count": 1
      },
      {
        "before": "const [base, unusedPort, out] = process.argv.slice(2);",
        "after": "const [base, unusedPort, out] = process.argv.slice(2); const routes = qaScriptRoutes();",
        "count": 1
      },
      {
        "before": "'/en/statistical-levels'",
        "after": "routes.en",
        "count": 10
      },
      {
        "before": "'/niveles-estadisticos'",
        "after": "routes.es",
        "count": 10
      },
      {
        "before": "const routes = qaScriptRoutes();",
        "after": "const routes = qaScriptRoutes(); const ac=routes.es==='/analisiscuantitativo';",
        "count": 1
      },
      {
        "before": "c.evaluate('document.fonts.ready'));await sleep(500);",
        "after": "c.evaluate('document.fonts.ready'));if(ac)await open('sl-seasonality-disclosure');await sleep(500);",
        "count": 1
      },
      {
        "before": "    await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-polish\",test_id:\"sl-polish:L116\",test_name:locale+'-'+(width<600?'mobile':'desktop'),assertion_id:null,action_id:\"sl-polish:L116:C11:open\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels-interaction-polish.mjs\",source_line:116,source_column:11}),open('sl-quant'));",
        "after": "  if(ac){await open('sl-calendar-disclosure');}else{await (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-polish\",test_id:\"sl-polish:L116\",test_name:locale+'-'+(width<600?'mobile':'desktop'),assertion_id:null,action_id:\"sl-polish:L116:C11:open\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels-interaction-polish.mjs\",source_line:116,source_column:11}),open('sl-quant'));}",
        "count": 1
      },
      {
        "before": "    void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-polish\",test_id:\"sl-polish:L117\",test_name:locale+'-'+(width<600?'mobile':'desktop'),assertion_id:\"sl-polish:L117:C5\",action_id:\"sl-polish:L117:C5:assert-equal\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels-interaction-polish.mjs\",source_line:117,source_column:5}),assert.equal(await c.evaluate(\"document.querySelector('#sl-calendar button[aria-expanded]').getAttribute('aria-expanded')\"),'true'));",
        "after": "  if(ac){assert.equal(await c.evaluate('document.querySelectorAll(\"#sl-calendar button[aria-expanded]\").length'),0);assert.equal(await c.evaluate('document.querySelector(\"#sl-calendar-disclosure\").open'),true);}else{void (globalThis.__SL_RELEASE_QA__?.observability?.context({suite_id:\"sl-polish\",test_id:\"sl-polish:L117\",test_name:locale+'-'+(width<600?'mobile':'desktop'),assertion_id:\"sl-polish:L117:C5\",action_id:\"sl-polish:L117:C5:assert-equal\",source_file:\"scripts/statistical-levels-release/scripts/qa/qa-statistical-levels-interaction-polish.mjs\",source_line:117,source_column:5}),assert.equal(await c.evaluate(\"document.querySelector('#sl-calendar button[aria-expanded]').getAttribute('aria-expanded')\"),'true'));}",
        "count": 1
      },
      {
        "before": "c.click('#sl-calendar button[aria-expanded]')",
        "after": "c.click(ac?'#sl-calendar-disclosure > summary':'#sl-calendar button[aria-expanded]')",
        "count": 4
      },
      {
        "before": "document.querySelector('.sl-patterns-summary').innerText",
        "after": "document.querySelector('.sl-patterns-summary')?.innerText ?? [...document.querySelectorAll('.sl-pattern-controls select')].map(e=>e.selectedOptions[0].textContent).join(' ')+' '+document.querySelector('.sl-patterns-context').textContent",
        "count": 2
      },
      {
        "before": "import { qaScriptRoutes } from '../qa-routes.mjs';",
        "after": "import { qaScriptRoutes } from '../qa-routes.mjs'; import { sanitizeProductQAValue } from '../product-qa-observability.mjs';",
        "count": 1
      },
      {
        "before": "report.failure='PRODUCT_ASSERTION_FAILED';",
        "after": "report.failure='PRODUCT_ASSERTION_FAILED';report.failure_details=sanitizeProductQAValue({name:error.name,code:error.code,message:error.message,actual:error.actual,expected:error.expected,stack:error.stack},base);",
        "count": 1
      },
      {
        "before": "assert.ok(summary.toLowerCase().includes(locale==='en'?'all cycles':'todos los ciclos'))",
        "after": "assert.ok(ac?await c.evaluate('document.querySelectorAll(\".sl-pattern-controls select\")[1].value===\"all\"'):summary.toLowerCase().includes(locale==='en'?'all cycles':'todos los ciclos'))",
        "count": 1
      },
      {
        "before": ".filter(e=>e.getClientRects().length)",
        "after": ".filter(e=>e.getClientRects().length&&!e.closest('details:not([open])'))",
        "count": 3
      }
    ]
  },
  "scripts/statistical-levels-release/scripts/qa/asset-transition-readiness.mjs": {
    "git_path": "scripts/statistical-levels-release/scripts/qa/asset-transition-readiness.mjs",
    "previous_sha256": "b3e610a7f921ba3aa6f59ab69c755b7253221251df4fa3b23badae9fe2ce052a",
    "current_sha256": "37d83b5623950455041009ef116c0df6a194cbce9261cfaa304bf5d5729f952d",
    "changes": [
      {
        "before": "    if (options.length !== 2 || options[0].value !== target.frequency || options[1].value !== target.window) return false;",
        "after": "    const acRoute = ['/analisiscuantitativo', '/en/quantitative-analysis'].includes(location.pathname);\n    if (acRoute) {\n      const frequencies = root.querySelectorAll('#sl-frequency select');\n      const buttons = [...root.querySelectorAll('#sl-controls button')].filter(button => button.getAttribute('data-window') !== null);\n      const windows = ['1Y', '3Y', '5Y', '10Y', 'Full'];\n      if (options.length !== 0 || frequencies.length !== 1 || frequencies[0].value !== target.frequency || !visible(frequencies[0]) ||\n          buttons.length !== windows.length || buttons.some((button, index) => button.getAttribute('data-window') !== windows[index] || !visible(button)) ||\n          buttons.filter(button => button.getAttribute('aria-pressed') === 'true').length !== 1 ||\n          buttons.find(button => button.getAttribute('aria-pressed') === 'true').getAttribute('data-window') !== target.window) return false;\n    } else if (options.length !== 2 || options[0].value !== target.frequency || options[1].value !== target.window) return false;",
        "count": 1
      }
    ]
  },
  "scripts/statistical-levels-release/scripts/adopt-causal-bridge.mjs": {
    "git_path": "scripts/statistical-levels-release/scripts/adopt-causal-bridge.mjs",
    "previous_sha256": "961e954058b31643d8588c0c1b260ade094f8a91b932caa6be9b70d41a694e74",
    "current_sha256": "cff2c99cd48ef7eae96aa073872b5595dec23fdabaf54567b795b127bc2add80",
    "changes": [
      {
        "before": "export function selectionExpression(kind) {\n  const c=actionControls[kind];",
        "after": "export const acActionControls = Object.freeze({ ...actionControls,\n  T3:Object.freeze({type:'EVALUATE',selector:'#sl-frequency select',value:'daily'}),\n  T4:Object.freeze({type:'CLICK',selector:'[data-window=\"Full\"]'})\n});\nexport function selectionExpression(kind, ac = false) {\n  const c=(ac?acActionControls:actionControls)[kind];",
        "count": 1
      },
      {
        "before": "export const scriptFingerprint=",
        "after": "export function matchActionControl(kind,type,parameter) {\n  for(const ac of [false,true]) {\n    const control=(ac?acActionControls:actionControls)[kind];\n    if(control?.type===type&&parameter===(type==='CLICK'?control.selector:selectionExpression(kind,ac)))return control;\n  }\n  return null;\n}\nexport function actionSourceContract(action) {\n  for(const ac of [false,true]) {\n    const control=(ac?acActionControls:actionControls)[action?.kind];\n    const source=control?.type==='CLICK'?listenerMarker:control?selectionExpression(action.kind,ac):'';\n    if(control&&action.source_sha256===sha(source))return {control,source};\n  }\n  return null;\n}\nexport const scriptFingerprint=",
        "count": 1
      },
      {
        "before": "need(actionControls[action.kind]?.type==='CLICK'&&selector===actionControls[action.kind].selector,'ACTION_CONTROL_MISMATCH');",
        "after": "need(matchActionControl(action.kind,'CLICK',selector),'ACTION_CONTROL_MISMATCH');",
        "count": 1
      },
      {
        "before": "need(actionControls[action.kind]?.type==='EVALUATE'&&expression===selectionExpression(action.kind),'ACTION_CONTROL_MISMATCH');",
        "after": "need(matchActionControl(action.kind,'EVALUATE',expression),'ACTION_CONTROL_MISMATCH');",
        "count": 1
      },
      {
        "before": "  const a=matches[0],control=actionControls[a.kind];\n  const expectedSource=control?.type==='CLICK'?listenerMarker:control?selectionExpression(a.kind):'';",
        "after": "  const a=matches[0],contract=actionSourceContract(a),control=contract?.control;\n  const expectedSource=contract?.source??'';",
        "count": 1
      },
      {
        "before": "export function matchActionControl(kind,type,parameter) {",
        "after": "export function matchActionControl(kind,type,parameter) {\n  if(!['T1','T2','T3','T4'].includes(kind))return null;",
        "count": 1
      },
      {
        "before": "export function actionSourceContract(action) {",
        "after": "export function actionSourceContract(action) {\n  if(!['T1','T2','T3','T4'].includes(action?.kind))return null;",
        "count": 1
      }
    ]
  },
  "scripts/statistical-levels-release/scripts/adopt-request-evidence.mjs": {
    "git_path": "scripts/statistical-levels-release/scripts/adopt-request-evidence.mjs",
    "previous_sha256": "462ad0bd02035d906ed9323c0d3e7801271f7cb56aaa9878ca2c448f1dade357",
    "current_sha256": "26ddfcac2a2b8ac170a79fc368d840fc4356b7c9dd18ce758b66d3a521a5a3c2",
    "changes": [
      {
        "before": "import { actionControls, listenerMarker",
        "after": "import { actionControls, matchActionControl, listenerMarker",
        "count": 1
      },
      {
        "before": "    const t=active.get(p),control=actionControls[t?.kind];\n    if(!t||!control||control.type!==type||t.action_instance_id!==unknown)return null;\n    if(parameter!==(type==='CLICK'?control.selector:selectionExpression(t.kind)))return null;",
        "after": "    const t=active.get(p),control=matchActionControl(t?.kind,type,parameter);\n    if(!t||!control||t.action_instance_id!==unknown)return null;",
        "count": 1
      },
      {
        "before": "import { actionControls, matchActionControl, listenerMarker, selectionExpression, newAction,",
        "after": "import { matchActionControl, actionSourceContract, newAction,",
        "count": 1
      },
      {
        "before": "   const control=actionControls[a.kind];\n   agree(a.source_sha256,control?sha(control.type==='CLICK'?listenerMarker:selectionExpression(a.kind)):undefined);",
        "after": "   const contract=actionSourceContract(a);\n   agree(a.source_sha256,contract?sha(contract.source):undefined);",
        "count": 1
      }
    ]
  },
  "scripts/statistical-levels-release/scripts/runtime-transition-receipts.mjs": {
    "git_path": "scripts/statistical-levels-release/scripts/runtime-transition-receipts.mjs",
    "previous_sha256": "878a8fe43d1ca504fdf1b1daf5768d95b4f00dd7426695bc25819c387128354e",
    "current_sha256": "41cdc868bd1f7249c6aa6d870442c0f1e695f37dec6e8a4528ca902e03fc0efa",
    "changes": [
      {
        "before": "intent:'a',url:'t',payload:'m',alive:'p'})]);",
        "after": "intent:'a',url:'t',payload:'m',alive:'p'}),\n // Exact approved AC / Next16.4.6 executable recovered from the immutable Preview.\n // Native source digest, breakpoint locations and four frames remain mandatory.\n Object.freeze({sha256:'49962c6499298c06762f7b00bc1cece34b8e2eacc44dae58d677be9df9847809',length:135210,fetch:1995,before_fetch:1989,validated:2218,commit:133993,frames:Object.freeze([1995,134208,107564,20819]),intent:'a',url:'t',payload:'m',alive:'p',response:'i',raw_json:'n',from:'c.current.selection',target:'i',current:'n===d.current'})]);",
        "count": 1
      },
      {
        "before": "parsed:r===i,status:n.status,redirected:n.redirected,path:new URL(n.url).pathname,origin:new URL(n.url).origin,content_type:n.headers.get(\"content-type\")",
        "after": "parsed:r===${executable.raw_json??'i'},status:${executable.response??'n'}.status,redirected:${executable.response??'n'}.redirected,path:new URL(${executable.response??'n'}.url).pathname,origin:new URL(${executable.response??'n'}.url).origin,content_type:${executable.response??'n'}.headers.get(\"content-type\")",
        "count": 1
      },
      {
        "before": "from:d.current.selection,target:n,current:i===c.current,alive:",
        "after": "from:${executable.from??'d.current.selection'},target:${executable.target??'n'},current:${executable.current??'i===c.current'},alive:",
        "count": 1
      }
    ]
  }
};
export function beforeAcRoutePaths(file,current) {
  const name=file.startsWith('scripts/statistical-levels-release/scripts/') ?
    file.slice('scripts/statistical-levels-release/scripts/'.length) : file.replace(/^scripts\//,'');
  const spec=acRouteChanges['scripts/statistical-levels-release/scripts/'+name];
  if(!spec)return current;
  const bytes=Buffer.isBuffer(current)?current:Buffer.from(current);
  if(digest(bytes)===spec.previous_sha256)return current;
  assert.equal(digest(bytes),spec.current_sha256,'CURRENT_HISTORICAL_CONTRACT:'+name);
  const historical=historicalBlob('fd007159235c306b714789d60786a5733ab7d8f4',spec.git_path,spec.previous_sha256);
  let projected=historical.toString();
  for(const {before,after,count} of spec.changes){
    assert.equal(projected.split(before).length-1,count,'AC_ROUTE_CHANGE_COUNT:'+name);
    projected=projected.split(before).join(after);
  }
  assert.equal(projected,bytes.toString(),'AC_ROUTE_ONLY_DELTA:'+name);
  return Buffer.isBuffer(current)?historical:historical.toString();
}

export function historicalPinnedBytes(file,current) {
  current=beforeAcRoutePaths(file,current);
  const name=file.replace(/^scripts\//,'');
  if(!Object.hasOwn(filePins,name))return current;
  const pins=filePins[name],gitName='scripts/statistical-levels-release/scripts/'+name;
  assert.equal(digest(current),pins[RPRIME],'CURRENT_HISTORICAL_CONTRACT:'+name);
  historicalBlob(RPRIME,gitName,pins[RPRIME]);
  historicalBlob(CLOSURE,gitName,pins[CLOSURE]);
  return historicalBlob(DX,gitName,pins[DX]);
}
const historicalReleaseInputs="const releaseInputs = ['candidate_git_sha', 'candidate_deployment_id', 'expected_previous_production_sha',\n  'expected_previous_production_deployment', 'previous_publication_date'];";
const currentReleaseInputsSHA="bcc473a55991a468620d522e475495def75d8978068eefe75ffe07816285221b";
export function historicalProbeRegion(name,source) {
  if(name!=='releaseInputs')return source;
  assert.equal(digest(source),currentReleaseInputsSHA,'PROBE_CORE_SECURITY:releaseInputs');
  return historicalReleaseInputs;
}
const workflowPath='.github/workflows/statistical-levels-release.yml';
const normalizeWorkflow=source=>source.replace(/(EXPECTED_SOURCE_SUMS: )[a-f0-9]{64}/g,'$1<FROZEN_SOURCE_SUMS>');
const workflowNormalizedSHA="c548670b9e2d652e34aebed307fee83bed76d349f22ebccf939048ce9b3a798f";
const historicalWorkflowSHA="13d9429121704fb5a7ca891cfbe06c60629a357540c41fd86cd8ccdd00038b28";
const requiredJobs=["candidate-qa", "seal-qa", "invoke-controller", "production-qa", "seal-production-qa", "certify-production", "publication-result", "daily-dispatch", "identity-probe", "transition-prepare", "transition-qa", "seal-transition-qa", "transition-certify"];
export function assertHistoricalWorkflow(source) {
  const pins=[...source.matchAll(/EXPECTED_SOURCE_SUMS: ([a-f0-9]{64})/g)].map(m=>m[1]);
  const sums=digest(readFileSync(new URL('../SOURCE_SHA256SUMS',import.meta.url)));
  assert.equal(pins.length,10,'HISTORICAL_WORKFLOW_PINS');
  assert.ok(pins.every(pin=>pin===sums),'HISTORICAL_WORKFLOW_PINS');
  const jobs=[...source.matchAll(/^  ([a-z][a-z0-9-]*):\n/gm)].map(m=>m[1]);
  assert.deepEqual(jobs,requiredJobs,'HISTORICAL_WORKFLOW_JOB_INVENTORY');
  assert.equal(new Set(jobs).size,jobs.length,'HISTORICAL_WORKFLOW_DUPLICATE_JOB');
  assert.equal(digest(normalizeWorkflow(source)),workflowNormalizedSHA,'HISTORICAL_WORKFLOW_DELTA');
}
export function exactWorkflowJob(source,name) {
  assertHistoricalWorkflow(source);
  const jobs=[...source.matchAll(/^  ([a-z][a-z0-9-]*):\n/gm)];
  const index=jobs.findIndex(m=>m[1]===name);
  assert.ok(index>=0,'HISTORICAL_WORKFLOW_MISSING_JOB');
  return source.slice(jobs[index].index,index+1<jobs.length?jobs[index+1].index:source.length);
}
export function historicalWorkflowPrefix(source) {
  assertHistoricalWorkflow(source);
  const historical=historicalBlob(DX,workflowPath,historicalWorkflowSHA).toString();
  assert.equal(historical.split('  identity-probe:\n').length,2,'HISTORICAL_WORKFLOW_PROBE');
  return normalizeWorkflow(historical.split('  identity-probe:\n')[0]);
}
