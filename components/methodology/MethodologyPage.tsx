import Link from "next/link";
import type { ReactNode } from "react";
import { methodologyContent, type MethodologyBlock, type MethodologyLocale } from "@/lib/methodology/content";
import s from "./methodology.module.css";

function SectionHeading({ index, title }: { index: number; title: string }) {
  return <div className={s.sectionHeading}><span className={s.sectionNumber}>{String(index).padStart(2, "0")}.</span><h2>{title}</h2></div>;
}

function Section({ index, title, id, className = "", children }: {
  index: number; title: string; id: string; className?: string; children: ReactNode;
}) {
  return <details className={`${s.section} ${className}`} id={id} data-methodology-section={id}>
    <summary className={s.sectionSummary}>
      <SectionHeading index={index} title={title} />
      <span className={s.disclosureSign} aria-hidden="true" />
    </summary>
    <div className={s.sectionBody}>{children}</div>
  </details>;
}

function Blocks({ blocks }: { blocks: MethodologyBlock[] }) {
  return blocks.map((block, index) => "items" in block
    ? <ul key={index} className={s.studyList}>{block.items.map(item => <li key={item}>{item}</li>)}</ul>
    : <p key={index}>{block.label ? <><strong>{block.label}</strong>{" "}</> : null}{block.text}</p>);
}

export function MethodologyPage({ locale }: { locale: MethodologyLocale }) {
  const c = methodologyContent[locale];
  const invitationStart = c.data[2].slice(0, -c.invitationEmphasis.length);
  return <div className={s.page} data-methodology-page={locale}>
    <header className={s.hero}>
      <div className={s.heroLandscape} aria-hidden="true" />
      <div className={s.heroCopy}>
        <h1>{c.title}</h1>
        <p className={s.motto}>{c.subtitle}</p>
        <p className={s.description}>{c.description}</p>
      </div>
    </header>

    <Section index={1} title={c.sections[0]} id="enfoque">
      <div className={s.approachBody}>{c.approach.slice(0, 3).map(p => <p key={p}>{p}</p>)}</div>
      <blockquote className={s.uncertainty}>{c.approach[3]}</blockquote>
    </Section>

    <Section index={2} title={c.sections[1]} id="principios">
      <div className={s.principles}>{c.principles.map(p => <article key={p.title}>
        <h3>{p.title}</h3><p>{p.text}</p>
      </article>)}</div>
    </Section>

    <Section index={3} title={c.sections[2]} id="proceso">
      <p className={s.processIntro}>{c.process.intro}</p>
      <ol className={s.processSteps}>{c.process.steps.map((step, index) => <li key={step}>
        <span className={s.processNode} aria-hidden="true" />
        <span>{step}</span>
        {index < c.process.steps.length - 1 ? <span className={s.processArrow} aria-hidden="true">→</span> : null}
      </li>)}</ol>
      <p className={s.processExplanation}>{c.process.explanation}</p>
      <div className={s.distinction}>
        <p>{c.process.distinctionIntro}</p>
        <ul>{c.process.distinctions.map(item => <li key={item}>{item}</li>)}</ul>
        <p className={s.distinctionEnd}>{c.process.distinctionEnd}</p>
      </div>
      <p className={s.decision}>{c.process.decision}</p>
    </Section>

    <Section index={4} title={c.sections[3]} id="mercado">
      <div className={s.modules}>{c.modules.map(module => <details className={s.module} key={module.id} data-methodology-module={module.id}>
        <summary><div><h3>{module.title}</h3><p>{module.question}</p></div><span className={s.disclosureSign} aria-hidden="true" /></summary>
        <div className={s.moduleBody}>
          <div className={s.prose}><Blocks blocks={module.blocks} /></div>
          <Link prefetch={false} className={s.toolLink} href={module.href} aria-label={`${c.toolLink}: ${module.title}`}>{c.toolLink}<span className={s.linkRule} aria-hidden="true" /></Link>
        </div>
      </details>)}</div>
    </Section>

    <Section index={5} title={c.sections[4]} id="investigacion" className={s.research}>
      <p className={s.researchQuestion}>{c.research.question}</p>
      <div className={s.researchIntro}>{c.research.intro.map(p => <p key={p}>{p}</p>)}</div>
      <p className={s.criteriaIntro}>{c.research.criteriaIntro}</p>
      <ul className={s.criteria}>{c.research.criteria.map(item => <li key={item}>{item}</li>)}</ul>
      <div className={s.researchReflections}>{c.research.reflections.map(p => <p key={p}>{p}</p>)}</div>
    </Section>

    <Section index={6} title={c.sections[5]} id="finanzas-personales">
      <div className={s.personalBody}><p className={s.personalQuestion}>{c.personal.question}</p>
        <div className={s.prose}>{c.personal.paragraphs.map(p => <p key={p}>{p}</p>)}</div>
      </div>
    </Section>

    <Section index={7} title={c.sections[6]} id="datos">
      <div className={s.dataIntro}>{c.data.slice(0, 2).map(p => <p key={p}>{p}</p>)}</div>
      <p className={s.invitation}>{invitationStart}<strong>{c.invitationEmphasis}</strong></p>
      <div className={s.dataPractices}>{c.data.slice(3).map(p => <p key={p}>{p}</p>)}</div>
    </Section>

    <Section index={8} title={c.sections[7]} id="limites" className={s.limits}>
      <p className={s.limitsLead}>{c.limits[0]}</p>
      <div className={s.limitsBody}>{c.limits.slice(1).map(p => <p key={p}>{p}</p>)}</div>
    </Section>

    <footer className={s.closing}><p>{c.closing[0]}</p><p>{c.closing[1]}</p></footer>
  </div>;
}
