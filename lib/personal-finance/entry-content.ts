export type PersonalFinanceLocale = "es" | "en";

export type PersonalFinanceRecommendationAction = {
  cta: string;
  description?: string;
  href: string;
  label?: string;
  time: string;
};

export type PersonalFinanceRecommendation = {
  actionLabel?: string;
  actions:
    | readonly [PersonalFinanceRecommendationAction]
    | readonly [PersonalFinanceRecommendationAction, PersonalFinanceRecommendationAction];
  description: string;
  eyebrow: string;
  outcomeLabel: string;
  outcomes: readonly [string, string, string];
  title: string;
};

export type PersonalFinanceRouteOption = {
  id: "budget" | "debt" | "emergency" | "readiness";
  label: string;
  recommendation: PersonalFinanceRecommendation;
};

export type PersonalFinanceEntryContent = {
  bridge: {
    description: string;
    eyebrow: string;
    resources: readonly [
      { cta: string; description: string; href: string; title: string },
      { cta: string; description: string; href: string; title: string },
    ];
    title: string;
    transition: { cta: string; href: string; label: string };
  };
  faq: {
    items: readonly { answer: string; question: string }[];
    title: string;
  };
  guidedRoute: {
    eyebrow: string;
    introduction: string;
    options: readonly [
      PersonalFinanceRouteOption,
      PersonalFinanceRouteOption,
      PersonalFinanceRouteOption,
      PersonalFinanceRouteOption,
    ];
    title: string;
  };
  hero: {
    eyebrow: string;
    imageAlt: string;
    privacy: string;
    primaryCta: string;
    subtitle: string;
    title: string;
  };
  locale: PersonalFinanceLocale;
};

