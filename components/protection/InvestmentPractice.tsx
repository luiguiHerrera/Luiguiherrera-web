"use client";

import { useState } from "react";

type Locale = "es" | "en";

type PracticeCase = {
  classification: string;
  options: string[];
  questions: string[];
  reading: string;
  signals: string[];
  situation: string;
  title: string;
};

const practiceCases: Record<Locale, PracticeCase[]> = {
  es: [
    {
      title: "Rentabilidad demasiado perfecta",
      situation: "Te ofrecen una inversión que promete 24% anual, bajo riesgo y cupos limitados hasta mañana.",
      options: [
        "Entrar rápido para no perder el cupo.",
        "Pedir cómo genera retorno, quién custodia el dinero y qué riesgos existen.",
        "Invertir poco para probar.",
      ],
      reading:
        "La combinación de rentabilidad alta, bajo riesgo y urgencia comercial merece revisión. La primera pregunta no es cuánto paga, sino cómo se genera el retorno, quién custodia el capital, qué regulación existe, cómo se sale y qué escenario puede salir mal.",
      signals: ["retorno alto", "urgencia", "bajo riesgo declarado", "falta de explicación del mecanismo"],
      questions: [
        "¿De dónde sale el retorno?",
        "¿Quién custodia el dinero?",
        "¿Qué entidad regula o supervisa?",
        "¿Cómo recupero el capital?",
        "¿Qué pasa si el escenario falla?",
      ],
      classification: "Estudiar más / Evitar presión",
    },
    {
      title: "Deuda cara antes de invertir",
      situation: "Tienes una deuda de tarjeta al 22% anual, pero quieres invertir porque viste una oportunidad que podría subir.",
      options: [
        "Invertir igual, porque la oportunidad puede rendir más.",
        "Comparar el costo seguro de la deuda contra el retorno incierto de la inversión.",
        "Pedir otro crédito para no dejar pasar la oportunidad.",
      ],
      reading:
        "Una deuda cara funciona como una rentabilidad negativa bastante exigente. Antes de buscar retorno incierto, conviene ordenar la base: liquidez, deuda cara y margen de error.",
      signals: ["costo financiero alto", "presión por oportunidad", "base financiera frágil"],
      questions: [
        "¿Cuánto me cuesta la deuda después de comisiones?",
        "¿Qué retorno necesitaría solo para compensarla?",
        "¿Qué pasa si la inversión cae y la deuda sigue?",
        "¿Tengo fondo de emergencia?",
      ],
      classification: "Ordenar base primero",
    },
    {
      title: "Todos están ganando",
      situation: "Un amigo te dice que todos están ganando con IA, cripto o una acción de moda. Sientes que te estás quedando fuera.",
      options: [
        "Entrar porque la tendencia es evidente.",
        "Separar la narrativa del precio, el tamaño de posición y el rol en cartera.",
        "Poner una parte grande para recuperar el tiempo perdido.",
      ],
      reading:
        "Una tendencia puede ser real y aun así estar cara, saturada o mal dimensionada para tu cartera. La pregunta no es solo si el tema es interesante, sino qué papel cumple, cuánto puedes perder y qué invalidaría la tesis.",
      signals: ["comparación social", "FOMO", "narrativa fuerte", "tamaño de posición emocional"],
      questions: [
        "¿Estoy comprando tesis o emoción?",
        "¿Qué porcentaje de mi cartera tiene sentido?",
        "¿Qué escenario invalidaría la idea?",
        "¿Es núcleo, satélite o apuesta?",
      ],
      classification: "Satélite / Apuesta pequeña / Estudiar más",
    },
    {
      title: "Todo en una sola inversión",
      situation: "Tienes casi todo tu dinero invertido en una sola empresa, fondo, inmueble o proyecto privado.",
      options: [
        "Mantenerlo porque lo conoces bien.",
        "Revisar concentración, liquidez y qué pasaría si falla.",
        "Aumentar más porque la convicción es alta.",
      ],
      reading:
        "Concentración no es solo tener una buena idea. Es depender demasiado de un solo resultado. Incluso una tesis razonable puede dañar tu plan si el tamaño, la liquidez o el horizonte no encajan.",
      signals: ["concentración", "confianza elevada", "baja diversificación", "dependencia de un solo escenario"],
      questions: [
        "¿Qué porcentaje de mi patrimonio depende de esto?",
        "¿Puedo salir si necesito liquidez?",
        "¿Qué pasa si cae 30%, 50% o queda bloqueado?",
        "¿Estoy confundiendo familiaridad con seguridad?",
      ],
      classification: "Revisar concentración",
    },
    {
      title: "Necesitas el dinero pronto",
      situation: "Necesitas usar el dinero en 6 meses, pero te ofrecen una inversión ilíquida con buena rentabilidad esperada.",
      options: [
        "Invertir porque 6 meses es suficiente.",
        "Separar dinero de corto plazo del dinero que puede asumir riesgo.",
        "Entrar y confiar en que podrás vender si hace falta.",
      ],
      reading:
        "El horizonte manda. Una inversión puede tener sentido a largo plazo y ser inadecuada para dinero que necesitas pronto. Liquidez y tiempo suelen importar más que rentabilidad esperada.",
      signals: ["horizonte corto", "iliquidez", "necesidad futura de efectivo", "posible venta forzada"],
      questions: [
        "¿Cuándo necesito realmente el dinero?",
        "¿Qué penalización hay por salir?",
        "¿Existe mercado secundario?",
        "¿Qué pasa si necesito vender en mal momento?",
      ],
      classification: "Proteger liquidez",
    },
    {
      title: "Producto moderno que no entiendes",
      situation:
        "Te presentan un producto moderno y rentable. Usa palabras como estructurado, arbitraje, inteligencia artificial, derivados o yield, pero no logras explicar cómo funciona.",
      options: [
        "Invertir porque quien lo ofrece parece experto.",
        "Pedir una explicación simple, riesgos, costos, liquidez y escenarios negativos.",
        "Entrar con una cantidad relevante para aprender en la práctica.",
      ],
      reading:
        "No entender un producto no lo convierte automáticamente en malo, pero sí cambia el proceso. Antes de poner dinero relevante, necesitas poder explicar de dónde sale el retorno, qué riesgo asumes, cuánto cuesta y cómo puedes salir.",
      signals: ["complejidad", "dependencia del vendedor", "términos técnicos", "retorno poco explicado"],
      questions: [
        "¿Puedo explicarlo en mis palabras?",
        "¿Qué pierdo si sale mal?",
        "¿Qué costos tiene?",
        "¿Qué riesgo queda oculto?",
        "¿Cómo se valora y cómo se vende?",
      ],
      classification: "Estudiar más antes de invertir",
    },
  ],
  en: [
    {
      title: "Too-perfect return",
      situation: "You are offered an investment promising 24% a year, low risk, and limited spots until tomorrow.",
      options: [
        "Move quickly so you do not lose the spot.",
        "Ask how returns are generated, who holds the money, and what risks exist.",
        "Put in a small amount just to test it.",
      ],
      reading:
        "High return, low stated risk, and commercial urgency deserve a pause. The first question is not how much it pays, but how the return is produced, who holds the capital, what oversight exists, how you exit, and what could go wrong.",
      signals: ["high return", "urgency", "low stated risk", "unclear return mechanism"],
      questions: [
        "Where does the return come from?",
        "Who has custody of the money?",
        "Which entity supervises or regulates it?",
        "How do I recover capital?",
        "What happens if the scenario fails?",
      ],
      classification: "Study more / Avoid pressure",
    },
    {
      title: "Expensive debt before investing",
      situation: "You have credit card debt at 22% a year, but you want to invest after seeing an opportunity that could rise.",
      options: [
        "Invest anyway because the opportunity may earn more.",
        "Compare the certain cost of the debt with the uncertain return of the investment.",
        "Take another loan so you do not miss the opportunity.",
      ],
      reading:
        "Expensive debt acts like a demanding negative return. Before chasing uncertain upside, it usually makes sense to organize the base: liquidity, high-cost debt, and margin of error.",
      signals: ["high financing cost", "opportunity pressure", "fragile financial base"],
      questions: [
        "What does the debt cost after fees?",
        "What return would I need just to offset it?",
        "What happens if the investment falls and the debt remains?",
        "Do I have an emergency buffer?",
      ],
      classification: "Fix the base first",
    },
    {
      title: "Everyone seems to be winning",
      situation: "A friend says everyone is making money with AI, crypto, or a popular stock. You feel left behind.",
      options: [
        "Buy because the trend is obvious.",
        "Separate the story from price, position size, and portfolio role.",
        "Put in a large amount to make up for lost time.",
      ],
      reading:
        "A trend can be real and still be expensive, crowded, or poorly sized for your portfolio. The question is not only whether the theme is interesting, but what role it plays, how much you can lose, and what would invalidate the idea.",
      signals: ["social comparison", "FOMO", "strong narrative", "emotional position sizing"],
      questions: [
        "Am I buying a thesis or an emotion?",
        "What percentage of my portfolio makes sense?",
        "What would invalidate the idea?",
        "Is it core, satellite, or a small bet?",
      ],
      classification: "Satellite / Small bet / Study more",
    },
    {
      title: "Everything in one investment",
      situation: "Almost all your money is in one company, fund, property, or private project.",
      options: [
        "Keep it because you know it well.",
        "Review concentration, liquidity, and what happens if it fails.",
        "Increase the position because conviction is high.",
      ],
      reading:
        "Concentration is not just having a good idea. It is depending too heavily on one outcome. Even a reasonable thesis can harm your plan if size, liquidity, or time horizon do not fit.",
      signals: ["concentration", "high confidence", "low diversification", "dependence on one scenario"],
      questions: [
        "What percentage of my net worth depends on this?",
        "Can I exit if I need liquidity?",
        "What happens if it falls 30%, 50%, or becomes locked?",
        "Am I confusing familiarity with safety?",
      ],
      classification: "Review concentration",
    },
    {
      title: "You need the money soon",
      situation: "You need the money in 6 months, but you are offered an illiquid investment with attractive expected return.",
      options: [
        "Invest because 6 months should be enough.",
        "Separate short-term money from money that can take risk.",
        "Enter and trust that you will be able to sell if needed.",
      ],
      reading:
        "Time horizon leads the decision. An investment can make sense over the long term and still be unsuitable for money you need soon. Liquidity and timing often matter more than expected return.",
      signals: ["short horizon", "illiquidity", "future cash need", "possible forced sale"],
      questions: [
        "When do I really need the money?",
        "What penalty applies if I exit?",
        "Is there a secondary market?",
        "What happens if I need to sell at a bad time?",
      ],
      classification: "Protect liquidity",
    },
    {
      title: "A modern product you do not understand",
      situation:
        "You are shown a modern, profitable product. It uses terms like structured, arbitrage, artificial intelligence, derivatives, or yield, but you cannot explain how it works.",
      options: [
        "Invest because the person offering it sounds expert.",
        "Ask for a simple explanation, risks, costs, liquidity, and negative scenarios.",
        "Put in a meaningful amount to learn by doing.",
      ],
      reading:
        "Not understanding a product does not automatically make it bad, but it changes the process. Before committing meaningful money, you need to explain where return comes from, what risk you take, what it costs, and how you can exit.",
      signals: ["complexity", "dependence on seller", "technical terms", "poorly explained return"],
      questions: [
        "Can I explain it in my own words?",
        "What do I lose if it goes wrong?",
        "What costs does it carry?",
        "What risk is hidden?",
        "How is it valued and sold?",
      ],
      classification: "Study more before investing",
    },
  ],
};

