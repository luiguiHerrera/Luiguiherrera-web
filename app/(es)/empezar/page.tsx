import { StartPathPage, type StartPathContent } from "@/components/pathways/StartPathPage";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/empezar");

const content: StartPathContent = {
  locale: "es",
  hero: {
    eyebrow: "Camino guiado",
    title: "Pon orden a tu dinero antes de invertir",
    subtitle:
      "Crea tu presupuesto, organiza tus deudas o revisa si estás preparado para invertir. Sin registro y sin que tus datos salgan del navegador.",
    guarantee: "Sin registro · Tus datos no salen del navegador",
  },
  primaryActions: [
    {
      label: "Crear mi presupuesto",
      href: "/presupuesto",
      description: "Organiza ingresos, gastos y compromisos para conocer tu margen mensual.",
    },
    {
      label: "Organizar mis deudas",
      href: "/deudas",
      description: "Introduce tus deudas y compara distintas formas de priorizar los pagos.",
    },
  ],
  orientation: {
    title: "¿No sabes por dónde empezar?",
    items: [
      {
        situation: "No sé en qué se me va el dinero.",
        href: "/presupuesto",
        destinationLabel: "Ir al presupuesto",
      },
      {
        situation: "Mis deudas consumen demasiado ingreso.",
        href: "/deudas",
        destinationLabel: "Revisar mis deudas",
      },
      {
        situation: "Quiero crear un colchón de seguridad.",
        href: "/presupuesto",
        destinationLabel: "Ir al presupuesto",
        support: "Calcula primero tu margen mensual y la cobertura de tu ahorro disponible.",
      },
      {
        situation: "Quiero saber si estoy preparado para invertir.",
        href: "/diagnostico?mode=quick",
        destinationLabel: "Abrir diagnóstico rápido",
      },
    ],
  },
  learning: {
    actionLabel: "Abrir",
    title: "Aprender y profundizar",
    introduction:
      "No necesitas empezar por z-scores o modelos cuantitativos. Puedes comenzar por lo esencial: entender tu flujo, tus deudas, tu margen de error y después pensar en inversión.",
    purpose:
      "Esta ruta sirve para empezar por situación personal, flujo, deuda, margen de seguridad y criterio.",
    links: [
      {
        meta: "Diagnóstico",
        label: "Diagnóstico completo",
        href: "/diagnostico?mode=complete",
        description: "Evaluación más profunda por capacidad, objetivos, conducta y consistencia.",
      },
      {
        meta: "Práctica",
        label: "Simulador de decisiones financieras",
        href: "/proteccion",
        description: "Casos cortos para entrenar preguntas antes de poner dinero en riesgo.",
      },
      {
        meta: "Alertas",
        label: "Alertas para tu dinero",
        href: "/protege-tu-dinero",
        description: "Señales de alerta antes de entregar capital.",
      },
      {
        meta: "Siguiente nivel",
        label: "Ver modo inversionista",
        href: "/inversionista",
        description: "Accede a herramientas educativas de mercado e investigación.",
      },
    ],
    closingNote:
      "Este camino no busca simplificar en exceso. Busca ordenar el proceso: primero margen de error, luego protección, después contexto.",
  },
  faq: {
    title: "Preguntas frecuentes",
    items: [
      {
        question: "¿Por dónde empiezo si nunca he organizado mis finanzas?",
        answer:
          "Esta es una ruta guiada para ordenar diagnóstico, presupuesto, deudas, decisiones financieras y alertas antes de invertir. Puedes empezar por tu presupuesto o tus deudas y avanzar después hacia diagnóstico y protección.",
      },
      {
        question: "¿Necesito crear una cuenta?",
        answer: "No. Puedes utilizar esta ruta y sus herramientas sin crear una cuenta.",
      },
      {
        question: "¿Mis datos financieros salen del navegador?",
        answer:
          "No. Los datos financieros que introduces en las herramientas se procesan en tu navegador y no se envían a un servidor.",
      },
      {
        question: "¿Debo pagar mis deudas antes de invertir?",
        answer:
          "No necesariamente. El orden depende de tu estabilidad, el coste de la deuda, tu capacidad de pago y la protección disponible. Este contenido no evalúa una situación personal completa ni reemplaza asesoría financiera, fiscal o legal.",
      },
    ],
  },
};

export default function EmpezarPage() {
  return <StartPathPage content={content} />;
}
