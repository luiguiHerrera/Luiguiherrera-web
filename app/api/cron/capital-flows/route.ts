import { timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { CAPITAL_FLOWS_CACHE_TAG, getCachedCapitalFlow } from '@/lib/dashboard/get-published-capital-flows';
import { CAPITAL_FLOW_IDS, fetchCapitalFlowSource } from '@/lib/dashboard/capital-flows-source.mjs';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = new TextEncoder().encode(request.headers.get('authorization') ?? '');
  const expected = new TextEncoder().encode(`Bearer ${secret ?? ''}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const results = await Promise.all(CAPITAL_FLOW_IDS.map(async id => {
    try {
      const candidate = await fetchCapitalFlowSource(id);
      return { asset: id, validated: true, cutoffDate: candidate.cutoffDate };
    } catch {
      return { asset: id, validated: false, retainedPrevious: true };
    }
  }));
  // SWR preserves successful entries if a subsequent fetch fails; validation occurs inside cache too.
  if (results.some(result => result.validated)) {
    revalidateTag(CAPITAL_FLOWS_CACHE_TAG, 'max');
    await Promise.allSettled(CAPITAL_FLOW_IDS.map(id => getCachedCapitalFlow(id)));
    revalidatePath('/dashboard');
  }
  console.info('[dashboard:capital-flows:cron]', { results });
  return Response.json({ refreshRequested: results.some(result => result.validated), results },
    { status: results.every(result => result.validated) ? 200 : 503 });
}
