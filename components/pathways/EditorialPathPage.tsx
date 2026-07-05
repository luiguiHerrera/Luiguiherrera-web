import Link from "next/link";

type PathCard = {
  description: string;
  href: string;
  label: string;
  meta: string;
  title: string;
};

type EditorialPathPageProps = {
  actionLabel: string;
  cards: PathCard[];
  closingNote: string;
  eyebrow: string;
  intro: string;
  primaryCta: {
    href: string;
    label: string;
  };
  secondaryCta?: {
    href: string;
    label: string;
  };
  subtitle: string;
  title: string;
};

export function EditorialPathPage({
  actionLabel,
  cards,
  closingNote,
  eyebrow,
  intro,
  primaryCta,
  secondaryCta,
  subtitle,
  title,
}: EditorialPathPageProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <section className="grid gap-8 border-b border-line pb-10 lg:grid-cols-[0.58fr_0.42fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">{subtitle}</p>
        </div>
        <div className="rounded-[6px] border border-petrol/20 bg-white/70 p-5 text-sm leading-7 text-muted shadow-[0_12px_32px_rgba(11,52,54,0.045)]">
          {intro}
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={`${card.href}-${card.label}`}
            href={card.href}
            className="group flex min-h-[15rem] min-w-0 flex-col rounded-[6px] border border-line bg-white/75 p-5 shadow-[0_12px_32px_rgba(11,52,54,0.045)] transition hover:border-petrol hover:bg-white"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{card.label}</span>
              <span className="shrink-0 rounded-[4px] border border-line bg-panel px-2.5 py-1 text-xs font-semibold text-muted">
                {card.meta}
              </span>
            </div>
            <h2 className="mt-5 break-words text-2xl font-semibold leading-tight text-ink">{card.title}</h2>
            <p className="mt-3 break-words text-sm leading-6 text-muted">{card.description}</p>
            <span className="mt-auto pt-6 text-sm font-semibold text-petrol transition group-hover:translate-x-0.5">{actionLabel} &rarr;</span>
          </Link>
        ))}
      </section>

      <section className="mt-8 rounded-[6px] border border-line bg-[#f3efe6] p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <p className="max-w-3xl text-sm leading-6 text-muted">{closingNote}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href={primaryCta.href} className="inline-flex items-center justify-center rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol">
              {primaryCta.label}
            </Link>
            {secondaryCta ? (
              <Link href={secondaryCta.href} className="inline-flex items-center justify-center rounded-[4px] border border-petrol/25 bg-white/70 px-4 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol hover:bg-white">
                {secondaryCta.label}
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