const copy = {
  es: {
    eyebrow: "Práctica educativa",
    title: "Prácticas de inversión",
    subtitle: "Casos cortos para entrenar mejores preguntas antes de poner dinero.",
    caseLabel: "Caso",
    decisionLabel: "¿Qué harías?",
    selectedLabel: "Tu decisión",
    readingLabel: "Lectura prudente",
    signalsLabel: "Qué mirar",
    questionsLabel: "Preguntas útiles",
    classificationLabel: "Cómo clasificarlo",
    nextLabel: "Mejor siguiente paso",
    nextText: "Bajar la velocidad, pedir información verificable y decidir solo cuando el riesgo sea comprensible.",
    note: "No busca puntuarte ni decir qué comprar. Es práctica para detectar preguntas importantes antes de invertir.",
  },
  en: {
    eyebrow: "Educational practice",
    title: "Investment practice",
    subtitle: "Short cases to practice better questions before putting money at risk.",
    caseLabel: "Case",
    decisionLabel: "What would you do?",
    selectedLabel: "Your decision",
    readingLabel: "Prudent read",
    signalsLabel: "What to watch",
    questionsLabel: "Useful questions",
    classificationLabel: "How to classify it",
    nextLabel: "Better next step",
    nextText: "Slow down, ask for verifiable information, and decide only when the risk is understandable.",
    note: "This does not rate your profile or tell you what to buy. It is practice for spotting important questions before investing.",
  },
};

