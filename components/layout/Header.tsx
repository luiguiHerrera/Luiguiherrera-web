"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { FocusEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { MarketLabMark } from "@/components/brand/MarketLabMark";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeFromPathname } from "@/lib/i18n/locales";

const navHrefs = {
  es: {
    home: "/",
    start: "/empezar",
    investor: "/inversionista",
    research: "/investigacion/td3",
    protection: "/proteccion",
    resources: "/recursos",
  },
  en: {
    home: "/en",
    start: "/en/start",
    investor: "/en/investor",
    research: "/en/research/td3",
    protection: "/en/protection",
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

function DesktopDropdown({
  href,
  isHome,
  items,
  label,
}: {
  href: string;
  isHome: boolean;
  items: NavDropdownItem[];
  label: string;
}) {
  const [open, setOpen] = useState(false);

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    setOpen(false);
    event.currentTarget.querySelector<HTMLButtonElement>("button")?.focus();
  }

  return (
    <div
      className="relative shrink-0"
      onBlur={handleBlur}
      onFocus={() => setOpen(true)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex items-center">
        <HeaderLink
          href={href}
          className="block border-b border-transparent py-1.5 pl-2 pr-1 font-medium transition hover:border-petrol hover:text-petrol focus-visible:border-petrol focus-visible:text-petrol focus-visible:outline-none"
        >
          {label}
        </HeaderLink>
        <button
          type="button"
          aria-expanded={open}
          aria-label={`${label}: menú`}
          className="inline-flex h-7 w-6 items-center justify-center rounded-[3px] text-muted transition hover:bg-paper hover:text-petrol focus-visible:text-petrol"
          onClick={() => setOpen(true)}
        >
          <span aria-hidden="true" className={`text-[9px] transition-transform duration-150 ${open ? "rotate-180" : ""}`}>▾</span>
        </button>
      </div>
      <div
        className={`absolute right-0 top-full z-[70] w-[min(21rem,calc(100vw-2rem))] pt-3 transition duration-150 ${
          open ? "visible opacity-100" : "invisible pointer-events-none opacity-0"
        }`}
      >
        <div className={`grid gap-1 rounded-[6px] border border-line border-t-petrol/55 p-2 shadow-[0_18px_42px_rgba(11,52,54,0.12)] ${
          isHome ? "bg-[#fffdf8]/90 backdrop-blur-xl" : "bg-[#fffdf8]"
        }`}>
          {items.map((item) => (
            <HeaderLink
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="block rounded-[4px] border-l-2 border-transparent px-3 py-2.5 text-[11px] text-muted transition hover:border-brass/55 hover:bg-paper hover:text-petrol focus-visible:border-brass/55 focus-visible:bg-paper focus-visible:text-petrol focus-visible:outline-none"
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

function DesktopNavLink({ href, label }: { href: string; label: string }) {
  return (
    <HeaderLink
      href={href}
      className="block shrink-0 border-b border-transparent px-2 py-1.5 font-medium transition hover:border-petrol hover:text-petrol focus-visible:border-petrol focus-visible:text-petrol focus-visible:outline-none"
    >
      {label}
    </HeaderLink>
  );
}

function HeaderForPathname({ pathname }: { pathname: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const locale = localeFromPathname(pathname);
  const dictionary = getDictionary(locale);
  const hrefs = navHrefs[locale];
  const navGroups = [
    { href: hrefs.start, label: dictionary.layout.nav.start, items: dictionary.layout.startItems },
    { href: hrefs.investor, label: dictionary.layout.nav.investor, items: dictionary.layout.investorItems },
    { href: hrefs.research, label: dictionary.layout.nav.research },
    { href: hrefs.protection, label: dictionary.layout.nav.protection, items: dictionary.layout.protectionItems },
    { href: hrefs.resources, label: dictionary.layout.nav.resources, items: dictionary.layout.resourcesItems },
  ];
  const isHome = pathname === "/" || pathname === "/en";

  function handleHeaderKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") setMobileOpen(false);
  }

  return (
    <header onKeyDown={handleHeaderKeyDown} className="sticky top-0 z-50 border-b border-line/80 bg-[#fffdf8]/96 shadow-[0_1px_18px_rgba(11,52,54,0.045)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4 lg:px-5">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <Link href={hrefs.home} className="flex min-w-0 flex-1 items-center transition hover:opacity-75">
            <span className="sr-only">{dictionary.layout.brand}</span>
            <MarketLabMark />
          </Link>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher />
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-label={locale === "en" ? "Open navigation" : "Abrir navegación"}
            className="inline-flex min-h-8 items-center justify-center rounded-[4px] border border-petrol bg-petrol px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_8px_18px_rgba(11,52,54,0.10)] transition hover:bg-panel hover:text-petrol"
            onClick={() => setMobileOpen((current) => !current)}
          >
            {mobileOpen ? (locale === "en" ? "Close" : "Cerrar") : (locale === "en" ? "Menu" : "Menú")}
          </button>
        </div>
        <div className="hidden min-w-0 items-center gap-3 lg:flex">
          <nav className="flex min-w-0 items-center gap-1 text-[12px] text-muted">
            {navGroups.map((group) => (
              group.items?.length ? (
                <DesktopDropdown key={group.href} href={group.href} isHome={isHome} label={group.label} items={group.items} />
              ) : (
                <DesktopNavLink key={group.href} href={group.href} label={group.label} />
              )
            ))}
          </nav>
          <div className="ml-1">
            <LanguageSwitcher />
          </div>
          <HeaderLink href={hrefs.start} className="inline-flex shrink-0 rounded-[4px] border border-petrol bg-petrol px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(11,52,54,0.12)] transition hover:bg-panel hover:text-petrol">
            {dictionary.layout.cta}
          </HeaderLink>
        </div>
      </div>
      {mobileOpen ? (
        <nav className="max-h-[calc(100vh-3.5rem)] overflow-y-auto border-t border-line bg-[#fffdf8] px-4 py-4 lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-2">
            {navGroups.map((group) => (
              <div key={group.href} className="border-b border-line/75 pb-2">
                <HeaderLink href={group.href} className="flex min-h-10 items-center font-semibold text-ink transition hover:text-petrol">
                  {group.label}
                </HeaderLink>
                {group.items?.length ? (
                  <div className="grid gap-1 pb-2 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <HeaderLink
                        key={`${item.href}-${item.label}`}
                        href={item.href}
                        className="rounded-[4px] border border-line/80 bg-paper/70 px-3 py-2 text-sm text-muted transition hover:border-petrol/35 hover:bg-white hover:text-petrol"
                      >
                        <span className="block font-semibold text-ink">{item.label}</span>
                        <span className="mt-1 block text-xs leading-5">{item.description}</span>
                      </HeaderLink>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}

export function Header() {
  const pathname = usePathname();
  return <HeaderForPathname key={pathname} pathname={pathname} />;
}
