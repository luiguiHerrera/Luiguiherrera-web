type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function SectionHeader({ eyebrow, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brass">{eyebrow}</p> : null}
      <h1 className="text-4xl font-semibold leading-[1.04] text-white md:text-6xl">{title}</h1>
      {subtitle ? <p className="mt-5 max-w-2xl text-base leading-8 text-muted md:text-lg">{subtitle}</p> : null}
    </div>
  );
}
