import { EditorialPathPage } from "@/components/pathways/EditorialPathPage";
import type { Metadata } from "next";
import { ReadingCard } from "@/components/seo/ReadingCard";

export const metadata: Metadata = {
  title: "Empezar a invertir | Ruta guiada de preparación financiera",
  description: "Ruta guiada para ordenar presupuesto, deudas, diagnóstico, protección y prácticas antes de invertir.",
};

const cards = [
  {
    label: "01",
    meta: "Rápido",
    title: "Diagnóstico rápido",
    href: "/diagnostico?mode=quick",
    description: "Lectura compacta de horizonte, liquidez, tolerancia y sesgos principales.",
  },
  {
    label: "02",
    meta: "Completo",
    title: "Diagnóstico completo",
    href: "/diagnostico?mode=complete",
    description: "Evaluación más profunda por capacidad, objetivos, conducta y consistencia.",
  },
  {
    label: "03",
    meta: "Flujo",
    title: "Presupuesto personal",
    href: "/presupuesto",
    description: "Ordena ingresos, gastos, protección, disfrute, inversión y crecimiento.",
  },
  {
    label: "04",
    meta: "Deuda",
    title: "Gestión de deudas",
    href: "/deudas",
    description: "Revisa si tus deudas están compitiendo contra tu flujo y tu capacidad de invertir.",
  },
  {
    label: "05",
    meta: "Práctica",
    title: "Simulador de decisiones financieras",
    href: "/proteccion",
    description: "Casos cortos para entrenar preguntas antes de poner dinero en riesgo.",
  },
  {
    label: "06",
    meta: "Alertas",
    title: "Alertas para tu dinero",
    href: "/protege-tu-dinero",
    description: "Señales de alerta antes de entregar capital.",
  },
];

export default function EmpezarPage() {
  return (
    <EditorialPathPage
      actionLabel="Abrir"
      cards={cards}
      closingNote="Este camino no busca simplificar en exceso. Busca ordenar el proceso: primero margen de error, luego protección, después contexto."
      eyebrow="Camino guiado"
      heroChips={["Diagnóstico", "Flujo", "Deuda", "Protección"]}
      intro="No necesitas empezar por z-scores, FedWatch o modelos cuantitativos. Puedes comenzar por lo esencial: entender tu flujo, tus deudas, tu margen de error y después pensar en inversión."
      primaryCta={{ href: "/diagnostico?mode=quick", label: "Empezar diagnóstico" }}
      secondaryCta={{ href: "/inversionista", label: "Ver modo inversionista" }}
      subtitle="Ruta guiada para ordenar diagnóstico, presupuesto, deudas y protección antes de invertir."
      title="Ordena lo esencial"
      readingCard={<ReadingCard title="Ficha de lectura" items={[
        { label: "Qué es", value: "Una ruta guiada para ordenar diagnóstico, presupuesto, deudas, decisiones financieras y alertas antes de invertir." },
        { label: "Para qué sirve", value: "Sirve para empezar por situación personal, flujo, deuda, margen de seguridad y criterio." },
        { label: "Límites", value: "No evalúa una situación personal completa ni reemplaza asesoría financiera, fiscal o legal." },
        { label: "Siguiente paso", value: "Empezar por el diagnóstico rápido y avanzar hacia diagnóstico completo, presupuesto, deudas y protección." },
      ]} />}
    />
  );
}
