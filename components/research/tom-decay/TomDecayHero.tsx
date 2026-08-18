import Link from "next/link";
import { DecayRibbon } from "@/components/research/tom-decay/DecayRibbon";
import { EditorialByline } from "@/components/editorial/EditorialByline";
import type { TomDecayContent } from "@/lib/research/tom-decay/content";

type TomDecayHeroProps = {
  content: TomDecayContent;
  modifiedAt: string;
  publishedAt: string;
};

export function TomDecayHero({ content, modifiedAt, publishedAt }: TomDecayHeroProps) {
  const { hero } = content;

  return (
    <header className="institutional-hero institutional-hero--research min-w-0 px-5 py-8 sm:px-6 md:px-8 md:py-11">
      <nav aria-label={content.breadcrumb.navLabel} className="text-xs text-muted">
        <Link
          className="font-semibold text-petrol underline decoration-petrol/30 underline-offset-4 transition hover:decoration-petrol"
          href={content.breadcrumb.href}
        >
          {content.breadcrumb.label}
        </Link>
        <span aria-hidden="true" className="px-2 text-line">
          /
        </span>
        <span>{hero.title}</span>
      </nav>

      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">
        {hero.kicker}
      </p>
      <h1 className="institutional-hero-title mt-4 max-w-[16ch] font-semibold leading-[0.98] text-ink">
        {hero.title}
      </h1>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-petrol/80 [overflow-wrap:anywhere]">
        {content.descriptor}
      </p>

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.46fr)] lg:items-start">
        <div className="min-w-0">
          <p className="max-w-3xl text-lg font-medium leading-8 text-petrol md:text-xl md:leading-9">
            {hero.subtitle}
          </p>
          <div className="mt-5 grid max-w-3xl gap-4 text-base leading-8 text-muted">
            {hero.intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center rounded-[4px] border border-petrol bg-petrol px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(11,52,54,0.14)] transition hover:bg-panel hover:text-petrol"
              href={hero.primaryCta.href}
            >
              {hero.primaryCta.label}
            </Link>
            <Link
              className="inline-flex min-h-11 items-center rounded-[4px] border border-petrol/35 bg-white/70 px-5 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol hover:bg-white"
              href={hero.secondaryCta.href}
            >
              {hero.secondaryCta.label}
            </Link>
          </div>
        </div>

        <aside className="institutional-hero-note min-w-0 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            {content.labels.source}
          </p>
          <p className="mt-3 text-sm leading-7 text-ink [overflow-wrap:anywhere]">{hero.metadata}</p>
          <EditorialByline locale={content.locale} modifiedAt={modifiedAt} publishedAt={publishedAt} />
        </aside>
      </div>

      <DecayRibbon ribbon={hero.ribbon} />
    </header>
  );
}
