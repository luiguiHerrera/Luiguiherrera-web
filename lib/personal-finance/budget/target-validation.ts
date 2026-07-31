import type {
  AllocationBasisPoints,
  TargetAllocation,
} from "./target-types.ts";
import {
  allocationCategories,
  MAX_CATEGORY_ALLOCATION_BASIS_POINTS,
} from "./target-types.ts";
import type { BudgetLocale } from "./types.ts";

export type PercentageParseError = "invalid" | "negative" | "precision" | "range";

export type PercentageParseResult =
  | { basisPoints: AllocationBasisPoints | null; error: null }
  | { basisPoints: null; error: PercentageParseError };

export function parseLocalizedPercentage(
  raw: string,
  locale: BudgetLocale,
  maximumBasisPoints = 10_000,
): PercentageParseResult {
  const value = raw.trim();
  if (value === "") return { basisPoints: null, error: null };
  if (value.startsWith("-")) return { basisPoints: null, error: "negative" };
  if (/[eE+]/.test(value) || /\s/.test(value)) {
    return { basisPoints: null, error: "invalid" };
  }

  const separator = locale === "es" ? "," : ".";
  const escaped = separator === "." ? "\\." : separator;
  const match = value.match(new RegExp(`^(\\d{1,3})(?:${escaped}(\\d{1,2}))?$`));
  if (!match) {
    const precisionPattern = new RegExp(`^\\d{1,3}${escaped}\\d{3,}$`);
    return {
      basisPoints: null,
      error: precisionPattern.test(value) ? "precision" : "invalid",
    };
  }

  const whole = Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const basisPoints = whole * 100 + Number(fraction || "0");
  if (basisPoints > maximumBasisPoints) {
    return { basisPoints: null, error: "range" };
  }
  return { basisPoints, error: null };
}

export function categorySliderMaxPercent(basisPoints: AllocationBasisPoints) {
  if (
    !Number.isSafeInteger(basisPoints)
    || basisPoints < 0
    || basisPoints > MAX_CATEGORY_ALLOCATION_BASIS_POINTS
  ) {
    throw new RangeError("basisPoints must be within the category allocation range");
  }
  if (basisPoints <= 10_000) return 100;
  return Math.min(600, Math.ceil(basisPoints / 2_500) * 25);
}

export function formatBasisPoints(
  basisPoints: AllocationBasisPoints,
  locale: BudgetLocale,
) {
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0) {
    throw new RangeError("basisPoints must be a non-negative safe integer");
  }
  const whole = Math.floor(basisPoints / 100);
  const fraction = String(basisPoints % 100).padStart(2, "0");
  if (fraction === "00") return String(whole);
  const trimmed = fraction.endsWith("0") ? fraction.slice(0, 1) : fraction;
  return `${whole}${locale === "es" ? "," : "."}${trimmed}`;
}

export function validateAllocation(allocation: TargetAllocation) {
  return allocationCategories.every((category) => (
    Number.isSafeInteger(allocation[category])
    && allocation[category] >= 0
    && allocation[category] <= MAX_CATEGORY_ALLOCATION_BASIS_POINTS
  ));
}

export function parseBoundedInteger(
  raw: string,
  minimum: number,
  maximum: number,
) {
  const value = raw.trim();
  if (value === "") return { error: null, value: null } as const;
  if (!/^\d+$/.test(value)) return { error: "invalid", value: null } as const;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    return { error: "range", value: null } as const;
  }
  return { error: null, value: parsed } as const;
}
