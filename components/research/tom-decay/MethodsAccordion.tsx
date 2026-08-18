import type { TomDecayContent } from "@/lib/research/tom-decay/content";
import { GlossaryText } from "@/components/research/tom-decay/GlossaryLink";

export function MethodsAccordion({ content }: { content: TomDecayContent }) {
  const copy = content.methods;

  return (
    <div className="min-w-0">
      <p className="max-w-3xl text-sm leading-7 text-muted"><GlossaryText text={copy.intro} /></p>
      <div className="mt-6 border-t border-line">
        {copy.sections.map((section) => (
          <details className="group border-b border-line" key={section.id}>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold text-ink transition hover:text-petrol">
              <span>{section.title}</span>
              <span
                aria-hidden="true"
                className="text-xs text-muted transition-transform duration-150 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="grid gap-3 pb-5 text-sm leading-7 text-muted">
              {section.body.map((paragraph) => (
                <p key={paragraph}><GlossaryText text={paragraph} /></p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
