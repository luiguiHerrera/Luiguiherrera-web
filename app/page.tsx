import Link from "next/link";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ToolCard } from "@/components/ui/ToolCard";

const tools = [
  {
    title: "Diagnóstico del inversionista",
    label: "01",
    href: "/diagnostico",
    description: "Antes de mirar el mercado, conviene mirar al inversionista. Objetivo, liquidez, experiencia y tolerancia a caídas.",
  },
  {
    title: "Market Regime Dashboard",
    label: "02",
    href: "/dashboard",
    description: "No te dice qué comprar. Ordena señales públicas para leer el contexto de riesgo.",
  },
  {
    title: "Quant / TD3 Lab",
    label: "03",
    href: "/quant-lab",
    description: "Modelos, simulaciones y métricas para estudiar portafolios con método.",
  },
  {
    title: "Protege tu dinero",
    label: "04",
    href: "/protege-tu-dinero",
    description: "Checklist de señales de alerta antes de perseguir rentabilidad.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 md:py-24">
      <section className="grid gap-10 lg:grid-cols-[1fr_0.75fr] lg:items-end">
        <div>
          <SectionHeader
            eyebrow="Plataforma laboratorio"
            title="Herramientas para invertir con más criterio y menos impulso."
            subtitle="Diagnósticos, simulaciones y lecturas de mercado para entender mejor el riesgo antes de tomar decisiones."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/diagnostico" className="rounded bg-sage px-5 py-3 text-sm font-semibold text-ink">
              Empezar diagnóstico
            </Link>
            <Link href="/dashboard" className="rounded border border-line px-5 py-3 text-sm font-semibold text-sage hover:border-petrol">
              Ver dashboard de mercado
            </Link>
          </div>
        </div>
        <div className="space-y-5">
          <div className="rounded-lg border border-line bg-panel p-6">
            <p className="text-sm uppercase tracking-[0.16em] text-brass">Idea central</p>
            <p className="mt-4 text-2xl leading-9 text-white">No te digo qué comprar. Te muestro cómo está respirando el mercado.</p>
          </div>
          <DisclaimerBox>Contenido educativo. No constituye asesoramiento financiero.</DisclaimerBox>
        </div>
      </section>

      <section className="mt-16 grid gap-5 md:grid-cols-2">
        {tools.map((tool) => <ToolCard key={tool.href} {...tool} />)}
      </section>
    </div>
  );
}
