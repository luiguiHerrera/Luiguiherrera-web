import type { TomDecayLocale } from "./content-types.ts";

export type TomFormatters = {
  bps: (value: number) => string;
  signedBps: (value: number) => string;
  pValue: (value: number) => string;
  integer: (value: number) => string;
  correlation: (value: number) => string;
  interval: (low: number, high: number) => string;
  year: (value: number) => string;
};

export function createTomFormatters(locale: TomDecayLocale): TomFormatters {
  const tag = locale === "es" ? "es-ES" : "en-US";
  const decimal = new Intl.NumberFormat(tag, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const signed = new Intl.NumberFormat(tag, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  });
  const whole = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 });
  const fine = new Intl.NumberFormat(tag, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  const lessThan = locale === "es" ? "< 0,0001" : "< 0.0001";

  const bps = (value: number) => decimal.format(value);

  return {
    bps,
    signedBps: (value: number) => signed.format(value),
    pValue: (value: number) => (value < 0.0001 ? lessThan : fine.format(value)),
    integer: (value: number) => whole.format(value),
    correlation: (value: number) => decimal.format(value),
    interval: (low: number, high: number) => `${bps(low)} — ${bps(high)}`,
    year: (value: number) => String(value),
  };
}

export function fillTemplate(text: string, values: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}
