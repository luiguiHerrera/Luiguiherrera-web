export type PersonalFinanceLocale = "es" | "en";

export type PersonalFinanceRecommendation = {
  cta: string;
  description: string;
  eyebrow: string;
  href: string;
  metadata: string;
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
            metadata: "2–4 min · Sin registro",
            cta: "Crear mi presupuesto →",
            href: "/presupuesto",
          },
        },
        {
          id: "debt",
          label: "Mis deudas consumen demasiado ingreso.",
          recommendation: {
            eyebrow: "Tu primer paso",
            title: "Ordena primero tus deudas",
            description: "Compara cuotas, tasas y presión sobre tu ingreso antes de decidir qué deuda atacar primero.",
            outcomeLabel: "Al terminar sabrás",
            outcomes: ["Cuánto absorben tus pagos.", "Qué deuda priorizar.", "Qué estrategias comparar."],
            metadata: "3–5 min · Tus datos no se guardan",
            cta: "Organizar mis deudas →",
            href: "/deudas",
          },
        },
        {
          id: "emergency",
          label: "Quiero crear un fondo de emergencia.",
          recommendation: {
            eyebrow: "Tu primer paso",
            title: "Primero calcula tu margen real",
            description: "Antes de fijar una meta, identifica tu gasto esencial y el margen que puedes sostener.",
            outcomeLabel: "Al terminar sabrás",
            outcomes: ["Cuál es tu gasto base.", "Cuánto puedes aportar.", "Qué meta es realista."],
            metadata: "2–4 min · Sin registro",
            cta: "Ir al presupuesto →",
            href: "/presupuesto",
          },
        },
        {
          id: "readiness",
          label: "Quiero saber si estoy preparado para invertir.",
          recommendation: {
            eyebrow: "Tu primer paso",
            title: "Haz un diagnóstico rápido",
            description: "Evalúa liquidez, deuda, margen y horizonte antes de poner capital en el mercado.",
            outcomeLabel: "Al terminar sabrás",
            outcomes: [
              "Si tu base financiera es estable.",
              "Qué vulnerabilidad deberías resolver.",
              "Qué paso tiene más sentido ahora.",
            ],
            metadata: "4–6 min · Resultado educativo",
            cta: "Abrir diagnóstico rápido →",
            href: "/diagnostico?mode=quick",
          },
        },
      ],
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
            metadata: "2–4 min · No account required",
            cta: "Build my budget →",
            href: "/en/budget",
          },
        },
        {
          id: "debt",
          label: "My debt takes up too much of my income.",
          recommendation: {
            eyebrow: "Your first step",
            title: "Put your debts in order first",
            description: "Compare payments, rates and pressure on your income before choosing what to tackle first.",
            outcomeLabel: "By the end, you will know",
            outcomes: ["How much your payments consume.", "Which debt to prioritize.", "Which strategies to compare."],
            metadata: "3–5 min · Your data is not stored",
            cta: "Organize my debts →",
            href: "/en/debt",
          },
        },
        {
          id: "emergency",
          label: "I want to build an emergency fund.",
          recommendation: {
            eyebrow: "Your first step",
            title: "First calculate your real margin",
            description: "Before setting a goal, identify your essential spending and the margin you can sustain.",
            outcomeLabel: "By the end, you will know",
            outcomes: ["Your essential spending.", "What you can contribute.", "What target is realistic."],
            metadata: "2–4 min · No account required",
            cta: "Go to budget →",
            href: "/en/budget",
          },
        },
        {
          id: "readiness",
          label: "I want to know whether I am ready to invest.",
          recommendation: {
            eyebrow: "Your first step",
            title: "Take a quick assessment",
            description: "Review liquidity, debt, margin and horizon before putting capital into the market.",
            outcomeLabel: "By the end, you will know",
            outcomes: [
              "Whether your financial base is stable.",
              "Which vulnerability to address.",
              "What next step makes sense.",
            ],
            metadata: "4–6 min · Educational result",
            cta: "Open quick assessment →",
            href: "/en/diagnostic?mode=quick",
          },
        },
      ],
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
