import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { loadPublishedPage, sourceForSnapshot } from './published-data.ts';
import { RUNTIME_SCHEMA, validateRuntimeAsset } from './runtime-snapshot.ts';

test('a new verified run updates the lab while prior tabs retain their file hashes', async t => {
  const root = 'lib/statistical-levels/generated';
  const first = 'a'.repeat(40), second = 'b'.repeat(40);
  const dates = { [first]: '2026-11-24T12:00:00.000Z', [second]: '2026-11-25T12:00:00.000Z' };
  let revisions = [first], damaged = false;
  const originals = new Map<string,string>();
  function original(name: string) {
    let text = originals.get(name);
    if (!text) { text = readFileSync(root + '/' + name, 'utf8'); originals.set(name,text); }
    return text;
  }
  const hash = (text: string) => createHash('sha256').update(text).digest('hex');
  function fixture(revision: string, name: string) {
    const manifest = JSON.parse(original('manifest.json'));
    manifest.baseline.cutoff = dates[revision];
    const manifestBytes = JSON.stringify(manifest);
    if (name === 'manifest.json') return manifestBytes;
    if (name === 'provenance') {
      const meta = JSON.parse(readFileSync(root + '-provenance.json','utf8'));
      meta.GENERATED_AT = dates[revision];
      meta.snapshots.find((file: {FILE: string}) => file.FILE === 'manifest.json').SNAPSHOT_SHA256 = hash(manifestBytes);
      return JSON.stringify(meta);
    }
    if (damaged && revision === second && name === 'assets/SPY.json') return '{}';
    return original(name);
  }
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    if (url.startsWith('https://api.github.com/')) return Response.json({workflow_runs: revisions.map(head_sha => ({
      event:'workflow_run', workflow_id:336203586, head_branch:'vercel-deployment', conclusion:'success',
      head_sha, repository:{id:1263772150}, head_repository:{id:1263772150},
      head_commit:{ id:head_sha, timestamp:dates[head_sha], message:'Update statistical levels snapshot with durable raw provenance' }
    }))});
    const match = /\/([ab]{40})\/lib\/statistical-levels\/generated(?:-provenance\.json|\/(.+))$/.exec(url);
    assert.ok(match); return new Response(fixture(match[1], match[2] || 'provenance'));
  });
  const previous = process.env.STAT_LEVELS_LIVE_DATA;
  process.env.STAT_LEVELS_LIVE_DATA = 'true';
  t.after(() => { if (previous === undefined) delete process.env.STAT_LEVELS_LIVE_DATA; else process.env.STAT_LEVELS_LIVE_DATA = previous; });
  const old = await loadPublishedPage({});
  assert.equal(old.snapshot.revision, first);
  revisions = [second, first];
  const fresh = await loadPublishedPage({});
  assert.equal(fresh.snapshot.revision, second);
  assert.notEqual(fresh.snapshot.id, old.snapshot.id);
  assert.equal(await sourceForSnapshot(old.snapshot.id, second), null);
  const pinned = await sourceForSnapshot(old.snapshot.id, first);
  assert.ok(pinned);
  const asset = await pinned.source.getAsset('QQQ'), seasonality = await pinned.source.getSeasonality('QQQ');
  const payload = { schema:RUNTIME_SCHEMA, ticker:'QQQ', snapshot:old.snapshot.id, asset, seasonality };
  await validateRuntimeAsset(payload,'QQQ',old.snapshot);
  await assert.rejects(validateRuntimeAsset({...payload,asset:{...asset,lastClose:0}},'QQQ',old.snapshot));
  damaged = true;
  assert.equal((await loadPublishedPage({})).snapshot.id, old.snapshot.id);
});
