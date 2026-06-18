import Link from "next/link";

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
    <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
      <section className="border-b border-line pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Control de riesgo</p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Protección</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          Checklist, alertas y filtros para cuidar el margen de error antes de entregar capital.
        </p>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        {protectionItems.map((item) => (
          <Link key={item.href} href={item.href} className="group flex min-h-[13rem] flex-col border border-line bg-panel p-5 transition hover:border-ink">
            <h2 className="text-2xl font-semibold text-ink">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{item.description}</p>
            <span className="mt-auto pt-6 text-sm font-semibold text-ink">Abrir &rarr;</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