export function InvestmentPractice({ locale }: { locale: Locale }) {
  const [caseIndex, setCaseIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const cases = practiceCases[locale];
  const activeCase = cases[caseIndex];
  const labels = copy[locale];

  function chooseCase(index: number) {
    setCaseIndex(index);
    setSelectedOption(null);
  }

  return (
    <section className="mt-10 max-w-full overflow-hidden rounded-[6px] border border-petrol/20 bg-[#f3efe6] p-3 shadow-[0_16px_42px_rgba(11,52,54,0.055)] sm:p-4 md:mt-12 md:p-6 lg:p-8">
      <div className="grid min-w-0 gap-7 lg:grid-cols-[0.34fr_1fr] lg:gap-10">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">{labels.eyebrow}</p>
          <h2 className="mt-3 break-words text-2xl font-semibold leading-tight text-ink sm:text-3xl md:text-4xl">{labels.title}</h2>
          <p className="mt-4 text-base leading-7 text-muted">{labels.subtitle}</p>
          <p className="mt-5 border-l border-petrol/35 pl-4 text-sm leading-6 text-muted">{labels.note}</p>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-6 lg:grid-cols-3">
            {cases.map((item, index) => {
              const active = index === caseIndex;

              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => chooseCase(index)}
                  className={`rounded-[4px] border px-3 py-2 text-left text-xs font-semibold transition ${
                    active
                      ? "border-petrol bg-petrol text-white shadow-[0_10px_22px_rgba(11,52,54,0.12)]"
                      : "border-line bg-white/70 text-muted hover:border-petrol hover:text-petrol"
                  }`}
                  aria-pressed={active}
                >
                  {labels.caseLabel} {index + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 rounded-[6px] border border-line bg-white/82 p-3 sm:p-4 md:p-6">
          <div className="flex min-w-0 flex-col gap-3 border-b border-line pb-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">
                {labels.caseLabel} {caseIndex + 1}
              </p>
              <h3 className="mt-2 break-words text-xl font-semibold leading-tight text-ink sm:text-2xl">{activeCase.title}</h3>
            </div>
            <span className="w-fit max-w-full rounded-[4px] border border-petrol/25 bg-paper px-3 py-1 text-xs font-semibold text-petrol">
              {activeCase.classification}
            </span>
          </div>

          <p className="mt-5 break-words text-base leading-7 text-ink sm:text-lg sm:leading-8">{activeCase.situation}</p>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{labels.decisionLabel}</p>
            <div className="mt-3 grid gap-2">
              {activeCase.options.map((option, index) => {
                const selected = selectedOption === index;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelectedOption(index)}
                    className={`rounded-[4px] border px-3 py-3 text-left text-sm font-semibold leading-6 break-words transition sm:px-4 ${
                      selected
                        ? "border-petrol bg-petrol text-white shadow-[0_12px_26px_rgba(11,52,54,0.12)]"
                        : "border-line bg-paper text-ink hover:border-petrol hover:bg-white"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedOption !== null ? (
            <div className="mt-6 grid gap-4 border-t border-line pt-5">
              <div className="rounded-[4px] border border-petrol/20 bg-[#eef5f2] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{labels.selectedLabel}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-ink">{activeCase.options[selectedOption]}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{labels.readingLabel}</p>
                <p className="mt-2 text-sm leading-7 text-muted">{activeCase.reading}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[4px] border border-line bg-paper p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{labels.signalsLabel}</p>
                  <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
                    {activeCase.signals.map((signal) => (
                      <li key={signal} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-petrol" aria-hidden="true" />
                        <span>{signal}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[4px] border border-line bg-paper p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{labels.questionsLabel}</p>
                  <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
                    {activeCase.questions.map((question) => (
                      <li key={question} className="flex gap-2">
                        <span className="text-petrol" aria-hidden="true">
                          -
                        </span>
                        <span>{question}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid gap-3 rounded-[4px] border border-petrol/20 bg-white p-4 md:grid-cols-[0.45fr_1fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{labels.classificationLabel}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-ink">{activeCase.classification}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{labels.nextLabel}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{labels.nextText}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
