import type { Locale } from "@/lib/i18n/locales";

export const routePairs = [
  { es: "/", en: "/en" },
  { es: "/mercado", en: "/en/market" },
  { es: "/diagnostico", en: "/en/diagnostic" },
  { es: "/investigacion", en: "/en/research" },
  { es: "/investigacion/td3", en: "/en/research/td3" },
  { es: "/proteccion", en: "/en/protection" },
  { es: "/recursos", en: "/en/resources" },
  { es: "/dashboard", en: "/en/dashboard" },
  { es: "/niveles-estadisticos", en: "/en/statistical-levels" },
  { es: "/informe-semanal", en: "/en/weekly-report" },
  { es: "/quant-lab", en: "/en/quant-lab" },
  { es: "/protege-tu-dinero", en: "/en/protect-your-money" },
  { es: "/metodologia", en: "/en/methodology" },
  { es: "/legal", en: "/en/legal" },
] as const;

export function translatePathname(pathname: string, targetLocale: Locale) {
  const normalized = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const match = routePairs.find((pair) => pair.es === normalized || pair.en === normalized);
  if (match) return match[targetLocale];

  if (targetLocale === "es" && normalized.startsWith("/en/")) return normalized.replace(/^\/en/, "") || "/";
  if (targetLocale === "en" && !normalized.startsWith("/en")) return `/en${normalized === "/" ? "" : normalized}`;
  return normalized;
}

export function withSearch(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname;
}
