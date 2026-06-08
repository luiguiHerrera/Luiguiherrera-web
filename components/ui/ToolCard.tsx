import Link from "next/link";

type ToolCardProps = {
  title: string;
  description: string;
  href: string;
  label: string;
  meta?: string;
};

export function ToolCard({ title, description, href, label, meta }: ToolCardProps) {
  return (
    <Link href={href} className="group flex min-h-[10rem] flex-col border-t border-line py-6 transition duration-200 hover:border-ink">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{label}</p>
        {meta ? <span className="border border-line bg-panelSoft px-3 py-1 text-xs text-muted">{meta}</span> : null}
      </div>
      <h2 className="mt-4 text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-3 leading-7 text-muted">{description}</p>
      <span className="mt-auto pt-6 text-sm font-semibold text-ink">Abrir herramienta &rarr;</span>
    </Link>
  );
}
