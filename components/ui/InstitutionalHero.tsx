import type { ReactNode } from "react";

export type InstitutionalHeroVariant =
  | "archive"
  | "educational"
  | "executive"
  | "library"
  | "research"
  | "thesis";

type InstitutionalHeroProps = {
  children?: ReactNode;
  chips?: string[];
  className?: string;
  description: ReactNode;
  eyebrow: string;
  note?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
  variant: InstitutionalHeroVariant;
};

const variantClasses: Record<InstitutionalHeroVariant, string> = {
  archive: "institutional-hero--archive",
  educational: "institutional-hero--educational",
  executive: "institutional-hero--executive",
  library: "institutional-hero--library",
  research: "institutional-hero--research",
  thesis: "institutional-hero--thesis",
};

export function InstitutionalHero({
  children,
  chips = [],
  className = "",
  description,
  eyebrow,
  note,
  subtitle,
  title,
  variant,
}: InstitutionalHeroProps) {
  const hasAside = Boolean(note || children);

  return (
    <section
      className={`institutional-hero ${variantClasses[variant]} grid min-w-0 gap-7 px-5 py-8 sm:px-6 md:gap-9 md:px-8 md:py-11 ${
        hasAside ? "lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.42fr)] lg:items-end" : ""
      } ${className}`}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">{eyebrow}</p>
        <h1 className="institutional-hero-title mt-4 max-w-[18ch] font-semibold leading-[0.98] text-ink">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-5 max-w-4xl text-lg font-medium leading-8 text-petrol md:text-xl">{subtitle}</p>
        ) : null}
        <div className="mt-5 max-w-4xl text-base leading-7 text-muted md:text-lg md:leading-8">
          {description}
        </div>
        {chips.length ? (
          <div className="mt-6 flex min-w-0 flex-wrap gap-2" aria-label="Metodología">
            {chips.map((chip) => (
              <span
                key={chip}
                className="institutional-hero-chip max-w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] [overflow-wrap:anywhere]"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {hasAside ? (
        <aside className="institutional-hero-note min-w-0 p-5 text-sm leading-7 text-muted">
          {note}
          {children}
        </aside>
      ) : null}
    </section>
  );
}
