import { ReportsArchive, type ArchiveReport } from "@/components/reports/ReportsArchive";
import { marketReports, reportDisplayName, reportHref } from "@/lib/reports/market-reports";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/informes");

export default function InformesPage() {
  const reports: ArchiveReport[] = marketReports.map(report => {
    const context = report.editorialSections?.find(section => section.id === "contexto-general");
    const paragraph = context?.blocks.find(block => block.kind === "paragraph");
    const hasDistinctSummary = report.summary.replace(/[.\s]+$/u, "") !== report.title.replace(/[.\s]+$/u, "");
    const excerpt = !hasDistinctSummary && paragraph?.kind === "paragraph"
      ? [...new Intl.Segmenter("es", { granularity: "sentence" }).segment(paragraph.text)].slice(0, 2).map(part => part.segment).join("").trim()
      : report.summary;

    return {
      id: report.id,
      title: report.title,
      label: reportDisplayName(report),
      summary: report.summary,
      excerpt,
      monthKey: report.monthKey,
      monthLabel: report.monthLabel,
      editionAt: report.editionAt,
      publishedAt: report.publishedAt,
      status: report.status,
      href: reportHref(report),
      downloads: [
        { label: "PDF", href: report.pdfHref },
        { label: "HTML", href: report.htmlHref },
        { label: "Markdown", href: report.markdownHref },
        { label: "Calendario (.ics)", href: report.calendarHref },
      ].filter((format): format is { label: string; href: string } => Boolean(format.href)),
    };
  });

  return <ReportsArchive reports={reports} />;
}
