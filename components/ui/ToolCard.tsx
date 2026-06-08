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
    <Link
      href={href}
      className="group flex min-h-[15rem] flex-col rounded-lg border border-line bg-panel/95 p-6 shadow-quiet transition duration-200 hover:-translate-y-0.5 hover:border-petrol hover:bg-panelSoft"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage">{label}</p>
        {meta ? <span className="rounded-full border border-line bg-ink/40 px-3 py-1 text-xs text-muted">{meta}</span> : null}
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-3 leading-7 text-muted">{description}</p>
      <span className="mt-auto pt-6 text-sm font-semibold text-brass group-hover:text-white">Abrir herramienta</span>
    </Link>
  );
}
