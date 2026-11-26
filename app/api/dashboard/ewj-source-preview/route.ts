import { getEwjAutomaticModel } from '@/lib/dashboard/get-ewj-capital-flows';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Preview-only readback of the derived model, used to verify the hosted download.
// The returned points contain computed USD flows, never issuer NAV or shares.
export async function GET() {
  if (process.env.VERCEL_ENV === 'production') return new Response(null, { status: 404 });
  try {
    return Response.json(await getEwjAutomaticModel(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'EWJ source unavailable' }, { status: 503 });
  }
}
