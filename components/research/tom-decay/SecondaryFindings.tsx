import type { TomDecayContent } from "@/lib/research/tom-decay/content";
import type { TomDecayView } from "@/lib/research/tom-decay/presentation";
import { GlossaryText } from "@/components/research/tom-decay/GlossaryLink";

type SecondaryFindingsProps = {
  cards: TomDecayView["secondaryCards"];
  content: TomDecayContent;
};

const statusStyles: Record<TomDecayView["secondaryCards"][number]["status"], string> = {
  suggestive: "border-brass/50 bg-[#f8f2e7] text-[#7d6132]",
  "not-robust": "border-line bg-panelSoft text-muted",
  exploratory: "border-sage/50 bg-[#eef3f0] text-[#3f604f]",
};

export function SecondaryFindings({ cards, content }: SecondaryFindingsProps) {
  const copy = content.secondary;

  return (
    <div className="min-w-0">
      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <article className="flex min-w-0 flex-col border border-line bg-white/75 p-5" key={card.id}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {copy.resultLabel}
            </p>
            <h3 className="mt-2 text-base font-semibold leading-6 text-ink">{card.finding}</h3>
            <p className="mt-3 text-sm leading-7 text-muted"><GlossaryText text={card.body} /></p>

            <dl className="mt-5 grid gap-2 border-t border-line pt-4 text-xs">
              {card.evidence.map((item) => (
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1" key={item.sourceName}>
                  <dt className="text-muted">{item.sourceName}</dt>
                  <dd className="font-mono tabular-nums text-ink"><GlossaryText text={item.detail} /></dd>
                </div>
              ))}
            </dl>

            <div className="mt-auto pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {copy.verdictLabel}
              </p>
              <p
                className={`mt-2 inline-block border px-3 py-1.5 text-xs font-semibold leading-5 ${statusStyles[card.status]}`}
              >
                {card.verdict}
              </p>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-7 text-muted"><GlossaryText text={copy.closing} /></p>
    </div>
  );
}
