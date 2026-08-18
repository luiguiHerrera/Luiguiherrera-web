import { ClaimBoundary } from "@/components/research/tom-decay/ClaimBoundary";
import { GhostAlphaNarrative } from "@/components/research/tom-decay/GhostAlphaNarrative";
import { KeyFindings } from "@/components/research/tom-decay/KeyFindings";
import { MethodsAccordion } from "@/components/research/tom-decay/MethodsAccordion";
import { PublicationComparison } from "@/components/research/tom-decay/PublicationComparison";
import { RegimeComparisonChart } from "@/components/research/tom-decay/RegimeComparisonChart";
import { RollingPremiumChart } from "@/components/research/tom-decay/RollingPremiumChart";
import { SecondaryFindings } from "@/components/research/tom-decay/SecondaryFindings";
import { TomDecayFooter } from "@/components/research/tom-decay/TomDecayFooter";
import { TomDecayHero } from "@/components/research/tom-decay/TomDecayHero";
import { TomDecayNav } from "@/components/research/tom-decay/TomDecayNav";
import { TomDecaySection, TomDecayTakeaway } from "@/components/research/tom-decay/TomDecaySection";
import { VerificationKit } from "@/components/research/tom-decay/VerificationKit";
import type { TomDecayContent } from "@/lib/research/tom-decay/content";
import {
  tomDataHashes,
  tomDecayData,
  tomDownloadHashes,
  tomEventMarkers,
  tomToolVersion,
} from "@/lib/research/tom-decay/dataset";
import { tomDecayEditorial } from "@/lib/research/tom-decay/editorial";
import { buildTomDecayView } from "@/lib/research/tom-decay/presentation";
import type { TomDatasetId } from "@/lib/research/tom-decay/types";

