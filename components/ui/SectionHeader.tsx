type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function SectionHeader({ eyebrow, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-brass">{eyebrow}</p> : null}
      <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">{title}</h1>
      {subtitle ? <p className="mt-5 text-lg leading-8 text-muted">{subtitle}</p> : null}
    </div>
  );
}
