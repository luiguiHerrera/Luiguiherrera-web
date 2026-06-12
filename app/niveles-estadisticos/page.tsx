import { StatLevelsLab } from "@/components/statistical-levels/StatLevelsLab";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { statisticalLevelsData } from "@/lib/statistical-levels/generated-data";

export default function NivelesEstadisticosPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.76fr] lg:items-end">
        <SectionHeader
          eyebrow="Laboratorio"
          title="Laboratorio de niveles estadísticos"
          subtitle="Selecciona activos y compara su posición actual frente a distintas ventanas de su propio historial."
        />
        <DisclaimerBox>
          Lectura educativa. No constituye asesoría financiera ni instrucción operativa.
        </DisclaimerBox>
      </div>

      <div className="mt-8 grid gap-4 border-y border-line py-5 text-sm leading-6 text-muted md:grid-cols-3">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Datos actualizados hasta</span>
          <span className="mt-1 block font-semibold text-ink">{statisticalLevelsData.generatedAt}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Fuente</span>
          <a href={statisticalLevelsData.sourceUrl} className="mt-1 inline-block font-semibold text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
            {statisticalLevelsData.source}
          </a>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Límite metodológico</span>
          <span className="mt-1 block text-ink">No implica dirección futura; solo posición frente al historial.</span>
        </div>
      </div>

      <div className="mt-8">
        <StatLevelsLab />
      </div>
    </div>
  );
}
