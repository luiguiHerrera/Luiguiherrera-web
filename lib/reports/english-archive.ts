import { readFile } from "node:fs/promises";
import path from "node:path";
import catalogue from "./english-archive-catalogue.json";

export type EnglishArchiveEntry = (typeof catalogue)[number];
export const englishArchiveReports: readonly EnglishArchiveEntry[] = catalogue;
export const getEnglishArchiveReport = (slug: string) => englishArchiveReports.find(report => report.slug === slug);

export async function getEnglishArchiveMarkdown(report: EnglishArchiveEntry) {
  return readFile(path.join(process.cwd(), "public", report.markdownHref), "utf8");
}

export type ArchiveBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph" | "quote"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "image"; alt: string; src: string }
  | { kind: "table"; headers: string[]; rows: string[][] };

export type ArchiveChapter = { id: string; title: string; eyebrow: string; assets: boolean; blocks: ArchiveBlock[] };
const isSpecial = (line: string) => /^(#{2,6}\s|[-*]\s|>\s?|!\[|\|)/.test(line);

export function parseEnglishArchive(markdown: string): ArchiveChapter[] {
  const start = markdown.indexOf("\n## ");
  if (start < 0) throw new Error("English report has no chapters");
  const lines = markdown.slice(start + 1).split("\n");
  const chapters: ArchiveChapter[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const heading = line.match(/^(#{2,6})\s+(.+)$/);
    if (heading?.[1] === "##") {
      const title = heading[2];
      chapters.push({ id: /^Sources/.test(title) ? "fuentes-y-aviso" : "chapter-" + String(chapters.length + 1).padStart(2, "0"), title, eyebrow: title, assets: /^(Reading by asset|Follow-up reading by asset)$/i.test(title), blocks: [] });
      continue;
    }
    const chapter = chapters.at(-1);
    if (!chapter) throw new Error("Content precedes first English chapter");
    if (heading) { chapter.blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] }); continue; }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const row = lines[i].trim();
        if (!/^[|:\-\s]+$/.test(row)) rows.push(row.split("|").slice(1, -1).map(cell => cell.trim()));
        i++;
      }
      i--;
      chapter.blocks.push({ kind: "table", headers: rows[0], rows: rows.slice(1) });
      continue;
    }
    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) { chapter.blocks.push({ kind: "image", alt: image[1], src: image[2].replace(/^\.\.\/images\//, "/images/") }); continue; }
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*]\s+/, "")); i++; }
      i--;
      chapter.blocks.push({ kind: "list", items });
      continue;
    }
    if (line.startsWith(">")) { chapter.blocks.push({ kind: "quote", text: line.replace(/^>\s?/, "") }); continue; }
    let text = line;
    while (i + 1 < lines.length && lines[i + 1].trim() && !isSpecial(lines[i + 1].trim())) text += " " + lines[++i].trim();
    chapter.blocks.push({ kind: "paragraph", text });
  }
  return chapters;
}
