type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function SectionHeader({ eyebrow, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-brass">{eyebrow}</p> : null}
      <h1 className="text-3xl font-semibold leading-[1.08] text-ink md:text-5xl">{title}</h1>
      {subtitle ? <p className="mt-4 max-w-2xl text-sm leading-7 text-muted md:text-base">{subtitle}</p> : null}
    </div>
  );
}
