export type EditorialLocale = "es" | "en";

export function formatEditorialDate(date: string, locale: EditorialLocale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}
