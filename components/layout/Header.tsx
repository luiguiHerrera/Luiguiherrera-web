"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeFromPathname } from "@/lib/i18n/locales";

const navHrefs = {
  es: {
    home: "/",
    start: "/empezar",
    investor: "/inversionista",
    market: "/mercado",
    diagnostic: "/diagnostico",
    research: "/investigacion",
    protection: "/proteccion",
    trends: "/tendencias",
    resources: "/recursos",
  },
  en: {
    home: "/en",
    start: "/en/start",
    investor: "/en/investor",
    market: "/en/market",
    diagnostic: "/en/diagnostic",
    research: "/en/research",
    protection: "/en/protection",
    trends: "/en/trends",
    resources: "/en/resources",
  },
};

type NavDropdownItem = {
  description: string;
  href: string;
  label: string;
  shortLabel: string;
};

function withDiagnosticRestart(href: string) {
  const [pathAndQuery, hash = ""] = href.split("#");
  const [path, query = ""] = pathAndQuery.split("?");
  const params = new URLSearchParams(query);
  params.set("restart", String(Date.now()));
  const nextQuery = params.toString();
  return `${path}${nextQuery ? `?${nextQuery}` : ""}${hash ? `#${hash}` : ""}`;
}

function isDiagnosticHref(href: string) {
  return href === "/diagnostico" ||
    href.startsWith("/diagnostico?") ||
    href === "/en/diagnostic" ||
    href.startsWith("/en/diagnostic?");
}

function HeaderLink({ children, className, href }: { children: ReactNode; className: string; href: string }) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!isDiagnosticHref(href)) return;
    event.preventDefault();
    router.push(withDiagnosticRestart(href));
  }

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}

function DesktopDropdown({ href, items, label }: { href: string; items: NavDropdownItem[]; label: string }) {
  return (
    <div className="group relative shrink-0">
      <HeaderLink
        href={href}
        className="block border-b border-transparent px-2 py-1.5 font-medium transition hover:border-petrol hover:text-petrol focus-visible:border-petrol focus-visible:text-petrol focus-visible:outline-none"
      >
        {label}
      </HeaderLink>
      <div className="invisible absolute left-0 top-full z-50 hidden w-[21rem] pt-3 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 lg:block">
        <div className="grid gap-1 rounded-[6px] border border-line/90 bg-white/95 p-2 shadow-[0_18px_45px_rgba(11,52,54,0.10)] backdrop-blur-xl">
          {items.map((item) => (
            <HeaderLink
              key={item.href}
              href={item.href}
              className="block rounded-[4px] px-3 py-2.5 text-[11px] text-muted transition hover:bg-paper hover:text-petrol focus-visible:bg-paper focus-visible:text-petrol focus-visible:outline-none"
            >
              <span className="block font-semibold text-ink">{item.label}</span>
              <span className="block pt-1 leading-5">{item.description}</span>
            </HeaderLink>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const dictionary = getDictionary(locale);
  const hrefs = navHrefs[locale];
  const navGroups = [
    { href: hrefs.market, label: dictionary.layout.nav.market, items: dictionary.layout.marketItems },
    { href: hrefs.diagnostic, label: dictionary.layout.nav.diagnostic, items: dictionary.layout.diagnosticItems },
    { href: hrefs.research, label: dictionary.layout.nav.research, items: dictionary.layout.researchItems },
    { href: hrefs.protection, label: dictionary.layout.nav.protection, items: dictionary.layout.protectionItems },
    { href: hrefs.trends, label: dictionary.layout.nav.trends, items: dictionary.layout.trendsItems },
    { href: hrefs.resources, label: dictionary.layout.nav.resources, items: dictionary.layout.resourcesItems },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-[#fffdf8]/92 shadow-[0_1px_18px_rgba(11,52,54,0.045)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:justify-between lg:px-5 lg:py-2.5">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <Link href={hrefs.home} className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink transition hover:text-petrol sm:gap-2 sm:text-xs sm:tracking-[0.18em]">
            <span className="h-2 w-2 shrink-0 rounded-full bg-petrol sm:h-2.5 sm:w-2.5" aria-hidden="true" />
            <span className="truncate">{dictionary.layout.brand}</span>
          </Link>
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <HeaderLink href={hrefs.start} className="inline-flex min-h-8 w-full items-center justify-center rounded-[4px] border border-petrol bg-petrol px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_8px_18px_rgba(11,52,54,0.10)] transition hover:bg-panel hover:text-petrol">
            {dictionary.layout.cta}
          </HeaderLink>
        </div>
        <div className="hidden w-full min-w-0 items-center gap-3 md:flex lg:w-auto">
          <nav className="-mx-1 flex max-w-full min-w-0 gap-1 overflow-x-auto text-[12px] text-muted [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:items-center lg:overflow-visible">
            <HeaderLink
              href={hrefs.start}
              className="shrink-0 border-b border-transparent px-2 py-1.5 font-medium transition hover:border-petrol hover:text-petrol focus-visible:border-petrol focus-visible:text-petrol focus-visible:outline-none"
            >
              {dictionary.layout.nav.start}
            </HeaderLink>
            <HeaderLink
              href={hrefs.investor}
              className="shrink-0 border-b border-transparent px-2 py-1.5 font-medium transition hover:border-petrol hover:text-petrol focus-visible:border-petrol focus-visible:text-petrol focus-visible:outline-none"
            >
              {dictionary.layout.nav.investor}
            </HeaderLink>
            {navGroups.map((group) => (
              <DesktopDropdown key={group.href} href={group.href} label={group.label} items={group.items} />
            ))}
          </nav>
          <div className="hidden md:block lg:ml-1">
            <LanguageSwitcher />
          </div>
          <HeaderLink href={hrefs.start} className="hidden shrink-0 rounded-[4px] border border-petrol bg-petrol px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(11,52,54,0.12)] transition hover:bg-panel hover:text-petrol md:inline-flex">
            {dictionary.layout.cta}
          </HeaderLink>
        </div>
      </div>
    </header>
  );
}
