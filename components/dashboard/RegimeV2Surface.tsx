import type { RegimeV2Claim, RegimeV2Source, RegimeV2View } from "@/lib/dashboard/regime-v2-presentation";
import { RegimeV2Disclosure } from "./RegimeV2Disclosure";
import styles from "./regime-v2.module.css";

const Arrow = () => <span aria-hidden="true">↗</span>;
// A bounded pair avoids allocating native ICU formatters for every source field.
const instantFormatters = {
  es: new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }),
  en: new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }),
};
function instantLabel(value: string | null, view: RegimeV2View) {
  if (!value || !Number.isFinite(Date.parse(value))) return view.labels.unknown;
  return instantFormatters[view.locale].format(new Date(value)) + " UTC";
}
function Claims({ title, claims, kind }: { title: string; claims: RegimeV2Claim[]; kind: string }) {
  if (!claims.length) return null;
  return <section className={styles.claimGroup} data-claim-group={kind}>
    <h2>{title}</h2>
    <ul>{claims.map(claim => <li key={claim.id}><a href={claim.evidenceHref} data-claim-id={claim.id}><span>{claim.text}</span><Arrow /></a></li>)}</ul>
  </section>;
}
function Source({ source, view }: { source: RegimeV2Source; view: RegimeV2View }) {
  return <details className={styles.source} id={`v2-source-${source.key}`}>
    <summary><span>{source.label}</span><span>{source.statusLabel}</span></summary>
    <dl className={styles.sourceFacts}>
      <div><dt>{view.labels.session}</dt><dd>{source.observationDate ?? view.labels.unknown}</dd></div>
      <div><dt>{view.labels.availableAt}</dt><dd>{instantLabel(source.availableAt, view)}</dd></div>
      <div><dt>{view.labels.capturedAt}</dt><dd>{instantLabel(source.capturedAt, view)}</dd></div>
      <div><dt>{view.labels.publishedAt}</dt><dd>{instantLabel(source.sourcePublishedAt, view)}</dd></div>
      <div><dt>{view.locale === "es" ? "Identidad y versión" : "Identity and version"}</dt><dd>{source.sourceId ?? view.labels.unknown}<br />{source.sourceVersion ?? view.labels.unknown}</dd></div>
      <div><dt>{view.locale === "es" ? "Reconstrucción" : "Replay class"}</dt><dd>{source.replayClass}</dd></div>
      <div className={styles.wide}><dt>{view.locale === "es" ? "Huella del dato observado" : "Observed data fingerprint"}</dt><dd><code>{source.vintageHash ?? view.labels.unknown}</code></dd></div>
    </dl>
  </details>;
}
function Measurement({ item, view }: { item: RegimeV2View["measurements"][number]; view: RegimeV2View }) {
  return <div id={item.id} className={styles.measurement} tabIndex={-1}>
    <div className={styles.measurementLine}><h4>{item.label}</h4><strong>{item.value}</strong></div>
    {item.reasons.length ? <ul className={styles.reasonList}>{item.reasons.map(reason => <li key={reason.code}>{reason.text}</li>)}</ul> : null}
    <p className={styles.measurementMeta}>{view.labels.session}: {item.observationDate ?? view.labels.unknown} · {item.statusLabel}</p>
    <div className={styles.sourceLinks}>{item.sources.map(source => <a href={`#v2-source-${source.key}`} key={source.key}>{source.label} <Arrow /></a>)}</div>
  </div>;
}

