import Link from "next/link";
import type { Metadata } from "next";
import { InvestmentPractice } from "@/components/protection/InvestmentPractice";
import { ReadingCard } from "@/components/seo/ReadingCard";

const protectionItems = [
  {
    title: "Protege tu dinero",
    href: "/protege-tu-dinero",
    description: "Checklist, señales de alerta y filtros para revisar propuestas antes de entregar capital.",
  },
  {
    title: "Radar de lecturas cruzadas",
    href: "/dashboard",
    description: "El dashboard integra señales de régimen para contrastar contexto, estrés y soporte de riesgo.",
  },
];

export default function ProteccionPage() {
  return (
    <div className="mx-auto min-w-0 max-w-7xl overflow-hidden px-4 py-10 md:px-5 md:py-14">
      <section className="estate-hero rounded-[6px] border border-line px-5 py-7 shadow-[0_16px_42px_rgba(11,52,54,0.045)] md:px-7 md:py-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Control de riesgo</p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Protección del inversor</h1>
        <p className="mt-5 max-w-[calc(100vw-2rem)] break-words text-lg leading-8 text-muted [overflow-wrap:anywhere] md:max-w-3xl">
          Checklist y simulador de decisiones financieras para reconocer alertas y cuidar el margen de error antes de entregar capital.
        </p>
      </section>

      <ReadingCard title="Ficha de lectura" items={[
        { label: "Qué es", value: "Un simulador educativo de decisiones financieras con casos sobre deuda, productos con referidos, finca raíz, ETF y portafolio familiar." },
        { label: "Para qué sirve", value: "Sirve para practicar decisiones antes de poner dinero en riesgo y reconocer liquidez, incentivos, concentración, plazo y presión comercial." },
        { label: "Límites", value: "Los casos son ilustrativos. No recomiendan productos, no califican entidades y no sustituyen análisis personalizado." },
        { label: "Siguiente paso", value: "Usar el checklist de Protege tu dinero antes de evaluar una propuesta real." },
      ]} />

      <InvestmentPractice locale="es" />

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        {protectionItems.map((item) => (
          <Link key={item.href} href={item.href} className="estate-card group flex min-h-[13rem] min-w-0 flex-col rounded-[6px] border border-line p-5 transition hover:border-petrol">
            <h2 className="break-words text-2xl font-semibold text-ink [overflow-wrap:anywhere]">{item.title}</h2>
            <p className="mt-3 break-words text-sm leading-6 text-muted [overflow-wrap:anywhere]">{item.description}</p>
            <span className="mt-auto pt-6 text-sm font-semibold text-petrol">Abrir &rarr;</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
export const metadata: Metadata = {
  title: "Protección del inversor | Checklist y simulador de decisiones",
  description: "Simulador educativo de decisiones financieras para revisar deuda, productos con referidos, finca raíz, ETF, portafolio familiar y señales de alerta antes de invertir.",
};
