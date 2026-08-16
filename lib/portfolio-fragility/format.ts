export type Locale = "es" | "en";

const LOCALE_TAGS: Record<Locale, string> = { es: "es-ES", en: "en-US" };

export function createFormatters(locale: Locale) {
  const tag = LOCALE_TAGS[locale];
  const percent = new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 1 });
  const decimal = new Intl.NumberFormat(tag, { maximumFractionDigits: 2 });
  const twoDecimals = new Intl.NumberFormat(tag, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return {
    pct: (value: number) => percent.format(value),
    number: (value: number) => decimal.format(value),
    multiplier: (value: number) => twoDecimals.format(value) + "×",
  };
}
