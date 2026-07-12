import Link from "next/link";
import type { Metadata } from "next";
import { RedFlagsChecklist } from "@/components/red-flags/RedFlagsChecklist";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { RiskPill } from "@/components/ui/RiskPill";
import { ReadingCard } from "@/components/seo/ReadingCard";
import type { ReactNode } from "react";

const protectionFilters = [
  {
    title: "Entidad",
    question: "¿La entidad está autorizada y registrada?",
    tone: "high" as const,
    level: "Prioritario",
    signals: ["Registro verificable", "Identidad y domicilio claros", "Advertencias públicas revisadas"],
  },
  {
    title: "Producto",
    question: "¿Comprendes qué estás contratando y qué riesgos asumes?",
    tone: "medium" as const,
    level: "Revisión",
    signals: ["Costes visibles", "Escenarios de pérdida", "Liquidez y salida entendibles"],
  },
  {
    title: "Conducta comercial",
    question: "¿Hay presión, urgencia, promesas o captación agresiva?",
    tone: "low" as const,
    level: "Observación",
    signals: ["Sin urgencia artificial", "Sin promesas sin riesgo", "Canal de contacto trazable"],
  },
];

const alarmSignals = [
  ["Entidad no autorizada", "No puedes contrastar registro o autorización en fuentes oficiales.", "Alto"],
  ["Contacto inesperado", "La propuesta llega por llamada, correo, mensajería o redes sin solicitud previa.", "Medio"],
  ["Urgencia para decidir", "Te piden actuar antes de revisar documentos o consultar otra fuente.", "Alto"],
  ["Alta rentabilidad sin riesgo", "La propuesta minimiza pérdidas, volatilidad o condiciones de salida.", "Alto"],
  ["Producto que no entiendes", "No queda claro de dónde sale el retorno ni qué puede salir mal.", "Medio"],
  ["Presión psicológica", "Usan miedo a perder la oportunidad, culpa o confianza personal.", "Medio"],
  ["Afinidad o redes sociales", "La confianza viene de comunidad, famosos, testimonios o cercanía.", "Medio"],
  ["Costes poco claros", "No hay desglose de comisiones, penalizaciones, spreads o custodia.", "Medio"],
  ["Falta de documentación", "No entregan información escrita, completa y verificable.", "Alto"],
  ["Más dinero para recuperar", "Piden nuevos pagos para desbloquear fondos o compensar pérdidas.", "Alto"],
];

const mifidItems = [
  ["Test de conveniencia", "Contrasta conocimientos y experiencia cuando se ofrecen productos complejos o servicios no asesorados."],
  ["Test de idoneidad", "En asesoramiento o gestión, ordena conocimientos, experiencia, situación financiera y objetivos."],
  ["Capacidad de pérdida", "No basta con querer rentabilidad; importa cuánto deterioro puedes soportar sin comprometer tu plan."],
  ["Horizonte temporal", "El plazo condiciona liquidez, volatilidad tolerable y tipo de producto razonable."],
  ["Tolerancia al riesgo", "La reacción ante pérdidas ayuda a evitar decisiones impulsivas o mal calibradas."],
];

const steps = [
  "Pausa.",
  "No envíes más dinero.",
  "Pide documentación.",
  "Verifica registros oficiales.",
  "Contrasta advertencias.",
  "Guarda evidencia.",
  "Contacta con el supervisor o autoridad correspondiente si sospechas una irregularidad.",
];

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-ink underline-offset-4 hover:underline">
      {children}
    </a>
  );
}

export default function ProtegeTuDineroPage() {
  return <ProtectYourMoneyContent readingCard={<ReadingCard title="Ficha de lectura" items={[
    { label: "Qué es", value: "Un checklist educativo de señales de alerta antes de confiar dinero a una entidad, producto o propuesta de inversión." },
    { label: "Para qué sirve", value: "Sirve para revisar documentación, regulación, custodia, promesas, presión comercial, liquidez y derecho de salida." },
    { label: "Límites", value: "No verifica oficialmente entidades, no declara fraude y debe complementarse con fuentes regulatorias oficiales." },
    { label: "Siguiente paso", value: "Verificar la entidad en fuentes oficiales y usar el simulador de protección para practicar decisiones." },
  ]} />} />;
}

