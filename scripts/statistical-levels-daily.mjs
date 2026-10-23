// Daily pre-fetch admission. Native S3 readback, no provider client and no retry.
// A failed/ambiguous selection or incomplete archive stops; it never authorizes
// a second provider fetch. This does not certify or promote public Production.
import { hash, jsonBytes, putVerified, requireValue, verifyRetention } from './statistical-levels-storage.mjs';
import { runPrefix } from './statistical-levels-archive.mjs';

const SHA = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
const RUN = /^\d{8}T\d{9}Z-[a-f0-9-]{36}$/;
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
export const stateBucket = 'sl-publication-state-732159826922-eu-south-2';
export const selectionKey = day => `statistical-levels/raw-authority/daily/${day}/SELECTED.json`;
export const publishedKey = day => `statistical-levels/publication-state/${day}/published.json`;
const ref = (key, value) => ({ key, version: value.version, sha256: hash(value.bytes), utf8: value.bytes.toString('utf8') });

async function readExisting(store, key) {
  if (!await store.findExact(key)) return null;
  const value = await store.get(key);
  requireValue(typeof value.version === 'string' && value.version !== 'null' && value.version.length > 0, 'DAILY_VERSION_REQUIRED');
  const exact = await store.get(key, value.version);
  requireValue(exact.version === value.version && exact.bytes.equals(value.bytes), 'DAILY_VERSION_READBACK');
  return value;
}
function selection(value, context) {
  requireValue(exactKeys(value, ['schema', 'day', 'run_id', 'source_sha', 'producer_run_id', 'producer_attempt', 'created_at']), 'DAILY_SELECTION_SCHEMA');
  requireValue(value.schema === 'statistical-levels.daily-selection.v1' && value.day === context.day &&
    RUN.test(value.run_id) && value.run_id.startsWith(context.day.replaceAll('-', '')) && SHA.test(value.source_sha) &&
    /^[1-9][0-9]*$/.test(value.producer_run_id) && /^[1-9][0-9]*$/.test(value.producer_attempt) &&
    Number.isFinite(Date.parse(value.created_at)) && value.created_at.slice(0, 10) === context.day &&
    Date.parse(value.created_at) <= Date.parse(context.now), 'DAILY_SELECTION_IDENTITY');
  return value;
}
function published(value, day) {
  // This gate recognizes only the existing future-promotion marker schema.
  // N's historical marker and arbitrary JSON never become a current-day marker.
  const keys = ['publication_date_utc', 'authority_run_id', 'sealed_manifest_sha256', 'generated_commit',
    'preview_deployment_id', 'production_deployment_id', 'production_git_sha', 'qa_attestation_hash',
    'production_qa_attestation_hash', 'production_certified_at_utc', 'production_certified_at',
    'controller_version', 'previous_production_sha', 'previous_production_deployment',
    'new_production_sha', 'new_production_deployment', 'main_sha_observed', 'main_sha_observed_before_release',
    'main_sha_observed_after_release', 'previous_publication_date', 'previous_publication_marker_sha256'];
  requireValue(exactKeys(value, keys), 'DAILY_PUBLISHED_SCHEMA');
  requireValue(value.publication_date_utc === day && RUN.test(value.authority_run_id) &&
    value.authority_run_id.startsWith(day.replaceAll('-', '')) && HASH.test(value.sealed_manifest_sha256) &&
    value.controller_version === 'statistical-levels-release-controller.v2' &&
    /^dpl_[A-Za-z0-9]{10,80}$/.test(value.preview_deployment_id) && /^dpl_[A-Za-z0-9]{10,80}$/.test(value.previous_production_deployment) &&
    SHA.test(value.generated_commit) && value.generated_commit === value.production_git_sha &&
    value.production_git_sha === value.new_production_sha &&
    /^dpl_[A-Za-z0-9]{10,80}$/.test(value.production_deployment_id) &&
    value.production_deployment_id === value.new_production_deployment &&
    value.production_certified_at === value.production_certified_at_utc &&
    Number.isFinite(Date.parse(value.production_certified_at_utc)) &&
    HASH.test(value.qa_attestation_hash) && HASH.test(value.production_qa_attestation_hash) &&
    HASH.test(value.previous_publication_marker_sha256) && SHA.test(value.previous_production_sha) &&
    SHA.test(value.main_sha_observed) && value.main_sha_observed === value.main_sha_observed_before_release &&
    value.main_sha_observed === value.main_sha_observed_after_release &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.previous_publication_date) && value.previous_publication_date < day,
    'DAILY_PUBLISHED_IDENTITY');
  return value;
}
export async function admitDaily({ store, state, context, currentProvenance }) {
  requireValue(exactKeys(context, ['day', 'now', 'runId', 'gitSha', 'producerRunId', 'producerAttempt']), 'DAILY_CONTEXT_SCHEMA');
  requireValue(/^\d{4}-\d{2}-\d{2}$/.test(context.day) && new Date(context.now).toISOString().slice(0, 10) === context.day &&
    RUN.test(context.runId) && context.runId.startsWith(context.day.replaceAll('-', '')) && SHA.test(context.gitSha) &&
    /^[1-9][0-9]*$/.test(context.producerRunId) && /^[1-9][0-9]*$/.test(context.producerAttempt), 'DAILY_CONTEXT_IDENTITY');
  // This role must have explicit exact-prefix read permissions before activation.
  // Failure here cannot fall through to provider access or create a daily claim.
  const markerKey = publishedKey(context.day), markerObject = await readExisting(state, markerKey);
  if (markerObject) {
    const marker = published(JSON.parse(markerObject.bytes), context.day);
    requireValue(Date.parse(marker.production_certified_at_utc) <= Date.parse(context.now), 'DAILY_PUBLISHED_FUTURE');
    verifyRetention(await state.retention(markerKey, markerObject.version), Date.parse(marker.production_certified_at_utc));
    return { mode: 'PUBLISHED_NOOP', day: context.day, marker: ref(markerKey, markerObject), provider_fetches: 0 };
  }
  const key = selectionKey(context.day);
  let selectedObject = await readExisting(store, key), created = false;
  if (!selectedObject) {
    const value = { schema: 'statistical-levels.daily-selection.v1', day: context.day,
      run_id: context.runId, source_sha: context.gitSha, producer_run_id: context.producerRunId,
      producer_attempt: context.producerAttempt, created_at: context.now };
    try {
      const result = await putVerified(store, key, jsonBytes(value));
      selectedObject = { bytes: result.bytes, version: result.VERSION_ID }; created = true;
    } catch (error) {
      // Only an explicit atomic conditional conflict is reconcilable. Timeouts,
      // failed readbacks and unknown results retain STOP without another PUT.
      if (error.message !== 'PreconditionFailed') throw error;
      selectedObject = await readExisting(store, key);
      requireValue(selectedObject !== null, 'DAILY_SELECTION_RACE_UNRESOLVED');
    }
  }
  const selected = selection(JSON.parse(selectedObject.bytes), context);
  verifyRetention(await store.retention(key, selectedObject.version), Date.parse(selected.created_at));
  const common = { day: context.day, selection: ref(key, selectedObject) };
  if (created) return { mode: 'FETCH_NEW', ...common, runId: selected.run_id };
  const prefix = runPrefix('raw-authority', selected.run_id), sealed = await readExisting(store, prefix + 'SEALED');
  requireValue(sealed !== null, 'DAILY_SELECTED_ARCHIVE_INCOMPLETE');
  const seal = JSON.parse(sealed.bytes);
  requireValue(seal.PROTOCOL === 'statistical-levels.raw-archive.v1' && seal.RUN_ID === selected.run_id &&
    typeof seal.SNAPSHOT_CUTOFF === 'string' && seal.SNAPSHOT_CUTOFF.slice(0, 10) === context.day &&
    Object.keys(seal.OBJECTS ?? {}).length === 44, 'DAILY_SEAL_BINDING');
  const authority = { prefix, runId: selected.run_id, sealSHA256: hash(sealed.bytes), sealVersion: sealed.version };
  if (currentProvenance?.BASELINE_ID === selected.run_id) {
    requireValue(currentProvenance.GENERATOR_COMMIT === selected.source_sha &&
      currentProvenance.SOURCE_STATE === 'COMMITTED' && currentProvenance.CONFIG?.RAW_ARCHIVE_SEAL_SHA256 === authority.sealSHA256 &&
      currentProvenance.CONFIG?.RAW_ARCHIVE_SEAL_VERSION === authority.sealVersion, 'DAILY_GENERATED_BINDING');
    return { mode: 'GENERATED_NOOP', ...common, authority, seal: ref(prefix + 'SEALED', sealed), provider_fetches: 0 };
  }
  requireValue(context.gitSha === selected.source_sha, 'DAILY_REUSE_SOURCE_ADVANCED');
  return { mode: 'REUSE_SEALED', ...common, authority, seal: ref(prefix + 'SEALED', sealed), provider_fetches: 0 };
}
