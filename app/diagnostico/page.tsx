import { DiagnosticFlow } from "@/components/diagnostic/DiagnosticFlow";
import type { Metadata } from "next";
import type { DiagnosticMode } from "@/lib/diagnostic/types";
import { ReadingCard } from "@/components/seo/ReadingCard";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";

function modeFromSearchParam(mode: string | string[] | undefined): DiagnosticMode | undefined {
  if (mode === "quick" || mode === "complete") return mode;
  return undefined;
}

export default async function DiagnosticoPage({ searchParams }: { searchParams?: Promise<{ mode?: string | string[] }> }) {
  const params = await searchParams;
  const initialMode = modeFromSearchParam(params?.mode);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
      <InstitutionalHero
        chips={["Horizonte", "Liquidez", "Tolerancia", "Capacidad"]}
        className="mb-10"
        description="Elige una ruta rápida o completa para cruzar conocimientos, experiencia, tolerancia psicológica y capacidad real de asumir riesgo. Todo se calcula en tu navegador durante esta sesión."
        eyebrow="Diagnóstico del inversionista"
        note="No guardamos respuestas, portafolios ni resultados individuales. Si recargas la página, la sesión se pierde. Esta es una lectura educativa, no asesoramiento financiero."
        title="Antes de mirar el mercado, conviene mirar al inversionista."
        variant="educational"
      />
      <ReadingCard title="Ficha de lectura" items={[
        { label: "Qué es", value: "Un diagnóstico educativo del inversionista que ordena horizonte, liquidez, experiencia, tolerancia psicológica, comportamiento y capacidad real para asumir riesgo." },
        { label: "Para qué sirve", value: "Sirve para diferenciar deseo de invertir, tolerancia emocional y capacidad financiera antes de tomar decisiones." },
        { label: "Límites", value: "No es una evaluación regulatoria de idoneidad o conveniencia y no guarda respuestas personales." },
        { label: "Siguiente paso", value: "Usar el resultado como punto de conversación y revisar protección, deudas o mercado según el caso." },
      ]} />
      <DiagnosticFlow initialMode={initialMode} />
    </div>
  );
}
export const metadata: Metadata = {
  title: "Diagnóstico del inversionista | Riesgo, horizonte y capacidad",
  description: "Diagnóstico educativo para ordenar horizonte, liquidez, experiencia, tolerancia psicológica, sesgos y capacidad real antes de invertir.",
};
