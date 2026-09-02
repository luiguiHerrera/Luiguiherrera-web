import Link from "next/link";

type ToolCardProps = {
  title: string;
  description: string;
  href: string;
  label: string;
  actionLabel?: string;
  headingLevel?: "h2" | "h3";
  meta?: string;
};

export function ToolCard({ title, description, href, label, actionLabel = "Explorar", headingLevel = "h2", meta }: ToolCardProps) {
  const Heading = headingLevel;

  return (
    <Link href={href} className="estate-card group flex min-h-[8.5rem] min-w-0 flex-col rounded-[6px] border border-line p-4 transition duration-200 hover:border-petrol focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-petrol">{label}</p>
        {meta ? <span className="rounded-[4px] border border-line bg-panel px-2.5 py-1 text-xs text-muted">{meta}</span> : null}
      </div>
      <Heading className="mt-3 text-lg font-semibold text-ink">{title}</Heading>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <span className="mt-auto pt-5 text-sm font-semibold text-petrol transition group-hover:translate-x-0.5">{actionLabel} &rarr;</span>
    </Link>
  );
}
