"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeFromPathname } from "@/lib/i18n/locales";

export function Footer() {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const dictionary = getDictionary(locale);
  const methodologyHref = locale === "en" ? "/en/methodology" : "/metodologia";
  const trendsHref = locale === "en" ? "/en/trends" : "/tendencias";
  const legalHref = locale === "en" ? "/en/legal" : "/legal";

  return (
    <footer className="border-t border-[#19484a] bg-petrol">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-9 text-sm leading-6 text-white/85 md:flex-row md:items-center md:justify-between md:py-8">
        <p className="max-w-3xl">{dictionary.layout.footerText}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/15 pt-4 md:border-t-0 md:pt-0">
          <Link className="font-semibold text-white transition hover:text-white/80" href={methodologyHref}>
            {dictionary.layout.methodology}
          </Link>
          <Link className="font-semibold text-white transition hover:text-white/80" href={trendsHref}>
            {dictionary.layout.trends}
          </Link>
          <Link className="font-semibold text-white transition hover:text-white/80" href={legalHref}>
            {dictionary.layout.legal}
          </Link>
        </div>
      </div>
    </footer>
  );
}
