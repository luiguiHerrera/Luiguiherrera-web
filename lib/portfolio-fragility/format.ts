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
    hhi: (value: number) => new Intl.NumberFormat(tag, { maximumFractionDigits: 6 }).format(value),
    precise: (value: number) => new Intl.NumberFormat(tag, { maximumSignificantDigits: 17, useGrouping: false }).format(value),
    previewPct: (value: number) => new Intl.NumberFormat(tag, { style: "percent", ...(value > 0 && value < 0.000001 ? { maximumSignificantDigits: 4 } : { maximumFractionDigits: 4 }), useGrouping: false }).format(value),
    precisePct: (value: number) => new Intl.NumberFormat(tag, { style: "percent", maximumSignificantDigits: 12, useGrouping: false }).format(value),
    signedPct: (value: number) => new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 2, signDisplay: "exceptZero" }).format(value),
    points: (fraction: number) => new Intl.NumberFormat(tag, { maximumFractionDigits: 2, signDisplay: "exceptZero" }).format(fraction * 100) + (locale === "es" ? " puntos porcentuales" : " percentage points"),
  };
}
