import { TrendsExplorer } from "@/components/trends/TrendsExplorer";
import { trendsContent } from "@/lib/trends/trends-content";
import { ReadingCard } from "@/components/seo/ReadingCard";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/tendencias");

export default function TendenciasPage() {
  return <TrendsExplorer content={trendsContent.es} readingCard={<ReadingCard attached title="Ficha de lectura" items={[
    { label: "Qué es", value: "Un marco educativo para convertir tendencias como IA, robótica, energía, ciberseguridad, cripto e infraestructura en hipótesis prudentes." },
    { label: "Para qué sirve", value: "Sirve para separar narrativa, vehículo, precio, captura de valor, riesgo y rol dentro de un portafolio." },
    { label: "Límites", value: "Una tendencia real puede ser una mala inversión si el precio, el vehículo o el horizonte no encajan." },
    { label: "Siguiente paso", value: "Contrastar la tendencia con niveles estadísticos, metodología y contexto de mercado." },
  ]} />} />;
}
