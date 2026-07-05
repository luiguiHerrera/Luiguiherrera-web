import Link from "next/link";
import { InvestmentPractice } from "@/components/protection/InvestmentPractice";

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
      <section className="border-b border-line pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Control de riesgo</p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Protección</h1>
        <p className="mt-5 max-w-[calc(100vw-2rem)] break-words text-lg leading-8 text-muted [overflow-wrap:anywhere] md:max-w-3xl">
          Checklist, alertas y filtros para cuidar el margen de error antes de entregar capital.
        </p>
      </section>

      <InvestmentPractice locale="es" />

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        {protectionItems.map((item) => (
          <Link key={item.href} href={item.href} className="group flex min-w-0 min-h-[13rem] flex-col rounded-[6px] border border-line bg-white/75 p-5 shadow-[0_12px_32px_rgba(11,52,54,0.045)] transition hover:border-petrol hover:bg-white">
            <h2 className="break-words text-2xl font-semibold text-ink [overflow-wrap:anywhere]">{item.title}</h2>
            <p className="mt-3 break-words text-sm leading-6 text-muted [overflow-wrap:anywhere]">{item.description}</p>
            <span className="mt-auto pt-6 text-sm font-semibold text-petrol">Abrir &rarr;</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
