import Link from "next/link";
import { EnglishReportInline } from "./EnglishReportInline";
import { ReportEditionRail } from "./ReportEditionRail";
import { ReportSourcePolicy } from "./ReportSourcePolicy";
import { formatEditorialDate } from "@/lib/editorial/dates";
import type { ArchiveBlock, ArchiveChapter, EnglishArchiveEntry } from "@/lib/reports/english-archive";
import premium from "./report-premium.module.css";
import styles from "./english-archive-edition.module.css";

function Blocks({ blocks }: { blocks: ArchiveBlock[] }) {
  return <div className={styles.blocks}>{blocks.map((block, i) => {
    if (block.kind === "heading") return block.level === 3
      ? <h3 key={i}><EnglishReportInline text={block.text} /></h3>
      : <h4 key={i}><EnglishReportInline text={block.text} /></h4>;
    if (block.kind === "table") return <div key={i} className={styles.table} role="region" aria-label={block.headers.join(" · ")} tabIndex={0}>
      <table><thead><tr>{block.headers.map((text, j) => <th key={j} scope="col"><EnglishReportInline text={text} /></th>)}</tr></thead>
        <tbody>{block.rows.map((row, j) => <tr key={j}>{row.map((text, k) => k === 0 ? <th key={k} scope="row"><EnglishReportInline text={text} /></th> : <td key={k}><EnglishReportInline text={text} /></td>)}</tr>)}</tbody></table>
    </div>;
    if (block.kind === "list") return <ul key={i}>{block.items.map((text, j) => <li key={j}><EnglishReportInline text={text} /></li>)}</ul>;
    if (block.kind === "image") return <figure key={i}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Original report figures retain their natural aspect ratio. */}
      <img src={block.src} alt={block.alt} loading="lazy" />
    </figure>;
    if (block.kind === "quote") return <blockquote key={i}><EnglishReportInline text={block.text} /></blockquote>;
    return <p key={i}><EnglishReportInline text={block.text} /></p>;
  })}</div>;
}

function assetId(title: string) {
  if (/Ethereum|\bETH\b/i.test(title)) return "ethereum";
  if (/Bitcoin|\bBTC\b/i.test(title)) return "bitcoin";
  if (/USD.?COP|DXY/i.test(title)) return "usd-cop";
  if (/\bAI\b|Technology|Stock.?picking/i.test(title)) return "ia-tecnologia";
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function AssetChapter({ chapter }: { chapter: ArchiveChapter }) {
  const groups: Array<{ title?: string; blocks: ArchiveBlock[] }> = [];
  for (const block of chapter.blocks) {
    if (block.kind === "heading" && block.level === 3) groups.push({ title: block.text, blocks: [] });
    else { if (!groups.length) groups.push({ blocks: [] }); groups.at(-1)!.blocks.push(block); }
  }
  return <div className={styles.assets}>{groups.map((group, i) => group.title
    ? <details key={i} id={assetId(group.title)} open={i === 0} className={styles.asset}><summary><h3><EnglishReportInline text={group.title} /></h3><span><span className="details-open-label">Open +</span><span className="details-close-label">Close −</span></span></summary><div className={styles.assetBody}><Blocks blocks={group.blocks} /></div></details>
    : <Blocks key={i} blocks={group.blocks} />)}</div>;
}

export function EnglishArchiveReportEdition({ report, chapters, previous, next }: { report: EnglishArchiveEntry; chapters: ArchiveChapter[]; previous?: { href: string; title: string }; next?: { href: string; title: string } }) {
  const dates = [
    ["Original publication", report.publishedAt],
    ...(report.modifiedAt !== report.publishedAt ? [["Editorial update", report.modifiedAt]] : []),
    ...(report.editorialCutoffAt ? [["Editorial cutoff", report.editorialCutoffAt]] : []),
    ...(report.marketCutoffAt ? [["Market cutoff", report.marketCutoffAt]] : []),
  ];
  return <main className={premium.page}><ReportSourcePolicy newTab>
    <div className={premium.layout}>
      <ReportEditionRail sections={chapters} monthLabel={report.monthLabel} locale="en" editionLabel={report.editionLabel} />
      <article className={premium.edition} data-english-archive-edition={report.slug}>
        <Link href="/en/reports" className="inline-flex min-h-10 items-center border-b border-petrol/30 text-sm font-semibold text-petrol">← Back to the report archive</Link>
        <header className={premium.cover}>
          <p className={styles.eyebrow}>{report.label} <span>Archived report</span></p>
          <h1>{report.title}</h1>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-muted"><p>By <Link className="font-semibold text-petrol underline underline-offset-4" href="/en">Luigui Herrera</Link></p>{dates.map(([label, date]) => <p key={label}>{label}: <time dateTime={date}>{formatEditorialDate(date, "en")}</time></p>)}</div>
          <p className="mt-4 text-base leading-7 text-muted">{report.subtitle}</p>
          {report.prospectivePeriod ? <p className="mt-3 text-sm text-muted">Prospective period: {report.prospectivePeriod}</p> : null}
          <div className={styles.exports}>{report.pdfHref ? <a href={report.pdfHref} download>Original PDF (Spanish)</a> : null}<a href={report.markdownHref} download>Markdown (English)</a><Link href={report.spanishHref}>Spanish edition ↗</Link></div>
          <p className="mt-3 text-xs leading-5 text-muted">English translation of the original edition. Figures, sources and historical cutoffs are preserved.</p>
        </header>
        {chapters.map(chapter => <section key={chapter.id} id={chapter.id} className={premium.chapter} data-english-archive-chapter>
          <div><p className={styles.eyebrow}>{chapter.eyebrow}</p><h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">{chapter.title}</h2></div>
          {chapter.assets ? <AssetChapter chapter={chapter} /> : <Blocks blocks={chapter.blocks} />}
        </section>)}
        <nav className={styles.adjacent} aria-label="Other English reports">
          {previous ? <Link href={previous.href}><span>Previous report</span>{previous.title}</Link> : <span />}
          {next ? <Link href={next.href}><span>Next report</span>{next.title}</Link> : null}
        </nav>
      </article>
    </div>
  </ReportSourcePolicy></main>;
}
