export type ReportEditorialBlock =
  | { kind: "paragraph" | "heading" | "source"; text: string }
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
