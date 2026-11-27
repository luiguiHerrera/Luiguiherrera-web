import Image from "next/image";
import localFont from "next/font/local";
import { tradingViewScripts } from "@/lib/resources/tradingview-scripts";
import { resourcesContent } from "@/lib/resources/resources-content";
import { ResourcesLibrary } from "./ResourcesLibrary";
import styles from "./ResourcesPage.module.css";

const display = localFont({
  src: "../../public/fonts/playfair-display-500.ttf",
  weight: "500",
  style: "normal",
  display: "swap",
  variable: "--font-resources-display",
});

const screenshots: Record<string, string> = {
  "monthly-statistical-levels": "/images/resources/monthly-statistical-levels.webp",
  "jpm-collar-levels-spx": "/images/resources/jpm-collar-levels-spx.webp",
};

export function ResourcesPage({ locale }: { locale: "es" | "en" }) {
  const content = resourcesContent[locale];
  return (
    <div lang={locale} className={[display.variable, styles.page].join(" ")} data-resources-page={locale}>
      <header className={styles.hero}>
        <div className={styles.heroVisual} aria-hidden="true">
          <Image src="/images/resources/computational-engineering-hero.webp" alt="" fill preload sizes="(max-width: 767px) 100vw, (min-width: 1440px) 1200px, 90vw" />
        </div>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p className={styles.subtitle}>{content.description}</p>
        </div>
      </header>

      <section id={content.sectionId} aria-labelledby="resources-selector-title" className={styles.catalogue}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>{content.sectionEyebrow}</p>
          <h2 id="resources-selector-title">{content.sectionTitle}</h2>
        </div>
        <ResourcesLibrary categories={content.categories} label={content.sectionTitle}>
          {content.categories.map((category) => category.id === "tradingview" ? (
            <div key={category.id}>
              <div className={styles.platformHeading}>
                <h2>{category.name}</h2>
                <p>{category.description}</p>
              </div>
              <div className={styles.tools}>
                {tradingViewScripts.map((script) => (
                  <article key={script.id} className={[styles.tool, screenshots[script.id] ? styles.withVisual : ""].join(" ")} data-resource={script.id}>
                    <div className={styles.toolCopy}>
                      <div className={styles.toolMeta}>
                        <p>{locale === "en" ? script.categoryEn : script.category}</p>
                        <span>{locale === "en" ? content.published : script.status}</span>
                      </div>
                      <h3>{script.title}</h3>
                      <p className={styles.description}>{locale === "en" ? script.descriptionEn : script.description}</p>
                      <p className={styles.useCase}>{locale === "en" ? script.useCaseEn : script.useCase}</p>
                      <a href={script.tradingViewUrl} target="_blank" rel="noopener noreferrer" className={styles.toolLink}>{content.open}</a>
                    </div>
                    {screenshots[script.id] ? (
                      <figure className={styles.toolVisual}>
                        <Image src={screenshots[script.id]} alt={script.title + " · TradingView"} width={932} height={550} sizes="(max-width: 850px) 100vw, (min-width: 1440px) 550px, 44vw" />
                        <figcaption><span>{script.title}</span><span>TradingView</span></figcaption>
                      </figure>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div key={category.id} className={styles.coming}>
              <p className={styles.comingStatus}>{category.status}</p>
              <h3>{category.name}</h3>
              <p className={styles.comingDescription}>{category.description}</p>
            </div>
          ))}
        </ResourcesLibrary>
      </section>

      <details className={styles.reading}>
        <summary><h2>{content.readingTitle}</h2><span className={styles.plus} aria-hidden="true" /></summary>
        <dl>{content.reading.map((item) => (
          <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
        ))}</dl>
      </details>
    </div>
  );
}
