import { EditorialPathPage } from "@/components/pathways/EditorialPathPage";

const cards = [
  {
    label: "01",
    meta: "Flujo",
    title: "Presupuesto personal",
    href: "/presupuesto",
    description: "Ordena ingresos, gastos, protección, disfrute, inversión y crecimiento.",
  },
  {
    label: "02",
    meta: "Deuda",
    title: "Gestión de deudas",
    href: "/deudas",
    description: "Revisa si tus deudas están compitiendo contra tu flujo y tu capacidad de invertir.",
  },
  {
    label: "03",
    meta: "Para invertir",
    title: "Diagnóstico de inversión",
    href: "/diagnostico",
    description: "Úsalo cuando ya tengas más claro tu flujo, tus deudas y tu margen para asumir riesgo.",
  },
  {
    label: "04",
    meta: "Riesgo",
    title: "Protege tu dinero",
    href: "/protege-tu-dinero",
    description: "Señales de alerta antes de entregar capital.",
  },
  {
    label: "05",
    meta: "Práctica",
    title: "Prácticas de inversión",
    href: "/proteccion",
    description: "Casos cortos para entrenar preguntas antes de poner dinero en riesgo.",
  },
  {
    label: "06",
    meta: "Contexto",
    title: "Tendencias sin hype",
    href: "/tendencias",
    description: "Usa los cambios del mundo como hipótesis, no como recomendación.",
  },
];

export default function EmpezarPage() {
  return (
    <EditorialPathPage
      actionLabel="Abrir"
      cards={cards}
      closingNote="Este camino no busca simplificar en exceso. Busca ordenar el proceso: primero margen de error, luego protección, después contexto."
      eyebrow="Camino guiado"
      intro="No necesitas empezar por z-scores, FedWatch o modelos cuantitativos. Puedes comenzar por lo esencial: entender tu flujo, tus deudas, tu margen de error y después pensar en inversión."
      primaryCta={{ href: "/presupuesto", label: "Ordenar presupuesto" }}
      secondaryCta={{ href: "/inversionista", label: "Ver modo inversionista" }}
      subtitle="Un camino para ordenar decisiones antes de entrar en métricas, modelos o reportes avanzados."
      title="Empezar simple"
    />
  );
}
