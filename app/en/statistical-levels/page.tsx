import { StatLevelsLab } from "@/components/statistical-levels/StatLevelsLab";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getStatisticalLevelsPageData } from "@/lib/statistical-levels/get-statistical-levels-data";

type StatisticalLevelsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function daysSince(dateValue: string | null | undefined) {
  if (!dateValue) return null;
  const parsed = new Date(`${dateValue}T00:00:00Z`).getTime();
  if (!Number.isFinite(parsed)) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.floor((todayUtc - parsed) / 86400000);
}

export default async function StatisticalLevelsPage({ searchParams }: StatisticalLevelsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { asset, manifest, seasonality, selection } = await getStatisticalLevelsPageData(resolvedSearchParams);
  const staleDays = daysSince(manifest.generatedAt);
  const isStale = staleDays !== null && staleDays > 7;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-5 md:py-14">
      <div className="grid gap-5 md:gap-8 lg:grid-cols-[1fr_0.76fr] lg:items-end">
        <SectionHeader
          eyebrow="Lab"
          title="Statistical Levels Lab"
          subtitle="Select an asset and compare its current position across different windows of its own history."
        />
        <DisclaimerBox>
          Educational reading. This is not financial advice or an execution instruction.
        </DisclaimerBox>
      </div>

      <div className="mt-6 grid gap-4 border-y border-line py-4 text-sm leading-6 text-muted md:mt-8 md:grid-cols-4 md:py-5">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Last market data</span>
          <span className="mt-1 block font-semibold text-ink">{manifest.generatedAt}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Snapshot generated</span>
          <span className="mt-1 block font-semibold text-ink">{manifest.snapshotGeneratedAt ?? "Not recorded in this snapshot"}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Source</span>
          <a href={manifest.sourceUrl} className="mt-1 inline-block font-semibold text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
            Public market data processed at static build time · provider by availability · proprietary calculations.
          </a>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Methodological limit</span>
          <span className="mt-1 block text-ink">Historical positioning only; it does not imply future direction.</span>
        </div>
        {isStale ? (
          <div className="border-l border-brass/40 pl-3 text-brass md:col-span-4">
            Data pending automated refresh.
          </div>
        ) : null}
      </div>

      <div className="mt-6 md:mt-8">
        <StatLevelsLab asset={asset} manifest={manifest} seasonality={seasonality} selection={selection} locale="en" />
      </div>
    </div>
  );
}
