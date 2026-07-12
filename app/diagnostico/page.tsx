import { DiagnosticFlow } from "@/components/diagnostic/DiagnosticFlow";
import type { Metadata } from "next";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { DiagnosticMode } from "@/lib/diagnostic/types";

function modeFromSearchParam(mode: string | string[] | undefined): DiagnosticMode | undefined {
  if (mode === "quick" || mode === "complete") return mode;
  return undefined;
}

export default async function DiagnosticoPage({ searchParams }: { searchParams?: Promise<{ mode?: string | string[] }> }) {
  const params = await searchParams;
  const initialMode = modeFromSearchParam(params?.mode);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
      <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-end">
        <SectionHeader
          eyebrow="Diagnóstico del inversionista"
          title="Antes de mirar el mercado, conviene mirar al inversionista."
          subtitle="Elige una ruta rápida o completa para cruzar conocimientos, experiencia, tolerancia psicológica y capacidad real de asumir riesgo. Todo se calcula en tu navegador durante esta sesión."
        />
        <DisclaimerBox>
          No guardamos respuestas, portafolios ni resultados individuales. Si recargas la página, la sesión se pierde. Este diagnóstico es una lectura educativa de preparación actual y no constituye asesoramiento financiero o recomendación personalizada.
        </DisclaimerBox>
      </div>
      <DiagnosticFlow initialMode={initialMode} />
    </div>
  );
}
export const metadata: Metadata = {
  title: "Diagnóstico del inversionista | Riesgo, horizonte y capacidad",
  description: "Diagnóstico educativo para ordenar horizonte, liquidez, experiencia, tolerancia psicológica, sesgos y capacidad real antes de invertir.",
};
