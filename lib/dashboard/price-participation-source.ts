import type { AssetStatRecord, StatisticalLevelsManifest } from "../statistical-levels/types";
import { PRICE_PARTICIPATION_SECTOR_TICKERS, type PriceParticipationInput, type PriceSeries } from "./price-participation";

export const PRICE_PARTICIPATION_SOURCE_URL = "https://github.com/luiguiHerrera/Luiguiherrera-web/tree/vercel-deployment/lib/statistical-levels/generated";
export const PRICE_PARTICIPATION_HISTORY_LIMIT = 300;
export type PriceParticipationPublication = Omit<PriceParticipationInput, "breadth">;
type SnapshotIdentity = { id: string; revision?: string };
type PublishedPricePage = {
  data: { asset: AssetStatRecord; manifest: Pick<StatisticalLevelsManifest, "baseline" | "sourceUrl"> };
  snapshot: SnapshotIdentity;
};
type PublishedPriceSource = {
  source: { getAsset(ticker: string): Promise<AssetStatRecord> };
  snapshot: SnapshotIdentity;
};
export type PriceParticipationSourceDependencies = {
  loadPublishedPage(selection: { asset: "SPY"; frequency: "daily"; window: "Full" }): Promise<PublishedPricePage>;
  sourceForSnapshot(id: string, revision: string | null): Promise<PublishedPriceSource | null>;
  now?: () => Date;
};
export class PriceParticipationSourceError extends Error {
  constructor(message: string, options?: ErrorOptions) { super(message, options); this.name = "PriceParticipationSourceError"; }
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const instant = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(instant) && new Date(instant).toISOString().slice(0, 10) === value;
}

function publicSourceUrl(value: unknown) {
  if (typeof value === "string") {
    try {
      const url = new URL(value.trim());
      if (url.protocol === "https:" && url.hostname && !url.username && !url.password) return url.toString();
    } catch { /* The public snapshot repository remains a truthful fallback. */ }
  }
  return PRICE_PARTICIPATION_SOURCE_URL;
}

/** Read completed adjusted daily history, never the asset's current market mark. */
export function extractPriceParticipationSeries(
  asset: AssetStatRecord,
  ticker: string,
  baseline: { id: string; cutoff: string },
): PriceSeries {
  const authority = asset?.dataAuthority;
  if (asset?.ticker !== ticker || authority?.baselineId !== baseline.id || authority?.snapshotCutoff !== baseline.cutoff ||
      !/^[a-f0-9]{64}$/u.test(authority?.rawSha256 ?? "")) {
    throw new PriceParticipationSourceError(`Incoherent published authority for ${ticker}`);
  }
  const cutoff = authority.lastCompletedObservation?.daily;
  const history = asset.frequencies?.daily?.drawdownHistory;
  if (!Array.isArray(history)) throw new PriceParticipationSourceError(`Missing published daily history for ${ticker}`);
  if (cutoff === null && history.length === 0 && ticker !== "SPY") return { ticker, points: [] };
  if (!validDate(cutoff) || cutoff > baseline.cutoff.slice(0, 10)) throw new PriceParticipationSourceError(`Invalid completed daily cutoff for ${ticker}`);
  const byDate = new Map<string, { date: string; close: number | null }>();
  for (const point of history) {
    if (!point || !validDate(point.date) || (point.close !== null &&
        (typeof point.close !== "number" || !Number.isFinite(point.close) || point.close <= 0))) {
      throw new PriceParticipationSourceError(`Invalid adjusted daily history for ${ticker}`);
    }
    const previous = byDate.get(point.date);
    if (previous && previous.close !== point.close) throw new PriceParticipationSourceError(`Conflicting published daily history for ${ticker}`);
    // Filtering by the declared completed cutoff excludes any intraday row;
    // preserving null cells prevents the model from substituting older prices.
    if (point.date <= cutoff) byDate.set(point.date, { date: point.date, close: point.close });
  }
  const points = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-PRICE_PARTICIPATION_HISTORY_LIMIT);
  if (ticker === "SPY" && !points.length) throw new PriceParticipationSourceError("No completed SPY observations");
  return { ticker, points };
}

async function readPublication<T>(read: () => Promise<T>): Promise<T> {
  try { return await read(); }
  catch (error) {
    // Framework control-flow exceptions must retain their identity. Normal
    // publication I/O failures reject the strict cache callback below.
    if (error instanceof Error && "digest" in error) throw error;
    throw new PriceParticipationSourceError("Verified price publication could not be read", { cause: error });
  }
}

/** One selected publication supplies every asset; no second market-data provider. */
export async function loadPriceParticipationPublication(dependencies: PriceParticipationSourceDependencies): Promise<PriceParticipationPublication> {
  const publication = await readPublication(() => dependencies.loadPublishedPage({ asset: "SPY", frequency: "daily", window: "Full" }));
  const { snapshot } = publication;
  if (!/^[a-f0-9]{64}$/u.test(snapshot?.id ?? "") ||
      (snapshot.revision !== undefined && !/^[a-f0-9]{40}$/u.test(snapshot.revision))) {
    throw new PriceParticipationSourceError("Invalid selected price snapshot identity");
  }
  const baseline = publication.data?.manifest?.baseline;
  if (!baseline?.id || !Number.isFinite(Date.parse(baseline.cutoff))) throw new PriceParticipationSourceError("Missing selected price baseline");
  const resolved = await readPublication(() => dependencies.sourceForSnapshot(snapshot.id, snapshot.revision ?? null));
  if (!resolved || resolved.snapshot.id !== snapshot.id || resolved.snapshot.revision !== snapshot.revision) {
    throw new PriceParticipationSourceError("Selected price snapshot is no longer available");
  }
  // SPY was already fetched by loadPublishedPage. Reuse it and read just twelve
  // additional asset records from that exact resolved source.
  const others = ["RSP", ...PRICE_PARTICIPATION_SECTOR_TICKERS];
  const otherAssets = await Promise.all(others.map(ticker => readPublication(() => resolved.source.getAsset(ticker))));
  const series = [extractPriceParticipationSeries(publication.data.asset, "SPY", baseline),
    ...otherAssets.map((asset, index) => extractPriceParticipationSeries(asset, others[index], baseline))];
  const priceThrough = publication.data.asset.dataAuthority!.lastCompletedObservation.daily!;
  // If another ETF in this exact publication evidences a session inside SPY's
  // completed range, an omitted SPY row is an explicit missing observation.
  // This neither invents exchange dates nor interpolates a close. An absent
  // session shared by all thirteen sources cannot be inferred here.
  const spyPoints = new Map(series[0].points.map(point => [point.date, point]));
  const spyStart = series[0].points[0].date;
  const observedDates = [...new Set(series.flatMap(asset => asset.points.map(point => point.date)))]
    .filter(date => date >= spyStart && date <= priceThrough).sort();
  series[0] = { ticker: "SPY", points: observedDates.map(date => spyPoints.get(date) ?? { date, close: null })
    .slice(-PRICE_PARTICIPATION_HISTORY_LIMIT) };
  const retrievedAt = (dependencies.now ?? (() => new Date()))().toISOString();
  return {
    series, priceThrough,
    authority: {
      id: baseline.id, ...(snapshot.revision ? { revision: snapshot.revision } : {}),
      retrievedAt, sourceUrl: publicSourceUrl(publication.data.manifest.sourceUrl),
    },
    refreshStatus: "current",
  };
}
