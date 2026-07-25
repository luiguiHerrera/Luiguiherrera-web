import { StatLevelsLab } from "@/components/statistical-levels/StatLevelsLab";
import type { Metadata } from "next";
import { ReadingCard } from "@/components/seo/ReadingCard";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";
import { getStatisticalLevelsPageData } from "@/lib/statistical-levels/get-statistical-levels-data";

type NivelesEstadisticosPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function daysSince(dateValue: string | null | undefined) {
  if (!dateValue) return null;
  const parsed = new Date(`${dateValue}T00:00:00Z`).getTime();
  if (!Number.isFinite(parsed)) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.floor((todayUtc - parsed) / 86400000);
}

export default async function NivelesEstadisticosPage({ searchParams }: NivelesEstadisticosPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { asset, manifest, seasonality, selection } = await getStatisticalLevelsPageData(resolvedSearchParams);
  const staleDays = daysSince(manifest.generatedAt);
  const isStale = staleDays !== null && staleDays > 7;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-5 md:py-14">
      <InstitutionalHero
        chips={["Percentiles", "Z-scores", "Extensiones", "Drawdowns", "Estacionalidad"]}
        description="Compara percentiles, z-scores, extensiones, rangos, drawdowns y estacionalidad de ETFs, oro, cripto, sectores y mercados internacionales."
        eyebrow="Laboratorio cuantitativo"
        note="Lectura educativa. No constituye asesoría financiera ni instrucción operativa."
        title="Laboratorio de niveles estadísticos"
        variant="research"
      />

      <ReadingCard attached title="Ficha de lectura" items={[
        { label: "Qué es", value: "Un laboratorio de niveles estadísticos que compara activos contra su propio historial mediante percentiles, z-scores, extensiones, rangos, drawdowns y estacionalidad." },
        { label: "Para qué sirve", value: "Sirve para ubicar si un activo está cerca de zonas históricamente altas, bajas o normales sin convertirlo en señal automática." },
        { label: "Fuentes principales", value: "Series históricas precalculadas por activo y metodología interna de ventanas estadísticas." },
        { label: "Límites", value: "Los niveles son descriptivos, dependen del historial disponible y no indican por sí solos cuándo comprar o vender." },
      ]} />

      <div className="mt-6 grid gap-4 border-y border-line py-4 text-sm leading-6 text-muted md:mt-8 md:grid-cols-4 md:py-5">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Último dato de mercado</span>
          <span className="mt-1 block font-semibold text-ink">{manifest.generatedAt}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Snapshot generado</span>
          <span className="mt-1 block font-semibold text-ink">{manifest.snapshotGeneratedAt ?? "No registrado en este snapshot"}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Fuente</span>
          <a href={manifest.sourceUrl} className="mt-1 inline-block font-semibold text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
            Datos de mercado de fuentes abiertas procesados en build estático · proveedor según disponibilidad · cálculos propios.
          </a>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Límite metodológico</span>
          <span className="mt-1 block text-ink">No implica dirección futura; solo posición frente al historial.</span>
        </div>
        {isStale ? (
          <div className="border-l border-brass/40 pl-3 text-brass md:col-span-4">
            Datos pendientes de actualización automática.
          </div>
        ) : null}
      </div>

      <div className="mt-6 min-w-0 max-w-full overflow-x-hidden md:mt-8">
        <StatLevelsLab asset={asset} manifest={manifest} seasonality={seasonality} selection={selection} />
      </div>
    </div>
  );
}
export const metadata: Metadata = {
  title: "Niveles estadísticos | Percentiles, z-scores y estacionalidad",
  description: "Laboratorio de niveles estadísticos para comparar activos por percentil, z-score, extensión, rango histórico, drawdown y estacionalidad.",
};
