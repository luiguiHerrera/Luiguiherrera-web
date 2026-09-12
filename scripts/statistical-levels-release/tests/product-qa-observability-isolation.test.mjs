// The Founder froze these approved security/classifier/ADOPT/PROMOTE inputs for this observability-only change.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const expected = {
  "unchanged existing semantic event classifier": {
    "scripts/network-accounting.mjs": "a423eb268dc046cdb1c022587621afb33671f70f72f0dc1c519a9a5d481acc10"
  },
  "Custom Trusted Source and anonymous baseline logic unchanged": {
    "scripts/probe-gate.mjs": "0365b98b2b84e8db364aabfcac52199d467564c7d64169fc9b39bced5d320d6e",
    "scripts/probe-http.mjs": "036a21186195bfaecadfe046d08786b69f692b730e2144da7b450f8d319614df"
  },
  "HTTP application fixture binding unchanged": {
    "scripts/probe-dom.mjs": "1164dc7ff85c69b970a70ee0a00586dbbd662e7d7970b9615f9fdd60ae5cda4e"
  },
  "browser authority binding unchanged": {
    "scripts/probe-browser-authority.mjs": "d8873a83f6159e33e874124c62324d8bf76c7527786adeaaa1414b2b1e304209"
  },
  "OIDC V3 identity security unchanged": {
    "scripts/probe-oidc.mjs": "951606ee7fa3aa2442f3201af904afeb6afa0745475d72bbff24545f7ca603ab",
    "scripts/probe-runtime.mjs": "a0c808af84d5f8f047a823bb88ae9247fdceb93099d0274e4c0eeb2b6d66a3a8"
  },
  "phase-scoped token budget unchanged": {
    "scripts/probe-token-budget.mjs": "944a180e12e516417acf3f98b3e59ad402b33293b9141eaa830753d47c09860e"
  },
  "PROBE target authorization and controller-exclusion contracts unchanged": {
    "scripts/probe-core.mjs": "1f9febf65554472832d4858af453662d87f27925e5b282cfe2b04a6b66ebba41",
    "policy.json": "c194090cdb1db2ce6aee032492aab95dac85c32405be7e8d0855f43bc728fd22",
    "controller-request-schema.json": "d44337f72a9970d9db8e5d24ec1c400b4a5a4db9d4e3110b054727e6c9a224d3",
    "controller-qa-schema.json": "3fece1fd42493bc6210c1ea901459f50c85fc2deb24d177e0dadf51b35a063d8"
  },
  "ADOPT shared runner and transport behavior unchanged": {
    "scripts/qa-runner.mjs": "4584b988912f702a3b79f8de19640dd8eb0c0ebf61e45d0330af6ae975c03262",
    "scripts/browser-harness-base.mjs": "3d3a5f048d1e75f56f88ccb728e09aa7e892cc8f6b627dff81e05664145c18b9",
    "scripts/release-core.mjs": "c461b1af450c69007b4f5bfac9c21010ca475b843aec5fed3ff6fe6b8912dd70"
  },
  "PROMOTE shared runner and transport behavior unchanged": {
    "scripts/qa-runner.mjs": "4584b988912f702a3b79f8de19640dd8eb0c0ebf61e45d0330af6ae975c03262",
    "scripts/browser-harness-base.mjs": "3d3a5f048d1e75f56f88ccb728e09aa7e892cc8f6b627dff81e05664145c18b9",
    "scripts/release-core.mjs": "c461b1af450c69007b4f5bfac9c21010ca475b843aec5fed3ff6fe6b8912dd70"
  }
};
for (const [name, files] of Object.entries(expected)) {
  test(name, async () => {
    for (const [file, hash] of Object.entries(files)) {
      const bytes = await readFile(new URL('../' + file, import.meta.url));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), hash, file);
    }
  });
}
