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
    <div className="flex shrink-0 items-center rounded-[4px] border border-petrol/25 bg-white/80 text-[10px] font-semibold uppercase tracking-[0.1em] shadow-[0_4px_14px_rgba(11,52,54,0.06)] sm:text-[11px] sm:tracking-[0.12em]">
      <Link
        href={hrefFor("es")}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center px-2 py-1.5 transition hover:text-petrol sm:px-2.5 lg:min-h-0 lg:min-w-0 ${currentLocale === "es" ? "bg-petrol text-white" : "text-muted"}`}
        aria-current={currentLocale === "es" ? "page" : undefined}
      >
        ES
      </Link>
      <Link
        href={hrefFor("en")}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center px-2 py-1.5 transition hover:text-petrol sm:px-2.5 lg:min-h-0 lg:min-w-0 ${currentLocale === "en" ? "bg-petrol text-white" : "text-muted"}`}
        aria-current={currentLocale === "en" ? "page" : undefined}
      >
        EN
      </Link>
    </div>
  );
}
