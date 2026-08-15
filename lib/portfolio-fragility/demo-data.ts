import type { HistoryObservation, Holding } from "./engine";

export const DEMO_HOLDINGS: Holding[] = [
  { assetId: "GLD", rawWeight: 10, bucket: "GOLD" },
  { assetId: "QQQ", rawWeight: 35, bucket: "MEGA_GROWTH" },
  { assetId: "SPY", rawWeight: 35, bucket: "BROAD_EQ" },
  { assetId: "TLT", rawWeight: 20, bucket: "GOV_LONG" },
];

const INCEPTION: Record<string, string> = {
  GLD: "2004-11-18", QQQ: "1999-03-10", SPY: "1993-01-22", TLT: "2002-07-22",
};

function weekdays(start: string, end: string) {
  const dates: string[] = [];
  for (let time = Date.parse(start + "T00:00:00Z"); time <= Date.parse(end + "T00:00:00Z"); time += 86_400_000) {
    const date = new Date(time);
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}

function deterministicReturn(asset: string, index: number, date: string) {
  const common = 0.00022 + 0.006 * Math.sin(index * 0.37) + 0.003 * Math.cos(index * 0.11);
  const style = 0.0025 * Math.sin(index * 0.73 + asset.charCodeAt(0));
  let regime = 0;
  if (date >= "2007-10-09" && date <= "2009-03-09") regime = asset === "TLT" || asset === "GLD" ? 0.0004 : -0.0012;
  if (date >= "2020-02-19" && date <= "2020-03-23") regime = asset === "TLT" ? 0.0002 : -0.004;
  if (date >= "2022-01-03" && date <= "2022-12-30") regime = asset === "GLD" ? 0.0001 : asset === "TLT" ? -0.0007 : -0.0003;
  const exposure = asset === "QQQ" ? 1.18 : asset === "SPY" ? 1 : asset === "TLT" ? -0.28 : -0.08;
  return Math.max(-0.08, Math.min(0.08, exposure * common + style + regime));
}

export function buildDemoHistory(): HistoryObservation[] {
  const ranges = [
    ["2007-10-09", "2009-03-09"],
    ["2020-02-19", "2020-03-23"],
    ["2022-01-03", "2022-12-30"],
    ["2025-01-02", "2026-02-20"],
  ] as const;
  const dates = ranges.flatMap(([start, end]) => weekdays(start, end));
  return DEMO_HOLDINGS.flatMap((holding) => {
    let value = 100;
    return dates.map((date, index) => {
      value *= 1 + deterministicReturn(holding.assetId, index, date);
      return {
        assetId: holding.assetId, date, value, currency: "USD", returnBasis: "TOTAL_RETURN" as const,
        source: "Portfolio Fragility Lab bundled demonstration dataset",
        provenance: "pfl-web-demo/0.1.0 deterministic synthetic total-return index",
        inceptionDate: INCEPTION[holding.assetId],
      };
    });
  });
}

export function parsePortfolioText(value: string): Holding[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [assetId, raw] = line.split(/[\s,;]+/);
    return { assetId: assetId?.toUpperCase() ?? "", rawWeight: Number(raw) };
  });
}

export function parseHistoryCsv(value: string): HistoryObservation[] {
  const rows = value.trim().split(/\r?\n/).filter(Boolean);
  const header = rows.shift()?.split(",").map((cell) => cell.trim().toLowerCase()) ?? [];
  const required = ["date", "asset", "value", "currency", "return_basis"];
  const supported = new Set([...required, "source", "provenance", "inception_date"]);
  if (required.some((field) => !header.includes(field))) throw new Error("CSV requires date, asset, value, currency, return_basis columns.");
  if (new Set(header).size !== header.length) throw new Error("CSV header names must be unique.");
  if (header.some((field) => !supported.has(field))) throw new Error("CSV contains an unsupported column.");
  return rows.map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    if (cells.length !== header.length) throw new Error("Every CSV row must contain exactly one value for each header column.");
    const get = (name: string) => cells[header.indexOf(name)] ?? "";
    return {
      date: get("date"), assetId: get("asset").toUpperCase(), value: Number(get("value")), currency: get("currency").toUpperCase(),
      returnBasis: get("return_basis") as HistoryObservation["returnBasis"], source: get("source") || "User-supplied local CSV",
      provenance: get("provenance") || "User-supplied local CSV; processed in browser", inceptionDate: get("inception_date") || undefined,
    };
  });
}
