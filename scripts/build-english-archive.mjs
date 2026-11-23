import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
export const catalogue = JSON.parse(readFileSync(resolve(root, "lib/reports/english-archive-catalogue.json"), "utf8"));
const dictionary = JSON.parse(readFileSync(resolve(root, "lib/reports/translations/archive-dictionary.en.json"), "utf8"));
const numeric = /^[-+−–≈±\d.,%/() ×x:;≤≥<> ]+$/;
const linkPattern = /\[((?:\[[^\]]+\]|[^\]])+)\]\(([^)]+)\)/g;

export function englishPath(href) {
  const withoutOrigin = href.replace(/^https:\/\/www\.luiguiherrera\.com(?=\/)/, "");
  const report = catalogue.find(item => withoutOrigin === item.spanishHref || withoutOrigin.startsWith(item.spanishHref + "#") || withoutOrigin.startsWith(item.spanishHref + "?"));
  if (report) return report.href + withoutOrigin.slice(report.spanishHref.length);
  if (withoutOrigin === "/informes/segundo-informe-noviembre-2026") return "/en/weekly-report";
  if (withoutOrigin === "/dashboard") return "/en/dashboard";
  if (withoutOrigin.startsWith("/niveles-estadisticos")) return withoutOrigin.replace("/niveles-estadisticos", "/en/quantitative-analysis");
  return href;
}

function englishNumber(value) {
  return value.replace(/\d[\d.]*,\d+/g, number => number.replaceAll(".", "").replace(",", "."));
}
export function translateText(text) {
  if (!text) return text;
  const numericText = text.replaceAll("**", "").replace(/\s*(?:USD|M USD|B USD|pp|t)$/, "");
  const translated = numeric.test(numericText) ? englishNumber(text)
    : dictionary[text] ?? (/^[-:| ]+$/.test(text) || /^https?:\/\//.test(text) ? text : undefined);
  if (translated === undefined) throw new Error("Missing English translation: " + text);
  return translated.replace(linkPattern, (_, label, href) => "[" + (dictionary[label] ?? label) + "](" + englishPath(href) + ")");
}

export function reportBody(source) {
  const first = source.indexOf("\n## ");
  if (first < 0) throw new Error("Report has no chapters");
  return source.slice(first + 1).trimEnd() + "\n";
}

export function translateBody(source) {
  return reportBody(source).split("\n").map(line => {
    if (!line.trim()) return line;
    if (line.startsWith("|")) return "|" + line.split("|").slice(1, -1).map(cell => " " + translateText(cell.trim()) + " ").join("|") + "|";
    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) return "![" + translateText(image[1]) + "](" + image[2] + ")";
    const prefix = line.match(/^(#{1,6}\s+|>\s?|[-*]\s+)?(.*)$/);
    const text = prefix[2].trim();
    const boldLabel = text.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
    return (prefix[1] ?? "") + (boldLabel
      ? "**" + translateText(boldLabel[1]) + ":** " + translateText(boldLabel[2])
      : translateText(text));
  }).join("\n");
}

export function sourceFor(report) {
  const source = readFileSync(resolve(root, "public" + report.sourceMarkdown), "utf8");
  const hash = createHash("sha256").update(source).digest("hex");
  if (hash !== report.sourceSha256) throw new Error("Spanish source changed: " + report.id);
  return source;
}

export function buildEnglishReport(report) {
  return "# " + report.title + "\n\n" + report.subtitle + "\n\n"
    + "- Edition: " + report.label + "\n- Author: Luigui Herrera\n- Original publication: " + report.publishedAt
    + "\n- Last editorial update: " + report.modifiedAt
    + (report.editorialCutoffAt ? "\n- Editorial cutoff: " + report.editorialCutoffAt : "")
    + (report.marketCutoffAt ? "\n- Market data cutoff: " + report.marketCutoffAt : "")
    + "\n- English edition: https://www.luiguiherrera.com" + report.href
    + "\n- Spanish original: https://www.luiguiherrera.com" + report.spanishHref
    + (report.prospectivePeriod ? "\n- Prospective period: " + report.prospectivePeriod : "")
    + "\n\n" + translateBody(sourceFor(report));
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  for (const report of catalogue) {
    const content = buildEnglishReport(report);
    const target = resolve(root, "public" + report.markdownHref);
    if (check) {
      if (readFileSync(target, "utf8") !== content) throw new Error("English output is stale: " + report.slug);
    } else writeFileSync(target, content);
  }
  process.stdout.write((check ? "Checked" : "Generated") + " " + catalogue.length + " complete English archive editions.\n");
}
