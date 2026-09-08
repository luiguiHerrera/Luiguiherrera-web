import { neumaierSum, normalizeWeights, type Holding } from "./engine.ts";

export type NumberFormat = "dot" | "comma";
export type WeightUnit = "percentages" | "fractions" | "relative";
export type PortfolioDraft = { text: string; numberFormat: NumberFormat; unit: WeightUnit };
export type InputIssue = { line: number; code: "row" | "number" | "duplicate" | "empty" | "range"; token?: string };
export type PreviewRow = { assetId: string; originalId: string; input: string; interpreted: number; normalized: number };
export type PortfolioPreview = {
  draft: PortfolioDraft; rows: PreviewRow[]; holdings: Holding[]; enteredTotal: number;
  engineNormalization: boolean; rescaled: boolean; normalizedTotal: number;
};
export type PreviewResult = { ok: true; preview: PortfolioPreview } | { ok: false; issues: InputIssue[] };

// Delimiters and units are explicit. In particular, a comma never splits a holdings row.
export function previewPortfolio(draft: PortfolioDraft): PreviewResult {
  const issues: InputIssue[] = []; const rows: PreviewRow[] = []; const seen = new Set<string>();
  const grammar = draft.numberFormat === "dot" ? /^\d+(?:\.\d+)?$/ : /^\d+(?:,\d+)?$/;
  draft.text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim(); if (!line) return;
    const match = /^(\S+?)(?:\s*;\s*|\s+)(.+)$/.exec(line);
    if (!match || !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(match[1])) { issues.push({ line: index + 1, code: "row" }); return; }
    const originalId = match[1]; const assetId = originalId.toUpperCase(); const input = match[2].trim();
    const token = draft.unit === "percentages" ? input.replace(/\s*%$/, "") : input;
    if (!grammar.test(token)) { issues.push({ line: index + 1, code: "number", token: input }); return; }
    const interpreted = Number(token.replace(",", "."));
    const rawWeight = draft.unit === "percentages" ? interpreted / 100 : interpreted;
    if (!Number.isFinite(interpreted) || interpreted > Number.MAX_SAFE_INTEGER || (interpreted === 0 && /[1-9]/.test(token)) || (interpreted > 0 && rawWeight === 0)) {
      issues.push({ line: index + 1, code: "range" }); return;
    }
    if (seen.has(assetId)) { issues.push({ line: index + 1, code: "duplicate", token: assetId }); return; }
    seen.add(assetId); rows.push({ assetId, originalId, input, interpreted, normalized: 0 });
  });
  if (issues.length) return { ok: false, issues };
  const holdings = rows.map((row) => ({ assetId: row.assetId, rawWeight: draft.unit === "percentages" ? row.interpreted / 100 : row.interpreted }));
  const normalized = normalizeWeights(holdings);
  if (normalized.status !== "OK") return { ok: false, issues: [{ line: 0, code: rows.some((r) => r.interpreted > 0) ? "range" : "empty" }] };
  const byId = new Map(normalized.asset_ids.map((id, i) => [id, normalized.normalized_weights[i]]));
  for (const row of rows) {
    row.normalized = byId.get(row.assetId) ?? 0;
    if (row.interpreted > 0 && row.normalized <= 0) return { ok: false, issues: [{ line: rows.indexOf(row) + 1, code: "range" }] };
  }
  const enteredTotal = neumaierSum(rows.map((r) => r.interpreted));
  if (!Number.isFinite(enteredTotal)) return { ok: false, issues: [{ line: 0, code: "range" }] };
  return { ok: true, preview: {
    draft: { ...draft }, rows, holdings, enteredTotal,
    engineNormalization: normalized.normalization_applied,
    rescaled: draft.unit === "relative" ? normalized.normalization_applied : Math.abs(enteredTotal - (draft.unit === "percentages" ? 100 : 1)) > 1e-12,
    normalizedTotal: neumaierSum(normalized.normalized_weights),
  } };
}

export function sameDraft(a: PortfolioDraft, b: PortfolioDraft) {
  return a.text === b.text && a.numberFormat === b.numberFormat && a.unit === b.unit;
}

export function parsePortfolioText(text: string, numberFormat: NumberFormat = "dot", unit: WeightUnit = "relative"): Holding[] {
  const result = previewPortfolio({ text, numberFormat, unit });
  if (!result.ok) throw new Error("Invalid holdings input: " + result.issues.map((issue) => `${issue.line}:${issue.code}`).join(", "));
  return result.preview.holdings;
}
