import { parseLocalizedMoney } from "../personal-finance/budget/validation.ts";
import type { BudgetCurrency, BudgetLocale } from "../personal-finance/budget/types.ts";
import type { DebtInput, DebtProfileInput, ExtraContributionInput, RateType } from "./types.ts";

export const MAX_MONTHS = 600;
export const MAX_PAYMENT_MONTH = 12_000;
export const MAX_ROWS = 30;
export const MAX_INPUT_MINOR = Number.MAX_SAFE_INTEGER;
export const MAX_ANNUAL_RATE = 10_000_000; // 1,000.0000% in 0.0001 percentage-point units.
const annualRateScale = 1_000_000;
const periodScale = BigInt(10) ** BigInt(24);

export type FieldError = "format" | "range" | "negative" | "precision";
export type FieldResult = { value: number | null; error: FieldError | null };

export function parseDebtMoney(raw: string, locale: BudgetLocale, currency: BudgetCurrency): FieldResult {
  const { minorUnits, error } = parseLocalizedMoney(raw, locale, currency);
  return { value: minorUnits, error: error === "invalid" ? "format" : error };
}

export function parseDebtRate(raw: string, locale: BudgetLocale): FieldResult {
  const value = raw.trim();
  if (!value) return { value: null, error: null };
  const separator = locale === "es" ? "," : "\\.";
  const match = new RegExp(`^(\\d+)(?:${separator}(\\d+))?$`).exec(value);
  if (!match) return { value: null, error: value.startsWith("-") ? "negative" : "format" };
  if ((match[2]?.length ?? 0) > 4) return { value: null, error: "precision" };
  const rate = Number(match[1]) * 10_000 + Number((match[2] ?? "").padEnd(4, "0"));
  return validInteger(rate, 0, MAX_ANNUAL_RATE) ? { value: rate, error: null } : { value: null, error: "range" };
}

export function parseDebtMonth(raw: string): FieldResult {
  const value = raw.trim();
  if (!value) return { value: null, error: null };
  if (!/^\d+$/.test(value)) return { value: null, error: "format" };
  const month = Number(value);
  return validInteger(month, 1, MAX_PAYMENT_MONTH) ? { value: month, error: null } : { value: null, error: "range" };
}

function validInteger(value: number, min: number, max: number) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

const kinds = new Set(["card", "personal", "vehicle", "mortgage", "education", "other"]);
const rateTypes = new Set(["nominal", "effective", "unknown"]);
const validMoney = (value: number | null) => value === null || validInteger(value, 0, MAX_INPUT_MINOR);

export function validateDebtInputs(profile: DebtProfileInput, debts: DebtInput[], extras: ExtraContributionInput[]) {
  if (debts.length > MAX_ROWS || extras.length > MAX_ROWS) return false;
  if (![profile.availableDebtPayment, profile.emergencyFund, profile.fixedMonthlyExpenses, profile.liquidNetWorth, profile.monthlyNetIncome].every(validMoney)) return false;
  if (new Set(debts.map(d => d.id)).size !== debts.length || new Set(extras.map(e => e.id)).size !== extras.length) return false;
  return debts.every(d => (
    typeof d.id === "string" && d.id.trim().length > 0 && typeof d.name === "string"
    && kinds.has(d.type) && rateTypes.has(d.rateType) && typeof d.minimumIncludesFees === "boolean"
    && [d.balance, d.minimumPayment, d.monthlyFee].every(validMoney)
    && !(d.balance !== null && d.balance > 0 && d.minimumIncludesFees && d.minimumPayment !== null
      && d.monthlyFee !== null && d.minimumPayment < d.monthlyFee)
    && (d.annualRate === null || validInteger(d.annualRate, 0, MAX_ANNUAL_RATE))
  )) && extras.every(e => (
    typeof e.id === "string" && e.id.trim().length > 0 && validMoney(e.amount)
    && (e.monthNumber === null || validInteger(e.monthNumber, 1, MAX_PAYMENT_MONTH))
  ));
}

export function monthlyRate(annual: number, type: Exclude<RateType, "unknown">) {
  if (type === "nominal") return { numerator: BigInt(annual), denominator: BigInt(annualRateScale * 12) };
  if (annual === 0) return { numerator: BigInt(0), denominator: periodScale };

  // Find the monthly growth factor on a fixed 24-decimal grid using integer powers.
  const scale = BigInt(annualRateScale);
  const target = (scale + BigInt(annual)) * periodScale ** BigInt(12);
  let lower = periodScale;
  let upper = BigInt(2) * periodScale; // Even the maximum allowed annual rate gives < 2× monthly growth.
  while (upper - lower > BigInt(1)) {
    const middle = (lower + upper) / BigInt(2);
    if (scale * middle ** BigInt(12) <= target) lower = middle;
    else upper = middle;
  }
  const midpointBase = periodScale * BigInt(2);
  const roundUp = scale * (lower + upper) ** BigInt(12) <= (scale + BigInt(annual)) * midpointBase ** BigInt(12);
  return { numerator: (roundUp ? upper : lower) - periodScale, denominator: periodScale };
}

export function monthlyInterest(balance: bigint, rate: ReturnType<typeof monthlyRate>) {
  return (balance * rate.numerator + rate.denominator / BigInt(2)) / rate.denominator;
}
