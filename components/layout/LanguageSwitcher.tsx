"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { localeFromPathname, type Locale } from "@/lib/i18n/locales";
import { translatePathname, withSearch } from "@/lib/i18n/routes";

export function LanguageSwitcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentLocale = localeFromPathname(pathname);
  const search = searchParams.toString();

  function hrefFor(locale: Locale) {
    return withSearch(translatePathname(pathname, locale), search);
  }

  return (
    <div className="flex shrink-0 items-center border border-line bg-panelSoft text-[11px] font-semibold uppercase tracking-[0.12em]">
      <Link
        href={hrefFor("es")}
        className={`px-2 py-1.5 transition hover:text-ink ${currentLocale === "es" ? "bg-ink text-white" : "text-muted"}`}
        aria-current={currentLocale === "es" ? "page" : undefined}
      >
        ES
      </Link>
      <Link
        href={hrefFor("en")}
        className={`px-2 py-1.5 transition hover:text-ink ${currentLocale === "en" ? "bg-ink text-white" : "text-muted"}`}
        aria-current={currentLocale === "en" ? "page" : undefined}
      >
        EN
      </Link>
    </div>
  );
}
