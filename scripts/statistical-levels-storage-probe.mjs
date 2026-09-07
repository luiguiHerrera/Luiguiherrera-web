import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { S3Store, runtimeConfig, newRunId, hash, requireValue, assertNoSecrets } from './statistical-levels-storage.mjs';
import { runPrefix, sealArchive } from './statistical-levels-archive.mjs';

async function denied(operation, expected = 'AccessDenied') {
  try { await operation(); } catch (error) { requireValue(error.message === expected, 'UNEXPECTED_DENIAL'); return; }
  throw new Error('FORBIDDEN_OPERATION_SUCCEEDED');
}

export async function probe(store, runId = newRunId()) {
  await store.identity();
  const prefix = runPrefix('provisioning-probes', runId);
  const bytes = Buffer.from(`STATISTICAL_LEVELS_PROVISIONING_PROBE\nRUN_ID=${runId}\nUTC=${new Date().toISOString()}\nRANDOM=${randomBytes(32).toString('hex')}\n`);
  const authority = await sealArchive({ store, prefix, runId, expectedCount: 1,
    produce: async function* () { yield { name: 'raw/probe.bin', bytes }; },
    describe: (item, archived) => ({ SOURCE_FILE: item.name, SHA256: hash(archived), BYTES: archived.length }),
    provenance: { PROVIDER: 'SYNTHETIC_NO_PROVIDER_ACCESS', GIT_SHA: process.env.GITHUB_SHA ?? 'local-test', IDENTITY: 'GITHUB_OIDC' } });
  const key = prefix + 'raw/probe.bin', binding = authority.seal.OBJECTS['raw/probe.bin'];
  const retention = await store.retention(key, binding.VERSION_ID);
  await denied(() => store.put(key, Buffer.from('different synthetic bytes')), 'PreconditionFailed');
  await denied(() => store.put(prefix + 'missing-precondition.bin', bytes, { condition: false }));
  await denied(() => store.delete(key));
  // Use the identical retention value: even an unexpected allow cannot shorten
  // or extend the synthetic object's retention. Both calls must be denied.
  await denied(() => store.retain(key, binding.VERSION_ID, retention));
  await denied(() => store.retain(key, binding.VERSION_ID, retention, true));
  await denied(() => store.put(`statistical-levels/provisioning-denial-probes/${runId}/probe.bin`, bytes));
  const original = await store.get(key);
  requireValue(original.version === binding.VERSION_ID && original.bytes.equals(bytes) && hash(original.bytes) === binding.SHA256, 'ORIGINAL_OBJECT_CHANGED');
  requireValue(JSON.stringify(await store.retention(key, binding.VERSION_ID)) === JSON.stringify(retention), 'RETENTION_CHANGED');
  const result = { RUN_ID: runId, PREFIX: prefix, HOSTED_PROBE: 'PASS', OIDC_TOKEN: 'ISSUED', ASSUME_ROLE_WITH_WEB_IDENTITY: 'PASS', TEMPORARY_AWS_CREDENTIALS: 'PASS', LONG_LIVED_SECRET_USED: 'NO', FIRST_CREATE: 'PASS', BYTE_EQUALITY: 'PASS', LOCAL_SHA256: hash(bytes), READBACK_SHA256: hash(original.bytes), OBJECT_LOCK_MODE: retention.Mode, RETENTION_PRESENT: 'YES', RETAIN_UNTIL: retention.RetainUntilDate, RAW_MANIFEST: 'PASS', PROVENANCE_MANIFEST: 'PASS', SHA256SUMS: 'PASS', SEALED: 'PASS', SEALED_AFTER_ALL_OTHER_OBJECTS_VERIFIED: 'YES', OVERWRITE_HTTP: 412, OVERWRITE_SUCCEEDED: 'NO', ORIGINAL_OBJECT_BYTES_UNCHANGED: 'YES', ORIGINAL_SHA256_UNCHANGED: 'YES', WRITE_WITHOUT_IF_NONE_MATCH: 'DENIED', OBJECT_CREATED_WITHOUT_PRECONDITION: 'NO', DELETE_PERMISSION: 'DENIED', OBJECT_STILL_READABLE: 'YES', RETENTION_MUTATION: 'DENIED', BYPASS_GOVERNANCE: 'DENIED', OUTSIDE_PREFIX_WRITE: 'DENIED', OUTSIDE_PREFIX_OBJECT_CREATED: 'NO', SECRET_LEAK_SCAN: 'PASS' };
  assertNoSecrets(JSON.stringify(result));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let store;
  try {
    store = new S3Store(runtimeConfig());
    const result = await probe(store);
    const text = JSON.stringify(result, null, 2) + '\n';
    console.log(text);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '```json\n' + text + '```\n');
  } catch (error) {
    const code = /^[A-Z][A-Z0-9_]{0,100}$/.test(error.message) || ['AccessDenied', 'PreconditionFailed'].includes(error.message) ? error.message : 'UNCLASSIFIED_ERROR';
    console.error('SYNTHETIC_STORAGE_PROBE_FAILED_CLOSED:' + code); process.exitCode = 1;
  }
  finally { store?.close(); }
}
