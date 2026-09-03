"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MarketLabMark } from "@/components/brand/MarketLabMark";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeFromPathname } from "@/lib/i18n/locales";

export function Footer() {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const dictionary = getDictionary(locale);
  const methodologyHref = locale === "en" ? "/en/methodology" : "/metodologia";
  const legalHref = locale === "en" ? "/en/legal" : "/legal";
  const isPersonalFinanceEntry = pathname === "/empezar" || pathname === "/en/start";

  if (isPersonalFinanceEntry) {
    const year = new Date().getUTCFullYear();
    const copyright = locale === "en"
      ? `© ${year} Luigui Herrera. All rights reserved.`
      : `© ${year} Luigui Herrera. Todos los derechos reservados.`;

    return (
      <footer className="border-t border-[#19484a] bg-petrol">
        <div className="mx-auto grid max-w-[1420px] gap-6 px-5 py-9 text-sm leading-6 text-white/80 sm:px-8 md:grid-cols-[1fr_auto_1fr] md:items-center md:px-10 md:py-8">
          <Link
            href={locale === "en" ? "/en" : "/"}
            className="w-fit text-white transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <span className="sr-only">{dictionary.layout.brand}</span>
            <MarketLabMark />
          </Link>
          <p className="md:text-center">{copyright}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 md:justify-end">
            <Link className="font-semibold text-white transition hover:text-white/80" href={methodologyHref}>
              {dictionary.layout.methodology}
            </Link>
            <Link className="font-semibold text-white transition hover:text-white/80" href={legalHref}>
              {dictionary.layout.legal}
            </Link>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-[#19484a] bg-petrol">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-9 text-sm leading-6 text-white/85 md:flex-row md:items-center md:justify-between md:py-8">
        <p className="max-w-3xl">{dictionary.layout.footerText}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/15 pt-4 md:border-t-0 md:pt-0">
          <Link className="font-semibold text-white transition hover:text-white/80" href={methodologyHref}>
            {dictionary.layout.methodology}
          </Link>
          <Link className="font-semibold text-white transition hover:text-white/80" href={legalHref}>
            {dictionary.layout.legal}
          </Link>
        </div>
      </div>
    </footer>
  );
}
