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
  let revisions = [first], damaged = false, missingReceipt = false, otherActor = false;
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
      meta.GENERATOR_COMMIT = "f".repeat(40);
      meta.snapshots.find((file: {FILE: string}) => file.FILE === 'manifest.json').SNAPSHOT_SHA256 = hash(manifestBytes);
      return JSON.stringify(meta);
    }
    if (damaged && revision === second && name === 'assets/SPY.json') return '{}';
    return original(name);
  }
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    const before = "f".repeat(40);
    const runId = (revision: string) => revision === first ? 10 : 20;
    const pushed = (revision: string) => dates[revision].replace("12:00:00","12:01:00");
    if (url.includes("/activity?")) return Response.json(revisions.map(after => ({
      before, after, actor:{id:otherActor && after === second ? 1 : 41898282}, ref:"refs/heads/vercel-deployment", activity_type:"push", timestamp:pushed(after)
    })));
    if (url.includes("/artifacts")) {
      const id = Number(url.split("/").at(-2));
      return Response.json({artifacts:missingReceipt && id === 20 ? [] : [{name:"sl-published-"+id+"-1",expired:false,digest:"sha256:"+"a".repeat(64),workflow_run:{id,head_sha:before}}]});
    }
    if (url.includes("/workflows/306145344/")) return Response.json({workflow_runs: revisions.map(rev => ({
      id:runId(rev), run_attempt:1, event:"schedule", workflow_id:306145344, head_branch:"vercel-deployment", conclusion:"success",
      head_sha:before, repository:{id:1263772150}, head_repository:{id:1263772150},
      run_started_at:dates[rev], updated_at:pushed(rev)
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
  missingReceipt = true;
  assert.equal((await loadPublishedPage({})).snapshot.id, old.snapshot.id);
  missingReceipt = false;
  otherActor = true;
  assert.equal((await loadPublishedPage({})).snapshot.id, old.snapshot.id);
  otherActor = false;
  damaged = true;
  assert.equal((await loadPublishedPage({})).snapshot.id, old.snapshot.id);
});
