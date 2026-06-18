import { StatLevelsLab } from "@/components/statistical-levels/StatLevelsLab";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getStatisticalLevelsPageData } from "@/lib/statistical-levels/get-statistical-levels-data";

type NivelesEstadisticosPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NivelesEstadisticosPage({ searchParams }: NivelesEstadisticosPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { asset, manifest, seasonality, selection } = await getStatisticalLevelsPageData(resolvedSearchParams);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-5 md:py-14">
      <div className="grid gap-5 md:gap-8 lg:grid-cols-[1fr_0.76fr] lg:items-end">
        <SectionHeader
          eyebrow="Laboratorio"
          title="Laboratorio de niveles estadísticos"
          subtitle="Selecciona un activo y compara su posición actual frente a distintas ventanas de su propio historial."
        />
        <DisclaimerBox>
          Lectura educativa. No constituye asesoría financiera ni instrucción operativa.
        </DisclaimerBox>
      </div>

      <div className="mt-6 grid gap-4 border-y border-line py-4 text-sm leading-6 text-muted md:mt-8 md:grid-cols-3 md:py-5">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Datos actualizados hasta</span>
          <span className="mt-1 block font-semibold text-ink">{manifest.generatedAt}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Fuente</span>
          <a href={manifest.sourceUrl} className="mt-1 inline-block font-semibold text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
            Datos públicos de mercado procesados en build estático · proveedor según disponibilidad · cálculos propios.
          </a>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Límite metodológico</span>
          <span className="mt-1 block text-ink">No implica dirección futura; solo posición frente al historial.</span>
        </div>
      </div>

      <div className="mt-6 md:mt-8">
        <StatLevelsLab asset={asset} manifest={manifest} seasonality={seasonality} selection={selection} />
      </div>
    </div>
  );
}