/** Server-rendered presentation of the accepted output. Never evaluates or smooths a regime. */
export function RegimeV2Surface({ view }: { view: RegimeV2View }) {
  const t = (es: string, en: string) => view.locale === "es" ? es : en;
  return <RegimeV2Disclosure className={styles.surface}>
    <article className={`${styles.hero} ${view.technical ? styles.incomplete : ""} ${view.state === "STRESS" ? styles.stress : ""}`} aria-labelledby="v2-regime-title" data-v2-primary data-state={view.state}>
      <header className={styles.heroHeader}>
        <div>
          <p className={styles.eyebrow}>{view.technical ? view.labels.technical : t("Lectura de mercado", "Market reading")}</p>
          <h1 id="v2-regime-title">{view.title}</h1>
          <p className={styles.interpretation}>{view.interpretation}</p>
        </div>
        {!view.technical ? <a className={styles.concordance} href="#v2-dimensions" aria-label={`${view.concordance.label}: ${view.concordance.value}. ${t("Ver explicación", "View explanation")}`}>
          <span>{view.concordance.label}</span><strong>{view.concordance.value} <Arrow /></strong>
        </a> : null}
      </header>
      {view.technical ? <div className={styles.pendingBlock}>
        <h2>{view.labels.pending}</h2>
        <ul>{(view.groupedPending.length ? view.groupedPending : view.missingReasons).slice(0, 3).map(item => <li key={item.code}>{item.text}</li>)}</ul>
        <p>{view.labels.latestEvidence}: {view.observationDate ?? t("sesión todavía no acreditada", "session not yet established")}. <a href="#v2-data-status">{t("Revisar las fuentes", "Review sources")} <Arrow /></a></p>
      </div> : <div className={styles.reasonGrid}>
        <Claims title={view.labels.supports} claims={view.supports} kind="supports" />
        <Claims title={view.labels.brakes} claims={view.brakes} kind="brakes" />
        <Claims title={view.labels.watch} claims={view.watch} kind="watch" />
      </div>}
      {view.dataQuality.prominent && !view.technical ? <p className={styles.partial} role="note"><strong>{view.dataQuality.label}: {view.dataQuality.value.toLowerCase()}.</strong> {view.dataQuality.description} <a href="#v2-data-status">{t("Ver faltantes", "View gaps")} <Arrow /></a></p> : null}
      <footer className={styles.heroFooter}>
        <nav aria-label={t("Profundizar en la lectura", "Explore the reading")}>
          <a className={styles.primaryLink} href={view.technical ? "#v2-data-status" : "#v2-evidence"}>{view.technical ? t("Ver estado de datos", "View data status") : view.labels.evidence} <span aria-hidden="true">↓</span></a>
          <a className={styles.secondaryLink} href="#v2-methodology">{view.labels.methodology} <Arrow /></a>
        </nav>
        <p>{view.labels.asOf}<br /><time dateTime={view.asOf}>{instantLabel(view.asOf, view)}</time></p>
      </footer>
    </article>

    <details className={styles.disclosure} id="v2-evidence">
      <summary><span className={styles.sectionNumber} aria-hidden="true">01</span><h2>{view.labels.evidenceTitle}</h2><span className={styles.openIcon} aria-hidden="true">+</span></summary>
      <div className={styles.disclosureBody}>
        <p className={styles.detailIntro}>{t("Cada afirmación conserva su medida, su sesión y la fuente que la sostiene.", "Each claim retains its measurement, session and supporting source.")}</p>
        <div id="v2-dimensions" className={styles.dimensions} tabIndex={-1}>
          {[view.concordance, view.uncertainty, view.dataQuality].map(dimension => <section key={dimension.label}>
            <h3>{dimension.label} <strong>{dimension.value}</strong></h3><p>{dimension.description}</p>
          </section>)}
        </div>
        {view.uncertainty.plausibleRegimes.length ? <p className={styles.plausible}>{t("Estados plausibles en la expansión de estados intermedios", "Plausible states when intermediate states are expanded")}: {view.uncertainty.plausibleRegimes.join(" · ")}.</p> : null}
        <div className={styles.pillars}>{view.pillars.map(pillar => <details id={`v2-pillar-${pillar.id}`} className={styles.pillar} key={pillar.id}>
          <summary><h3>{pillar.label}</h3><span>{pillar.stateLabel}</span><span className={styles.openIcon} aria-hidden="true">+</span></summary>
          <div className={styles.pillarBody}><p>{pillar.summary}</p>{view.measurements.filter(item => pillar.featureIds.includes(item.featureId)).map(item => <Measurement item={item} view={view} key={item.id} />)}</div>
        </details>)}</div>
        <section className={styles.satellites} aria-labelledby="v2-satellite-title">
          <h3 id="v2-satellite-title">{view.satellites.label}</h3><p>{view.satellites.description}</p>
          <details className={styles.satelliteDisclosure}><summary>BTC / GLD <span className={styles.openIcon} aria-hidden="true">+</span></summary><div>{view.measurements.filter(item => view.satellites.featureIds.includes(item.featureId)).map(item => <Measurement item={item} view={view} key={item.id} />)}</div></details>
        </section>
        <section id="v2-data-status" className={styles.dataStatus} tabIndex={-1}>
          <h3>{view.labels.dataStatus} <span>{view.dataQuality.value}</span></h3>
          <p>{view.dataQuality.description}</p>
          {view.missingReasons.length ? <ul className={styles.reasonList}>{view.missingReasons.map(reason => <li key={reason.code}>{reason.text}</li>)}</ul> : null}
          <div className={styles.sources}>{view.sources.map(source => <Source key={source.key} source={source} view={view} />)}</div>
        </section>
      </div>
    </details>

    <details className={styles.disclosure} id="v2-methodology">
      <summary><span className={styles.sectionNumber} aria-hidden="true">02</span><h2>{view.labels.methodology}</h2><span className={styles.openIcon} aria-hidden="true">+</span></summary>
      <div className={`${styles.disclosureBody} ${styles.methodology}`}>
        <div><p className={styles.eyebrow}>{view.methodology.title}</p><h3>{view.methodology.architecture}</h3><p>{t("Conjunto de parámetros", "Parameter set")} <strong>{view.methodology.parameterSet}</strong></p></div>
        {view.methodology.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        <details className={styles.rules}><summary>{t("Fuentes, ventanas y reglas exactas", "Sources, windows and exact rules")} <span aria-hidden="true">+</span></summary>
          <ul>{view.methodology.rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
          <dl className={styles.sourceFacts}>
            <div><dt>{t("Motor", "Engine")}</dt><dd>{view.methodology.engineVersion}</dd></div>
            <div><dt>{t("Tabla de decisión", "Decision table")}</dt><dd>{view.methodology.ruleVersion} · {view.ruleId}</dd></div>
            <div><dt>{t("Clase de reconstrucción", "Replay class")}</dt><dd>{view.methodology.replayClass}</dd></div>
            <div><dt>{view.labels.asOf}</dt><dd>{instantLabel(view.asOf, view)}</dd></div>
          </dl>
        </details>
      </div>
    </details>
  </RegimeV2Disclosure>;
}
