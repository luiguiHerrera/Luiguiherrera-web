import type { TomDecayContent } from "@/lib/research/tom-decay/content";
import type { TomDecayView } from "@/lib/research/tom-decay/presentation";
import { GlossaryText } from "@/components/research/tom-decay/GlossaryLink";

type KeyFindingsProps = {
  content: TomDecayContent;
  findings: TomDecayView["findings"];
};

export function KeyFindings({ content, findings }: KeyFindingsProps) {
  const copy = content.findings;

  return (
    <div className="min-w-0">
      <dl className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {findings.map((finding) => (
          <div className="min-w-0 bg-white/85 p-5 md:p-6" key={finding.label}>
            <dt className="sr-only">{finding.label}</dt>
            <dd>
              <p className="flex items-baseline gap-1.5 font-semibold tabular-nums text-ink">
                <span className="text-3xl leading-none md:text-4xl">{finding.value}</span>
                {finding.unit ? (
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
                    <GlossaryText text={finding.unit} />
                  </span>
                ) : null}
              </p>
              <p className="mt-4 text-sm leading-6 text-muted"><GlossaryText text={finding.label} /></p>
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-7 max-w-3xl text-lg font-semibold leading-8 text-ink md:text-xl md:leading-9">
        {copy.emphasis}
      </p>

      <p className="mt-4 inline-flex flex-wrap items-center gap-2.5 border border-sage/45 bg-[#eef3f0] px-4 py-2.5 text-xs font-medium leading-5 text-[#3f604f]">
        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-sage" />
        {copy.replication}
      </p>
    </div>
  );
}
