import Link from "next/link";

type ToolCardProps = {
  title: string;
  description: string;
  href: string;
  label: string;
  actionLabel?: string;
  meta?: string;
};

export function ToolCard({ title, description, href, label, actionLabel = "Explorar", meta }: ToolCardProps) {
  return (
    <Link href={href} className="estate-card group flex min-h-[8.5rem] flex-col rounded-[6px] border border-line p-4 transition duration-200 hover:border-petrol">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-petrol">{label}</p>
        {meta ? <span className="rounded-[4px] border border-line bg-panel px-2.5 py-1 text-xs text-muted">{meta}</span> : null}
      </div>
      <h2 className="mt-3 text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <span className="mt-auto pt-5 text-sm font-semibold text-petrol transition group-hover:translate-x-0.5">{actionLabel} &rarr;</span>
    </Link>
  );
}
