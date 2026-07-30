import Link from "next/link";

type StartLink = {
  description: string;
  href: string;
  label: string;
};

type OrientationItem = {
  destinationLabel: string;
  href: string;
  situation: string;
  support?: string;
};

type LearningLink = StartLink & {
  meta: string;
};

type FrequentlyAskedQuestion = {
  answer: string;
  question: string;
};

export type StartPathContent = {
  locale: "es" | "en";
  hero: {
    eyebrow: string;
    guarantee: string;
    subtitle: string;
    title: string;
  };
  primaryActions: [StartLink, StartLink];
  orientation: {
    items: [OrientationItem, OrientationItem, OrientationItem, OrientationItem];
    title: string;
  };
  learning: {
    actionLabel: string;
    closingNote: string;
    introduction: string;
    links: LearningLink[];
    purpose: string;
    title: string;
  };
  faq: {
    items: FrequentlyAskedQuestion[];
    title: string;
  };
};

type StartPathPageProps = {
  content: StartPathContent;
};

const focusClasses =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petrol focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

export function StartPathPage({ content }: StartPathPageProps) {
  return (
    <div lang={content.locale} className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <header className="institutional-hero institutional-hero--educational min-w-0 px-5 py-8 sm:px-6 md:px-8 md:py-11">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-petrol">
          {content.hero.eyebrow}
        </p>
        <h1 className="mt-4 max-w-[22ch] text-balance text-[clamp(2rem,9.5vw,3rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-ink md:text-[clamp(3rem,5.5vw,4.6rem)]">
          {content.hero.title}
        </h1>
        <p className="mt-5 max-w-4xl text-base leading-7 text-muted md:text-lg md:leading-8">
          {content.hero.subtitle}
        </p>
        <p className="mt-5 inline-flex min-h-11 items-center rounded-[4px] border border-petrol/25 bg-white/75 px-3.5 py-2 text-sm font-semibold text-petrol">
          {content.hero.guarantee}
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {content.primaryActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`group flex min-h-[11.875rem] flex-col justify-between rounded-[6px] border border-petrol bg-petrol p-5 text-white shadow-[0_14px_32px_rgba(11,52,54,0.12)] transition hover:bg-panel hover:text-petrol sm:min-h-[8.5rem] ${focusClasses}`}
            >
              <span className="text-lg font-semibold leading-6">{action.label}</span>
              <span className="mt-3 max-w-xl text-sm leading-5 text-white/80 group-hover:text-muted">
                {action.description}
              </span>
              <span aria-hidden="true" className="mt-3 text-sm font-semibold">
                &rarr;
              </span>
            </Link>
          ))}
        </div>
      </header>

      <section aria-labelledby="start-orientation-title" className="mt-8">
        <div className="rounded-[6px] border border-line bg-white/75 px-5 py-6 shadow-[0_12px_32px_rgba(11,52,54,0.045)] md:px-6">
          <h2 id="start-orientation-title" className="text-2xl font-semibold leading-tight text-ink">
            {content.orientation.title}
          </h2>
          <ol className="mt-5 divide-y divide-line border-y border-line">
            {content.orientation.items.map((item, index) => (
              <li key={`${item.href}-${item.situation}`}>
                <Link
                  href={item.href}
                  className={`group grid min-h-[4.5rem] grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 px-1 py-3 transition hover:bg-paper/80 sm:grid-cols-[2rem_minmax(0,1fr)_auto] ${focusClasses}`}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-petrol/25 text-xs font-semibold text-petrol"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold leading-6 text-ink">{item.situation}</span>
                    {item.support ? (
                      <span className="mt-1 block text-sm leading-6 text-muted">{item.support}</span>
                    ) : null}
                  </span>
                  <span className="col-start-2 mt-1 text-sm font-semibold text-petrol sm:col-start-3 sm:row-start-1 sm:mt-0 sm:pl-5">
                    {item.destinationLabel} <span aria-hidden="true">&rarr;</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="start-learning-title" className="mt-8">
        <div className="rounded-[6px] border border-line bg-panel p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
          <h2 id="start-learning-title" className="text-2xl font-semibold leading-tight text-ink">
            {content.learning.title}
          </h2>
          <div className="mt-4 max-w-4xl space-y-3 text-sm leading-6 text-muted">
            <p>{content.learning.introduction}</p>
            <p>{content.learning.purpose}</p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {content.learning.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`group flex min-h-[10rem] min-w-0 flex-col rounded-[6px] border border-line bg-white/75 p-5 transition hover:border-petrol hover:bg-white ${focusClasses}`}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-petrol">
                  {link.meta}
                </span>
                <h3 className="mt-3 text-xl font-semibold leading-tight text-ink">{link.label}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{link.description}</p>
                <span className="mt-auto pt-4 text-sm font-semibold text-petrol">
                  {content.learning.actionLabel} <span aria-hidden="true">&rarr;</span>
                </span>
              </Link>
            ))}
          </div>

          <aside className="mt-6 border-l-2 border-petrol pl-4 text-sm leading-6 text-muted">
            {content.learning.closingNote}
          </aside>
        </div>
      </section>

      <section aria-labelledby="start-faq-title" className="mt-8">
        <div className="rounded-[6px] border border-line bg-white/75 p-5 shadow-[0_12px_32px_rgba(11,52,54,0.04)] md:p-6">
          <h2 id="start-faq-title" className="text-2xl font-semibold leading-tight text-ink">
            {content.faq.title}
          </h2>
          <div className="mt-5 divide-y divide-line border-y border-line">
            {content.faq.items.map((item) => (
              <details key={item.question} className="group">
                <summary className={`min-h-11 cursor-pointer py-3 font-semibold leading-6 text-ink ${focusClasses}`}>
                  {item.question}
                </summary>
                <p className="max-w-4xl pb-5 pr-4 text-sm leading-6 text-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
