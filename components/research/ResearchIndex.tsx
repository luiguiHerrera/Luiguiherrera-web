import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { formatEditorialDate } from "@/lib/editorial/dates";
import type { ResearchIndexContent } from "@/lib/research/research-index";
import { researchStudyFigure } from "./ResearchStudyFigure";
import styles from "./ResearchIndex.module.css";

const display = localFont({
  src: "../../public/fonts/playfair-display-500.ttf",
  weight: "500",
  style: "normal",
  display: "swap",
  variable: "--font-research-display",
});

export function ResearchIndex({ content, locale }: { content: ResearchIndexContent; locale: "es" | "en" }) {
  return (
    <div lang={locale} className={[display.variable, styles.page].join(" ")} data-research-index={locale}>
      <header className={styles.hero}>
        <div className={styles.heroVisual} aria-hidden="true">
          <Image src="/images/research/quantitative-hero.webp" alt="" fill preload sizes="(max-width: 767px) 100vw, (min-width: 1440px) 1150px, 85vw" />
        </div>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p className={styles.subtitle}>{content.subtitle}</p>
          <p className={styles.introduction}>{content.description}</p>
        </div>
      </header>

      <section aria-labelledby="research-studies-title" className={styles.catalogue}>
        <h2 id="research-studies-title">{content.entriesLabel}</h2>
        <ul className={styles.publications}>
          {content.entries.map((entry) => {
            const figure = researchStudyFigure(entry.href, locale);
            return (
              <li key={entry.href}>
                <article>
                  <Link href={entry.href} className={[styles.publication, figure ? styles.withFigure : ""].join(" ")} aria-label={content.readLabel + ": " + entry.title}>
                    <div className={styles.metadata}>
                      <p className={styles.kicker}>{entry.kicker}</p>
                      <time dateTime={entry.publishedAt}>{formatEditorialDate(entry.publishedAt, locale)}</time>
                    </div>
                    <div className={styles.publicationBody}>
                      <h3>{entry.title}</h3>
                      <p className={styles.summary}>{entry.summary}</p>
                      <div className={styles.methods}>
                        <p>{content.methodsLabel}</p>
                        <ul>{entry.methods.map((method) => <li key={method}>{method}</li>)}</ul>
                      </div>
                      <span className={styles.read}>{content.readLabel}</span>
                    </div>
                    {figure}
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
        <p className={styles.note}>{content.note}</p>
      </section>
    </div>
  );
}
