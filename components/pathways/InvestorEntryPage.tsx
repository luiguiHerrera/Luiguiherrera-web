import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { JsonLd } from "@/components/seo/JsonLd";
import { InvestorGuidedRoute } from "./InvestorGuidedRoute";
import { investorEntryContent } from "@/lib/investor/entry-content";
import styles from "./InvestorEntry.module.css";

const display = localFont({
  src: "../../public/fonts/playfair-display-500.ttf",
  weight: "500",
  style: "normal",
  display: "swap",
  variable: "--font-investor-display",
});

function BridgeVisual({ kind }: { kind: "resources" | "risk" }) {
  return <svg className={styles.bridgeVisual} viewBox="0 0 180 120" fill="none" aria-hidden="true" focusable="false">
    {kind === "resources" ? <>
      <path d="M16 19h112v76H16zM39 34h112v76H39z" stroke="currentColor" opacity=".18" />
      <path d="M57 20v89M79 20v89M101 20v89M123 35v74M17 48h134M17 70h134M17 92h134" stroke="currentColor" opacity=".12" />
      <path d="M29 35h17m15 0h27m14 0h12M51 58h18m15 0h49M29 81h17m38 0h27M51 103h39m15 0h28" stroke="currentColor" strokeWidth="2" opacity=".65" />
      <path d="M153 17v9m-4-4h8M165 82v9m-4-4h8" stroke="currentColor" opacity=".5" />
    </> : <>
      <path d="m90 14 55 29-55 29-55-29 55-29Z" fill="currentColor" opacity=".045" />
      <path d="m90 14 55 29v43l-55 29-55-29V43l55-29Z M35 43l55 29 55-29 M90 72v43" stroke="currentColor" opacity=".5" />
      <path d="M90 14v43 M35 86l55-29 55 29" stroke="currentColor" strokeDasharray="3 5" opacity=".18" />
      {[[90,14],[145,43],[145,86],[90,115],[35,86],[35,43],[90,72]].map(([cx,cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.5" fill="currentColor" opacity=".7" />)}
    </>}
  </svg>;
}

export function InvestorEntryPage({ locale }: { locale: "es" | "en" }) {
  const content = investorEntryContent[locale];
  return (
    <div lang={locale} className={`${display.variable} ${styles.page}`} data-investor-entry={locale}>
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
            <Image src="/images/investor/monaco-hero.webp" alt="" fill preload sizes="(max-width: 767px) 100vw, (min-width: 1440px) 1100px, 80vw" />
          </div>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{content.hero.eyebrow}</p>
            <h1>{content.hero.title}</h1>
            <p className={styles.heroSupport}>{content.hero.support}</p>
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
          {content.bridges.items.map((item, index) => (
            <article key={item.href} className={index === 2 ? styles.personalBridge : styles.bridge}>
              <div className={styles.bridgeCopy}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <Link href={item.href} aria-label={`${item.cta}: ${item.title}`}>{item.cta} <span aria-hidden="true">→</span></Link>
              </div>
              {index < 2 ? <BridgeVisual kind={index === 0 ? "resources" : "risk"} /> : null}
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
