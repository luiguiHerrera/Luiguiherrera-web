// Operator-only export of the self-contained reviewed release. No network or
// historical raw captures are read. Revisions require a separate reviewed release.
import { writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadReviewedCalendars } from '../../../lib/regime-engine-v2/operations/calendar-package.ts';
import { canonical } from '../../../lib/regime-engine-v2/math.ts';

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--output-dir' || !path.isAbsolute(args[1])) {
  throw new Error('Usage: node materialize-calendar.mjs --output-dir EXISTING_PRIVATE_OUTPUT_DIRECTORY; no historical asOf argument is accepted');
}
const repository = await realpath(fileURLToPath(new URL('../../../', import.meta.url)));
const directory = await realpath(args[1]);
if (directory === repository || directory.startsWith(repository + path.sep)) throw new Error('Operational exports must stay outside the repository');
const loaded = loadReviewedCalendars(new Date().toISOString());
const artifact = {
  schemaVersion: 'regime-v2-reviewed-calendar-export/1.0.0',
  ...loaded,
  authority: 'REVIEWED_OFFICIAL_SOURCES',
  rawCapturesIncluded: false,
  sourceRefreshPerformed: false,
  publicationTimeInvented: false,
  note: 'This normalized export is auditable data. Runtime callers must load the committed package through its authentic factory; serialized exports are not an alternative source-input credential.',
};
const filename = path.join(directory, 'reviewed-calendar-export.json');
await writeFile(filename, canonical(artifact) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ filename, releaseIdentity: loaded.releaseIdentity, expectedSession: loaded.expectedSession, expiry: loaded.expiry }) + '\n');
