import { getPublishedCapitalFlows } from '@/lib/dashboard/get-published-capital-flows';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const models = await getPublishedCapitalFlows();
  return Response.json({ checkedAt: new Date().toISOString(), assets: models.map(model => ({
    asset: model.id, universe: model.vehicles, cutoffDate: model.cutoffDate,
    status: model.refreshStatus, retrievedAt: model.retrievedAt ?? null,
    sourceHash: model.sourceHash ?? null, sessions: model.points.length,
    lastRefreshError: model.lastRefreshError ?? null,
    comparisons: model.comparisons?.map(({ sessions, current, average }) => ({ sessions, current, average })),
  })) }, { headers: { 'Cache-Control': 'no-store' } });
}
