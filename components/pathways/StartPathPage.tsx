import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { PersonalFinanceGuidedRoute } from "./PersonalFinanceGuidedRoute";
import { PersonalFinanceHeroCta } from "./PersonalFinanceHeroCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { es } from "@/lib/i18n/dictionaries/es";
import { en } from "@/lib/i18n/dictionaries/en";
import type { PersonalFinanceEntryContent } from "@/lib/personal-finance/entry-content";
import styles from "./PersonalFinanceEntry.module.css";

export type StartPathContent = PersonalFinanceEntryContent;

const display = localFont({
  src: "../../public/fonts/playfair-display-500.ttf",
  weight: "500",
  style: "normal",
  display: "swap",
  variable: "--font-personal-finance-display",
});

export function StartPathPage({ content }: { content: StartPathContent }) {
  const stages = (content.locale === "es" ? es : en).layout.startItems;
  return (
    <div lang={content.locale} className={[display.variable, styles.page].join(" ")} data-personal-finance-entry={content.locale}>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        inLanguage: content.locale,
        mainEntity: content.faq.items.map(({ question, answer }) => ({
          "@type": "Question", name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      }} />
      <header className={styles.hero}>
        <div className={styles.heroVisual} aria-hidden="true">
          <Image src="/images/personal-finance/patrimony-hero.webp" alt="" fill preload sizes="(max-width: 767px) 100vw, (min-width: 1440px) 1150px, 85vw" />
        </div>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{content.hero.eyebrow}</p>
          <h1>{content.hero.title}</h1>
          <p className={styles.heroSupport}>{content.hero.subtitle}</p>
          <div className={styles.heroFoot}>
            <PersonalFinanceHeroCta label={content.hero.primaryCta} />
            <p className={styles.microcopy}>{content.hero.privacy}</p>
          </div>
        </div>
      </header>

      <nav aria-label={content.hero.eyebrow} className={styles.journey}>
        <ol>
          {stages.map((stage, index) => (
            <li key={stage.href}>
              <Link href={stage.href}>
                <span className={styles.stageNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.stageTitle}>{stage.label}</span>
                <span className={styles.stageDescription}>{stage.description}</span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <section id="personal-finance-guided-route" tabIndex={-1} aria-labelledby="personal-finance-guided-route-title" className={styles.guided}>
        <p className={styles.eyebrow}>{content.guidedRoute.eyebrow}</p>
        <h2 id="personal-finance-guided-route-title">{content.guidedRoute.title}</h2>
        <p className={styles.sectionSupport}>{content.guidedRoute.introduction}</p>
        <PersonalFinanceGuidedRoute content={content.guidedRoute} />
      </section>

      <section aria-labelledby="personal-finance-bridge-title" className={styles.bridges}>
        <div className={styles.bridgeHeading}>
          <p className={styles.eyebrow}>{content.bridge.eyebrow}</p>
          <h2 id="personal-finance-bridge-title">{content.bridge.title}</h2>
          <p className={styles.sectionSupport}>{content.bridge.description}</p>
        </div>
        <div className={styles.resources}>
          {content.bridge.resources.map((resource, index) => (
            <article key={resource.href} className={styles.resource}>
              <span className={styles.resourceNumber} aria-hidden="true">{String(index + 5).padStart(2, "0")}</span>
              <div>
                <h3>{resource.title}</h3>
                <p>{resource.description}</p>
                <Link href={resource.href}>{resource.cta}</Link>
              </div>
            </article>
          ))}
        </div>
        <div className={styles.investorBridge}>
          <p>{content.bridge.transition.label}</p>
          <Link href={content.bridge.transition.href}>{content.bridge.transition.cta}</Link>
        </div>
      </section>

      <section aria-labelledby="personal-finance-faq-title" className={styles.faq}>
        <h2 id="personal-finance-faq-title">{content.faq.title}</h2>
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
