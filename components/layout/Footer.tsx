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
  const legalHref = locale === "en" ? "/en/legal" : "/legal";

  return (
    <footer className="border-t border-line bg-panel">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <p>{dictionary.layout.footerText}</p>
        <div className="flex gap-4">
          <Link className="hover:text-ink" href={methodologyHref}>
            {dictionary.layout.methodology}
          </Link>
          <Link className="hover:text-ink" href={legalHref}>
            {dictionary.layout.legal}
          </Link>
        </div>
      </div>
    </footer>
  );
}
