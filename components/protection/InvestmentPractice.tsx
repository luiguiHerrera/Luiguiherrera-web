"use client";

import { useRef, useState } from "react";
import { investmentPracticeCases, type ControlLevel, type PracticeLocale } from "@/lib/protection/investment-practice-cases";

type Currency = "COP" | "USD" | "EUR";
const copPerCurrency: Record<Currency, number> = { COP: 1, USD: 4000, EUR: 4400 };
const currencies: Currency[] = ["COP", "USD", "EUR"];

const ui = {
  es: { eyebrow:"Prácticas de inversión", subtitle:"Simulador de decisiones financieras", intro:"Cinco situaciones comunes para entender qué protege cada decisión, qué compromete y qué conviene revisar antes de actuar.", note:"Los casos y las cifras son ilustrativos. Esta experiencia no recomienda productos ni sustituye el análisis de una situación particular.", currency:"Moneda ilustrativa", currencyNote:"Las conversiones son ilustrativas y solo sirven para comparar decisiones dentro del caso.", explore:"Explorar un caso", modules:"Ver los cinco casos", case:"Caso", of:"de 5", situation:"Situación", data:"Datos visibles", decisions:"Tres decisiones", choose:"Elige una decisión para observar sus efectos, no para acertar.", immediate:"Consecuencia inmediata", next:"Ver lo que puede ocurrir después", secondary:"Consecuencia secundaria", reading:"Lectura educativa", review:"Qué conviene revisar", alert:"Alerta principal", learning:"Aprendizaje final", compare:"Comparar decisiones", another:"Explorar otro caso", protect:"Proteges", sacrifice:"Sacrificas", depend:"Dependes de", status:{known:"Conocido",expected:"Esperado",verified:"Verificado",incomplete:"Incompleto",unknown:"No informado"}, levels:{control:"Mayor control",balance:"Equilibrio parcial",exposure:"Exposición alta"} },
  en: { eyebrow:"Investment practice", subtitle:"Financial decision simulator", intro:"Five common situations to understand what each decision protects, what it compromises, and what should be reviewed before acting.", note:"The cases and figures are illustrative. This experience does not recommend products and does not replace analysis of a specific situation.", currency:"Illustrative currency", currencyNote:"Currency conversions are illustrative and only used to compare decisions within the case.", explore:"Explore a case", modules:"View all five cases", case:"Case", of:"of 5", situation:"Situation", data:"Visible facts", decisions:"Three decisions", choose:"Choose a decision to examine its effects—not to get an answer right.", immediate:"Immediate consequence", next:"See what may happen next", secondary:"What may happen next", reading:"Educational reading", review:"What to review", alert:"Main alert", learning:"Final learning", compare:"Compare decisions", another:"Explore another case", protect:"What you protect", sacrifice:"What you sacrifice", depend:"What you depend on", status:{known:"Known",expected:"Expected",verified:"Verified",incomplete:"Incomplete",unknown:"Not disclosed"}, levels:{control:"Greater control",balance:"Partial balance",exposure:"High exposure"} },
};

function formatCurrency(copAmount: number, currency: Currency, locale: PracticeLocale) {
  return new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", {
    style: "currency", currency, currencyDisplay: "code", maximumFractionDigits: 0,
  }).format(copAmount / copPerCurrency[currency]).replace(/\s+/g, " ");
}

function formatSelectedAmount(amount: number, currency: Currency, locale: PracticeLocale) {
  return new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", {
    style: "currency", currency, currencyDisplay: "code", maximumFractionDigits: 0,
  }).format(amount).replace(/\s+/g, " ");
}

function parseLocalizedNumber(value: string, decimalComma: boolean) {
  return decimalComma ? Number(value.replace(/\./g, "").replace(",", ".")) : Number(value.replace(/,/g, ""));
}

function convertText(text: string, currency: Currency, locale: PracticeLocale) {
  let converted = text.replace(/\{money:(\d+)\}/g, (_, raw: string) => formatSelectedAmount(Number(raw), currency, locale));
  converted = converted.replace(/\{cop:(\d+)\}/g, (_, raw: string) => formatCurrency(Number(raw), currency, locale));
  converted = converted.replace(/COP\s([\d.,]+)\s*(millones?|M)?/gi, (_, raw: string, scale?: string) => {
    const amount = parseLocalizedNumber(raw, locale === "es") * (scale ? 1_000_000 : 1);
    return formatCurrency(amount, currency, locale);
  });
  converted = converted.replace(/USD\s([\d,]+(?:\.\d+)?)/gi, (_, raw: string) => formatCurrency(parseLocalizedNumber(raw, false) * 4000, currency, locale));
  return converted;
}

