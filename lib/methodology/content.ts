export type MethodologyLocale = "es" | "en";
export type MethodologyBlock =
  | { text: string; label?: string }
  | { items: string[] };

type MethodologyContent = {
  title: string;
  subtitle: string;
  description: string;
  sections: string[];
  approach: string[];
  principles: { title: string; text: string }[];
  process: { intro: string; steps: string[]; explanation: string; distinctionIntro: string; distinctions: string[]; distinctionEnd: string; decision: string };
  modules: { id: string; title: string; question: string; href: string; blocks: MethodologyBlock[] }[];
  research: { question: string; intro: string[]; criteriaIntro: string; criteria: string[]; reflections: string[] };
  personal: { question: string; paragraphs: string[] };
  data: string[];
  invitationEmphasis: string;
  limits: string[];
  closing: string[];
  toolLink: string;
};

export const methodologyContent: Record<MethodologyLocale, MethodologyContent> = {
  es: {
    title: "Metodología",
    subtitle: "Observar, cuantificar, cuestionar.",
    description: "Mi forma de estudiar los mercados, construir herramientas y poner a prueba mis hipótesis.",
    sections: ["Mi enfoque", "Los principios bajo los que trabajo", "Del dato al criterio", "Cómo estudio el mercado", "Investigación", "Finanzas personales", "Datos, herramientas y reproducibilidad", "Los límites de mi metodología"],
    approach: [
      "Entiendo el mercado como un sistema de múltiples dimensiones. El precio de un activo es probablemente la más visible, pero no rara vez la más explicativa.",
      "Me interesa entender qué hay detrás de sus movimientos, qué condiciones los acompañan, qué riesgos estoy asumiendo y qué tan diferente es el comportamiento actual respecto a lo que históricamente he observado.",
      "Para ello, recurro a la ingeniería, la economía, la estadística, las finanzas cuantitativas y la computación. No considero que alguna de estas disciplinas, por sí sola, sea suficiente para explicar el mercado.",
      "Mi propósito no es eliminar la incertidumbre, sino entenderla mejor y aprender a tomar decisiones en conjunto de ella.",
    ],
    principles: [
      { title: "Evidencia.", text: "Una idea interesante no es necesariamente una idea correcta. Me interesa conocer qué evidencia la respalda y bajo qué condiciones deja de ser válida." },
      { title: "Contexto.", text: "Un dato aislado puede ser correcto y, aun así, llevarme a una interpretación equivocada." },
      { title: "Probabilidad.", text: "Prefiero estudiar distribuciones, frecuencias y escenarios antes que construir conclusiones deterministas." },
      { title: "Trazabilidad.", text: "Considero importante poder identificar el origen de un dato, cómo ha sido tratado y qué supuestos intervienen en su cálculo." },
      { title: "Escepticismo.", text: "Cuestiono tanto las hipótesis de otros como las propias. Que un resultado coincida con lo que esperaba encontrar no lo hace más válido." },
      { title: "Riesgo.", text: "La rentabilidad me interesa, pero también me ocupa entender qué he tenido que asumir para obtenerla." },
    ],
    process: {
      intro: "En mi proceso de análisis distingo cinco etapas:",
      steps: ["Observación", "Procesamiento", "Cuantificación", "Interpretación", "Decisión"],
      explanation: "Parto de información observable y calculable, la organizo, aplico las herramientas estadísticas que considero pertinentes y posteriormente interpreto los resultados dentro de su contexto.",
      distinctionIntro: "Procuro mantener una distinción clara entre tres elementos:",
      distinctions: ["El dato publicado por una fuente.", "El resultado obtenido mediante un cálculo o modelo propio.", "Mi interpretación de ese resultado."],
      distinctionEnd: "No tienen la misma naturaleza ni necesariamente el mismo grado de certeza.",
      decision: "La decisión es una etapa posterior. Disponer de más información no implica que deba actuar con mayor frecuencia y no disponer de suficiente información tampoco implica parálisis.",
    },
    modules: [
      {
        id: "dashboard", title: "Dashboard de mercado", question: "¿Bajo qué condiciones se está moviendo el mercado?", href: "/dashboard",
        blocks: [
          { text: "Construí el Dashboard para organizar en un mismo espacio distintas dimensiones del mercado que considero relevantes para mi proceso de inversión." },
          { label: "Entorno financiero.", text: "Observo el estrés financiero, su evolución y las variables que contribuyen a generarlo, utilizando diversas fuentes públicas." },
          { label: "Precio y participación.", text: "Me interesa saber si los movimientos del índice están acompañados por una participación amplia del mercado o si dependen de un grupo reducido de activos. Para ello, analizo SPY, RSP, el comportamiento sectorial y los indicadores de amplitud RAMO y RASI." },
          { label: "Riesgo.", text: "Utilizo indicadores de volatilidad implícita, modelos EWMA y GARCH, Value at Risk, correlaciones y medidas de concentración de la varianza, como el Absorption Ratio. Cada uno me permite estudiar una dimensión diferente del riesgo." },
          { label: "Flujos de capital.", text: "Observo las entradas y salidas netas de vehículos de inversión seleccionados, su persistencia y su magnitud relativa frente al historial. Distingo entre flujos publicados, estimaciones y aproximaciones indirectas." },
          { text: "No espero que todos los indicadores coincidan. De hecho, son precisamente sus divergencias las que más información me aportan." },
        ],
      },
      {
        id: "quantitative", title: "Análisis cuantitativo", question: "¿Dónde está este activo frente a su propia historia?", href: "/analisiscuantitativo",
        blocks: [
          { text: "Esta herramienta nace de mi interés por entender el comportamiento de un activo desde una perspectiva estadística, más allá de la observación convencional de su precio." },
          { text: "Estudio:" },
          { items: ["Distribuciones históricas de movimientos y extensiones.", "Niveles estadísticos semanales y mensuales.", "Percentiles y desviaciones respecto a referencias históricas.", "Drawdowns y procesos de recuperación.", "Estacionalidad y patrones de calendario.", "Métricas de rentabilidad y riesgo.", "Correlaciones entre activos."] },
          { text: "Cada lectura depende del horizonte temporal, la frecuencia, la disponibilidad de información y el tamaño de la muestra correspondiente." },
          { text: "Por ejemplo, que un activo se encuentre en un extremo de su distribución histórica me aporta información sobre lo inusual de su comportamiento. No me dice necesariamente que esté próximo a cambiar de dirección." },
          { text: "Una frecuencia histórica tampoco constituye una probabilidad futura." },
        ],
      },
      {
        id: "portfolio", title: "Fragilidad de portafolio", question: "¿Qué riesgos estoy asumiendo, incluso aquellos que no son evidentes?", href: "/fragilidad-de-portafolio",
        blocks: [
          { text: "Tener varios activos en un portafolio no significa necesariamente estar diversificado." },
          { text: "Me interesa entender cómo se distribuye el capital, qué dependencias existen entre las posiciones y cómo podría comportarse el conjunto bajo distintas condiciones." },
          { text: "La herramienta permite explorar la concentración, las correlaciones, el comportamiento histórico, escenarios de estrés y ejercicios contrafactuales." },
          { text: "Estos últimos permiten preguntarnos cómo habría cambiado el resultado bajo una composición o unos supuestos diferentes." },
          { text: "No busco identificar un portafolio universalmente óptimo. Me interesa que el inversionista conozca mejor la estructura del riesgo que ha decidido asumir." },
        ],
      },
      {
        id: "perspectives", title: "Análisis y perspectivas", question: "¿Qué considero relevante del contexto actual?", href: "/analisisyperpectivas",
        blocks: [
          { text: "En mis informes comparto mis observaciones sobre el mercado, los cambios que identifico y los escenarios que considero razonables." },
          { text: "Combino información macroeconómica, estadística, financiera y sectorial con las lecturas obtenidas de mis propias herramientas." },
          { text: "Procuro distinguir entre lo que ha ocurrido, lo que ha cambiado y lo que considero que podría ocurrir bajo determinadas condiciones." },
          { text: "Mis perspectivas son revisables. Si la información que sustenta una hipótesis cambia, considero razonable que también cambie mi interpretación." },
        ],
      },
      {
        id: "trends", title: "Tendencias", question: "¿Qué cambios estructurales merece la pena estudiar?", href: "/tendencias",
        blocks: [
          { text: "Me interesa observar las transformaciones tecnológicas, económicas y sociales que podrían modificar la forma en que producimos, consumimos, trabajamos e invertimos." },
          { text: "Estudio cada tendencia desde distintas dimensiones: la evidencia que la respalda, su cadena de valor, la asignación de capital, la política pública, la regulación, los vehículos de inversión disponibles y los riesgos que podrían invalidar mi hipótesis." },
          { text: "Distingo entre identificar un cambio estructural e identificar una oportunidad de inversión." },
          { text: "Una tecnología puede transformar el mundo sin que necesariamente resulte rentable invertir en ella a cualquier precio." },
        ],
      },
    ],
    research: {
      question: "¿Qué queda de una hipótesis después de someterla a prueba?",
      intro: ["La investigación constituye una parte importante de mi proceso de aprendizaje y desarrollo profesional.", "Me interesa estudiar tanto la existencia de determinadas anomalías financieras como la persistencia de sus resultados, su significancia estadística y su viabilidad práctica."],
      criteriaIntro: "En mis investigaciones incorporo, según corresponda, elementos como:",
      criteria: ["Comparación con benchmarks pertinentes.", "Costes de transacción y restricciones operativas.", "Validación fuera de muestra.", "Pruebas de significancia estadística y técnicas de remuestreo.", "Control de sesgos y sobreajuste.", "Reproducibilidad experimental."],
      reflections: [
        "Un resultado atractivo en un backtest puede perder buena parte de su interés cuando incorporamos las condiciones bajo las cuales realmente tendría que operar un inversionista. Y una estrategia puede ser perfectamente rentable en el mercado actual, aunque funcione pésimo en un backtest, pues \"nadie se baña 2 veces en el mismo río\".",
        "Me interesa desmenuzar estas diferencias, incluso cuando los resultados contradicen la hipótesis inicial y especialmente si refuerzan mi opinión, pues no quiero caer en sesgos de confirmación.",
      ],
    },
    personal: {
      question: "Antes de entender el mercado, considero importante entendernos a nosotros mismos.",
      paragraphs: ["No todos tenemos la misma capacidad financiera, tolerancia al riesgo, horizonte temporal ni obligaciones personales.", "Las herramientas de finanzas personales buscan ayudar a identificar estas diferencias y explorar cómo influyen en nuestras decisiones.", "Trabajo sobre dimensiones como el presupuesto, el endeudamiento, la liquidez, los objetivos financieros, la capacidad de asumir pérdidas y el comportamiento frente a la incertidumbre.", "Mi objetivo no es que todas las personas lleguen a la misma decisión, sino que cada una pueda entender mejor las implicaciones de la suya."],
    },
    data: [
      "Utilizo fuentes institucionales, información de mercado, publicaciones académicas y proveedores de datos, complementados con desarrollos y cálculos propios.",
      "Las herramientas se apoyan en distintos lenguajes y entornos de programación, entre ellos Python, R, Stata, C++ y Pine Script.",
      "Comparto parte de estos recursos porque así como no me gusta creer sin verificar, no busco que nadie me crea absolutamente nada, deseo que contrasten y cuestionen mis resultados y cuando encuentren algo importante ME LO DEJEN SABER.",
      "En los módulos que utilizan información periódica, he incorporado procesos automatizados de actualización donde las características de la fuente y la infraestructura lo permiten.",
      "Procuro identificar la fecha de corte, la frecuencia, el origen de los datos y las limitaciones de cada cálculo. Cuando una información no está disponible, dejo clara su ausencia.",
      "Las fórmulas, los parámetros y las particularidades metodológicas se documentan en las herramientas correspondientes.",
    ],
    invitationEmphasis: "ME LO DEJEN SABER.",
    limits: [
      "Los mercados evolucionan. Las distribuciones cambian, las correlaciones no son constantes y las relaciones que observamos durante determinados periodos pueden dejar de ser relevantes.",
      "Los modelos son representaciones simplificadas de una realidad considerablemente más compleja.",
      "Por favor, no consideren mis herramientas como sistemas infalibles ni como sustitutos del criterio del inversionista, cada quien debe ser responsable de sus decisiones, incluyendo la obtención, depuración y cálculo de la información.",
      "Esta metodología está en constante evolución. A medida que incorporo nuevos conocimientos, encuentro mejores fuentes o identifico limitaciones en mis procedimientos, reviso y modifico mi forma de trabajar.",
    ],
    closing: ["Mi propósito no es tener una respuesta para cada movimiento del mercado.", "Es disponer de mejores herramientas para formular preguntas, evaluar mis hipótesis y tomar decisiones con mayor criterio."],
    toolLink: "Abrir herramienta",
  },
  en: {
    title: "Methodology",
    subtitle: "Observe, quantify, question.",
    description: "My way of studying markets, building tools and putting my hypotheses to the test.",
    sections: ["My approach", "The principles I work by", "From data to judgment", "How I study the market", "Research", "Personal finance", "Data, tools and reproducibility", "The limits of my methodology"],
    approach: [
      "I see the market as a multidimensional system. An asset’s price is probably its most visible dimension, but not infrequently the most explanatory.",
      "I am interested in understanding what lies behind its movements, the conditions that accompany them, the risks I am taking and how different current behavior is from what I have historically observed.",
      "To do so, I draw on engineering, economics, statistics, quantitative finance and computing. I do not consider any one of these disciplines sufficient, on its own, to explain the market.",
      "My purpose is not to eliminate uncertainty, but to understand it better and learn to make decisions alongside it.",
    ],
    principles: [
      { title: "Evidence.", text: "An interesting idea is not necessarily a correct one. I want to know what evidence supports it and under what conditions it ceases to be valid." },
      { title: "Context.", text: "An isolated data point can be correct and still lead me to a mistaken interpretation." },
      { title: "Probability.", text: "I prefer studying distributions, frequencies and scenarios to constructing deterministic conclusions." },
      { title: "Traceability.", text: "I consider it important to identify where a data point comes from, how it has been processed and which assumptions enter into its calculation." },
      { title: "Skepticism.", text: "I question other people’s hypotheses as well as my own. A result that matches what I expected to find is no more valid for doing so." },
      { title: "Risk.", text: "Returns interest me, but I also care about understanding what I have had to take on to obtain them." },
    ],
    process: {
      intro: "I distinguish five stages in my analytical process:",
      steps: ["Observation", "Processing", "Quantification", "Interpretation", "Decision"],
      explanation: "I start with observable, calculable information, organize it, apply the statistical tools I consider appropriate and then interpret the results in their context.",
      distinctionIntro: "I try to maintain a clear distinction between three elements:",
      distinctions: ["The data published by a source.", "The result obtained through my own calculation or model.", "My interpretation of that result."],
      distinctionEnd: "They are not of the same nature, nor do they necessarily carry the same degree of certainty.",
      decision: "Decision comes at a later stage. Having more information does not mean I should act more frequently, and not having enough information does not imply paralysis either.",
    },
    modules: [
      {
        id: "dashboard", title: "Market Dashboard", question: "Under what conditions is the market moving?", href: "/en/dashboard",
        blocks: [
          { text: "I built the Dashboard to bring together different dimensions of the market that I consider relevant to my investment process." },
          { label: "Financial environment.", text: "I observe financial stress, its evolution and the variables that contribute to it, using various public sources." },
          { label: "Price and participation.", text: "I want to know whether index movements are accompanied by broad market participation or depend on a small group of assets. To do so, I analyze SPY, RSP, sector performance and the RAMO and RASI breadth indicators." },
          { label: "Risk.", text: "I use implied volatility indicators, EWMA and GARCH models, Value at Risk, correlations and measures of variance concentration, such as the Absorption Ratio. Each allows me to study a different dimension of risk." },
          { label: "Capital flows.", text: "I observe net inflows and outflows in selected investment vehicles, their persistence and their magnitude relative to their history. I distinguish between reported flows, estimates and indirect approximations." },
          { text: "I do not expect every indicator to agree. In fact, it is precisely their divergences that provide me with the most information." },
        ],
      },
      {
        id: "quantitative", title: "Quantitative analysis", question: "Where does this asset stand relative to its own history?", href: "/en/quantitative-analysis",
        blocks: [
          { text: "This tool grew out of my interest in understanding an asset’s behavior from a statistical perspective, beyond the conventional observation of its price." },
          { text: "I study:" },
          { items: ["Historical distributions of movements and extensions.", "Weekly and monthly statistical levels.", "Percentiles and deviations from historical references.", "Drawdowns and recovery processes.", "Seasonality and calendar patterns.", "Return and risk metrics.", "Correlations between assets."] },
          { text: "Each reading depends on its time horizon, frequency, available information and corresponding sample size." },
          { text: "For example, an asset at an extreme of its historical distribution tells me something about how unusual its behavior is. It does not necessarily tell me that it is about to change direction." },
          { text: "A historical frequency does not constitute a future probability either." },
        ],
      },
      {
        id: "portfolio", title: "Portfolio fragility", question: "What risks am I taking, including those that are not obvious?", href: "/en/portfolio-fragility",
        blocks: [
          { text: "Holding several assets in a portfolio does not necessarily mean being diversified." },
          { text: "I want to understand how capital is distributed, the dependencies between positions and how the whole portfolio might behave under different conditions." },
          { text: "The tool allows exploration of concentration, correlations, historical behavior, stress scenarios and counterfactual exercises." },
          { text: "The latter allow us to ask how the outcome would have changed under a different composition or different assumptions." },
          { text: "I am not looking to identify a universally optimal portfolio. I want investors to better understand the structure of the risk they have chosen to take." },
        ],
      },
      {
        id: "perspectives", title: "Analysis and perspectives", question: "What do I consider relevant in the current context?", href: "/en/reports",
        blocks: [
          { text: "In my reports, I share my observations about the market, the changes I identify and the scenarios I consider reasonable." },
          { text: "I combine macroeconomic, statistical, financial and sector information with readings from my own tools." },
          { text: "I try to distinguish between what has happened, what has changed and what I consider could happen under certain conditions." },
          { text: "My perspectives are open to revision. If the information supporting a hypothesis changes, I consider it reasonable for my interpretation to change as well." },
        ],
      },
      {
        id: "trends", title: "Trends", question: "Which structural changes are worth studying?", href: "/en/trends",
        blocks: [
          { text: "I am interested in observing the technological, economic and social transformations that could change the way we produce, consume, work and invest." },
          { text: "I study each trend across different dimensions: the evidence supporting it, its value chain, capital allocation, public policy, regulation, available investment vehicles and the risks that could invalidate my hypothesis." },
          { text: "I distinguish between identifying a structural change and identifying an investment opportunity." },
          { text: "A technology can transform the world without necessarily making it profitable to invest in it at any price." },
        ],
      },
    ],
    research: {
      question: "What remains of a hypothesis after putting it to the test?",
      intro: ["Research is an important part of my learning and professional development process.", "I am interested in studying both the existence of particular financial anomalies and the persistence of their results, their statistical significance and their practical viability."],
      criteriaIntro: "Where appropriate, my research incorporates elements such as:",
      criteria: ["Comparison with relevant benchmarks.", "Transaction costs and operational constraints.", "Out-of-sample validation.", "Statistical significance tests and resampling techniques.", "Control of bias and overfitting.", "Experimental reproducibility."],
      reflections: [
        "An attractive backtest result can lose much of its appeal once we incorporate the conditions under which an investor would actually have to operate. And a strategy can be perfectly profitable in today’s market even if it performs terribly in a backtest, because \"no one bathes 2 times in the same river\".",
        "I want to pick apart these differences, even when the results contradict the initial hypothesis, and especially when they reinforce my opinion, because I do not want to fall into confirmation bias.",
      ],
    },
    personal: {
      question: "Before understanding the market, I consider it important to understand ourselves.",
      paragraphs: ["We do not all have the same financial capacity, risk tolerance, time horizon or personal obligations.", "The personal finance tools aim to help identify these differences and explore how they influence our decisions.", "I work on dimensions such as budgeting, debt, liquidity, financial goals, the capacity to absorb losses and behavior in the face of uncertainty.", "My aim is not for everyone to reach the same decision, but for each person to better understand the implications of their own."],
    },
    data: [
      "I use institutional sources, market information, academic publications and data providers, complemented by my own developments and calculations.",
      "The tools draw on different programming languages and environments, including Python, R, Stata, C++ and Pine Script.",
      "I share some of these resources because, just as I do not like to believe without checking, I do not want anyone to take anything I say on faith. I want you to cross-check and question my results and, when you find something important, LET ME KNOW.",
      "In modules that use periodic information, I have incorporated automated update processes wherever the characteristics of the source and the infrastructure allow it.",
      "I try to identify the cutoff date, frequency, origin of the data and limitations of each calculation. When information is unavailable, I make its absence clear.",
      "Formulas, parameters and methodological details are documented in the corresponding tools.",
    ],
    invitationEmphasis: "LET ME KNOW.",
    limits: [
      "Markets evolve. Distributions change, correlations are not constant, and relationships observed during particular periods can cease to be relevant.",
      "Models are simplified representations of a considerably more complex reality.",
      "Please do not consider my tools infallible systems or substitutes for investor judgment. Each person must be responsible for their decisions, including obtaining, cleaning and calculating information.",
      "This methodology is constantly evolving. As I incorporate new knowledge, find better sources or identify limitations in my procedures, I review and modify the way I work.",
    ],
    closing: ["My purpose is not to have an answer for every market movement.", "It is to have better tools to formulate questions, evaluate my hypotheses and make decisions with better judgment."],
    toolLink: "Open tool",
  },
};
