import type { ReactNode } from "react";

type TomDecaySectionProps = {
  children?: ReactNode;
  className?: string;
  eyebrow: string;
  id?: string;
  intro?: string[];
  title: string;
  wide?: boolean;
};

export function TomDecaySection({
  children,
  className = "",
  eyebrow,
  id,
  intro,
  title,
  wide = false,
}: TomDecaySectionProps) {
  return (
    <section className={`scroll-mt-24 border-t border-line py-12 md:py-16 ${className}`} id={id}>
      <div className={wide ? "max-w-4xl" : "max-w-3xl"}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">{eyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold leading-tight text-ink md:text-4xl">{title}</h2>
        {intro?.length ? (
          <div className="mt-5 grid gap-4 text-sm leading-7 text-muted md:text-base md:leading-8">
            {intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ) : null}
      </div>
      {children ? <div className="mt-8">{children}</div> : null}
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
