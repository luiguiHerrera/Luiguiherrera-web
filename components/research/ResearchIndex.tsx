import Link from "next/link";
import { formatEditorialDate } from "@/lib/editorial/dates";
import type { ResearchIndexContent } from "@/lib/research/research-index";

type ResearchIndexProps = {
  content: ResearchIndexContent;
  locale: "es" | "en";
};

export function ResearchIndex({ content, locale }: ResearchIndexProps) {
  return (
    <div className="mx-auto max-w-7xl overflow-x-clip px-4 pb-12 md:px-5 md:pb-16">
      <header className="institutional-hero institutional-hero--research min-w-0 px-5 py-8 sm:px-6 md:px-8 md:py-11">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">{content.eyebrow}</p>
        <h1 className="institutional-hero-title mt-4 max-w-[16ch] font-semibold leading-[0.98] text-ink">
          {content.title}
        </h1>
        <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-petrol md:text-xl">
          {content.subtitle}
        </p>
        <p className="mt-4 max-w-3xl text-base leading-8 text-muted">{content.description}</p>
      </header>

      <section className="mt-12 md:mt-16">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          {content.entriesLabel}
        </h2>
        <ul className="mt-5 grid gap-4">
          {content.entries.map((entry) => (
            <li key={entry.href}>
              <Link
                className="group block border border-line bg-white/75 p-6 transition hover:border-petrol/45 hover:bg-white md:p-8"
                href={entry.href}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
                    {entry.kicker}
                  </p>
                  <time className="font-mono text-[11px] text-muted" dateTime={entry.publishedAt}>
                    {formatEditorialDate(entry.publishedAt, locale)}
                  </time>
                </div>
                <h3 className="mt-3 max-w-3xl text-xl font-semibold leading-tight text-ink md:text-3xl">
                  {entry.title}
                </h3>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-muted md:text-base">{entry.summary}</p>

                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                      {content.methodsLabel}
                    </span>
                    {entry.methods.map((method) => (
                      <span className="border border-line px-2 py-1 font-mono text-[10px] text-muted" key={method}>
                        {method}
                      </span>
                    ))}
                  </div>
                  <span className="ml-auto text-xs font-semibold text-petrol underline decoration-petrol/30 underline-offset-4 transition group-hover:decoration-petrol">
                    {content.readLabel}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 border-t border-line pt-6 text-xs leading-6 text-muted">{content.note}</p>
      </section>
    </div>
  );
}