export function TomDecayResearchPage({ content }: { content: TomDecayContent }) {
  const view = buildTomDecayView(content);
  const editorial = tomDecayEditorial[content.locale];
  const ids = content.nav.items.map((item) => item.id);
  const [questionId, findingsId, publicationId, evidenceId, replicationId, limitsId, reproduceId] = ids;

  const datasetIds: TomDatasetId[] = ["yahoo", "french"];
  const rollingSeries = datasetIds.map((id) => ({
    id,
    name: content.labels.datasets[id].name,
    short: content.labels.datasets[id].short,
    points: [...tomDecayData[id].rolling],
  }));
  const regimeSeries = datasetIds.map((id) => ({
    id,
    name: content.labels.datasets[id].name,
    short: content.labels.datasets[id].short,
    estimates: tomDecayData[id].regimes,
  }));

  const events = content.rolling.events.map((event) => ({
    id: event.id,
    label: event.label,
    year: tomEventMarkers.find((marker) => marker.id === event.id)!.year,
  }));

  const hashGroups = datasetIds.map((id) => ({
    label: content.labels.datasets[id].name,
    entries: Object.entries(tomDataHashes[id]).map(([file, sha256]) => ({ file, sha256 })),
  }));
  hashGroups.push({
    label: content.verification.downloadLabel,
    entries: Object.entries(tomDownloadHashes).map(([file, sha256]) => ({ file, sha256 })),
  });

  const frenchSourceHash = tomDecayData.french.provenance.downloadSha256;

  return (
    <article className="mx-auto max-w-7xl overflow-x-clip px-4 pb-4 md:px-5 md:pb-8">
      <TomDecayHero
        content={content}
        modifiedAt={editorial.modifiedAt}
        publishedAt={editorial.publishedAt}
      />

      <TomDecayNav nav={content.nav} />

      <TomDecaySection
        eyebrow={content.question.eyebrow}
        id={questionId}
        intro={content.question.body}
        title={content.question.title}
      />

      <TomDecaySection
        eyebrow={content.findings.eyebrow}
        id={findingsId}
        title={content.findings.title}
        wide
      >
        <KeyFindings content={content} findings={view.findings} />
      </TomDecaySection>

      <TomDecaySection
        eyebrow={content.publication.eyebrow}
        id={publicationId}
        intro={view.publicationBody}
        title={content.publication.title}
      >
        <PublicationComparison content={content} format={view.format} pairs={view.publicationPairs} />
      </TomDecaySection>

      <TomDecaySection
        className="tom-decay-surface -mx-4 px-4 md:-mx-5 md:px-5"
        eyebrow={content.rolling.eyebrow}
        id={evidenceId}
        intro={view.rollingBody}
        title={content.rolling.title}
        wide
      >
        <RollingPremiumChart content={content} events={events} series={rollingSeries} />
        <TomDecayTakeaway>{content.rolling.takeaway}</TomDecayTakeaway>
      </TomDecaySection>

      <TomDecaySection
        eyebrow={content.replication.eyebrow}
        id={replicationId}
        intro={content.replication.body}
        title={content.replication.title}
        wide
      >
        <div className="grid gap-3 md:grid-cols-2">
          {content.replication.sources.map((source) => (
            <div className="min-w-0 border border-line bg-white/75 p-5" key={source.id}>
              <p className="text-sm font-semibold text-ink">{source.name}</p>
              <dl className="mt-4 grid gap-2.5 text-xs leading-6">
                {[
                  { term: content.replication.sourceFieldLabels.provider, description: source.provider },
                  { term: content.replication.sourceFieldLabels.universe, description: source.universe },
                  {
                    term: content.replication.sourceFieldLabels.returnDefinition,
                    description: source.returnDefinition,
                  },
                ].map((field) => (
                  <div className="grid gap-0.5" key={field.term}>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                      {field.term}
                    </dt>
                    <dd className="text-ink [overflow-wrap:anywhere]">{field.description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <RegimeComparisonChart content={content} series={regimeSeries} />
        </div>

        <TomDecayTakeaway>{content.replication.takeaway}</TomDecayTakeaway>
      </TomDecaySection>

      <TomDecaySection
        eyebrow={content.ghost.eyebrow}
        intro={content.ghost.body}
        title={content.ghost.title}
        wide
      >
        <GhostAlphaNarrative content={content} />
      </TomDecaySection>

      <TomDecaySection
        eyebrow={content.secondary.eyebrow}
        intro={[content.secondary.intro]}
        title={content.secondary.title}
        wide
      >
        <SecondaryFindings cards={view.secondaryCards} content={content} />
      </TomDecaySection>

      <TomDecaySection
        eyebrow={content.boundary.eyebrow}
        id={limitsId}
        title={content.boundary.title}
        wide
      >
        <ClaimBoundary content={content} />
      </TomDecaySection>

      <TomDecaySection
        eyebrow={content.lesson.eyebrow}
        intro={content.lesson.body}
        title={content.lesson.title}
      >
        <div className="max-w-3xl">
          <p className="border-l-2 border-petrol/50 pl-5 text-base font-semibold leading-8 text-ink md:text-lg">
            {content.lesson.question}
          </p>
          <div className="mt-6 grid gap-4 text-sm leading-7 text-muted md:text-base md:leading-8">
            {content.lesson.closing.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </TomDecaySection>

      <TomDecaySection
        eyebrow={content.verification.eyebrow}
        id={reproduceId}
        title={content.verification.title}
        wide
      >
        <VerificationKit
          content={content}
          hashGroups={hashGroups}
          sourceHash={
            frenchSourceHash
              ? { label: content.verification.sourceHashLabel, value: frenchSourceHash }
              : null
          }
          toolVersion={tomToolVersion}
        />
      </TomDecaySection>

      <TomDecaySection eyebrow={content.methods.eyebrow} title={content.methods.title} wide>
        <MethodsAccordion content={content} />
      </TomDecaySection>

      <TomDecayFooter content={content} />
    </article>
  );
}
