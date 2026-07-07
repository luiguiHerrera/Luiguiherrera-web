import { EditorialPathPage } from "@/components/pathways/EditorialPathPage";

const cards = [
  {
    label: "01",
    meta: "Base",
    title: "Diagnóstico rápido",
    href: "/diagnostico",
    description: "Evalúa tu punto de partida sin guardar respuestas.",
  },
  {
    label: "02",
    meta: "Flujo",
    title: "Presupuesto personal",
    href: "/presupuesto",
    description: "Compara tu distribución actual con un modelo ideal y aterrízalo a una versión realista.",
  },
  {
    label: "03",
    meta: "Próximo bloque",
    title: "Gestión de deudas",
    href: "/deudas",
    description: "Una deuda cara puede competir contra cualquier inversión incierta. Ordena el costo, el flujo y el margen de seguridad.",
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
    description: "Casos realistas para practicar decisiones sin poner dinero en riesgo.",
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
      intro="No necesitas empezar por z-scores, FedWatch o modelos cuantitativos. Puedes comenzar por lo esencial: entender tu margen de error, detectar riesgos evidentes y construir un proceso más limpio."
      primaryCta={{ href: "/diagnostico", label: "Hacer diagnóstico rápido" }}
      secondaryCta={{ href: "/inversionista", label: "Ver modo inversionista" }}
      subtitle="Un camino para ordenar decisiones antes de entrar en métricas, modelos o reportes avanzados."
      title="Empezar simple"
    />
  );
}
