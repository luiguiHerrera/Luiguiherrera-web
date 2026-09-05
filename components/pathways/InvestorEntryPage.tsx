import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { JsonLd } from "@/components/seo/JsonLd";
import { InvestorGuidedRoute, InvestorHeroCta } from "./InvestorGuidedRoute";
import { investorEntryContent } from "@/lib/investor/entry-content";
import styles from "./InvestorEntry.module.css";

const display = localFont({
  src: "../../public/fonts/playfair-display-500.ttf",
  weight: "500",
  style: "normal",
  display: "swap",
  variable: "--font-investor-display",
});

export function InvestorEntryPage({ locale }: { locale: "es" | "en" }) {
  const content = investorEntryContent[locale];
  return (
    <div lang={locale} className={`${display.variable} ${styles.page}`}>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        inLanguage: locale,
        mainEntity: content.faq.items.map(({ question, answer }) => ({
          "@type": "Question", name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      }} />
      <div className={styles.frame}>
        <header className={styles.hero}>
          <div className={styles.heroVisual} aria-hidden="true">
            <Image src="/images/investor-observatory.webp" alt="" fill preload sizes="(max-width: 767px) 100vw, 75vw" />
          </div>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{content.hero.eyebrow}</p>
            <h1>{content.hero.title}</h1>
            <p className={styles.heroSupport}>{content.hero.support}</p>
            <InvestorHeroCta>{content.hero.cta}</InvestorHeroCta>
            <p className={styles.microcopy}>{content.hero.microcopy}</p>
          </div>
        </header>
        <section id="investor-guided-route" aria-labelledby="investor-guide-title" className={styles.guided}>
          <h2 id="investor-guide-title">{content.guided.title}</h2>
          <p className={styles.sectionSupport}>{content.guided.support}</p>
          <InvestorGuidedRoute content={content.guided} />
        </section>
      </div>
      <section aria-labelledby="investor-bridges-title" className={styles.bridges}>
        <h2 id="investor-bridges-title">{content.bridges.title}</h2>
        <div className={styles.bridgeList}>
          {content.bridges.items.map((item) => (
            <article key={item.href} className={styles.bridge}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <Link href={item.href} aria-label={`${item.cta}: ${item.title}`}>{item.cta} <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
      </section>
      <section aria-labelledby="investor-faq-title" className={styles.faq}>
        <h2 id="investor-faq-title">{content.faq.title}</h2>
        <div className={styles.faqList}>
          {content.faq.items.map((item) => (
            <details key={item.question}>
              <summary>{item.question}<span aria-hidden="true" className={styles.faqIcon} /></summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
