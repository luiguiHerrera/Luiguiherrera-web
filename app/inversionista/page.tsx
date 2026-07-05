import { EditorialPathPage } from "@/components/pathways/EditorialPathPage";

const cards = [
  {
    label: "01",
    meta: "Informe",
    title: "Primer informe de julio",
    href: "/informe-julio",
    description: "Lectura de flujos, riesgo y activos multi-mercado.",
  },
  {
    label: "02",
    meta: "Reporte",
    title: "Informe semanal",
    href: "/informe-semanal",
    description: "Lectura editorial de régimen, ETFs, sectores, volatilidad, flujos, niveles y estacionalidad.",
  },
  {
    label: "03",
    meta: "Régimen",
    title: "Dashboard",
    href: "/dashboard",
    description: "Volatilidad, rotación sectorial, flujos y lecturas cruzadas en una vista común.",
  },
  {
    label: "04",
    meta: "Histórico",
    title: "Niveles estadísticos",
    href: "/niveles-estadisticos",
    description: "Percentiles, z-scores, extensiones, drawdowns y estacionalidad para ubicar el precio.",
  },
  {
    label: "05",
    meta: "Hipótesis",
    title: "Tendencias",
    href: "/tendencias",
    description: "Cambios estructurales convertidos en mapas editoriales y vehículos observables.",
  },
  {
    label: "06",
    meta: "Quant",
    title: "Quant Lab",
    href: "/quant-lab",
    description: "Contexto de rendimiento TD3 y notas del proceso cuantitativo.",
  },
  {
    label: "07",
    meta: "DRL",
    title: "Investigación DRL",
    href: "/investigacion",
    description: "Investigación sobre aprendizaje profundo por refuerzo con costes, cash y validación estadística.",
  },
  {
    label: "08",
    meta: "Soporte",
    title: "Recursos",
    href: "/recursos",
    description: "Herramientas y scripts para complementar el proceso.",
  },
];

export default function InversionistaPage() {
  return (
    <EditorialPathPage
      actionLabel="Abrir"
      cards={cards}
      closingNote="Las herramientas avanzadas ayudan a observar contexto y documentar proceso. La decisión final sigue dependiendo de criterio, riesgo y validación propia."
      eyebrow="Camino avanzado"
      intro="Este camino reúne herramientas más avanzadas. Sirven para observar contexto, contrastar hipótesis y documentar proceso. No reemplazan criterio, gestión de riesgo ni validación propia."
      primaryCta={{ href: "/informe-semanal", label: "Leer informe semanal" }}
      secondaryCta={{ href: "/empezar", label: "Volver al camino simple" }}
      subtitle="Para explorar reportes, métricas, niveles estadísticos, tendencias e investigación cuantitativa sin convertirlos en señales automáticas."
      title="Modo inversionista"
    />
  );
}
