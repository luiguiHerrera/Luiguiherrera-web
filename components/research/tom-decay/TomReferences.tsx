import { TomDecaySection } from "@/components/research/tom-decay/TomDecaySection";
import type { TomDecayContent } from "@/lib/research/tom-decay/content";

export function TomReferences({ content }: { content: TomDecayContent }) {
  const copy = content.references;

  return (
    <TomDecaySection eyebrow={copy.eyebrow} intro={[copy.intro]} narrative title={copy.title}>
      <ol className="mx-auto grid max-w-[68rem] gap-px border border-line bg-line">
        {copy.entries.map((reference) => (
          <li
            className="scroll-mt-28 bg-white/80 p-5 text-sm leading-7 md:p-6"
            id={reference.id}
            key={reference.id}
          >
            <p className="font-medium text-ink">
              {reference.authors} ({reference.year}).
            </p>
            <a
              aria-label={`${reference.title}. ${copy.externalLabel}`}
              className="mt-1 inline rounded-[2px] font-semibold text-petrol underline decoration-petrol/45 underline-offset-[3px] [overflow-wrap:anywhere] transition hover:decoration-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol"
              href={reference.href}
              rel="noopener noreferrer"
              target="_blank"
            >
              {reference.title}
              <span aria-hidden="true" className="ml-1 whitespace-nowrap text-xs">↗</span>
            </a>
            <p className="mt-1 text-muted">
              <cite>{reference.journal}</cite>, {reference.volume}({reference.issue}), {reference.pages}.
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted [overflow-wrap:anywhere]">
              {copy.doiLabel}: {reference.doi}
            </p>
          </li>
        ))}
      </ol>
    </TomDecaySection>
  );
}
