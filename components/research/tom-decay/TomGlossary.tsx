import { TomDecaySection } from "@/components/research/tom-decay/TomDecaySection";
import type { TomDecayContent } from "@/lib/research/tom-decay/content";

export function TomGlossary({ content }: { content: TomDecayContent }) {
  const copy = content.glossary;

  return (
    <TomDecaySection eyebrow={copy.eyebrow} intro={[copy.intro]} narrative title={copy.title}>
      <dl className="mx-auto grid max-w-[68rem] gap-px border border-line bg-line md:grid-cols-3">
        {copy.entries.map((entry) => (
          <div className="scroll-mt-28 bg-white/80 p-5 md:p-6" id={entry.id} key={entry.id}>
            <dt>
              <span className="font-mono text-lg font-semibold text-petrol">{entry.term}</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-brass">
                {entry.shortLabel}
              </span>
            </dt>
            <dd className="mt-4 grid gap-3 text-sm leading-7">
              <p className="text-ink">{entry.definition}</p>
              <p className="text-muted">{entry.explanation}</p>
              {entry.source ? (
                <p className="text-xs text-muted">
                  <a
                    className="rounded-[2px] font-medium text-petrol underline decoration-petrol/45 underline-offset-[3px] transition hover:decoration-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol"
                    href={entry.source.href}
                  >
                    {entry.source.label}
                  </a>
                </p>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </TomDecaySection>
  );
}
