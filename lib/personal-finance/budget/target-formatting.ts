import type { BudgetCurrency, BudgetLocale } from "./types.ts";

function currencyFractionDigits(
  locale: BudgetLocale,
  currency: BudgetCurrency,
) {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    currency,
    style: "currency",
  }).resolvedOptions().maximumFractionDigits ?? 0;
}

export function formatTargetMoney(
  minorUnits: bigint,
  locale: BudgetLocale,
  currency: BudgetCurrency,
) {
  const fractionDigits = currencyFractionDigits(locale, currency);
  const factor = BigInt(10) ** BigInt(fractionDigits);
  const negative = minorUnits < BigInt(0);
  const absolute = negative ? -minorUnits : minorUnits;
  const whole = absolute / factor;
  const fraction = (absolute % factor).toString().padStart(fractionDigits, "0");
  const signedWhole: bigint | number = negative
    ? whole === BigInt(0) ? -0 : -whole
    : whole;
  const formatter = new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    currency,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
    style: "currency",
    useGrouping: true,
  });

  return formatter.formatToParts(signedWhole).map((part) => (
    part.type === "fraction" ? fraction : part.value
  )).join("");
}
