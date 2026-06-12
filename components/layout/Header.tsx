import Link from "next/link";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/diagnostico", label: "Diagnóstico" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/niveles-estadisticos", label: "Niveles estadísticos" },
  { href: "/quant-lab", label: "Quant Lab" },
  { href: "/protege-tu-dinero", label: "Protege tu dinero" },
  { href: "/metodologia", label: "Metodología" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-panel/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-2.5 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="w-fit text-xs font-semibold uppercase tracking-[0.2em] text-ink">
          Market Lab
        </Link>
        <div className="flex w-full min-w-0 items-center gap-3 overflow-hidden lg:w-auto lg:overflow-visible">
          <nav className="-mx-1 flex max-w-full min-w-0 gap-1 overflow-x-auto pb-1 text-[12px] text-muted [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:pb-0">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 border-b border-transparent px-2 py-1.5 transition hover:border-ink hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/diagnostico" className="hidden shrink-0 border border-ink bg-ink px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-panel hover:text-ink sm:inline-flex">
            Comenzar
          </Link>
        </div>
      </div>
    </header>
  );
}
