import { DiagnosticFlow } from "@/components/diagnostic/DiagnosticFlow";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function DiagnosticoPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:py-16">
      <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-end">
        <SectionHeader
          eyebrow="Diagnóstico del inversionista"
          title="Antes de mirar el mercado, conviene mirar al inversionista."
          subtitle="Una lectura educativa de objetivo, experiencia, tolerancia a caídas, liquidez y concentración. Las respuestas se pierden al recargar."
        />
        <DisclaimerBox>
          Este diagnóstico es educativo y se basa en tus respuestas durante esta sesión. No constituye asesoramiento financiero, recomendación personalizada ni una propuesta de inversión.
        </DisclaimerBox>
      </div>
      <DiagnosticFlow />
    </div>
  );
}
