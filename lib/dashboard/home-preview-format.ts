export type HomePreviewLocale = "es" | "en";

export function formatHomePreviewNumber(
  value: number | null | undefined,
  locale: HomePreviewLocale,
  digits = 1,
) {
  if (value === null || value === undefined) return locale === "en" ? "n/a" : "n/d";

  return new Intl.NumberFormat(locale === "en" ? "en-US" : "es-ES", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatHomeCurvePointTitle(
  label: string,
  value: number,
  locale: HomePreviewLocale,
) {
  return `${label}: ${formatHomePreviewNumber(value, locale, 2)}`;
}
