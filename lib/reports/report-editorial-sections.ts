export type ReportEditorialBlock =
  | { kind: "paragraph" | "source"; text: string }
  | { kind: "heading"; text: string; level?: 3 | 4 }
  | { kind: "table"; headers: string[]; rows: string[][] };
export type ReportEditorialSection = {
  id: string;
  title: string;
  eyebrow: string;
  blocks: ReportEditorialBlock[];
};
export type ApprovedReportPdf = {
  path: string;
  sha256: string;
  size: number;
  pages: number;
};
