import { createHash } from "node:crypto";
import { NUMERIC_TOLERANCE } from "./contract.ts";
export const finite = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
export const positive = (x: unknown): x is number => finite(x) && x > 0;
export const ge = (x: number, b: number) => x > b || Math.abs(x - b) <= NUMERIC_TOLERANCE;
export const le = (x: number, b: number) => x < b || Math.abs(x - b) <= NUMERIC_TOLERANCE;
export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
export function variance(xs: number[], ddof = 1) {
  const mu = mean(xs);
  return xs.reduce((s, x) => s + (x - mu) ** 2, 0) / (xs.length - ddof);
}
export function correlation(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 2) return null;
  const ma = mean(a), mb = mean(b);
  let aa = 0, bb = 0, ab = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; aa += x * x; bb += y * y; ab += x * y; }
  return aa > 0 && bb > 0 ? Math.max(-1, Math.min(1, ab / Math.sqrt(aa) / Math.sqrt(bb))) : null;
}
export function averageCorrelation(columns: number[][]): number | null {
  const pairs: number[] = [];
  for (let i = 0; i < columns.length; i++) for (let j = i + 1; j < columns.length; j++) {
    const rho = correlation(columns[i], columns[j]);
    if (rho === null || !finite(rho)) return null;
    pairs.push(rho);
  }
  return pairs.length ? mean(pairs) : null;
}
export function canonical(value: unknown): string {
  if (value === undefined) return '"__undefined__"';
  if (typeof value === "number" && !Number.isFinite(value)) return JSON.stringify(String(value));
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b, "en")).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
}
export const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
export const bytesHash = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
export function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
