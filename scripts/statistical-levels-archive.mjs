import fs from 'node:fs';
import path from 'node:path';
import { hash, jsonBytes, putVerified, requireValue } from './statistical-levels-storage.mjs';

export function runPrefix(kind, runId) {
  requireValue(['raw-authority', 'provisioning-probes'].includes(kind) && /^[A-Za-z0-9-]{20,100}$/.test(runId), 'INVALID_RUN_NAMESPACE');
  return `statistical-levels/${kind}/${runId}/`;
}

// The reservation is the first write. An interrupted run leaves an incomplete,
// permanently reserved prefix; it can never be resumed or mistaken for sealed.
export async function sealArchive({ store, prefix, runId, produce, describe, expectedCount, provenance }) {
  const entries = {};
  async function write(name, bytes) {
    requireValue(/^(?:raw\/[A-Z0-9]+\.json|raw\/probe\.bin|RESERVATION|raw-manifest\.json|provenance-manifest\.json|SHA256SUMS|SEALED)$/.test(name) && !entries[name], 'INVALID_OR_DUPLICATE_OBJECT');
    const result = await putVerified(store, prefix + name, bytes);
    const { bytes: archivedBytes, ...metadata } = result;
    entries[name] = metadata;
    return archivedBytes;
  }
  try { await write('RESERVATION', jsonBytes({ RUN_ID: runId, PROTOCOL: 'statistical-levels.raw-archive.v1' })); }
  catch (error) { if (error.message === 'PreconditionFailed') throw new Error('RUN_ID_COLLISION'); throw error; }
  const records = [];
  for await (const item of produce()) {
    const archivedBytes = await write(item.name, item.bytes);
    records.push(await describe(item, archivedBytes));
  }
  requireValue(records.length === expectedCount, 'INCOMPLETE_RAW_ARCHIVE');
  const cutoff = new Date().toISOString();
  await write('raw-manifest.json', jsonBytes({ BASELINE_ID: runId, SNAPSHOT_CUTOFF: cutoff, PROVIDER: provenance.PROVIDER, records }));
  await write('provenance-manifest.json', jsonBytes({ ...provenance, RUN_ID: runId, SNAPSHOT_CUTOFF: cutoff, OBJECTS: entries }));
  // Preserve the offline generator's 40-raw + raw-manifest checksum contract.
  // The seal separately binds reservation, provenance and this checksum file.
  const sums = Object.keys(entries).filter(n => n.startsWith('raw/') || n === 'raw-manifest.json').sort().map(n => `${entries[n].SHA256}  ${n}\n`).join('');
  await write('SHA256SUMS', Buffer.from(sums));
  const seal = { PROTOCOL: 'statistical-levels.raw-archive.v1', RUN_ID: runId, SNAPSHOT_CUTOFF: cutoff, OBJECTS: { ...entries } };
  const sealBytes = jsonBytes(seal);
  await write('SEALED', sealBytes);
  return { prefix, runId, seal, sealSHA256: hash(sealBytes), sealVersion: entries.SEALED.VERSION_ID };
}

// Nothing is taken from the provider's buffers: every input is fetched again
// by its sealed S3 version, after verifying the seal itself.
export async function readSealedArchive(store, authority, destination) {
  const sealed = await store.get(authority.prefix + 'SEALED', authority.sealVersion);
  requireValue(sealed.version === authority.sealVersion && hash(sealed.bytes) === authority.sealSHA256, 'SEAL_READBACK_MISMATCH');
  const seal = JSON.parse(sealed.bytes);
  requireValue(seal.RUN_ID === authority.runId, 'SEAL_RUN_MISMATCH');
  fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
  for (const [name, binding] of Object.entries(seal.OBJECTS)) {
    requireValue(/^(?:raw\/[A-Z0-9]+\.json|raw\/probe\.bin|RESERVATION|raw-manifest\.json|provenance-manifest\.json|SHA256SUMS)$/.test(name), 'INVALID_SEALED_PATH');
    const archived = await store.get(authority.prefix + name, binding.VERSION_ID);
    requireValue(archived.version === binding.VERSION_ID && hash(archived.bytes) === binding.SHA256 && archived.bytes.length === binding.BYTES, 'ARCHIVED_INPUT_MISMATCH');
    const file = path.join(destination, name);
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, archived.bytes, { flag: 'wx', mode: 0o600 });
  }
  fs.writeFileSync(path.join(destination, 'SEALED'), sealed.bytes, { flag: 'wx', mode: 0o600 });
  return seal;
}
