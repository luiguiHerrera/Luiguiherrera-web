import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { loadPublishedPage, sourceForSnapshot } from './published-data.ts';
import { RUNTIME_SCHEMA, validateRuntimeAsset } from './runtime-snapshot.ts';

test('a new verified run updates the lab while prior tabs retain their file hashes', async t => {
  const root = 'lib/statistical-levels/generated';
  const first = 'a'.repeat(40), second = 'b'.repeat(40);
  const bundledCutoff = JSON.parse(readFileSync(root + '/manifest.json', 'utf8')).baseline.cutoff;
  const offsetDate = (days: number) => new Date(Date.parse(bundledCutoff) + days * 86_400_000).toISOString();
  // Each verified release must remain newer than the real bundled fallback.
  const dates = { [first]: offsetDate(1), [second]: offsetDate(2) };
  let revisions = [first], damaged = false, missingReceipt = false, otherActor = false;
  let discoveryFailures = 1;
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
  t.mock.method(globalThis, 'fetch', async (url: string, options?: { next?: { revalidate?: number } }) => {
    if (url.includes('/workflows/306145344/') && discoveryFailures-- > 0) {
      return new Response('Temporary upstream failure', { status: 503 });
    }
    const before = "f".repeat(40);
    const runId = (revision: string) => revision === first ? 10 : 20;
    const pushed = (revision: string) => new Date(Date.parse(dates[revision]) + 60_000).toISOString();
    if (url.includes("/activity?")) return Response.json(revisions.map(after => ({
      before, after, actor:{id:otherActor && after === second ? 1 : 41898282}, ref:"refs/heads/vercel-deployment", activity_type:"push", timestamp:pushed(after)
    })));
    if (url.includes("/artifacts")) {
      assert.equal(options?.next?.revalidate, 600, 'Mutable receipt listings must not be cached for a full day');
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
  // A live release at the replay's cutoff must not discard its complete explorer.
  // Earlier releases and discovery failures must not roll the lab back either.
  revisions = [first];
  dates[first] = JSON.parse(original('manifest.json')).baseline.cutoff;
  const replay = await loadPublishedPage({});
  assert.equal(replay.snapshot.revision, undefined);
  assert.ok(replay.data.asset.frequencies.daily.periodHistory!.length > 80);
  const replaySource = await sourceForSnapshot(replay.snapshot.id, null);
  assert.ok(replaySource);
  const replayAsset = await replaySource.source.getAsset('QQQ');
  assert.ok(replayAsset.frequencies.daily.periodHistory!.length > 80);
  dates[first] = offsetDate(-1);
  assert.equal((await loadPublishedPage({})).snapshot.id, replay.snapshot.id);
  revisions = [];
  assert.equal((await loadPublishedPage({})).snapshot.id, replay.snapshot.id);
});