function levelClasses(level: ControlLevel) {
  return level === "exposure" ? "border-risk/30 bg-[#f7eeee] text-risk" : level === "balance" ? "border-brass/35 bg-[#f7f1e7] text-brass" : "border-petrol/25 bg-[#eef3f1] text-petrol";
}

export function InvestmentPractice({ locale }: { locale: PracticeLocale }) {
  const [caseIndex,setCaseIndex]=useState(0); const [decisionIndex,setDecisionIndex]=useState<number|null>(null); const [expanded,setExpanded]=useState(false);
  const [currency,setCurrency]=useState<Currency>(locale === "es" ? "COP" : "USD");
  const simulator=useRef<HTMLDivElement>(null); const labels=ui[locale]; const cases=investmentPracticeCases[locale]; const active=cases[caseIndex]; const decision=decisionIndex===null?null:active.decisions[decisionIndex];
  const display=(text:string)=>convertText(text,currency,locale);
  const chooseCase=(index:number)=>{setCaseIndex(index);setDecisionIndex(null);setExpanded(false);};
  const pick=(index:number)=>{setDecisionIndex(index);setExpanded(false);};
  const scroll=(target:React.RefObject<HTMLDivElement|null>)=>target.current?.scrollIntoView({behavior:"smooth",block:"start"});
  return <section className="mt-10 overflow-hidden rounded-[6px] border border-petrol/20 bg-[#f3efe6] shadow-[0_16px_42px_rgba(11,52,54,0.055)] md:mt-12">
    <div className="border-b border-petrol/15 px-4 py-8 sm:px-6 md:px-8 md:py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">{labels.eyebrow}</p><h2 className="mt-3 text-2xl font-semibold text-ink sm:text-4xl">{labels.subtitle}</h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-muted sm:text-lg">{labels.intro}</p><p className="mt-5 max-w-3xl border-l border-petrol/35 pl-4 text-sm leading-6 text-muted">{labels.note}</p>
      <div className="mt-5 max-w-md rounded-[4px] border border-petrol/20 bg-white/55 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-petrol">{labels.currency}</span><div className="flex gap-1" role="group" aria-label={labels.currency}>{currencies.map(item=><button key={item} type="button" onClick={()=>setCurrency(item)} aria-pressed={currency===item} className={`rounded-[3px] border px-3 py-1.5 text-xs font-semibold transition ${currency===item?"border-petrol bg-petrol text-white":"border-line bg-white text-muted hover:border-petrol hover:text-petrol"}`}>{item}</button>)}</div></div><p className="mt-2 text-xs leading-5 text-muted">{labels.currencyNote}</p></div>
      <div className="mt-6 flex flex-wrap gap-3"><button onClick={()=>scroll(simulator)} className="rounded-[4px] bg-petrol px-4 py-3 text-sm font-semibold text-white">{labels.explore}</button><button onClick={()=>scroll(simulator)} className="rounded-[4px] border border-petrol/30 bg-white/65 px-4 py-3 text-sm font-semibold text-petrol">{labels.modules}</button></div>
    </div>
    <div ref={simulator} className="scroll-mt-6 p-3 sm:p-5 md:p-8">
      <div className="grid gap-2 sm:grid-cols-2">{cases.map((item,index)=><button key={item.slug} onClick={()=>chooseCase(index)} aria-pressed={caseIndex===index} className={`rounded-[4px] border p-4 text-left transition ${caseIndex===index?"border-petrol bg-petrol text-white":"border-line bg-white/75 text-ink hover:border-petrol"}`}><span className={`text-xs font-semibold uppercase tracking-[0.16em] ${caseIndex===index?"text-white/70":"text-petrol"}`}>{labels.case} {index+1} {labels.of}</span><span className="mt-1 block font-semibold">{item.category}</span></button>)}</div>
      <div className="mt-4 rounded-[6px] border border-line bg-white/85 p-4 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{labels.case} {caseIndex+1} {labels.of}</p><h3 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">{active.title}</h3>
        <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="min-w-0"><h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{labels.situation}</h4><p className="mt-3 text-base leading-7 text-ink">{display(active.situation)}</p>
            <h4 className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{labels.data}</h4><dl className="mt-3 divide-y divide-line rounded-[4px] border border-line bg-paper">{active.facts.map(f=><div key={f.label} className="grid min-w-0 gap-1 px-3 py-2.5 sm:grid-cols-[1fr_auto]"><dt className="min-w-0 break-words text-sm text-muted [overflow-wrap:anywhere]">{f.label}</dt><dd className="min-w-0 max-w-full break-words text-sm font-semibold text-ink [overflow-wrap:anywhere] sm:text-right">{display(f.value)}</dd></div>)}</dl>
            <div className="mt-4 min-w-0 rounded-[4px] border border-petrol/20 bg-[#eef3f1] p-4"><h4 className="break-words font-semibold text-ink [overflow-wrap:anywhere]">{active.metric.title}</h4><div className="mt-3 grid min-w-0 gap-2">{active.metric.rows.map(row=><div key={row.label} className="flex min-w-0 flex-wrap items-start justify-between gap-2 border-t border-petrol/10 pt-2 text-sm"><span className="min-w-0 break-words text-muted [overflow-wrap:anywhere]">{row.label}</span><span className="min-w-0 max-w-full break-words font-semibold text-ink [overflow-wrap:anywhere] sm:text-right">{display(row.value)}{row.status&&<small className="ml-2 rounded-full border border-current/20 px-2 py-0.5 font-semibold text-muted">{labels.status[row.status]}</small>}</span></div>)}</div></div>
          </div>
          <div className="min-w-0"><h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{labels.decisions}</h4><p className="mt-2 text-sm leading-6 text-muted">{labels.choose}</p><div className="mt-3 grid gap-3">{active.decisions.map((option,index)=><button key={option.title} onClick={()=>pick(index)} aria-pressed={decisionIndex===index} className={`rounded-[4px] border p-4 text-left transition ${decisionIndex===index?"border-petrol bg-[#eef3f1] shadow-sm":"border-line bg-paper hover:border-petrol"}`}><span className="text-xs font-semibold text-muted">0{index+1}</span><span className="mt-1 block font-semibold text-ink">{option.title}</span>{option.description&&<span className="mt-2 block text-sm leading-6 text-muted">{display(option.description)}</span>}</button>)}</div>
            {decision&&<div aria-live="polite" className="mt-5 border-t border-line pt-5"><div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses(decision.level)}`}>{labels.levels[decision.level]}</div><h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{labels.immediate}</h4><p className="mt-2 text-sm leading-7 text-ink">{display(decision.immediate)}</p>{!expanded?<button onClick={()=>setExpanded(true)} className="mt-5 w-full rounded-[4px] bg-petrol px-4 py-3 text-sm font-semibold text-white">{labels.next}</button>:<ResultDetails locale={locale} decision={decision} display={display}/>}</div>}
          </div>
        </div>
        {decision&&expanded&&<div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5"><button onClick={()=>{setDecisionIndex(null);setExpanded(false)}} className="rounded-[4px] border border-petrol bg-white px-4 py-3 text-sm font-semibold text-petrol">{labels.compare}</button><button onClick={()=>chooseCase((caseIndex+1)%cases.length)} className="rounded-[4px] bg-petrol px-4 py-3 text-sm font-semibold text-white">{labels.another}</button></div>}
      </div>
    </div>
  </section>;
}

function ResultDetails({locale,decision,display}:{locale:PracticeLocale;decision:(typeof investmentPracticeCases)[PracticeLocale][number]["decisions"][number];display:(text:string)=>string}) { const l=ui[locale]; return <div className="mt-5 grid gap-4"><Info title={l.secondary} text={display(decision.secondary)}/><Info title={l.reading} text={display(decision.reading)}/><div className="rounded-[4px] border border-line bg-paper p-4"><h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{l.review}</h4><ul className="mt-3 grid gap-2 text-sm text-muted">{decision.review.map(item=><li key={item} className="flex gap-2"><span className="text-petrol">—</span>{display(item)}</li>)}</ul></div><div className="rounded-[4px] border border-risk/25 bg-[#f7eeee] p-4"><h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-risk">{l.alert}</h4><p className="mt-2 text-sm leading-6 text-ink">{display(decision.alert)}</p></div><div className="grid gap-3 sm:grid-cols-3"><Trade label={l.protect} text={display(decision.tradeoff.protect)}/><Trade label={l.sacrifice} text={display(decision.tradeoff.sacrifice)}/><Trade label={l.depend} text={display(decision.tradeoff.depend)}/></div><Info title={l.learning} text={display(decision.learning)}/></div> }
function Info({title,text}:{title:string;text:string}) { return <div><h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{title}</h4><p className="mt-2 text-sm leading-7 text-muted">{text}</p></div> }
function Trade({label,text}:{label:string;text:string}) { return <div className="rounded-[4px] border border-line bg-white p-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-petrol">{label}</p><p className="mt-2 text-sm leading-6 text-muted">{text}</p></div> }
