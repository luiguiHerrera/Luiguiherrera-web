// Explicit operator command for official calendar evidence; no scheduler or runtime fetch path.
import { mkdir, writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureScope, persistCapture } from '../../../lib/regime-engine-v2/capture.ts';

const sources = {
  nyse: 'https://www.nyse.com/trade/hours-calendars',
  'cboe-options': 'https://www.cboe.com/about/hours/us-options/',
  'cboe-futures': 'https://www.cboe.com/about/hours/us-futures/',
  'cboe-faq': 'https://datashop.cboe.com/faqs',
  'cboe-vx-spec': 'https://www.cboe.com/tradable-products/vix/vix-futures/specifications/',
  'cfe-rulebook': 'https://cdn.cboe.com/resources/regulation/rule_book/cfe-rule-book.pdf',
};
const [directory, ...ids] = process.argv.slice(2);
if (!directory || !path.isAbsolute(directory) || !ids.length || new Set(ids).size !== ids.length || ids.some(id => !sources[id])) {
  throw new Error(`Usage: node capture-calendar-sources.mjs ABSOLUTE_PRIVATE_DIRECTORY ${Object.keys(sources).join(' | ')}`);
}
const repository = await realpath(fileURLToPath(new URL('../../../', import.meta.url)));
let ancestor = path.resolve(directory);
while (true) { try { ancestor = await realpath(ancestor); break; } catch (error) { if (error.code !== 'ENOENT') throw error; const parent = path.dirname(ancestor); if (parent === ancestor) throw error; ancestor = parent; } }
if (ancestor === repository || ancestor.startsWith(repository + path.sep)) throw new Error('Calendar raw must stay outside the repository');
await mkdir(directory, { recursive: true });
const events = [], scope = captureScope();
for (const id of ids) {
  const sourceUrl = sources[id], startedAt = new Date().toISOString();
  const event = { id, sourceUrl, startedAt, requested: true };
  events.push(event);
  try {
    const capture = await scope.capture({ sourceId: `OFFICIAL_CALENDAR_${id.toUpperCase().replaceAll('-', '_')}`, sourceVersion: 'official-calendar-raw/1', sourceUrl, origin: 'PROSPECTIVE' }, async () => {
      const response = await fetch(sourceUrl, { redirect: 'error', signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'RegimeEngineV2-CalendarReadiness/1.0', Accept: 'text/html' } });
      event.status = response.status;
      event.contentType = response.headers.get('content-type');
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    });
    event.capturePath = await persistCapture(directory, capture);
    event.rawHash = capture.rawHash;
    event.completedAt = capture.completedAt;
    event.bytes = Buffer.from(capture.rawBase64, 'base64').length;
    const extension = event.contentType?.includes('application/pdf') ? 'pdf' : 'html';
    try { await writeFile(path.join(directory, `${id}-${capture.rawHash}.${extension}`), Buffer.from(capture.rawBase64, 'base64'), { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    event.result = 'CAPTURED';
  } catch (error) { event.completedAt = new Date().toISOString(); event.result = 'FAILED'; event.error = String(error); }
  await writeFile(path.join(directory, `network-${startedAt.replaceAll(':', '-')}-${id}.json`), JSON.stringify(event, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify(events, null, 2));
if (events.some(event => event.result !== 'CAPTURED')) process.exitCode = 1;
