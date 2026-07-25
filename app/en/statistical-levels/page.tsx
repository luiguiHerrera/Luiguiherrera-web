import { StatLevelsLab } from "@/components/statistical-levels/StatLevelsLab";
import { ReadingCard } from "@/components/seo/ReadingCard";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";
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
      <InstitutionalHero
        chips={["Percentiles", "Z-scores", "Extensions", "Drawdowns", "Seasonality"]}
        description="Select an asset and compare its current position across different windows of its own history."
        eyebrow="Quantitative laboratory"
        note="Educational reading. This is not financial advice or an execution instruction."
        title="Statistical Levels Lab"
        variant="research"
      />

      <ReadingCard attached title="Reading card" items={[
        { label: "What it is", value: "A statistical-levels lab that compares assets against their own history using percentiles, z-scores, extensions, ranges, drawdowns and seasonality." },
        { label: "What it is for", value: "It helps locate whether an asset is near historically high, low or normal zones without turning that into an automatic signal." },
        { label: "Main sources", value: "Precomputed historical series by asset and internal statistical-window methodology." },
        { label: "Limits", value: "The levels are descriptive, depend on available history and do not by themselves indicate when to buy or sell." },
      ]} />

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

      <div className="mt-6 min-w-0 max-w-full overflow-x-hidden md:mt-8">
        <StatLevelsLab asset={asset} manifest={manifest} seasonality={seasonality} selection={selection} locale="en" />
      </div>
    </div>
  );
}
