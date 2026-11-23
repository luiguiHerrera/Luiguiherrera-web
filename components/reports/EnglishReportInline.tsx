import type { ReactNode } from "react";
import { ReportAnchor, ReportText } from "./ReportSourcePolicy";

export function EnglishReportInline({ text }: { text: string }): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\((?:https?:\/\/|\/(?!\/))[^)]+\)|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}><ReportText>{part.slice(2, -2)}</ReportText></strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={i}><ReportText>{part.slice(1, -1)}</ReportText></em>;
    const link = part.match(/^\[([^\]]+)\]\(((?:https?:\/\/|\/(?!\/))[^)]+)\)$/);
    if (link) return <ReportAnchor key={i} href={link[2]} className="underline decoration-petrol/30 underline-offset-4 hover:text-petrol"><EnglishReportInline text={link[1]} /></ReportAnchor>;
    return <ReportText key={i}>{part}</ReportText>;
  });
}