export const personalFinanceEntryContent: Record<PersonalFinanceLocale, PersonalFinanceEntryContent> = {
  es: {
    locale: "es",
    hero: {
      eyebrow: "Finanzas personales",
      title: "Pon orden a tu dinero\nantes de invertir",
      subtitle: "Entiende tu flujo, reduce presión\ny decide con más criterio.",
      primaryCta: "Encontrar mi siguiente paso ↓",
      privacy: "Sin registro · Tus datos permanecen en tu navegador",
      imageAlt: "Escalinata de piedra clara que asciende entre muros arquitectónicos iluminados por luz natural.",
    },
    guidedRoute: {
      eyebrow: "Ruta guiada",
      title: "¿Qué necesitas resolver primero?",
      introduction: "Elige la situación que más se parece a la tuya.",
      options: [
        {
          id: "budget",
          label: "No sé en qué se me va el dinero.",
          recommendation: {
            eyebrow: "Tu primer paso",
            title: "Empieza por tu presupuesto",
            description: "Descubre cuánto te queda cada mes y qué gastos están reduciendo tu margen.",
            outcomeLabel: "Al terminar sabrás",
            outcomes: ["Tu margen mensual.", "Qué categorías pesan más.", "Qué revisar primero."],
            actions: [{
              time: "≈30 min · con tus cifras a mano",
              cta: "Crear mi presupuesto →",
              href: "/presupuesto",
            }],
          },
        },
        {
          id: "debt",
          label: "Mis deudas consumen demasiado ingreso.",
          recommendation: {
            eyebrow: "Tu primer paso",
            title: "Ordena tus deudas por impacto",
            description: "Compara cuánto pesa cada deuda sobre tu ingreso y cuál merece atención primero.",
            outcomeLabel: "Al terminar sabrás",
            outcomes: ["Cuánto absorben tus pagos.", "Qué deuda priorizar.", "Qué estrategias comparar."],
            actions: [{
              time: "≈30 min · con saldos y tasas a mano",
              cta: "Organizar mis deudas →",
              href: "/deudas",
            }],
          },
        },
        {
          id: "emergency",
          label: "Quiero crear un fondo de emergencia.",
          recommendation: {
            eyebrow: "Tu primer paso",
            title: "Construye tu fondo desde un margen real",
            description: "Calcula cuánto necesitas y cuánto puedes separar sin desordenar tu flujo.",
            outcomeLabel: "Al terminar sabrás",
            outcomes: ["Tu gasto esencial.", "Cuánto margen puedes destinar.", "Qué meta puedes sostener."],
            actions: [{
              time: "≈30 min · como parte de tu presupuesto",
              cta: "Planificar mi fondo desde mi presupuesto →",
              href: "/presupuesto",
            }],
          },
        },
        {
          id: "readiness",
          label: "Quiero saber si estoy preparado para invertir.",
          recommendation: {
            eyebrow: "Tu primer paso",
            title: "Revisa tu capacidad antes de asumir riesgo",
            description: "Evalúa tu base financiera, horizonte y tolerancia antes de poner capital en el mercado.",
            outcomeLabel: "Al terminar sabrás",
            outcomes: [
              "Tu nivel de preparación.",
              "Qué vulnerabilidad deberías revisar.",
              "Qué siguiente paso tiene más sentido.",
            ],
            actionLabel: "Elige la profundidad",
            actions: [
              {
                label: "Diagnóstico rápido",
                time: "≈10–15 min",
                description: "Una lectura inicial de tu preparación y del principal factor que deberías revisar.",
                cta: "Hacer diagnóstico rápido →",
                href: "/diagnostico?mode=quick",
              },
              {
                label: "Diagnóstico completo",
                time: "≈30–45 min",
                description: "Una evaluación más profunda de capacidad, experiencia, conducta, liquidez y tolerancia al riesgo.",
                cta: "Hacer diagnóstico completo →",
                href: "/diagnostico?mode=complete",
              },
            ],
          },
        },
      ],
    },
    bridge: {
      eyebrow: "Antes de pasar al mercado",
      title: "Practica y protege tus decisiones",
      description: "Dos recursos para pasar de ordenar tus finanzas a evaluar decisiones con más criterio.",
      resources: [
        {
          title: "Simulador de decisiones financieras",
          description: "Ensaya escenarios antes de comprometer capital.",
          cta: "Practicar una decisión →",
          href: "/proteccion",
        },
        {
          title: "Protege tu dinero",
          description: "Detecta señales de alerta antes de entregar capital.",
          cta: "Revisar señales de alerta →",
          href: "/protege-tu-dinero",
        },
      ],
      transition: {
        label: "Cuando tu base esté en orden:",
        cta: "Conoce el mercado →",
        href: "/inversionista",
      },
    },
    faq: {
      title: "Preguntas frecuentes",
      items: [
        {
          question: "¿Por dónde empiezo si nunca he organizado mis finanzas?",
          answer: "Empieza por identificar cuánto entra, cuánto sale y qué compromisos reducen tu margen. La ruta guiada te lleva al presupuesto, las deudas o el diagnóstico según tu situación.",
        },
        {
          question: "¿Necesito crear una cuenta?",
          answer: "No. Puedes usar esta ruta y las herramientas enlazadas sin crear una cuenta.",
        },
        {
          question: "¿Guardamos tus datos financieros?",
          answer: "No. Los datos que introduces en presupuesto, deudas y diagnóstico se calculan durante la sesión en tu navegador y no se envían a nuestros servidores.",
        },
        {
          question: "¿Debo pagar mis deudas antes de invertir?",
          answer: "No existe una respuesta universal. Depende del coste de la deuda, tu estabilidad, liquidez y capacidad de pago. La herramienta ayuda a comparar esas variables; no sustituye asesoría personalizada.",
        },
      ],
    },
  },
  en: {
    locale: "en",
    hero: {
      eyebrow: "Personal finance",
      title: "Get your finances in order\nbefore investing",
      subtitle: "Understand your cash flow, reduce pressure,\nand make better decisions.",
      primaryCta: "Find my next step ↓",
      privacy: "No sign-up · Your data stays in your browser",
      imageAlt: "A pale architectural staircase rising through a spacious, luminous interior.",
    },
    guidedRoute: {
      eyebrow: "Guided path",
      title: "What do you need to solve first?",
      introduction: "Choose the option that best matches your situation.",
      options: [
        {
          id: "budget",
          label: "I do not know where my money goes.",
          recommendation: {
            eyebrow: "Your first step",
            title: "Start with your budget",
            description: "See what remains each month and which expenses are reducing your margin.",
            outcomeLabel: "By the end, you will know",
            outcomes: ["Your monthly margin.", "Which categories take the biggest share.", "What to review first."],
            actions: [{
              time: "≈30 min · with your figures at hand",
              cta: "Build my budget →",
              href: "/en/budget",
            }],
          },
        },
        {
          id: "debt",
          label: "My debt takes up too much of my income.",
          recommendation: {
            eyebrow: "Your first step",
            title: "Prioritize your debt by impact",
            description: "Compare how much each debt weighs on your income and which one needs attention first.",
            outcomeLabel: "By the end, you will know",
            outcomes: ["How much your payments consume.", "Which debt to prioritize.", "Which strategies to compare."],
            actions: [{
              time: "≈30 min · with balances and rates at hand",
              cta: "Organize my debts →",
              href: "/en/debt",
            }],
          },
        },
        {
          id: "emergency",
          label: "I want to build an emergency fund.",
          recommendation: {
            eyebrow: "Your first step",
            title: "Build your emergency fund from a realistic margin",
            description: "Calculate what you need and what you can set aside without disrupting your cash flow.",
            outcomeLabel: "By the end, you will know",
            outcomes: ["Your essential spending.", "How much margin you can allocate.", "What target you can sustain."],
            actions: [{
              time: "≈30 min · as part of your budget",
              cta: "Plan my fund through my budget →",
              href: "/en/budget",
            }],
          },
        },
        {
          id: "readiness",
          label: "I want to know whether I am ready to invest.",
          recommendation: {
            eyebrow: "Your first step",
            title: "Review your capacity before taking risk",
            description: "Review your financial base, horizon and tolerance before putting capital into the market.",
            outcomeLabel: "By the end, you will know",
            outcomes: [
              "Your level of readiness.",
              "Which vulnerability to review.",
              "What next step makes sense.",
            ],
            actionLabel: "Choose the depth",
            actions: [
              {
                label: "Quick assessment",
                time: "≈10–15 min",
                description: "An initial view of your readiness and the main factor you should review.",
                cta: "Take quick assessment →",
                href: "/en/diagnostic?mode=quick",
              },
              {
                label: "Complete assessment",
                time: "≈30–45 min",
                description: "A deeper assessment of capacity, experience, behavior, liquidity and risk tolerance.",
                cta: "Take complete assessment →",
                href: "/en/diagnostic?mode=complete",
              },
            ],
          },
        },
      ],
    },
    bridge: {
      eyebrow: "Before entering the market",
      title: "Practice and protect your decisions",
      description: "Two resources to help you move from organizing your finances to evaluating decisions with greater clarity.",
      resources: [
        {
          title: "Financial decision simulator",
          description: "Test scenarios before committing capital.",
          cta: "Practice a decision →",
          href: "/en/protection",
        },
        {
          title: "Protect your money",
          description: "Identify warning signs before handing over capital.",
          cta: "Review warning signs →",
          href: "/en/protect-your-money",
        },
      ],
      transition: {
        label: "When your financial base is in order:",
        cta: "Know the market →",
        href: "/en/investor",
      },
    },
    faq: {
      title: "Frequently asked questions",
      items: [
        {
          question: "Where should I start if I have never organized my finances?",
          answer: "Start by identifying what comes in, what goes out and which commitments reduce your margin. The guided path directs you to budgeting, debt or the assessment based on your situation.",
        },
        {
          question: "Do I need to create an account?",
          answer: "No. You can use this path and the linked tools without creating an account.",
        },
        {
          question: "Do we store your financial data?",
          answer: "No. The information you enter in the budget, debt and assessment tools is calculated during the session in your browser and is not sent to our servers.",
        },
        {
          question: "Should I pay off debt before investing?",
          answer: "There is no universal answer. It depends on the cost of the debt, your stability, liquidity and ability to pay. The tool helps compare those variables; it does not replace personalized advice.",
        },
      ],
    },
  },
};

export const personalFinanceDefaultOptionId: PersonalFinanceRouteOption["id"] = "budget";

export function nextPersonalFinanceOptionIndex(
  currentIndex: number,
  key: string,
  optionCount: number,
) {
  if (optionCount < 1) return currentIndex;
  if (key === "Home") return 0;
  if (key === "End") return optionCount - 1;
  if (key === "ArrowDown" || key === "ArrowRight") return (currentIndex + 1) % optionCount;
  if (key === "ArrowUp" || key === "ArrowLeft") return (currentIndex - 1 + optionCount) % optionCount;
  return currentIndex;
}
