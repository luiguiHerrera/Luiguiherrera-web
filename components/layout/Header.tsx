import Link from "next/link";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/diagnostico", label: "Diagnóstico" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/quant-lab", label: "Quant Lab" },
  { href: "/protege-tu-dinero", label: "Protege tu dinero" },
  { href: "/metodologia", label: "Metodología" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-ink/88 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.18em] text-sage">
          Market Lab
        </Link>
        <nav className="flex flex-wrap gap-2 text-sm text-muted">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded border border-transparent px-3 py-2 transition hover:border-line hover:bg-panel hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
