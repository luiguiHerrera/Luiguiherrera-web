import type { Locale } from "@/lib/i18n/locales";
import { getTranslatedPathname } from "./language-pairs.ts";

export function translatePathname(pathname: string, targetLocale: Locale) {
  const normalized = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const translatedPathname = getTranslatedPathname(normalized, targetLocale);
  if (translatedPathname) return translatedPathname;

  const isEnglishPath = normalized === "/en" || normalized.startsWith("/en/");
  if (targetLocale === "en") return isEnglishPath ? normalized : "/en";
  return isEnglishPath ? "/" : normalized;
}

export function withSearch(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname;
}
