import type { ReactNode } from "react";
import { ReportParagraph, ReportText, ReportAnchor } from "./ReportSourcePolicy";
import { ReportSection } from "./ReportSection";
import { ReportQuantitativePanels } from "./ReportQuantitativePanels";
import type { ReportEditorialBlock, ReportEditorialSection } from "@/lib/reports/report-editorial-sections";

export function ReportEditorialInline({ text }: { text: string }): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\((?:https?:\/\/|\/(?!\/))[^)]+\)|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}><ReportText>{part.slice(2, -2)}</ReportText></strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={i}><ReportText>{part.slice(1, -1)}</ReportText></em>;
    const link = part.match(/^\[([^\]]+)\]\(((?:https?:\/\/|\/(?!\/))[^)]+)\)$/);
    if (link) return <ReportAnchor key={i} href={link[2]} className="underline decoration-petrol/30 underline-offset-4 hover:text-petrol">{<ReportEditorialInline text={link[1]} />}</ReportAnchor>;
    return <ReportText key={i}>{part}</ReportText>;
  });
}
const plain = (text: string) => text.replace(/\*\*/g, "").replace(/\*/g, "");

export function groupEditorialBlocks(section: ReportEditorialSection) {
  const result: Array<{ title?: string; blocks: ReportEditorialBlock[] }> = [];
  for (const block of section.blocks) {
    if (block.kind === "heading") result.push({ title: block.text, blocks: [] });
    else {
      if (!result.length) result.push({ blocks: [] });
      result[result.length - 1].blocks.push(block);
    }
  }
  return result;
}
function Blocks({ blocks, title }: { blocks: ReportEditorialBlock[]; title: string }) {
  return <div className="grid min-w-0 gap-4">{blocks.map((block, index) => block.kind === "table"
    ? <ReportQuantitativePanels key={index} asset={title} panels={[{ title: "Datos de esta edición", intro: "", headers: block.headers.map(plain), rows: block.rows.map(row => row.map(plain)), notes: [] }]} />
    : <ReportParagraph key={index} className={block.kind === "source" ? "break-words text-xs leading-6 text-muted" : "text-sm leading-7 text-muted md:text-base"}><ReportEditorialInline text={block.text} /></ReportParagraph>
  )}</div>;
}
function HierarchicalBlocks({ section }: { section: ReportEditorialSection }) {
  return <div className="grid min-w-0 gap-4">{section.blocks.map((block, index) => {
    if (block.kind !== "heading") return <Blocks key={index} blocks={[block]} title={section.title} />;
    if (block.level === 4) return <h4 key={index} className="mt-3 border-l-2 border-brass pl-3 text-xs font-semibold uppercase text-brass">{block.text}</h4>;
    const asset = section.id === "lectura-seguimiento" ? block.text.match(/^3\.[1-6]\. (SPY|GLD|FXI|EWJ|BTC|ETH)/)?.[1].toLowerCase() : undefined;
    return <h3 key={index} id={asset} className="mt-5 scroll-mt-24 border-t border-line pt-6 text-xl font-semibold leading-tight text-ink md:text-2xl">{block.text}</h3>;
  })}</div>;
}
export function ReportEditorialSections({ sections, preserveHierarchy = false }: { sections: ReportEditorialSection[]; preserveHierarchy?: boolean }) {
  return <>
    <nav aria-label="Secciones del informe" className="border-b border-line py-4">
      <ul className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-petrol">{sections.map(section => <li key={section.id}><a className="underline decoration-petrol/30 underline-offset-4" href={`#${section.id}`}>{section.eyebrow}</a></li>)}</ul>
    </nav>
    {sections.map(section => <section key={section.id} id={section.id} data-native-report-section={section.id} className="grid min-w-0 scroll-mt-24 gap-6 border-b border-line py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
      <div className="min-w-0">
        <ReportParagraph className="text-xs font-semibold uppercase text-petrol">{section.eyebrow}</ReportParagraph>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">{section.title}</h2>
      </div>
      <div className="grid min-w-0 gap-5">{preserveHierarchy ? <HierarchicalBlocks section={section} /> : groupEditorialBlocks(section).map((group, index) => {
        const title = group.title ?? section.title;
        const body = <Blocks blocks={group.blocks} title={title} />;
        if (!group.title) return <div key={index}>{body}</div>;
        if (section.id === "lectura-seguimiento") return <details key={index} className="group min-w-0 border border-line bg-panel open:border-petrol/45">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden">
            <h3 className="text-lg font-semibold text-ink">{group.title}</h3>
            <span className="text-xs font-semibold uppercase text-brass"><span className="details-open-label">Abrir</span><span className="details-close-label">Cerrar</span></span>
          </summary>
          <div className="border-t border-line p-5">{body}</div>
        </details>;
        return <ReportSection key={index} eyebrow={section.eyebrow} title={group.title} headingLevel={3}>{body}</ReportSection>;
      })}</div>
    </section>)}
  </>;
}
