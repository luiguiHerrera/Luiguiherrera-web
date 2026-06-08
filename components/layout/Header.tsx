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
    <header className="sticky top-0 z-50 border-b border-line/80 bg-ink/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="w-fit rounded text-sm font-semibold uppercase tracking-[0.18em] text-sage">
          Market Lab
        </Link>
        <nav className="-mx-1 flex gap-2 overflow-x-auto pb-1 text-sm text-muted lg:mx-0 lg:flex-wrap lg:overflow-visible lg:pb-0">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded border border-transparent px-3 py-2 transition hover:border-line hover:bg-panel hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
