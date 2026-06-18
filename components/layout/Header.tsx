import Link from "next/link";

const marketItems = [
  {
    href: "/dashboard",
    label: "Dashboard de régimen",
    description: "Lectura diaria de volatilidad, rotación y flujos.",
  },
  {
    href: "/niveles-estadisticos",
    label: "Niveles estadísticos",
    description: "Precio, percentiles, estacionalidad y contexto histórico.",
  },
  {
    href: "/informe-semanal",
    label: "Informe semanal",
    description: "Resumen editorial del cierre de mercado.",
  },
];

const navItems = [
  { href: "/", label: "Home" },
  { href: "/diagnostico", label: "Diagnóstico" },
  { href: "/investigacion", label: "Investigación" },
  { href: "/proteccion", label: "Protección" },
  { href: "/recursos", label: "Recursos" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-panel/92 shadow-[0_1px_18px_rgba(31,35,40,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 lg:flex-row lg:items-center lg:justify-between lg:px-5 lg:py-2.5">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="w-fit text-xs font-semibold uppercase tracking-[0.2em] text-ink">
            Market Lab
          </Link>
          <Link href="/diagnostico" className="shrink-0 border border-ink bg-ink px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-panel hover:text-ink sm:hidden">
            Comenzar
          </Link>
        </div>
        <div className="flex w-full min-w-0 items-center gap-3 lg:w-auto">
          <nav className="-mx-1 flex max-w-full min-w-0 gap-1 overflow-x-auto text-[12px] text-muted [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:items-center lg:overflow-visible">
            <Link
              href="/"
              className="shrink-0 border-b border-transparent px-2 py-1.5 transition hover:border-ink hover:text-ink focus-visible:border-ink focus-visible:text-ink focus-visible:outline-none"
            >
              Home
            </Link>
            <div className="group relative shrink-0">
              <Link
                href="/mercado"
                className="block border-b border-transparent px-2 py-1.5 transition hover:border-ink hover:text-ink focus-visible:border-ink focus-visible:text-ink focus-visible:outline-none"
              >
                Mercado
              </Link>
              <div className="invisible absolute left-0 top-full z-50 mt-2 hidden w-[21rem] gap-1 border border-line/80 bg-panel p-2 opacity-0 shadow-[0_14px_34px_rgba(31,35,40,0.10)] transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 lg:grid">
                {marketItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-2 py-1.5 text-[11px] text-muted transition hover:bg-panelSoft hover:text-ink focus-visible:bg-panelSoft focus-visible:text-ink focus-visible:outline-none lg:px-3 lg:py-2.5"
                  >
                    <span className="block font-semibold text-ink">{item.label}</span>
                    <span className="hidden pt-1 leading-5 lg:block">{item.description}</span>
                  </Link>
                ))}
              </div>
            </div>
            {navItems.slice(1).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 border-b border-transparent px-2 py-1.5 transition hover:border-ink hover:text-ink focus-visible:border-ink focus-visible:text-ink focus-visible:outline-none"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/diagnostico" className="hidden shrink-0 border border-ink bg-ink px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-panel hover:text-ink sm:inline-flex">
            Comenzar
          </Link>
        </div>
        <nav className="-mx-1 flex gap-1 overflow-x-auto border-t border-line/60 pt-1.5 text-[11px] text-muted [scrollbar-width:none] lg:hidden">
          {marketItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 border border-line/70 bg-panelSoft px-2.5 py-1.5 font-semibold text-ink transition hover:border-ink"
            >
              {item.label.replace(" de régimen", "").replace(" estadísticos", "")}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
