import type { Measure, Locale, Position } from "./types.ts";

export function number(value: number | null | undefined, locale: Locale, digits = 2) {
  return value == null ? (locale === "es" ? "No disponible" : "Not available") : new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", { maximumFractionDigits: digits }).format(value);
}
export function date(value: string, locale: Locale) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(Date.parse(value));
}
// display_value is already scaled. Only raw values without an override receive display_scale.
export function displayMeasure(row: Pick<Measure, "value" | "unit" | "display_value" | "display_unit" | "display_scale">, locale: Locale, defaults: { unit?: string; display_unit?: string; display_scale?: number } = {}) {
  const scale = row.display_scale ?? defaults.display_scale ?? 1;
  return { value: row.display_value != null ? String(row.display_value) : number(row.value == null ? null : row.value * scale, locale), unit: row.display_unit ?? defaults.display_unit ?? row.unit ?? defaults.unit ?? "" };
}
export function changeDisplay(position: Position, locale: Locale) {
  if (position.newly_reported) return { label: locale === "es" ? "Nueva declaración" : "Newly reported", delta: null, percent: null, tone: "neutral" };
  if (!position.comparison_eligible || position.delta == null) return { label: locale === "es" ? "Sin comparación" : "Not comparable", delta: null, percent: null, tone: "neutral" };
  return { label: position.display_direction, delta: position.delta, percent: position.delta_pct, tone: position.delta > 0 ? "positive" : position.delta < 0 ? "negative" : "neutral" };
}
export function signed(value: number | null, locale: Locale, digits = 2) { return value == null ? number(null, locale) : `${value > 0 ? "+" : ""}${number(value, locale, digits)}`; }
export function nature(kind: string | undefined) {
  if (/previsi|proyec|objetivo|forecast|projection|target|planned/i.test(kind ?? "")) return "future";
  if (/encuesta|survey|muestra|sample/i.test(kind ?? "")) return "survey";
  if (/estima|estimate/i.test(kind ?? "")) return "estimate";
  return "observed";
}
