import type { ContributionTrace } from "./types.ts";

export const contributionSources = ["unknown", "liquid", "reserve", "future"] as const;
export type ContributionSource = typeof contributionSources[number];
export type FundRelationship = "included" | "separate" | "unknown";

const zero = BigInt(0);
const nonnegative = (value: bigint) => value < zero ? zero : value;
const remaining = (balance: bigint | null, draw: bigint) => balance === null ? null : nonnegative(balance - draw);
const shortage = (balance: bigint | null, draw: bigint) => balance === null ? zero : nonnegative(draw - balance);

export function assessExtraLiquidity({
  assets, fund, relationship, monthlyObligations, trace, sources,
}: {
  assets: bigint | null;
  fund: bigint | null;
  relationship: FundRelationship;
  monthlyObligations: bigint | null;
  trace: ReadonlyArray<Pick<ContributionTrace, "id" | "applied">>;
  sources: Readonly<Record<string, ContributionSource>>;
}) {
  const applied: Record<ContributionSource, bigint> = { unknown: zero, liquid: zero, reserve: zero, future: zero };
  for (const item of trace) applied[sources[item.id] ?? "unknown"] += item.applied;

  const inconsistent = relationship === "included" && assets !== null && fund !== null && fund > assets;
  const separateAssets = relationship === "separate" || fund === zero ? assets
    : relationship === "included" && assets !== null && fund !== null && !inconsistent ? assets - fund : null;
  const totalBefore = inconsistent ? null : relationship === "included" ? assets
    : separateAssets !== null && fund !== null ? separateAssets + fund : null;
  const coveredSources = applied.unknown === zero && !inconsistent;
  const outsideAfter = coveredSources ? remaining(separateAssets, applied.liquid) : null;
  const fundAfter = coveredSources ? remaining(fund, applied.reserve) : null;

  const existingDraw = applied.liquid + applied.reserve;
  const bucketShortfall = shortage(separateAssets, applied.liquid) + shortage(fund, applied.reserve);
  const aggregateShortfall = shortage(totalBefore, existingDraw);
  const fundingGap = inconsistent ? null : bucketShortfall > aggregateShortfall ? bucketShortfall : aggregateShortfall;
  const totalAfter = outsideAfter !== null && fundAfter !== null ? outsideAfter + fundAfter
    : coveredSources && existingDraw === zero ? totalBefore : null;

  function coverage(reserve: bigint | null) {
    if (reserve === null || monthlyObligations === null || monthlyObligations <= zero) return null;
    return Number(reserve) / Number(monthlyObligations);
  }

  const reserveAtRisk = fundAfter !== null && fund !== null && fundAfter < fund
    && (fundAfter === zero || (monthlyObligations !== null && monthlyObligations > zero
      && (fundAfter < BigInt(3) * monthlyObligations || fund - fundAfter >= monthlyObligations)));

  return {
    applied, inconsistent, fundingGap, reserveAtRisk,
    before: { outside: separateAssets, fund, total: totalBefore, coverage: coverage(fund) },
    after: { outside: outsideAfter, fund: fundAfter, total: totalAfter, coverage: coverage(fundAfter) },
  };
}
