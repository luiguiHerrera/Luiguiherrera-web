import { createHash } from 'node:crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;
const source = 'https://etfiq.com/data/flows/funds/ewj.json';

// Temporary, preview-only schema inspection. Do not expose issuer figures.
function shape(value: unknown, depth = 0): unknown {
  if (value === null) return null;
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return value.slice(0, 350);
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return { length: value.length, first: value.slice(0, 2).map(item => shape(item, depth + 1)), last: value.slice(-2).map(item => shape(item, depth + 1)) };
  if (value && typeof value === 'object') {
    if (depth > 6) return Object.keys(value);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item, depth + 1)]));
  }
  return typeof value;
}

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') return new Response(null, { status: 404 });
  const response = await fetch(source, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(18000), headers: { Accept: 'application/json', 'User-Agent': 'LuiguiHerreraDashboard/1.0 (+https://www.luiguiherrera.com)' } });
  if (!response.ok) return Response.json({ source, status: response.status }, { status: 502 });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 4_000_000) return Response.json({ error: 'Oversized source' }, { status: 502 });
  const data = JSON.parse(bytes.toString('utf8'));
  return Response.json({ source, sourceHash: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, schemaVersion: data.schemaVersion, shape: shape(data) }, { headers: { 'Cache-Control': 'no-store' } });
}
