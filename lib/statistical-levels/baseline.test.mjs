import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { completedDailyRows, completedPeriod } from './baseline-policy.mjs';
import { datedCorrelationEvidence } from './defect-repairs.mjs';
import { verifyArchive, sha256 } from '../../scripts/statistical-levels-offline.mjs';

const cutoff = '2026-09-06T16:32:25Z';
const config = JSON.parse(fs.readFileSync('lib/statistical-levels/baseline-config.json', 'utf8'));
const archive = path.join(os.homedir(), config.RAW_ARCHIVE_RELATIVE_PATH);
const row = date => ({ date });

test('current crypto mark may exist while the September 6 UTC bar is excluded from completed history', () => {
  const rows = [row('2026-09-04'), row('2026-09-05'), row('2026-09-06')];
  assert.equal(rows.at(-1).date, '2026-09-06');
  assert.deepEqual(completedDailyRows(rows, { dataGranularity: '1d', exchangeTimezoneName: 'UTC' }, cutoff).map(r => r.date), ['2026-09-04', '2026-09-05']);
  assert.equal(rows.length, 3, 'policy does not mutate the frozen input');
});
test('ETF history admits only ended sessions; an intraday same-date mark is not a completed return', () => {
  const metadata = { dataGranularity: '1d', exchangeTimezoneName: 'America/New_York', currentTradingPeriod: { regular: { start: Date.parse('2026-09-04T13:30:00Z') / 1000, end: Date.parse('2026-09-04T20:00:00Z') / 1000 } } };
  const rows = [row('2026-09-03'), row('2026-09-04')];
  assert.equal(completedDailyRows(rows, metadata, cutoff).at(-1).date, '2026-09-04');
  assert.equal(completedDailyRows(rows, metadata, '2026-09-04T16:00:00Z').at(-1).date, '2026-09-03');
  assert.equal(completedDailyRows(rows, metadata, '2026-09-04T20:00:00Z').at(-1).date, '2026-09-04');
});
test('current calendar week/month stay excluded until their UTC boundary', () => {
  assert.equal(completedPeriod('2026-09-04', 'weekly', cutoff), false);
  assert.equal(completedPeriod('2026-08-28', 'weekly', cutoff), true);
  assert.equal(completedPeriod('2026-09-06', 'weekly', '2026-09-07T00:00:00Z'), true);
  assert.equal(completedPeriod('2026-09-04', 'monthly', cutoff), false);
  assert.equal(completedPeriod('2026-08-31', 'monthly', cutoff), true);
});
test('correlation through date follows the completed matched pairs, independent of current marks', () => {
  const a = [{ date: '2026-09-04', value: .1 }, { date: '2026-09-05', value: .2 }];
  const b = [{ date: '2026-09-04', value: .2 }];
  assert.deepEqual(datedCorrelationEvidence(a, b), { value: null, n: 1, effectiveThroughDate: '2026-09-04' });
  assert.deepEqual(datedCorrelationEvidence([{ date: '2026-08-24', observedThrough: '2026-08-30', value: .1 }], [{ date: '2026-08-24', observedThrough: '2026-08-28', value: .2 }]), { value: null, n: 1, effectiveThroughDate: '2026-08-28' });
  assert.deepEqual(datedCorrelationEvidence(a, []), { value: null, n: 0, effectiveThroughDate: null });
  assert.equal(datedCorrelationEvidence(a, [...b, ...b]).effectiveThroughDate, null);
});
test('generation rejects missing provenance before writing or fetching anything', () => {
  for (const field of ['RAW_MANIFEST_SHA256', 'RAW_ARCHIVE_MANIFEST_SHA256', 'SNAPSHOT_CUTOFF', 'GENERATOR_COMMIT', 'GENERATED_AT', 'SCHEMA_VERSION']) {
    const missing = { ...config };delete missing[field];
    assert.throws(() => verifyArchive('/does-not-exist', missing), /Missing provenance input/);
  }
  assert.throws(() => verifyArchive('/does-not-exist', config), /ENOENT/);
});
test('all 81 canonical snapshots bind to source hashes, code, config, cutoff and exact output bytes', () => {
  const provenance = JSON.parse(fs.readFileSync('lib/statistical-levels/generated-provenance.json', 'utf8'));
  assert.equal(provenance.snapshots.length, 81);
  assert.equal(provenance.CONFIG_SHA256, sha256(JSON.stringify(provenance.CONFIG)));
  assert.equal(provenance.BASELINE_ID, provenance.CONFIG.BASELINE_ID);
  assert.equal(provenance.GENERATOR_SHA256, sha256(JSON.stringify(provenance.SOURCE_BUNDLE)));
  for (const source of provenance.SOURCE_BUNDLE) assert.equal(sha256(fs.readFileSync(source.file)), source.SHA256);
  for (const snapshot of provenance.snapshots) {
    assert.equal(sha256(fs.readFileSync('lib/statistical-levels/generated/' + snapshot.FILE)), snapshot.SNAPSHOT_SHA256);
    for (const key of ['SCHEMA_VERSION', 'GENERATOR_COMMIT', 'GENERATOR_SHA256', 'CONFIG_SHA256', 'GENERATED_AT']) assert.ok(snapshot[key]);
    assert.equal(snapshot.INPUTS.length, snapshot.FILE === 'manifest.json' ? 40 : 1);
    for (const input of snapshot.INPUTS) for (const key of ['RAW_SOURCE_ID', 'RAW_SHA256', 'RAW_ROW_COUNT', 'RAW_FIRST_DATE', 'RAW_LAST_DATE', 'SNAPSHOT_CUTOFF', 'CURRENT_MARK_TIMESTAMP', 'LAST_COMPLETED_OBSERVATION']) assert.ok(input[key]);
  }
});
test('archived raw identity and final completed history are independently bound', { skip: !fs.existsSync(archive) || JSON.parse(fs.readFileSync('lib/statistical-levels/generated-provenance.json')).BASELINE_ID !== config.BASELINE_ID }, () => {
  const manifest = verifyArchive(archive, config);
  for (const input of manifest.records) {
    const asset = JSON.parse(fs.readFileSync(`lib/statistical-levels/generated/assets/${input.ASSET}.json`, 'utf8'));
    const crypto = ['BTCUSD', 'ETHUSD'].includes(input.ASSET);
    assert.equal(asset.currentMark.date, crypto ? '2026-09-06' : '2026-09-04');
    assert.equal(asset.frequencies.daily.lastDate, crypto ? '2026-09-05' : '2026-09-04');
    assert.equal(asset.frequencies.daily.periods, input.ROW_COUNT - (crypto ? 1 : 0));
    assert.ok(asset.frequencies.weekly.drawdownHistory.every(p => p.date < '2026-08-31'));
    assert.ok(asset.frequencies.monthly.drawdownHistory.every(p => p.date < '2026-09-01'));
  }
});
test('two complete regenerations from archived raw have identical 81-file and provenance manifests', { skip: !process.env.STAT_LEVELS_QUALIFICATION_DIR }, () => {
  const root = process.env.STAT_LEVELS_QUALIFICATION_DIR;
  const a = JSON.parse(fs.readFileSync(path.join(root, 'repaired-run-manifest.json'), 'utf8'));
  const b = JSON.parse(fs.readFileSync(path.join(root, 'repaired-2-run-manifest.json'), 'utf8'));
  assert.deepEqual(a, b);assert.equal(a.SNAPSHOT_COUNT, 81);assert.equal(a.NETWORK_ATTEMPTS, 0);
  for (const item of a.snapshots) for (const folder of ['repaired', 'repaired-2']) assert.equal(sha256(fs.readFileSync(path.join(root, folder, item.file))), item.SHA256);
});
