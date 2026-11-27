import { DiagnosticFlow } from "@/components/diagnostic/DiagnosticFlow";
import type { DiagnosticMode } from "@/lib/diagnostic/types";
import { DiagnosticReadingGuide } from "@/components/diagnostic/DiagnosticReadingGuide";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";
import { getRouteMetadata } from "@/lib/seo/site";

function modeFromSearchParam(mode: string | string[] | undefined): DiagnosticMode | undefined {
  if (mode === "quick" || mode === "complete") return mode;
  return undefined;
}

export default async function DiagnosticoPage({ searchParams }: { searchParams?: Promise<{ mode?: string | string[]; restart?: string | string[] }> }) {
  const params = await searchParams;
  const initialMode = modeFromSearchParam(params?.mode);
  const restartToken = Array.isArray(params?.restart) ? params.restart[0] : params?.restart;

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
      <DiagnosticReadingGuide />
      <DiagnosticFlow key={`${initialMode ?? "none"}:${restartToken ?? ""}`} initialMode={initialMode} />
    </div>
  );
}
export const metadata = getRouteMetadata("/diagnostico");
