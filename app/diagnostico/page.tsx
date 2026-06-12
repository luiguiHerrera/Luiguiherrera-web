import { DiagnosticFlow } from "@/components/diagnostic/DiagnosticFlow";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function DiagnosticoPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
      <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-end">
        <SectionHeader
          eyebrow="Diagnóstico del inversionista"
          title="Antes de mirar el mercado, conviene mirar al inversionista."
          subtitle="Elige una ruta rápida o completa para cruzar conocimientos, experiencia, tolerancia psicológica y capacidad real de asumir riesgo. Todo se calcula en tu navegador durante esta sesión."
        />
        <DisclaimerBox>
          No guardamos respuestas, portafolios ni resultados individuales. Si recargas la página, la sesión se pierde. Este diagnóstico no es una evaluación formal de idoneidad ni constituye asesoramiento financiero o recomendación personalizada.
        </DisclaimerBox>
      </div>
      <DiagnosticFlow />
    </div>
  );
}
