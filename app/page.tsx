import Link from "next/link";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ToolCard } from "@/components/ui/ToolCard";

const tools = [
  {
    title: "Diagnóstico del inversionista",
    label: "01",
    meta: "Autoconocimiento",
    href: "/diagnostico",
    description: "Antes de mirar el mercado, conviene mirar al inversionista. Objetivo, liquidez, experiencia y tolerancia a caídas.",
  },
  {
    title: "Market Regime Dashboard",
    label: "02",
    meta: "Contexto",
    href: "/dashboard",
    description: "No te dice qué comprar. Ordena señales públicas para leer el contexto de riesgo.",
  },
  {
    title: "Quant / TD3 Lab",
    label: "03",
    meta: "Investigación",
    href: "/quant-lab",
    description: "Modelos, simulaciones y métricas para estudiar portafolios con método.",
  },
  {
    title: "Protege tu dinero",
    label: "04",
    meta: "Red flags",
    href: "/protege-tu-dinero",
    description: "Checklist de señales de alerta antes de perseguir rentabilidad.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:py-20">
      <section className="grid gap-10 lg:grid-cols-[1fr_0.74fr] lg:items-end">
        <div>
          <SectionHeader
            eyebrow="Plataforma laboratorio"
            title="Herramientas para invertir con más criterio y menos impulso."
            subtitle="Diagnósticos, simulaciones y lecturas de mercado para entender mejor el riesgo antes de tomar decisiones."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/diagnostico" className="rounded bg-sage px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white">
              Empezar diagnóstico
            </Link>
            <Link href="/dashboard" className="rounded border border-line bg-panel/60 px-5 py-3 text-sm font-semibold text-sage transition hover:border-petrol hover:bg-panel">
              Ver dashboard de mercado
            </Link>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-panel p-6 shadow-quiet">
            <p className="text-sm uppercase tracking-[0.16em] text-brass">Idea central</p>
            <p className="mt-4 text-2xl leading-9 text-white">No te digo qué comprar. Te muestro cómo está respirando el mercado.</p>
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5 text-sm">
              <div>
                <p className="text-lg font-semibold text-white">Riesgo</p>
                <p className="mt-1 text-muted">Antes que impulso.</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Contexto</p>
                <p className="mt-1 text-muted">Antes que ruido.</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Método</p>
                <p className="mt-1 text-muted">Antes que relato.</p>
              </div>
            </div>
          </div>
          <DisclaimerBox>Contenido educativo. No constituye asesoramiento financiero.</DisclaimerBox>
        </div>
      </section>

      <section className="mt-14 rounded-lg border border-line bg-panel/70 p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Filosofía</p>
        <p className="mt-4 max-w-4xl text-2xl leading-10 text-white">
          No te digo qué comprar. Te ayudo a entender el riesgo, el contexto y tus propias decisiones.
        </p>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        {tools.map((tool) => <ToolCard key={tool.href} {...tool} />)}
      </section>
    </div>
  );
}
