import { EditorialPathPage } from "@/components/pathways/EditorialPathPage";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/inversionista");

const cards = [
  {
    label: "01",
    meta: "Régimen",
    title: "Dashboard",
    href: "/dashboard",
    description: "Volatilidad, rotación sectorial, flujos y lecturas cruzadas en una vista común.",
  },
  {
    label: "02",
    meta: "Informes",
    title: "Informes",
    href: "/informes",
    description: "Lecturas de mercado, flujos, riesgo y activos multi-mercado.",
  },
  {
    label: "03",
    meta: "Histórico",
    title: "Niveles estadísticos",
    href: "/niveles-estadisticos",
    description: "Percentiles, z-scores, extensiones, drawdowns y estacionalidad para ubicar el precio.",
  },
  {
    label: "04",
    meta: "Hipótesis",
    title: "Tendencias",
    href: "/tendencias",
    description: "Cambios estructurales convertidos en mapas editoriales y vehículos observables.",
  },
  {
    label: "05",
    meta: "DRL",
    title: "Investigación TD3",
    href: "/investigacion/td3",
    description: "Investigación sobre aprendizaje profundo por refuerzo con costes, cash y validación estadística.",
  },
];

export default function InversionistaPage() {
  return (
    <EditorialPathPage
      actionLabel="Abrir"
      cards={cards}
      closingNote="Las herramientas avanzadas ayudan a observar contexto y documentar proceso. La decisión final sigue dependiendo de criterio, riesgo y validación propia."
      eyebrow="Camino avanzado"
      heroChips={["Régimen", "Informes", "Niveles", "Hipótesis"]}
      heroVariant="executive"
      intro="Este camino reúne herramientas más avanzadas. Sirven para observar contexto, contrastar hipótesis y documentar proceso. No reemplazan criterio, gestión de riesgo ni validación propia."
      primaryCta={{ href: "/dashboard", label: "Abrir dashboard" }}
      secondaryCta={{ href: "/empezar", label: "Volver a Empezar" }}
      subtitle="Para explorar informes, métricas, niveles estadísticos, tendencias e investigación cuantitativa sin convertirlos en señales automáticas."
      title="Área inversionista"
    />
  );
}