export function ProtectYourMoneyContent({ readingCard }: { readingCard: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
      <section className="grid gap-8 border-b border-line pb-9 lg:grid-cols-[1fr_0.72fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Protección patrimonial</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Protege tu dinero</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            Evalúa señales de alerta antes de confiar en una propuesta de inversión.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#revision" className="border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink">
              Empezar revisión
            </a>
            <SourceLink href="https://www.cnmv.es/portal/Advertencias.aspx">Ver advertencias CNMV</SourceLink>
          </div>
        </div>
        <DisclaimerBox>
          Herramienta educativa. No sustituye la verificación oficial en CNMV ni constituye asesoría legal o financiera.
        </DisclaimerBox>
      </section>

      {readingCard}

      <section className="mt-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Tres filtros de protección</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Antes de mirar rentabilidad, revisa quién, qué y cómo.</h2>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {protectionFilters.map((filter) => (
            <article key={filter.title} className="border border-line bg-panel p-5">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl font-semibold text-ink">{filter.title}</h3>
                <RiskPill label={filter.level} tone={filter.tone} />
              </div>
              <p className="mt-4 text-lg leading-7 text-ink">{filter.question}</p>
              <ul className="mt-5 grid gap-2 text-sm leading-6 text-muted">
                {filter.signals.map((signal) => (
                  <li key={signal} className="border-l border-line pl-3">{signal}</li>
                ))}
              </ul>
              <p className="mt-5 border-t border-line pt-3 text-xs leading-5 text-muted">
                Fuente educativa: CNMV / MiFID II.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="revision" className="mt-8">
        <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_0.62fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Checklist interactivo</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Nivel de alerta inicial</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted md:text-base md:leading-7">
              Basado en criterios públicos de protección al inversor y señales de alerta divulgadas por la CNMV. No declara fraude ni verifica oficialmente entidades.
            </p>
          </div>
          <p className="border border-line bg-panelSoft p-4 text-sm leading-6 text-muted">
            Contrasta siempre la información en fuentes oficiales antes de transferir dinero o aceptar condiciones.
          </p>
        </div>
        <RedFlagsChecklist />
      </section>

      <section className="mt-8 border border-line bg-panel p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Señales de alarma CNMV</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Decálogo compacto</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            No son pruebas definitivas. Son motivos para pausar, documentar y contrastar.
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {alarmSignals.map(([title, text, level]) => (
            <article key={title} className="border border-line bg-panelSoft p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink">{title}</h3>
                <span className="text-xs font-semibold text-brass">{level}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">{text}</p>
            </article>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-muted">
          Referencias educativas: <SourceLink href="https://www.cnmv.es/portal/Advertencias.aspx">Alertas al inversor CNMV</SourceLink> · <SourceLink href="https://www.cnmv.es/portal/inversor/Entidades-Autorizadas.aspx">Entidades autorizadas CNMV</SourceLink> · <SourceLink href="https://www.cnmv.es/portal/inversor/Infografias.aspx">Infografías CNMV / MiFID II</SourceLink>.
        </p>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="border border-line bg-panel p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">MiFID</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Por qué te preguntan tanto antes de invertir</h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            Las preguntas sobre experiencia, conocimientos, situación financiera, objetivos, capacidad de pérdida y horizonte no son burocracia sin sentido. Ayudan a separar una lectura comercial de una evaluación prudente del inversor.
          </p>
          <Link href="/diagnostico" className="mt-5 inline-flex border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink">
            Hacer diagnóstico del inversor
          </Link>
          <p className="mt-4 text-xs leading-5 text-muted">
            Nuestro diagnóstico no sustituye una evaluación regulatoria formal, pero ayuda a ordenar dimensiones educativas: conocimiento, experiencia, capacidad, objetivos y comportamiento.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {mifidItems.map(([title, text]) => (
            <article key={title} className="border border-line bg-panelSoft p-4">
              <h3 className="font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 border border-line bg-panel p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Si algo no cuadra</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Un protocolo simple antes de avanzar</h2>
        <div className="mt-6 grid gap-2 md:grid-cols-7">
          {steps.map((step, index) => (
            <div key={step} className="border border-line bg-panelSoft p-3">
              <span className="text-xs font-semibold text-brass">{String(index + 1).padStart(2, "0")}</span>
              <p className="mt-2 text-sm font-semibold leading-6 text-ink">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
export const metadata: Metadata = {
  title: "Protege tu dinero | Checklist de señales de alerta antes de invertir",
  description: "Checklist educativo basado en criterios públicos de protección al inversor para revisar entidad, producto, documentación, presión comercial, promesas y señales de alerta.",
};
