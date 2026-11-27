import Image from "next/image";
import { aboutContent, aboutLinks } from "@/lib/about/content";
import type { Locale } from "@/lib/i18n/locales";
import styles from "./about.module.css";

function ProfileIcon({ kind }: { kind: "linkedin" | "github" }) {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor">
    {kind === "linkedin" ? <>
      <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2.1 5.6a1.35 1.35 0 1 0 0-2.7 1.35 1.35 0 0 0 0 2.7ZM6 18h2.2v-8H6v8Zm4 0h2.2v-4.5c0-1.2.6-1.8 1.5-1.8s1.3.6 1.3 1.8V18h2.2v-5.2c0-2.1-1.1-3.1-2.6-3.1-1.2 0-1.9.6-2.4 1.2v-.9H10v8Z" />
    </> : <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.82.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.82c.85 0 1.71.11 2.51.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.58 4.94.36.31.68.92.68 1.85v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />}
  </svg>;
}

export function AboutPage({ locale }: { locale: Locale }) {
  const t = aboutContent[locale];
  return <article className={styles.page} data-about-page={locale} aria-labelledby="about-title">
    <section className={styles.presentation} aria-labelledby="about-title">
      <div className={styles.introduction}>
        <h1 id="about-title">{t.introduction}<span>{t.name}</span></h1>
        <p className={styles.education}><strong>{t.education}</strong></p>
        <div className={styles.prose}>{t.paragraphs.map(text => <p key={text}>{text}</p>)}</div>
        <ul className={styles.profiles} aria-label={locale === "es" ? "Perfiles profesionales" : "Professional profiles"}>
          {aboutLinks.map(link => <li key={link.id}>
            <a href={link.href} target="_blank" rel="noopener noreferrer" aria-describedby={`about-${link.id}-caption`}>
              <ProfileIcon kind={link.id} />
              <span>{link.label} <span aria-hidden="true">↗</span></span>
              <span className="sr-only"> · {t.newTab}</span>
            </a>
            <p id={`about-${link.id}-caption`}>{t.linkCaptions[link.id]}</p>
          </li>)}
        </ul>
      </div>
      <div className={styles.illustration}>
        <Image src="/images/about/many-faces.webp" width={1122} height={1402} sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) 520px, 42vw" alt={t.illustrationAlt} preload />
      </div>
    </section>
    <section className={styles.thinking} aria-labelledby="about-thinking-title">
      <h2 id="about-thinking-title">{t.thinking}</h2>
      <div className={styles.principles}>
        {t.principles.map(principle => <section key={principle.title}>
          <h3>{principle.title}</h3>
          <p>{principle.text}</p>
        </section>)}
      </div>
    </section>
    <section className={styles.closing} aria-labelledby="about-why-title">
      <div>
        <h2 id="about-why-title">{t.why}</h2>
        {t.closing.map(text => <p key={text}>{text}</p>)}
      </div>
    </section>
  </article>;
}
