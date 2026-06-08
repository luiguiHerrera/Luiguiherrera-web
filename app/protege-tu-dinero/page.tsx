import { RedFlagsChecklist } from "@/components/red-flags/RedFlagsChecklist";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function ProtegeTuDineroPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:py-16">
      <div className="mb-10">
        <SectionHeader
          eyebrow="Detector de red flags"
          title="Protege tu dinero"
          subtitle="Antes de perseguir rentabilidad, conviene revisar si la oportunidad tiene señales de alarma."
        />
      </div>
      <RedFlagsChecklist />
    </div>
  );
}
