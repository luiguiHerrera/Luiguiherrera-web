import { StartPathPage, type StartPathContent } from "@/components/pathways/StartPathPage";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/empezar");

const content: StartPathContent = {
  locale: "es",
  hero: {
    eyebrow: "Camino guiado",
    title: "Pon orden a tu dinero antes de invertir",
    subtitle:
      "Crea tu presupuesto, organiza tus deudas o revisa si estás preparado para invertir. Sin registro: no guardamos los datos financieros que introduces.",
    guarantee: "Sin registro · No guardamos los datos financieros que introduces",
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
        situation: "Quiero crear un fondo de emergencia.",
        href: "/presupuesto",
        destinationLabel: "Ir al presupuesto",
        support: "Empieza calculando cuánto te queda cada mes y cuánto ahorro tienes disponible.",
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
        label: "Conoce tu perfil como inversionista",
        href: "/diagnostico?mode=complete",
        description:
          "Un cuestionario educativo para entender tu capacidad financiera, tus objetivos y cómo tomas decisiones al invertir.",
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
        question: "¿Guardamos tus datos financieros?",
        answer:
          "No. Tus ingresos, gastos y deudas se calculan directamente en tu navegador. No guardamos los datos financieros que introduces ni los enviamos a nuestros servidores.",
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
