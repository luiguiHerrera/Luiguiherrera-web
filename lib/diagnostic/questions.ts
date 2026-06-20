import type { DiagnosticAnswers, DiagnosticMode, DiagnosticProduct, DiagnosticQuestion } from "@/lib/diagnostic/types";

const both: DiagnosticMode[] = ["quick", "complete"];
const t = (es: string, en: string) => ({ es, en });

export const diagnosticQuestions: DiagnosticQuestion[] = [
  {
    id: "capital_reference",
    block: "setup",
    mode: both,
    prompt: t("Para que los escenarios sean realistas, elige una cantidad de referencia.", "To make scenarios realistic, choose a reference amount."),
    helper: t("No guardamos este dato. Solo ajusta los ejemplos durante esta sesión.", "We do not store this. It only adjusts examples during this session."),
    options: [
      { id: "1000", label: t("1.000 €", "€1,000") },
      { id: "5000", label: t("5.000 €", "€5,000") },
      { id: "10000", label: t("10.000 €", "€10,000") },
      { id: "25000", label: t("25.000 €", "€25,000") },
      { id: "50000", label: t("50.000 €", "€50,000") },
      { id: "generic", label: t("Prefiero ejemplos genéricos", "I prefer generic examples") },
    ],
  },
  {
    id: "products_known",
    block: "products",
    mode: both,
    multi: true,
    prompt: t("Marca los productos que conoces o considerarías usar con dinero real.", "Select the products you know or would consider using with real money."),
    helper: t("Esto activa preguntas adaptativas. No es una recomendación ni una validación.", "This activates adaptive questions. It is not a recommendation or validation."),
    options: [
      { id: "cash", label: t("Liquidez / fondos monetarios", "Cash / money market funds"), products: ["cash"], scores: { productComplexity: 12 } },
      { id: "bonds", label: t("Bonos simples", "Simple bonds"), products: ["bonds"], scores: { productComplexity: 25 } },
      { id: "indexFunds", label: t("Fondos indexados diversificados", "Diversified index funds"), products: ["indexFunds"], scores: { productComplexity: 35 } },
      { id: "individualStocks", label: t("Acciones individuales", "Individual stocks"), products: ["individualStocks"], scores: { productComplexity: 55 } },
      { id: "sectorEtfs", label: t("ETFs sectoriales o temáticos", "Sector or thematic ETFs"), products: ["sectorEtfs"], scores: { productComplexity: 58 } },
      { id: "crypto", label: t("Criptoactivos", "Cryptoassets"), products: ["crypto"], scores: { productComplexity: 72 }, flags: ["complex_products_selected"] },
      { id: "options", label: t("Opciones", "Options"), products: ["options"], scores: { productComplexity: 90 }, flags: ["complex_products_selected"] },
      { id: "leverage", label: t("Apalancamiento / margen", "Leverage / margin"), products: ["leverage"], scores: { productComplexity: 92 }, flags: ["complex_products_selected"] },
      { id: "shortSelling", label: t("Venta en corto", "Short selling"), products: ["shortSelling"], scores: { productComplexity: 95 }, flags: ["complex_products_selected"] },
    ],
  },
  {
    id: "savings_share",
    block: "financial",
    mode: both,
    prompt: t("¿Qué parte de tus ahorros totales representa el dinero que piensas invertir?", "What share of your total savings does the money you plan to invest represent?"),
    helper: t("Elige la opción que más se parezca a tu situación.", "Choose the option that best resembles your situation."),
    options: [
      { id: "lt10", label: t("Menos del 10%", "Less than 10%"), scores: { financialCapacity: 88, liquidityStrength: 82 } },
      { id: "10_25", label: t("Entre 10% y 25%", "Between 10% and 25%"), scores: { financialCapacity: 74, liquidityStrength: 70 } },
      { id: "25_50", label: t("Entre 25% y 50%", "Between 25% and 50%"), scores: { financialCapacity: 55, liquidityStrength: 52 } },
      { id: "gt50", label: t("Más del 50%", "More than 50%"), scores: { financialCapacity: 34, liquidityStrength: 34 }, flags: ["capital_concentration"] },
      { id: "almost_all", label: t("Prácticamente todo mi ahorro disponible", "Almost all my available savings"), scores: { financialCapacity: 18, liquidityStrength: 18 }, flags: ["capital_concentration", "liquidity_fragility"] },
    ],
  },
  {
    id: "loss_life_effect",
    block: "financial",
    mode: both,
    prompt: t("Tu inversión cae de {amount} a {amountMinus20} aproximadamente (-20%). ¿Qué tanto afectaría tu vida diaria?", "Your investment falls from {amount} to {amountMinus20}, approximately -20%. How much would it affect your daily life?"),
    helper: t("Piensa en pagos, familia, sueño y decisiones obligadas, no solo en el porcentaje.", "Think about payments, family, sleep and forced decisions, not only the percentage."),
    options: [
      { id: "none", label: t("Casi nada; tengo margen suficiente", "Almost nothing; I have enough margin"), scores: { financialCapacity: 88, liquidityStrength: 84, emotionalTolerance: 72 } },
      { id: "annoying", label: t("Me molestaría, pero no cambiaría pagos importantes", "It would bother me, but not change important payments"), scores: { financialCapacity: 68, liquidityStrength: 65, emotionalTolerance: 58 } },
      { id: "adjust", label: t("Tendría que ajustar algunos gastos", "I would need to adjust some expenses"), scores: { financialCapacity: 45, liquidityStrength: 42, emotionalTolerance: 42 }, flags: ["liquidity_fragility"] },
      { id: "uncomfortable", label: t("Me pondría en una situación incómoda", "It would put me in an uncomfortable situation"), scores: { financialCapacity: 28, liquidityStrength: 25, emotionalTolerance: 30 }, flags: ["liquidity_fragility"] },
      { id: "serious", label: t("Me afectaría seriamente", "It would seriously affect me"), scores: { financialCapacity: 12, liquidityStrength: 12, emotionalTolerance: 22 }, flags: ["liquidity_fragility"] },
    ],
  },
  {
    id: "emergency_months",
    block: "financial",
    mode: both,
    prompt: t("¿Cuántos meses de gastos tienes separados fuera de inversiones volátiles?", "How many months of expenses do you keep outside volatile investments?"),
    helper: t("El colchón separa inversión de supervivencia financiera.", "The buffer separates investing from financial survival."),
    options: [
      { id: "gt12", label: t("Más de 12 meses", "More than 12 months"), scores: { liquidityStrength: 92, financialCapacity: 82 } },
      { id: "6_12", label: t("Entre 6 y 12 meses", "Between 6 and 12 months"), scores: { liquidityStrength: 78, financialCapacity: 72 } },
      { id: "3_6", label: t("Entre 3 y 6 meses", "Between 3 and 6 months"), scores: { liquidityStrength: 55, financialCapacity: 58 } },
      { id: "lt3", label: t("Menos de 3 meses", "Less than 3 months"), scores: { liquidityStrength: 28, financialCapacity: 35 }, flags: ["liquidity_fragility"] },
      { id: "none", label: t("No tengo fondo separado", "I do not have a separate buffer"), scores: { liquidityStrength: 12, financialCapacity: 25 }, flags: ["liquidity_fragility"] },
    ],
  },
  {
    id: "cash_need_12m",
    block: "financial",
    mode: both,
    prompt: t("¿Qué tan probable es que necesites usar este dinero en los próximos 12 meses?", "How likely are you to need this money in the next 12 months?"),
    helper: t("Un horizonte largo en teoría no sirve si la caja se necesita pronto.", "A long horizon in theory does not help if cash is needed soon."),
    options: [
      { id: "very_low", label: t("Muy poco probable", "Very unlikely"), scores: { timeHorizon: 86, liquidityStrength: 80 } },
      { id: "low", label: t("Poco probable", "Unlikely"), scores: { timeHorizon: 72, liquidityStrength: 68 } },
      { id: "possible", label: t("Posible; no lo descarto", "Possible; I cannot rule it out"), scores: { timeHorizon: 45, liquidityStrength: 44 }, flags: ["near_cash_need"] },
      { id: "likely", label: t("Probable", "Likely"), scores: { timeHorizon: 25, liquidityStrength: 25 }, flags: ["near_cash_need", "liquidity_fragility"] },
      { id: "certain", label: t("Casi seguro", "Almost certain"), scores: { timeHorizon: 12, liquidityStrength: 15 }, flags: ["near_cash_need", "liquidity_fragility"] },
    ],
  },
  {
    id: "declared_drop",
    block: "pressure",
    mode: both,
    prompt: t("En abstracto, ¿qué caída temporal crees que podrías tolerar sin romper el plan?", "In theory, what temporary loss do you think you could tolerate without breaking the plan?"),
    helper: t("Luego lo contrastamos con escenarios concretos.", "We will compare this with concrete scenarios later."),
    options: [
      { id: "5", label: t("Hasta -5%", "Up to -5%"), scores: { emotionalTolerance: 25 } },
      { id: "10", label: t("Hasta -10%", "Up to -10%"), scores: { emotionalTolerance: 42 } },
      { id: "20", label: t("Hasta -20%", "Up to -20%"), scores: { emotionalTolerance: 62 } },
      { id: "35", label: t("Hasta -35%", "Up to -35%"), scores: { emotionalTolerance: 82 }, flags: ["declared_high_tolerance"] },
      { id: "more", label: t("Más de -35% si el plan tiene sentido", "More than -35% if the plan still makes sense"), scores: { emotionalTolerance: 90, overconfidence: 64 }, flags: ["declared_high_tolerance"] },
    ],
  },
  {
    id: "pressure_drop",
    block: "pressure",
    mode: both,
    prompt: t("Invertiste {amount}. Tres meses después ves {amountMinus18} aproximadamente (-18%). Redes y prensa hablan de más caídas. ¿Qué haces primero?", "You invested {amount}. Three months later you see {amountMinus18}, approximately -18%. Social media and news talk about further losses. What do you do first?"),
    helper: t("Elige la opción que más se parezca a lo que harías.", "Choose the option that best resembles what you would do."),
    options: [
      { id: "review", label: t("Reviso si cambió la tesis antes de tocar nada", "I check whether the thesis changed before touching anything"), scores: { emotionalTolerance: 76, consistency: 78, patience: 75 } },
      { id: "sell_part", label: t("Vendo una parte para recuperar tranquilidad", "I sell part to regain calm"), scores: { emotionalTolerance: 35, consistency: 42, patience: 35 }, flags: ["pressure_low_tolerance"] },
      { id: "sell_all", label: t("Salgo y acepto la pérdida para dejar de mirar", "I exit and accept the loss to stop watching"), scores: { emotionalTolerance: 18, consistency: 25, patience: 22 }, flags: ["pressure_low_tolerance", "panic_sell"] },
      { id: "buy_more", label: t("Compro más porque ahora está más barato", "I buy more because it is cheaper now"), scores: { emotionalTolerance: 68, overconfidence: 72, consistency: 42 }, flags: ["overconfidence"] },
      { id: "written_rule", label: t("Solo actuaría si una regla escrita ya lo contemplaba", "I would act only if a written rule already covered it"), scores: { emotionalTolerance: 78, consistency: 88, patience: 80 } },
    ],
  },
  {
    id: "slow_underperformance",
    block: "pressure",
    mode: both,
    prompt: t("Tu inversión no cae mucho, pero durante 18 meses va peor que lo que todos comentan. ¿Qué pesa más?", "Your investment does not fall much, but for 18 months it lags what everyone talks about. What weighs most?"),
    helper: t("La paciencia también se prueba por comparación social.", "Patience is also tested by social comparison."),
    options: [
      { id: "process", label: t("Mantener proceso si las razones siguen vigentes", "Keep the process if the reasons still hold"), scores: { patience: 84, consistency: 82 } },
      { id: "compare", label: t("Me costaría no moverme a lo que está funcionando", "It would be hard not to move to what is working"), scores: { patience: 35, fomoSensitivity: 76 }, flags: ["social_pressure", "fomo_entry"] },
      { id: "split", label: t("Movería una parte para no quedarme atrás", "I would move part so I do not fall behind"), scores: { patience: 42, fomoSensitivity: 68 }, flags: ["social_pressure"] },
      { id: "ignore", label: t("Evitaría mirar comparaciones para no alterar el plan", "I would avoid comparisons so they do not disturb the plan"), scores: { patience: 65, consistency: 65 } },
    ],
  },
  {
    id: "fast_gain",
    block: "bias",
    mode: both,
    prompt: t("Una posición de {amount} sube a {amountPlus45} en pocas semanas y ahora pesa mucho más dentro de tu cartera. ¿Qué haces primero?", "A position of {amount} rises to {amountPlus45} in a few weeks and now represents a much larger part of your portfolio. What do you do first?"),
    helper: t("Elige la opción que más se parezca a lo que harías.", "Choose the option that best resembles what you would do."),
    options: [
      { id: "rebalance", label: t("Reviso peso, riesgo y reglas antes de aumentar", "I review weight, risk and rules before adding"), scores: { euphoriaRisk: 18, consistency: 80 } },
      { id: "take_profit", label: t("Tomo una parte de ganancias y mantengo el plan", "I take some profit and keep the plan"), scores: { euphoriaRisk: 28, consistency: 72, calibration: 70 } },
      { id: "hold", label: t("Mantengo porque todavía puede seguir subiendo", "I hold because it could keep rising"), scores: { euphoriaRisk: 55, overconfidence: 52, consistency: 50 } },
      { id: "increase", label: t("Aumento porque la tesis parece estar funcionando", "I add because the thesis seems to be working"), scores: { euphoriaRisk: 86, overconfidence: 84, consistency: 34 }, flags: ["euphoria_sizing", "overconfidence"] },
      { id: "repeat", label: t("Busco otra oportunidad parecida para repetir", "I look for a similar opportunity to repeat it"), scores: { euphoriaRisk: 90, fomoSensitivity: 82, overconfidence: 78 }, flags: ["euphoria_sizing", "fomo_entry", "overconfidence"] },
    ],
  },
  {
    id: "return_expectation",
    block: "expectations",
    mode: both,
    prompt: t("Para sentir que vale la pena, ¿qué retorno anual esperarías de una inversión con riesgo?", "For it to feel worthwhile, what annual return would you expect from a risky investment?"),
    helper: t("No buscamos precisión; buscamos calibración de expectativas.", "We are not looking for precision; we are looking for expectation calibration."),
    options: [
      { id: "3_6", label: t("3% a 6%", "3% to 6%"), scores: { expectationRealism: 78 } },
      { id: "6_10", label: t("6% a 10%", "6% to 10%"), scores: { expectationRealism: 86 } },
      { id: "10_15", label: t("10% a 15%", "10% to 15%"), scores: { expectationRealism: 58 } },
      { id: "15_25", label: t("15% a 25%", "15% to 25%"), scores: { expectationRealism: 30, overconfidence: 65 }, flags: ["unrealistic_expectations"] },
      { id: "gt25", label: t("Más de 25%", "More than 25%"), scores: { expectationRealism: 12, overconfidence: 82 }, flags: ["unrealistic_expectations"] },
    ],
  },
  {
    id: "bad_year",
    block: "expectations",
    mode: both,
    prompt: t("Si una inversión razonable tiene un año negativo, ¿qué significa para ti?", "If a reasonable investment has a negative year, what does it mean to you?"),
    helper: t("Una expectativa incompatible suele romper el plan antes que el mercado.", "An incompatible expectation often breaks the plan before the market does."),
    options: [
      { id: "normal", label: t("Puede ser normal; reviso si sigue cumpliendo su función", "It can be normal; I check whether it still serves its role"), scores: { expectationRealism: 84, patience: 78 } },
      { id: "mistake", label: t("Probablemente elegí mal", "I probably chose badly"), scores: { expectationRealism: 35, patience: 36 }, flags: ["unrealistic_expectations"] },
      { id: "change", label: t("Buscaría algo que haya aguantado mejor", "I would look for something that held up better"), scores: { expectationRealism: 42, fomoSensitivity: 62 }, flags: ["social_pressure"] },
      { id: "depends", label: t("Depende de si el riesgo estaba contemplado desde el inicio", "It depends on whether the risk was contemplated from the start"), scores: { expectationRealism: 78, consistency: 74 } },
    ],
  },
  {
    id: "stock_basic",
    block: "knowledge",
    mode: both,
    prompt: t("Cuando compras una acción, ¿qué estás adquiriendo realmente?", "When you buy a stock, what are you really acquiring?"),
    helper: t("Conocimiento básico antes de evaluar riesgo.", "Basic knowledge before evaluating risk."),
    options: [
      { id: "ownership", label: t("Una participación económica en una empresa", "An economic ownership stake in a company"), scores: { knowledgeValidated: 90 } },
      { id: "loan", label: t("Un préstamo con interés fijo", "A loan with fixed interest"), scores: { knowledgeValidated: 18 }, flags: ["knowledge_gap_basic"] },
      { id: "guarantee", label: t("Un contrato que garantiza retorno si la empresa crece", "A contract that guarantees return if the company grows"), scores: { knowledgeValidated: 20 }, flags: ["knowledge_gap_basic"] },
      { id: "unsure", label: t("No estoy seguro", "I am not sure"), scores: { knowledgeValidated: 35, calibration: 78 }, flags: ["humble_uncertainty"] },
    ],
  },
  {
    id: "risk_return",
    block: "knowledge",
    mode: both,
    prompt: t("Si una inversión ofrece más retorno esperado, normalmente también implica...", "If an investment offers higher expected return, it usually also implies..."),
    helper: t("No siempre, pero la compensación riesgo-retorno importa.", "Not always, but the risk-return tradeoff matters."),
    options: [
      { id: "risk", label: t("Más incertidumbre, riesgo o condiciones que analizar", "More uncertainty, risk or conditions to analyze"), scores: { knowledgeValidated: 88 } },
      { id: "better", label: t("Una oportunidad mejor si el historial reciente fue bueno", "A better opportunity if recent performance was good"), scores: { knowledgeValidated: 35, fomoSensitivity: 58 }, flags: ["knowledge_gap_basic"] },
      { id: "less_risk", label: t("Menos riesgo porque alguien encontró una ineficiencia", "Less risk because someone found an inefficiency"), scores: { knowledgeValidated: 22, overconfidence: 68 }, flags: ["knowledge_gap_basic"] },
      { id: "past_only", label: t("Solo se puede evaluar mirando rentabilidad pasada", "It can only be evaluated by looking at past return"), scores: { knowledgeValidated: 32 }, flags: ["knowledge_gap_basic"] },
    ],
  },
  {
    id: "diversification",
    block: "knowledge",
    mode: both,
    prompt: t("¿Qué busca principalmente la diversificación?", "What does diversification mainly try to do?"),
    helper: t("No elimina todo riesgo; reduce dependencia de un único resultado.", "It does not remove all risk; it reduces dependence on one outcome."),
    options: [
      { id: "reduce_dependency", label: t("Reducir dependencia de un activo, sector o escenario", "Reduce dependence on one asset, sector or scenario"), scores: { knowledgeValidated: 88 } },
      { id: "increase_return", label: t("Aumentar siempre el retorno esperado", "Always increase expected return"), scores: { knowledgeValidated: 24 }, flags: ["knowledge_gap_basic"] },
      { id: "avoid_loss", label: t("Evitar cualquier pérdida temporal", "Avoid any temporary loss"), scores: { knowledgeValidated: 20 }, flags: ["knowledge_gap_basic"] },
      { id: "winner", label: t("Concentrar en lo que mejor funcionó", "Concentrate in what worked best"), scores: { knowledgeValidated: 28, fomoSensitivity: 65 }, flags: ["concentration_bias"] },
    ],
  },
  {
    id: "bond_rates",
    block: "knowledge",
    mode: both,
    prompt: t("Si suben los tipos de interés, el precio de un bono existente normalmente...", "If interest rates rise, the price of an existing bond usually..."),
    helper: t("Fuente frecuente de sorpresa en productos considerados conservadores.", "A frequent source of surprise in products considered conservative."),
    options: [
      { id: "falls", label: t("Puede bajar, especialmente si tiene duración alta", "Can fall, especially if it has high duration"), scores: { knowledgeValidated: 88 } },
      { id: "rises", label: t("Debe subir porque paga intereses", "Must rise because it pays interest"), scores: { knowledgeValidated: 25 }, flags: ["knowledge_gap_basic"] },
      { id: "fixed", label: t("No se mueve porque los bonos son fijos", "Does not move because bonds are fixed"), scores: { knowledgeValidated: 20 }, flags: ["knowledge_gap_basic"] },
      { id: "default_only", label: t("Solo cambia si el emisor quiebra", "Only changes if the issuer defaults"), scores: { knowledgeValidated: 30 }, flags: ["knowledge_gap_basic"] },
    ],
  },
  {
    id: "claim_vs_validate",
    block: "knowledge",
    mode: both,
    prompt: t("¿Cómo describirías tu conocimiento financiero?", "How would you describe your financial knowledge?"),
    helper: t("Esta respuesta se compara con las preguntas de validación.", "This answer is compared with validation questions."),
    options: [
      { id: "low", label: t("Estoy empezando", "I am starting"), scores: { calibration: 78, overconfidence: 18 } },
      { id: "basic", label: t("Básico, entiendo productos simples", "Basic, I understand simple products"), scores: { calibration: 70, overconfidence: 28 } },
      { id: "medium", label: t("Intermedio, puedo comparar riesgos y costes", "Intermediate, I can compare risks and costs"), scores: { calibration: 58, overconfidence: 45 }, flags: ["claims_knowledge"] },
      { id: "high", label: t("Alto, entiendo productos complejos", "High, I understand complex products"), scores: { calibration: 42, overconfidence: 68 }, flags: ["claims_knowledge"] },
    ],
  },
  {
    id: "years_real",
    block: "experience",
    mode: both,
    prompt: t("¿Cuántos años llevas invirtiendo con dinero propio?", "How many years have you invested with your own money?"),
    helper: t("Experiencia real es decidir bajo incertidumbre, no solo leer.", "Real experience is deciding under uncertainty, not only reading."),
    options: [
      { id: "lt1", label: t("Menos de 1 año", "Less than 1 year"), scores: { experienceReal: 22 } },
      { id: "1_3", label: t("1 a 3 años", "1 to 3 years"), scores: { experienceReal: 45 } },
      { id: "4_8", label: t("4 a 8 años", "4 to 8 years"), scores: { experienceReal: 68 } },
      { id: "gt8", label: t("Más de 8 años y he vivido ciclos difíciles", "More than 8 years and I have lived through difficult cycles"), scores: { experienceReal: 88 } },
    ],
  },
  {
    id: "real_drawdown",
    block: "experience",
    mode: both,
    prompt: t("¿Has vivido una caída fuerte con dinero propio invertido?", "Have you lived through a sharp drawdown with your own invested money?"),
    helper: t("Una caída real enseña cosas que un simulador no enseña.", "A real drawdown teaches things a simulator does not."),
    options: [
      { id: "no", label: t("No, mi experiencia ha sido tranquila", "No, my experience has been calm"), scores: { experienceReal: 34 } },
      { id: "sold", label: t("Sí, y vendí por incomodidad", "Yes, and I sold due to discomfort"), scores: { experienceReal: 52, emotionalTolerance: 30 }, flags: ["pressure_low_tolerance", "panic_sell"] },
      { id: "held", label: t("Sí, mantuve el plan y revisé aprendizajes", "Yes, I kept the plan and reviewed lessons"), scores: { experienceReal: 82, emotionalTolerance: 78, consistency: 80 } },
      { id: "averaged", label: t("Sí, aumenté exposición sin regla escrita", "Yes, I added exposure without a written rule"), scores: { experienceReal: 60, overconfidence: 70, consistency: 38 }, flags: ["no_written_process", "overconfidence"] },
    ],
  },
  {
    id: "process_docs",
    block: "experience",
    mode: both,
    prompt: t("Antes de usar un producto nuevo, ¿qué sueles revisar?", "Before using a new product, what do you usually review?"),
    helper: t("Elige la opción que más se parezca a lo que haces normalmente.", "Choose the option that best resembles what you usually do."),
    options: [
      { id: "full", label: t("Costes, liquidez, pérdida posible, documento del producto y rol en el plan", "Costs, liquidity, possible loss, product document and role in the plan"), scores: { experienceReal: 82, knowledgeValidated: 76, consistency: 82 } },
      { id: "performance", label: t("Rendimiento reciente y opiniones de fuentes que sigo", "Recent performance and opinions from sources I follow"), scores: { experienceReal: 42, fomoSensitivity: 72 }, flags: ["social_pressure"] },
      { id: "summary", label: t("Una descripción general si parece simple", "A general description if it seems simple"), scores: { experienceReal: 38, knowledgeValidated: 42 } },
      { id: "size_dependent", label: t("Depende del tamaño; para montos pequeños reviso menos", "It depends on size; for small amounts I review less"), scores: { experienceReal: 58, consistency: 52 } },
    ],
  },
  {
    id: "fomo_behavior",
    block: "bias",
    mode: both,
    prompt: t("Cuando mucha gente parece ganar dinero rápido, ¿qué te ocurre?", "When many people seem to be making money quickly, what happens to you?"),
    helper: t("Elige la opción que más se parezca a lo que harías.", "Choose the option that best resembles what you would do."),
    options: [
      { id: "wait", label: t("Siento presión, pero espero mi proceso", "I feel pressure, but I wait for my process"), scores: { fomoSensitivity: 25, consistency: 74 } },
      { id: "small", label: t("Me cuesta no participar aunque sea con poco", "It is hard not to participate, even with a little"), scores: { fomoSensitivity: 78, consistency: 42 }, flags: ["fomo_entry"] },
      { id: "confirm", label: t("Busco argumentos de que aún estoy a tiempo", "I look for arguments that I am still in time"), scores: { fomoSensitivity: 86, overconfidence: 62 }, flags: ["fomo_entry", "social_pressure"] },
      { id: "avoid", label: t("Prefiero ignorarlo para no alterar mi plan", "I prefer to ignore it so it does not disturb my plan"), scores: { fomoSensitivity: 35, consistency: 64 } },
    ],
  },
  {
    id: "loss_recovery",
    block: "bias",
    mode: both,
    prompt: t("Después de una pérdida incómoda, ¿qué impulso reconoces más?", "After an uncomfortable loss, which impulse do you recognize most?"),
    helper: t("Recuperar rápido suele ser una fuente fuerte de errores.", "Trying to recover quickly is often a strong source of mistakes."),
    options: [
      { id: "reduce", label: t("Reducir tamaño y revisar proceso", "Reduce size and review process"), scores: { consistency: 72, emotionalTolerance: 58 } },
      { id: "recover", label: t("Buscar una operación que recupere la pérdida", "Look for a trade to recover the loss"), scores: { consistency: 24, fomoSensitivity: 72 }, flags: ["loss_recovery_bias"] },
      { id: "document", label: t("No tocar nada y documentar qué pasó", "Do nothing and document what happened"), scores: { consistency: 82, patience: 72 } },
      { id: "switch", label: t("Cambiar totalmente de estrategia", "Completely change strategy"), scores: { consistency: 28, patience: 25 }, flags: ["loss_recovery_bias"] },
    ],
  },
  {
    id: "concentration",
    block: "bias",
    mode: both,
    prompt: t("Si tienes mucha convicción en una idea, ¿qué peso máximo te parecería razonable?", "If you have strong conviction in an idea, what maximum weight would feel reasonable?"),
    helper: t("Elige la opción que más se parezca a lo que harías.", "Choose the option that best resembles what you would do."),
    options: [
      { id: "lt10", label: t("Menos de 10%", "Less than 10%"), scores: { consistency: 82, overconfidence: 18 } },
      { id: "10_20", label: t("10% a 20%", "10% to 20%"), scores: { consistency: 70, overconfidence: 35 } },
      { id: "20_40", label: t("20% a 40%", "20% to 40%"), scores: { consistency: 45, overconfidence: 65 }, flags: ["concentration_bias"] },
      { id: "gt40", label: t("Más de 40% si la tesis es fuerte", "More than 40% if the thesis is strong"), scores: { consistency: 28, overconfidence: 84 }, flags: ["concentration_bias", "overconfidence"] },
    ],
  },
  {
    id: "plan_written",
    block: "bias",
    mode: both,
    prompt: t("Antes de invertir, ¿sueles definir por escrito qué harías si cae, sube o no se mueve?", "Before investing, do you usually write what you would do if it falls, rises or does not move?"),
    helper: t("Las reglas escritas reducen respuestas impulsivas bajo presión.", "Written rules reduce impulsive responses under pressure."),
    options: [
      { id: "yes", label: t("Sí, con reglas antes de entrar", "Yes, with rules before entering"), scores: { consistency: 88, patience: 78 } },
      { id: "sometimes", label: t("A veces, si el monto es relevante", "Sometimes, if the amount is relevant"), scores: { consistency: 62 } },
      { id: "mental", label: t("Lo tengo en mente, pero no escrito", "I have it in mind, but not written"), scores: { consistency: 42 }, flags: ["no_written_process"] },
      { id: "no", label: t("No; decido según evolucione", "No; I decide as it evolves"), scores: { consistency: 25 }, flags: ["no_written_process"] },
    ],
  },
  {
    id: "options_check",
    block: "products",
    mode: both,
    adaptiveFor: ["options"],
    prompt: t("Una call fuera del dinero con vencimiento cercano normalmente tiene...", "An out-of-the-money call with near expiration usually has..."),
    helper: t("Validación mínima de complejidad en opciones.", "Minimal complexity validation for options."),
    options: [
      { id: "decay", label: t("Alto riesgo de perder valor si el movimiento no ocurre pronto", "High risk of losing value if the move does not happen soon"), scores: { knowledgeValidated: 90, calibration: 76 } },
      { id: "protection", label: t("Protección natural contra cualquier caída", "Natural protection against any fall"), scores: { knowledgeValidated: 18 }, flags: ["knowledge_gap_complex", "product_mismatch"] },
      { id: "guaranteed", label: t("Valor garantizado por ser contrato financiero", "Guaranteed value because it is a financial contract"), scores: { knowledgeValidated: 14 }, flags: ["knowledge_gap_complex", "product_mismatch"] },
      { id: "unsure", label: t("No estoy seguro", "I am not sure"), scores: { knowledgeValidated: 30, calibration: 82 }, flags: ["humble_uncertainty"] },
    ],
  },
  {
    id: "leverage_check",
    block: "products",
    mode: both,
    adaptiveFor: ["leverage"],
    prompt: t("Si usas margen y el activo cae fuerte, ¿qué puede ocurrir?", "If you use margin and the asset falls sharply, what can happen?"),
    helper: t("El apalancamiento cambia velocidad y tamaño del error.", "Leverage changes the speed and size of mistakes."),
    options: [
      { id: "margin_call", label: t("Puedes verte obligado a aportar o cerrar posición", "You may be forced to add funds or close the position"), scores: { knowledgeValidated: 92 } },
      { id: "interest_only", label: t("La pérdida se limita al interés del préstamo", "The loss is limited to the loan interest"), scores: { knowledgeValidated: 15 }, flags: ["knowledge_gap_complex", "product_mismatch"] },
      { id: "broker_waits", label: t("El broker debe esperar a que recupere", "The broker must wait for recovery"), scores: { knowledgeValidated: 12 }, flags: ["knowledge_gap_complex", "product_mismatch"] },
      { id: "unsure", label: t("No estoy seguro", "I am not sure"), scores: { knowledgeValidated: 28, calibration: 80 }, flags: ["humble_uncertainty"] },
    ],
  },
  {
    id: "short_check",
    block: "products",
    mode: both,
    adaptiveFor: ["shortSelling"],
    prompt: t("En una venta en corto, ¿qué riesgo especial existe?", "In short selling, what special risk exists?"),
    helper: t("Producto difícil incluso con experiencia.", "A difficult product even with experience."),
    options: [
      { id: "unbounded", label: t("La pérdida puede crecer si el activo sube con fuerza", "The loss can grow if the asset rises sharply"), scores: { knowledgeValidated: 90 } },
      { id: "zero", label: t("La pérdida máxima siempre es cero si no hay margen", "Maximum loss is always zero if there is no margin"), scores: { knowledgeValidated: 18 }, flags: ["knowledge_gap_complex", "product_mismatch"] },
      { id: "bad_company", label: t("No hay riesgo si la empresa es mala", "There is no risk if the company is bad"), scores: { knowledgeValidated: 14 }, flags: ["knowledge_gap_complex", "product_mismatch"] },
      { id: "fee", label: t("Solo pierdes la comisión", "You only lose the fee"), scores: { knowledgeValidated: 12 }, flags: ["knowledge_gap_complex", "product_mismatch"] },
    ],
  },
  {
    id: "crypto_check",
    block: "products",
    mode: both,
    adaptiveFor: ["crypto"],
    prompt: t("Sobre criptoactivos, ¿qué afirmación es más prudente?", "About cryptoassets, which statement is more prudent?"),
    helper: t("Mide volatilidad, custodia, liquidez y narrativa.", "This measures volatility, custody, liquidity and narrative."),
    options: [
      { id: "risks", label: t("Pueden tener riesgos técnicos, regulatorios, de custodia y liquidez", "They can have technical, regulatory, custody and liquidity risks"), scores: { knowledgeValidated: 86 } },
      { id: "cash", label: t("Son equivalentes a efectivo digital estable", "They are equivalent to stable digital cash"), scores: { knowledgeValidated: 15 }, flags: ["knowledge_gap_complex", "product_mismatch"] },
      { id: "adoption", label: t("Si hay adopción, el riesgo principal desaparece", "If there is adoption, the main risk disappears"), scores: { knowledgeValidated: 28, overconfidence: 68 }, flags: ["knowledge_gap_complex"] },
      { id: "custody_irrelevant", label: t("No requieren análisis de custodia ni concentración", "They do not require custody or concentration analysis"), scores: { knowledgeValidated: 18 }, flags: ["knowledge_gap_complex"] },
    ],
  },
  {
    id: "stocks_check",
    block: "products",
    mode: both,
    adaptiveFor: ["individualStocks", "sectorEtfs"],
    prompt: t("Tener 60% del capital en una sola acción o tema implica principalmente...", "Having 60% of capital in one stock or theme mainly implies..."),
    helper: t("Incluso una buena idea puede ser un mal tamaño.", "Even a good idea can be a bad size."),
    options: [
      { id: "single_outcome", label: t("Dependencia alta de un único resultado", "High dependence on a single outcome"), scores: { knowledgeValidated: 86, consistency: 74 } },
      { id: "safer", label: t("Más seguridad si conoces bien la empresa o tema", "More safety if you know the company or theme well"), scores: { knowledgeValidated: 25, overconfidence: 76 }, flags: ["concentration_bias"] },
      { id: "less_vol", label: t("Menos volatilidad porque hay más convicción", "Less volatility because there is more conviction"), scores: { knowledgeValidated: 20 }, flags: ["knowledge_gap_complex"] },
      { id: "irrelevant", label: t("Riesgo irrelevante si el horizonte es largo", "Irrelevant risk if the horizon is long"), scores: { knowledgeValidated: 30 }, flags: ["knowledge_gap_complex"] },
    ],
  },
  {
    id: "bond_check",
    block: "products",
    mode: both,
    adaptiveFor: ["bonds"],
    prompt: t("Cuando compras un bono corporativo, ¿qué relación económica tienes?", "When you buy a corporate bond, what economic relationship do you have?"),
    helper: t("Distinguir propiedad de deuda evita sorpresas.", "Distinguishing ownership from debt avoids surprises."),
    options: [
      { id: "creditor", label: t("Eres acreedor bajo ciertas condiciones", "You are a creditor under certain conditions"), scores: { knowledgeValidated: 88 } },
      { id: "owner", label: t("Eres socio con derecho a voto", "You are an owner with voting rights"), scores: { knowledgeValidated: 22 }, flags: ["knowledge_gap_basic"] },
      { id: "guaranteed", label: t("Tienes garantía de no perder si esperas", "You are guaranteed not to lose if you wait"), scores: { knowledgeValidated: 30 }, flags: ["knowledge_gap_basic"] },
      { id: "same_stock", label: t("Es igual que una acción, pero estable", "It is like a stock, but stable"), scores: { knowledgeValidated: 28 }, flags: ["knowledge_gap_basic"] },
    ],
  },
];

function selectedProductSet(answers: DiagnosticAnswers) {
  const selected = new Set<DiagnosticProduct>();
  const raw = answers.products_known;
  const ids = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const productQuestion = diagnosticQuestions.find((question) => question.id === "products_known");
  for (const id of ids) {
    const option = productQuestion?.options.find((candidate) => candidate.id === id);
    for (const product of option?.products ?? []) selected.add(product);
  }
  return selected;
}

export function getQuestionsForMode(mode: DiagnosticMode, answers: DiagnosticAnswers = {}) {
  const selectedProducts = selectedProductSet(answers);
  const base = diagnosticQuestions.filter((question) => question.mode.includes(mode) && !question.adaptiveFor);
  const adaptive = diagnosticQuestions
    .filter((question) => question.mode.includes(mode) && question.adaptiveFor?.some((product) => selectedProducts.has(product)))
    .slice(0, mode === "quick" ? 12 : 15);
  return [...base, ...adaptive];
}

export function getSelectedProducts(answers: DiagnosticAnswers) {
  return Array.from(selectedProductSet(answers));
}
