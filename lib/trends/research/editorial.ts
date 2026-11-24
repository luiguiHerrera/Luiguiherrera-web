import overrides from "./editorial-overrides.json";
import type { Locale } from "./types";

// Keep the supplied research intact; apply the reviewed wording to public prose only.
const metadataFields = new Set([
  "id", "name", "title", "actor", "actors", "asset", "ticker", "cusip", "slug", "previous_slug",
  "url", "source", "sources", "source_ids", "moat_sources", "position_ids", "all_position_ids",
  "event_ids", "theme_ids", "data_ref", "label", "unit", "display_value", "display_unit",
  "display_scale", "qualifier", "period", "period_from", "period_to", "reported_at", "verified_at",
  "date", "as_of", "status", "direction", "display_direction", "kind",
]);

export function editPublicResearchCopy<T>(research: T, locale: Locale): T {
  const revisions: Record<string, string> = overrides[locale];
  function edit(value: unknown, field = ""): unknown {
    if (metadataFields.has(field)) return value;
    if (typeof value === "string") {
      let text = revisions[value] ?? value;
      if (field === "exposure") {
        text = text.replace(locale === "es" ? /^Yo la usaría para estudiar /u : /^I would use (?:it|this vehicle) to study /u, "");
        text = text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
      }
      if (locale === "es") {
        // Spanish verbs already carry the first person. Preserve the verb and its tense.
        text = text.replace(/\bYo\s+(\p{L})/gu, (_match, letter: string) => letter.toLocaleUpperCase("es"))
          .replace(/\byo\s+/gu, "");
      }
      return text;
    }
    if (Array.isArray(value)) return value.map(item => edit(item, field));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, edit(item, key)]));
    return value;
  }
  return edit(research) as T;
}

const redundantPolicyLabels = new Set([
  "marco citado en la fuente", "estado descrito en la fuente y el texto",
  "framework cited in the source", "status described in the source and text",
]);
export function policyStatusLabel(status: string) {
  return redundantPolicyLabels.has(status.toLocaleLowerCase().trim()) ? null : status;
}
