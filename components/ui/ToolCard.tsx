import Link from "next/link";

type ToolCardProps = {
  title: string;
  description: string;
  href: string;
  label: string;
};

export function ToolCard({ title, description, href, label }: ToolCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-line bg-panel p-6 shadow-quiet transition hover:-translate-y-0.5 hover:border-petrol"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sage">{label}</p>
      <h2 className="mt-4 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-3 leading-7 text-muted">{description}</p>
      <span className="mt-6 inline-flex text-sm font-semibold text-brass group-hover:text-white">Abrir herramienta</span>
    </Link>
  );
}
