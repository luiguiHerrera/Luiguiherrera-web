import type { BudgetCurrency, BudgetLocale } from "./types.ts";

export type MoneyParseError = "invalid" | "negative" | "precision" | "range";

export type MoneyParseResult =
  | { error: null; minorUnits: number | null }
  | { error: MoneyParseError; minorUnits: null };

export function currencyFractionDigits(locale: BudgetLocale, currency: BudgetCurrency) {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    currency,
    style: "currency",
  }).resolvedOptions().maximumFractionDigits ?? 0;
}

export function parseLocalizedMoney(
  raw: string,
  locale: BudgetLocale,
  currency: BudgetCurrency,
): MoneyParseResult {
  const value = raw.trim();
  if (value === "") return { error: null, minorUnits: null };
  if (value.startsWith("-")) return { error: "negative", minorUnits: null };
  if (/[eE+]/.test(value)) return { error: "invalid", minorUnits: null };

  const decimalSeparator = locale === "es" ? "," : ".";
  const groupingSeparator = locale === "es" ? "." : ",";
  const fractionDigits = currencyFractionDigits(locale, currency);
  const escapedDecimal = decimalSeparator === "." ? "\\." : decimalSeparator;
  const escapedGrouping = groupingSeparator === "." ? "\\." : groupingSeparator;
  const whole = `(?:0|[1-9]\\d*|[1-9]\\d{0,2}(?:${escapedGrouping}\\d{3})+)`;
  const pattern = fractionDigits > 0
    ? new RegExp(`^(${whole})(?:${escapedDecimal}(\\d+))?$`)
    : new RegExp(`^(${whole})$`);
  const match = value.match(pattern);

  if (!match) {
    const hasUnsupportedFraction = fractionDigits === 0
      && new RegExp(`^${whole}${escapedDecimal}\\d+$`).test(value);
    return { error: hasUnsupportedFraction ? "precision" : "invalid", minorUnits: null };
  }

  const fraction = match[2] ?? "";
  if (fraction.length > fractionDigits) return { error: "precision", minorUnits: null };

  const normalizedWhole = match[1].split(groupingSeparator).join("");
  const paddedFraction = fraction.padEnd(fractionDigits, "0");
  const factor = BigInt(10) ** BigInt(fractionDigits);
  const minorUnits = BigInt(normalizedWhole) * factor + BigInt(paddedFraction || "0");

  if (minorUnits > BigInt(Number.MAX_SAFE_INTEGER)) {
    return { error: "range", minorUnits: null };
  }

  return { error: null, minorUnits: Number(minorUnits) };
}

export function formatMoneyInput(
  minorUnits: number,
  locale: BudgetLocale,
  currency: BudgetCurrency,
) {
  return formatMinorUnits(minorUnits, locale, currency, {
    useGrouping: true,
  });
}

export function formatMoney(
  minorUnits: number,
  locale: BudgetLocale,
  currency: BudgetCurrency,
) {
  return formatMinorUnits(minorUnits, locale, currency, {
    currency,
    style: "currency",
    useGrouping: true,
  });
}

function formatMinorUnits(
  minorUnits: number,
  locale: BudgetLocale,
  currency: BudgetCurrency,
  options: Intl.NumberFormatOptions,
) {
  if (!Number.isSafeInteger(minorUnits)) {
    throw new RangeError("minorUnits must be a safe integer");
  }

  const fractionDigits = currencyFractionDigits(locale, currency);
  const factor = BigInt(10) ** BigInt(fractionDigits);
  const value = BigInt(minorUnits);
  const negative = value < 0;
  const absolute = negative ? -value : value;
  const whole = absolute / factor;
  const fraction = (absolute % factor).toString().padStart(fractionDigits, "0");
  const signedWhole: bigint | number = negative
    ? whole === BigInt(0) ? -0 : -whole
    : whole;
  const formatter = new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    ...options,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });

  return formatter.formatToParts(signedWhole).map((part) => (
    part.type === "fraction" ? fraction : part.value
  )).join("");
}
