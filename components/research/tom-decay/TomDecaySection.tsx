import type { ReactNode } from "react";

type TomDecaySectionProps = {
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  eyebrow: string;
  id?: string;
  intro?: string[];
  narrative?: boolean;
  title: string;
  wide?: boolean;
};

export const narrativeMeasure = "max-w-[58rem]";

export function TomDecaySection({
  children,
  className = "",
  compact = false,
  eyebrow,
  id,
  intro,
  narrative = false,
  title,
  wide = false,
}: TomDecaySectionProps) {
  const measure = narrative ? narrativeMeasure : wide ? "max-w-4xl" : "max-w-3xl";
  return (
    <section className={`scroll-mt-24 border-t border-line py-12 md:py-16 ${className}`} id={id}>
      <div className={measure}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">{eyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold leading-tight text-ink md:text-4xl">{title}</h2>
        {intro?.length ? (
          <div
            className={`grid text-sm leading-7 text-muted md:text-base md:leading-8 ${
              compact ? "mt-4 gap-3" : "mt-5 gap-4"
            }`}
          >
            {intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ) : null}
      </div>
      {children ? <div className={compact ? "mt-5" : "mt-8"}>{children}</div> : null}
    </section>
  );
}

export function TomDecayTakeaway({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 border-l-2 border-brass/60 bg-white/60 px-5 py-4 text-sm font-medium leading-7 text-ink">
      {children}
    </p>
  );
}
