import Image from "next/image";
import Link from "next/link";
import { PersonalFinanceGuidedRoute } from "@/components/pathways/PersonalFinanceGuidedRoute";
import { PersonalFinanceHeroCta } from "@/components/pathways/PersonalFinanceHeroCta";
import heroStyles from "@/components/pathways/PersonalFinanceHero.module.css";
import { JsonLd } from "@/components/seo/JsonLd";
import type { PersonalFinanceEntryContent } from "@/lib/personal-finance/entry-content";

export type StartPathContent = PersonalFinanceEntryContent;

type StartPathPageProps = {
  content: StartPathContent;
};

const focusClasses =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petrol focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

export function StartPathPage({ content }: StartPathPageProps) {
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div lang={content.locale} className="overflow-x-clip bg-paper">
      <JsonLd data={faqStructuredData} />

      <div className="mx-auto max-w-[1420px] px-4 sm:px-7 lg:px-9">
        <section className="relative isolate overflow-hidden border-x border-b border-line bg-paper">
          <div className="absolute inset-x-0 bottom-0 h-[18rem] md:inset-0 md:h-auto">
            <div className={`absolute inset-y-0 right-0 w-full md:w-[68%] ${heroStyles.imageField}`}>
              <Image
                src="/images/personal-finance-staircase-hero.webp"
                alt={content.hero.imageAlt}
                fill
                priority
                sizes="(max-width: 767px) 100vw, 68vw"
                className="object-cover object-[50%_56%] md:object-[50%_60%]"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-paper via-paper/30 via-20% to-transparent md:bg-gradient-to-r md:from-paper md:via-paper/95 md:via-38% md:to-transparent" />
          </div>

          <div className="relative z-10 flex min-h-[37rem] items-start px-5 pb-[20rem] pt-12 sm:px-8 md:min-h-[38rem] md:w-[45%] md:items-center md:pb-16 md:pt-16 lg:px-12">
            <div className="max-w-[42rem]">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-brass">
                {content.hero.eyebrow}
              </p>
              <h1 className="font-serif text-[clamp(2.55rem,4.7vw,4.65rem)] font-medium leading-[0.99] tracking-[-0.035em] text-ink">
                {content.hero.title.split("\n").map((line, index) => (
                  <span key={line} className="block lg:whitespace-nowrap">{index > 0 ? " " : null}{line}</span>
                ))}
              </h1>
              <p className="mt-6 max-w-[28rem] text-[clamp(1.05rem,1.6vw,1.25rem)] leading-8 text-muted">
                {content.hero.subtitle.split("\n").map((line, index) => (
                  <span key={line} className="block">{index > 0 ? " " : null}{line}</span>
                ))}
              </p>
              <div className="mt-7">
                <PersonalFinanceHeroCta label={content.hero.primaryCta} />
              </div>
              <p className="mt-5 max-w-[24rem] text-sm leading-6 text-petrol">
                {content.hero.privacy}
              </p>
            </div>
          </div>
        </section>

        <section
          id="personal-finance-guided-route"
          tabIndex={-1}
          aria-labelledby="personal-finance-guided-route-title"
          className="scroll-mt-24 border-x border-b border-line bg-white/70 px-5 py-10 focus:outline-none sm:px-8 md:py-12 lg:px-12"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brass">
            {content.guidedRoute.eyebrow}
          </p>
          <h2
            id="personal-finance-guided-route-title"
            className="mt-3 max-w-[24ch] text-balance font-serif text-[clamp(2rem,4vw,2.65rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink"
          >
            {content.guidedRoute.title}
          </h2>
          <p className="mt-3 text-base leading-7 text-muted">{content.guidedRoute.introduction}</p>
          <PersonalFinanceGuidedRoute content={content.guidedRoute} />
        </section>

        <section aria-labelledby="personal-finance-faq-title" className="px-1 py-11 sm:px-7 md:py-14 lg:px-8">
          <h2
            id="personal-finance-faq-title"
            className="font-serif text-[clamp(1.85rem,3vw,2.25rem)] font-semibold tracking-[-0.025em] text-ink"
          >
            {content.faq.title}
          </h2>
          <div className="mt-5 divide-y divide-line border-y border-line">
            {content.faq.items.map((item) => (
              <details key={item.question} className="group">
                <summary className={"grid min-h-14 cursor-pointer list-none grid-cols-[minmax(0,1fr)_1.5rem] items-center gap-4 py-3.5 text-[15px] font-semibold leading-6 text-ink [&::-webkit-details-marker]:hidden " + focusClasses}>
                  <span>{item.question}</span>
                  <span aria-hidden="true" className="details-open-label text-right text-xl font-normal text-muted">+</span>
                  <span aria-hidden="true" className="details-close-label text-right text-xl font-normal text-brass">−</span>
                </summary>
                <p className="max-w-4xl border-l-2 border-brass pb-5 pl-4 pr-7 text-sm leading-6 text-muted">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="personal-finance-bridge-title"
          className="border-x border-t border-line bg-white/35 px-5 py-10 sm:px-8 md:py-12 lg:px-12"
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] lg:gap-12">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brass">
                {content.bridge.eyebrow}
              </p>
              <h2
                id="personal-finance-bridge-title"
                className="mt-3 max-w-[18ch] font-serif text-[clamp(1.9rem,3vw,2.35rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-ink"
              >
                {content.bridge.title}
              </h2>
              <p className="mt-4 max-w-[34rem] text-base leading-7 text-muted">
                {content.bridge.description}
              </p>
            </div>

            <div className="min-w-0">
              <div className="grid border-y border-line sm:grid-cols-2 sm:divide-x sm:divide-line">
                {content.bridge.resources.map((resource, index) => (
                  <article
                    key={resource.href}
                    className={[
                      "flex min-w-0 flex-col py-5",
                      index === 0 ? "border-b border-line sm:border-b-0 sm:pr-6" : "sm:pl-6",
                    ].join(" ")}
                  >
                    <h3 className="font-serif text-xl font-semibold leading-tight text-ink">
                      {resource.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{resource.description}</p>
                    <Link
                      href={resource.href}
                      className={"mt-4 inline-flex min-h-11 w-fit items-center font-semibold text-petrol underline-offset-4 hover:underline " + focusClasses}
                    >
                      {resource.cta}
                    </Link>
                  </article>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <span className="text-muted">{content.bridge.transition.label}</span>
                <Link
                  href={content.bridge.transition.href}
                  className={"inline-flex min-h-11 items-center font-semibold text-petrol underline-offset-4 hover:underline " + focusClasses}
                >
                  {content.bridge.transition.cta}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
