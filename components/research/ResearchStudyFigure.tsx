import { tomDecayEditorial } from "@/lib/research/tom-decay/editorial";
import { td3Editorial } from "@/lib/research/td3-editorial";
import { tomDecayContent } from "@/lib/research/tom-decay/content";
import { tomDecayData } from "@/lib/research/tom-decay/dataset";
import { linearScale, niceAxisTicks, paddedDomain } from "@/lib/research/tom-decay/chart-geometry";
import { createTomFormatters } from "@/lib/research/tom-decay/format";
import { td3PaperContent } from "@/lib/research/td3-paper";
import { td3VisualContent } from "@/lib/research/td3-visual-content";
import styles from "./ResearchIndex.module.css";

type Locale = "es" | "en";

function TomStudyFigure({ locale }: { locale: Locale }) {
  const copy = tomDecayContent[locale];
  const format = createTomFormatters(locale);
  const series = [tomDecayData.yahoo, tomDecayData.french];
  const estimates = series.flatMap((dataset) => dataset.regimes.map((estimate) => estimate.premiumBps));
  const domain = paddedDomain(estimates, { padding: 0.12 });
  const y = linearScale(domain, [142, 20]);
  const ticks = niceAxisTicks(domain[0], domain[1], 4);
  const x = (index: number) => 34 + (334 / series[0].regimes.length) * (index + 0.5);
  return (
    <figure className={styles.figure} data-study-figure="tom-regimes">
      <figcaption>{copy.replication.chartTitle}</figcaption>
      <svg viewBox="0 0 380 202" role="img" aria-label={copy.replication.chartTitle}>
        <desc>{copy.replication.chartSummary}</desc>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1="34" x2="368" y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? "#a9afa7" : "#ded8cb"} strokeWidth={tick === 0 ? 1 : 0.6} />
            <text x="26" y={y(tick) + 3.5} textAnchor="end">{new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(tick)}</text>
          </g>
        ))}
        {series[0].regimes.map((estimate, index) => (
          <g key={estimate.regime}>
            {series.map((dataset, sourceIndex) => {
              const value = dataset.regimes[index];
              const dotX = x(index) + (sourceIndex === 0 ? -6 : 6);
              const color = sourceIndex === 0 ? "#193d32" : "#a08246";
              return (
                <g key={dataset.id}>
                  <title>{copy.labels.datasets[dataset.id].name + " · " + copy.labels.regimes[value.regime].name + ": " + format.bps(value.premiumBps) + " " + copy.labels.bpsPerDay}</title>
                  <line x1={dotX} x2={dotX} y1={y(0)} y2={y(value.premiumBps)} stroke={color} strokeOpacity=".28" strokeWidth="1.5" />
                  <circle cx={dotX} cy={y(value.premiumBps)} r="3.8" fill={sourceIndex === 0 ? color : "#faf8f2"} stroke={color} strokeWidth="1.8" />
                </g>
              );
            })}
            <text x={x(index)} y="163" textAnchor="middle">{copy.labels.regimes[estimate.regime].short}</text>
            {estimate.regime === "T1" ? <text x={x(index)} y="180" textAnchor="middle" className={styles.shortSample}>{copy.labels.shortSample}</text> : null}
          </g>
        ))}
        <text x="34" y="198">{copy.replication.axisY}</text>
      </svg>
      <div className={styles.figureLegend}>
        {series.map((dataset, index) => <span key={dataset.id}><i className={index === 0 ? styles.yahooKey : styles.frenchKey} aria-hidden="true" />{copy.labels.datasets[dataset.id].name}</span>)}
      </div>
    </figure>
  );
}

function Td3StudyFigure({ locale }: { locale: Locale }) {
  const copy = td3VisualContent[locale].statistics;
  const protocols = td3PaperContent[locale].cash.protocols;
  const x = linearScale([-0.8, 1.05], [96, 365]);
  const format = new Intl.NumberFormat(locale, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return (
    <figure className={styles.figure} data-study-figure="td3-bootstrap">
      <figcaption>{copy.chartTitle}</figcaption>
      <svg viewBox="0 0 380 212" role="img" aria-label={copy.chartTitle}>
        <desc>{copy.intro}</desc>
        <line x1={x(0)} x2={x(0)} y1="34" y2="164" stroke="#a9afa7" strokeDasharray="3 4" />
        <text x={x(0)} y="23" textAnchor="middle">{copy.zero}</text>
        {protocols.map((protocol, index) => {
          const [low, high] = JSON.parse(protocol.validation[1][1]) as [number, number];
          const delta = Number.parseFloat(protocol.validation[0][1]);
          const y = 73 + index * 63;
          const color = index === 0 ? "#193d32" : "#a08246";
          return (
            <g key={protocol.id}>
              <title>{protocol.label + ": " + protocol.validation[0][1] + " · " + protocol.validation[1][1]}</title>
              <text x="0" y={y + 4}>{protocol.label}</text>
              <line x1={x(low)} x2={x(high)} y1={y} y2={y} stroke={color} strokeWidth="2.5" />
              <path d={"M" + x(low) + " " + (y - 6) + "v12 M" + x(high) + " " + (y - 6) + "v12"} stroke={color} strokeWidth="1.5" />
              <circle cx={x(delta)} cy={y} r="4" fill={color} />
              <text x={x(low)} y={y - 12} textAnchor="start" className={styles.intervalEnd}>{format.format(low)}</text>
              <text x={x(high)} y={y - 12} textAnchor="end" className={styles.intervalEnd}>{format.format(high)}</text>
            </g>
          );
        })}
        <line x1="96" x2="365" y1="171" y2="171" stroke="#ded8cb" />
        {[-0.8, -0.4, 0, 0.4, 0.8].map((tick) => (
          <g key={tick}>
            <line x1={x(tick)} x2={x(tick)} y1="171" y2="176" stroke="#a9afa7" />
            <text x={x(tick)} y="190" textAnchor="middle">{new Intl.NumberFormat(locale, { minimumFractionDigits: 1 }).format(tick)}</text>
          </g>
        ))}
        <text x="365" y="211" textAnchor="end">{copy.axis}</text>
      </svg>
    </figure>
  );
}

// Optional previews use existing study identities; entries without a figure
// retain the same complete editorial row and need no catalogue redesign.
export function researchStudyFigure(href: string, locale: Locale) {
  if (href === tomDecayEditorial[locale].pathname) return <TomStudyFigure locale={locale} />;
  if (href === td3Editorial[locale].pathname) return <Td3StudyFigure locale={locale} />;
  return null;
}
