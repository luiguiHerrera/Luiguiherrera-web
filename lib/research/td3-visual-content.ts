import type { Td3PaperLocale } from "@/lib/research/td3-paper";

export type ClaimVerdict = "supported" | "not-supported" | "conditional";

export type Td3VisualContent = {
  navigation: Array<{ href: string; label: string }>;
  backtest: {
    eyebrow: string;
    title: string;
    apparentTitle: string;
    apparentText: string;
    chartLabel: string;
    axes: [string, string];
    sourcesTitle: string;
    sourcesText: string;
    risks: string[];
    conclusion: string;
  };
  ladder: {
    eyebrow: string;
    title: string;
    researchQuestionLabel: string;
    researchQuestion: string;
    questions: string[];
    interpretiveRuleLabel: string;
    interpretiveRule: string;
  };
  universe: {
    eyebrow: string;
    constraintsTitle: string;
    constraints: string[];
  };
  mechanism: {
    eyebrow: string;
    title: string;
    intro: string;
    state: string;
    actor: string;
    weights: string;
    criticInput: string;
    critics: string;
    lowerEstimate: string;
    reasonsTitle: string;
    reasons: string[];
  };
  evaluation: {
    eyebrow: string;
    title: string;
    intro: string;
    steps: string[];
    flow: [string, string, string];
    temporalNote: string;
    constantsTitle: string;
    constants: Array<[string, string]>;
    matchingNote: string;
  };
  ranking: {
    eyebrow: string;
    title: string;
    intro: string;
    metric: string;
    td3: string;
    comparator: string;
    selected: string;
    rows: [string, string, string];
    boundary: string;
    selectionNote: string;
  };
  statistics: {
    eyebrow: string;
    title: string;
    intro: string;
    chartTitle: string;
    axis: string;
    zero: string;
    wrc: string;
    conclusion: string;
    caveat: string;
  };
  execution: {
    eyebrow: string;
    title: string;
    intro: string;
    chartTitle: string;
    axis: string;
    benchmarkApproximation: string;
    filtersTitle: string;
    filters: string[];
    note: string;
  };
  claims: {
    eyebrow: string;
    title: string;
    intro: string;
    headers: [string, string, string];
    verdicts: Record<ClaimVerdict, string>;
    rows: Array<{ claim: string; verdict: ClaimVerdict; boundary: string }>;
  };
  contribution: {
    eyebrow: string;
    title: string;
    intro: string;
    flow: [string, string, string, string];
    feasibility: string;
    ingredients: string[];
    note: string;
  };
  final: {
    eyebrow: string;
    cards: Array<{ number: string; title: string; verdict: string; text: string; verdictTone: ClaimVerdict }>;
    mainAnswer: string;
    mainResultLabel: string;
    mainResult: string;
  };
  appendix: {
    eyebrow: string;
    title: string;
    intro: string;
    open: string;
    close: string;
    items: Array<{
      title: string;
      text: string;
      link?: { href: string; label: string; description?: string };
    }>;
  };
};

export const td3VisualContent: Record<Td3PaperLocale, Td3VisualContent> = {
  es: {
    navigation: [
      { href: "#claims", label: "Claims" },
      { href: "#metodo", label: "Método" },
      { href: "#evidencia", label: "Evidencia" },
      { href: "#conclusion", label: "Conclusión" },
      { href: "#apendice", label: "Apéndice" },
    ],
    backtest: {
      eyebrow: "Problema de evaluación",
      title: "Un backtest atractivo puede crear falsa confianza",
      apparentTitle: "Resultado aparente",
      apparentText: "Un candidato DRL puede quedar bien posicionado tras el entrenamiento y producir un backtest atractivo.",
      chartLabel: "Ilustración conceptual",
      axes: ["tiempo", "valor"],
      sourcesTitle: "Fuentes de sobreestimación",
      sourcesText: "La credibilidad del resultado depende del diseño de evaluación alrededor del algoritmo.",
      risks: [
        "Benchmarks débiles o no comparables",
        "Costes de transacción simplificados",
        "Tratamiento ambiguo del cash",
        "Sesgo por búsqueda de candidatos",
        "Validación estadística limitada",
      ],
      conclusion: "Por tanto, el TFM evalúa las afirmaciones alrededor de TD3.",
    },
    ladder: {
      eyebrow: "Jerarquía de evidencia",
      title: "Tres afirmaciones, cada vez más exigentes",
      researchQuestionLabel: "Pregunta de investigación",
      researchQuestion:
        "¿Puede un marco de evaluación orientado a falsación distinguir competitividad de ranking, credibilidad estadística y factibilidad práctica en asignación cross-asset basada en TD3?",
      questions: [
        "¿Rinde bien frente a benchmarks comparables?",
        "¿Sobrevive a la incertidumbre y al control de data snooping?",
        "¿Sigue siendo plausible bajo mandatos y estrés de ejecución?",
      ],
      interpretiveRuleLabel: "Regla interpretativa",
      interpretiveRule:
        "Quedar primero en un ranking no demuestra superioridad estadística; incluso la superioridad estadística no garantizaría la desplegabilidad.",
    },
    universe: {
      eyebrow: "Banco de pruebas",
      constraintsTitle: "Restricciones centrales",
      constraints: [
        "Asignación semanal",
        "Long-only; los pesos suman uno",
        "Costes de transacción específicos por activo",
        "Protocolos Zero-CASH y BIL-CASH",
        "Evaluación walk-forward con múltiples semillas",
      ],
    },
    mechanism: {
      eyebrow: "Mecanismo TD3",
      title: "Cómo TD3 produce asignaciones de cartera",
      intro: "TD3 se usa como learner de control continuo; la contribución no es una nueva variante del algoritmo.",
      state: "Estado de mercado",
      actor: "Red actor",
      weights: "Pesos de cartera",
      criticInput: "Entrada [estado, acción]",
      critics: "Críticos gemelos Q1 / Q2",
      lowerEstimate: "Menor estimación Q",
      reasonsTitle: "Por qué TD3 encaja aquí",
      reasons: [
        "Las ponderaciones son acciones continuas",
        "Los críticos gemelos reducen el riesgo de sobreestimación",
        "El suavizado de objetivos estabiliza los targets",
        "Las actualizaciones del actor se retrasan para mejorar estabilidad",
      ],
    },
    evaluation: {
      eyebrow: "Marco de evaluación",
      title: "El candidato se somete a un protocolo exigente",
      intro: "La separación temporal y la comparación bajo supuestos equivalentes forman parte del test.",
      steps: [
        "Datos y familias de variables",
        "Entrenamiento de candidatos TD3",
        "Validación walk-forward y prueba fuera de muestra",
        "Benchmarks determinísticos comparables",
        "Incertidumbre bootstrap y White Reality Check",
        "Diagnósticos de régimen, mandato, Pareto, ejecución y presupuesto",
      ],
      flow: ["Entrenar", "Validar", "Prueba OOS"],
      temporalNote: "La separación temporal es parte de la prueba.",
      constantsTitle: "Constantes respaldadas por el paper",
      constants: [
        ["Folds", "4"],
        ["Semillas", "Múltiples"],
        ["Presupuesto base", "60 episodios"],
        ["Benchmarks", "Conjunto determinístico amplio"],
        ["Cash", "Zero-CASH / BIL-CASH"],
      ],
      matchingNote: "Mismo universo, protocolo cash, calendario de costes y ventana de evaluación.",
    },
    ranking: {
      eyebrow: "Evidencia de ranking",
      title: "La competitividad sobrevive bajo supuestos comparables",
      intro: "La tabla compara los candidatos TD3 de la capa benchmark-matched con Trend SPY/CASH, el comparador limpio usado en validación estadística.",
      metric: "Métrica",
      td3: "TD3",
      comparator: "Trend SPY/CASH",
      selected: "TD3 seleccionado",
      rows: ["Retorno anualizado", "Ratio de Sharpe", "Drawdown máximo"],
      boundary: "El tratamiento del cash cambia la selección del candidato y la interpretación económica.",
      selectionNote:
        "Los candidatos se seleccionan mediante rankings diagnósticos; la interpretación económica descansa en métricas estándar y validación estadística.",
    },
    statistics: {
      eyebrow: "Validación estadística",
      title: "Los intervalos no establecen superioridad",
      intro: "Los intervalos bootstrap de diferencia de Sharpe cruzan cero en ambos protocolos.",
      chartTitle: "Intervalos bootstrap de diferencia de Sharpe",
      axis: "Diferencia de Sharpe",
      zero: "cero",
      wrc: "WRC p-value",
      conclusion:
        "TD3 sigue siendo competitivo en ranking, pero no queda establecida la superioridad estadística frente al benchmark limpio.",
      caveat:
        "Los intervalos son evidencia pareada; White Reality Check es evidencia del conjunto de candidatos ajustada por búsqueda.",
    },
    execution: {
      eyebrow: "Factibilidad práctica",
      title: "El estrés de ejecución y los mandatos cambian la lectura",
      intro: "La sensibilidad se aplica después del entrenamiento: no reentrena TD3, no cambia la selección y no crea nuevos ganadores.",
      chartTitle: "Degradación del Sharpe bajo estrés de spreads",
      axis: "Cambio de Sharpe",
      benchmarkApproximation: "≈ -0.0132 en el paper",
      filtersTitle: "Mandatos y filtros prácticos",
      filters: [
        "Filtro conservador duro: ninguna estrategia pasa",
        "La factibilidad moderada/agresiva depende del perfil",
        "La competitividad Pareto depende de los trade-offs",
        "El supuesto de cash cambia la selección del candidato",
      ],
      note:
        "Estrés: half-spreads adicionales de 3/5/5/50/0 bps para SPY/TLT/GLD/BTC-USD/CASH, ajustados por volatilidad con β = 0.5; sensibilidad posterior al entrenamiento, sin reentrenamiento.",
    },
    claims: {
      eyebrow: "Supervivencia de claims",
      title: "Solo algunas afirmaciones sobreviven",
      intro: "La lectura final separa competitividad, inferencia estadística y factibilidad práctica.",
      headers: ["Afirmación", "Lectura", "Frontera de evidencia"],
      verdicts: { supported: "Respaldada", "not-supported": "No respaldada", conditional: "Condicional" },
      rows: [
        {
          claim: "Competitividad de ranking",
          verdict: "supported",
          boundary: "Los candidatos seleccionados son competitivos frente al benchmark comparable; el liderazgo en retorno depende del cash.",
        },
        {
          claim: "Superioridad estadística",
          verdict: "not-supported",
          boundary: "Los intervalos incluyen cero y White Reality Check no rechaza.",
        },
        {
          claim: "El supuesto de cash importa",
          verdict: "supported",
          boundary: "Zero-CASH y BIL-CASH seleccionan candidatos diferentes.",
        },
        {
          claim: "Los supuestos de ejecución importan",
          verdict: "supported",
          boundary: "Las historias TD3 se degradan más bajo estrés de spreads.",
        },
        {
          claim: "Factibilidad bajo mandato conservador",
          verdict: "not-supported",
          boundary: "Ninguna estrategia pasa todos los filtros conservadores duros.",
        },
        {
          claim: "Competitividad Pareto",
          verdict: "conditional",
          boundary: "Los candidatos quedan sobre o cerca de fronteras relevantes, según perfil y trade-off.",
        },
        {
          claim: "Los benchmarks determinísticos siguen siendo creíbles",
          verdict: "supported",
          boundary: "Trend SPY/CASH continúa siendo un comparador limpio y fuerte.",
        },
      ],
    },
    contribution: {
      eyebrow: "Contribución metodológica",
      title: "Del backtest atractivo a una afirmación defendible",
      intro: "TD3 es el caso de estudio; el marco de evaluación orientado a falsación es la contribución.",
      flow: ["Backtest atractivo", "Evaluación comparable", "Bootstrap + WRC", "Afirmación defendible"],
      feasibility: "Filtros de factibilidad",
      ingredients: [
        "Tratamiento explícito del cash",
        "Costes de transacción",
        "Benchmarks determinísticos comparables",
        "Incertidumbre bootstrap",
        "Control de data snooping",
        "Filtros de factibilidad práctica",
      ],
      note: "La contribución es metodológica, no algorítmica: no propone una nueva variante TD3, alpha desplegable ni superioridad universal.",
    },
    final: {
      eyebrow: "Respuesta final",
      cards: [
        {
          number: "01",
          title: "Competitividad de ranking",
          verdict: "Respaldada",
          text: "Los candidatos TD3 seleccionados siguen siendo competitivos frente a benchmarks determinísticos comparables en rendimiento ajustado por riesgo.",
          verdictTone: "supported",
        },
        {
          number: "02",
          title: "Superioridad estadística",
          verdict: "No establecida",
          text: "Los intervalos bootstrap cruzan cero y White Reality Check no rechaza la hipótesis nula ajustada por búsqueda.",
          verdictTone: "not-supported",
        },
        {
          number: "03",
          title: "Factibilidad práctica",
          verdict: "Condicional",
          text: "Cash, estrés de ejecución, mandatos, trade-offs Pareto y regímenes alteran materialmente la interpretación.",
          verdictTone: "conditional",
        },
      ],
      mainAnswer: "TD3 es un candidato de investigación competitivo para asignación dinámica, no una estrategia de trading estadísticamente dominante.",
      mainResultLabel: "Resultado principal",
      mainResult: "Una evaluación realista cambia materialmente lo que puede afirmarse responsablemente a partir de experimentos favorables de cartera DRL.",
    },
    appendix: {
      eyebrow: "Apéndice interactivo",
      title: "Métodos, límites y trazabilidad",
      intro: "Estas notas amplían el protocolo sin competir con la secuencia principal de evidencia.",
      open: "Abrir",
      close: "Cerrar",
      items: [
        { title: "Los retornos netos incluyen costes específicos", text: "SPY, TLT y GLD usan 2 bps; BTC-USD, 10 bps; CASH, 0 bps bajo Zero-CASH; BIL usa 2 bps bajo BIL-CASH. Los costes afectan al retorno realizado y a la señal de aprendizaje." },
        { title: "Cash no es una nota al pie", text: "Zero-CASH es un sleeve sintético sin rendimiento ni coste. BIL-CASH usa una proxy invertible de Treasuries a corto plazo. Son entornos invertibles distintos y se evalúan por separado." },
        { title: "Diseño de candidatos y familias de variables", text: "Se evalúan familias V2 a V8, incluyendo macro limpio, volatilidad tipo GARCH, ablations sin volatilidad y combinaciones EWMA/GARCH. PCA fue auditado, pero no es la representación por defecto." },
        { title: "Búsqueda controlada por protocolo", text: "La búsqueda combina familias de variables, caps, semillas, folds y cash. La selección TD3-only se separa de la selección para comparación con benchmarks." },
        { title: "Diagnostic selection score", text: "Los scores mandate-aware y robust son resúmenes diagnósticos. No son tests de superioridad, probabilidades calibradas ni prueba de desplegabilidad." },
        { title: "Familias de benchmarks", text: "El conjunto incluye buy-and-hold, equal weight, 60/40, reglas defensivas, momentum, Markowitz rolling, minimum variance, inverse volatility y Trend SPY/CASH, bajo supuestos comparables." },
        { title: "Evaluación walk-forward", text: "Los candidatos se entrenan solo en cada ventana de entrenamiento y se leen fuera de muestra. Cuatro folds temporales reducen dependencia de un único corte, pero no crean historias de mercado independientes." },
        { title: "Bootstrap y White Reality Check", text: "El bootstrap cuantifica incertidumbre pareada en la diferencia de Sharpe. WRC aporta evidencia del conjunto de candidatos ajustada por búsqueda. Ninguno reemplaza la interpretación económica." },
        { title: "Bucle interno TD3", text: "El actor propone acciones continuas; dos críticos estiman valor; target networks, smoothing y actualizaciones retrasadas buscan reducir inestabilidad y sobreestimación." },
        { title: "Diseño de reward", text: "El reward parte del retorno neto e incorpora una penalización activa de drawdown. Turnover se penaliza económicamente mediante costes; concentración se evalúa fuera del reward." },
        { title: "Proyección de acciones factibles", text: "La acción cruda se proyecta al simplex: pesos no negativos que suman uno. La misma acción factible se ejecuta y se almacena para aprendizaje." },
        { title: "Análisis de regímenes", text: "TD3 lidera algunos tramos Zero-CASH, mientras benchmarks y reglas momentum ganan muchos regímenes, especialmente bajo BIL-CASH. No hay dominio all-weather." },
        { title: "Filtros de mandato", text: "Los perfiles conservador, moderado y agresivo aplican límites de drawdown, volatilidad, diversificación efectiva y turnover. Ninguna estrategia pasa la capa conservadora dura." },
        { title: "Convergencia del presupuesto", text: "La comprobación compara 30, 60, 100 y 150 episodios. No detecta subentrenamiento obvio a 60 episodios, pero tampoco demuestra optimalidad global del presupuesto." },
        { title: "Límites de alcance", text: "El universo es compacto y centrado en Estados Unidos. No incluye crédito, inmobiliario, commodities amplias, renta variable internacional, impuestos, impacto de mercado, liabilities ni necesidades de retirada." },
        { title: "Límites de ejecución", text: "La ejecución es aproximada: no modela profundidad de libro, impacto de mercado, liquidez intradía, routing de broker, custodia ni fiscalidad." },
        {
          title: "Reproducibilidad",
          text: "El paper documenta scripts de datos, entorno, entrenamiento, benchmarks, validación estadística y robustez. La trazabilidad respalda inspección y réplica, no sustituye evidencia live-forward.",
          link: {
            href: "https://github.com/luiguiHerrera/portfolio_drl_td3",
            label: "Repositorio del proyecto",
            description: "Código, scripts y evidencia reproducible del protocolo TD3.",
          },
        },
      ],
    },
  },
  en: {
    navigation: [
      { href: "#claims", label: "Claims" },
      { href: "#method", label: "Method" },
      { href: "#evidence", label: "Evidence" },
      { href: "#conclusion", label: "Conclusion" },
      { href: "#appendix", label: "Appendix" },
    ],
    backtest: {
      eyebrow: "Evaluation problem",
      title: "An attractive backtest can create false confidence",
      apparentTitle: "Apparent result",
      apparentText: "A DRL portfolio candidate can rank well after training and produce an attractive backtest.",
      chartLabel: "Conceptual illustration",
      axes: ["time", "value"],
      sourcesTitle: "Sources of overstatement",
      sourcesText: "The credibility of the result depends on the evaluation design around the algorithm.",
      risks: [
        "Weak or mismatched benchmarks",
        "Simplified transaction costs",
        "Ambiguous cash treatment",
        "Candidate-search bias",
        "Limited statistical validation",
      ],
      conclusion: "Therefore, the thesis evaluates the claims around TD3.",
    },
    ladder: {
      eyebrow: "Evidence hierarchy",
      title: "Three increasingly strong claims",
      researchQuestionLabel: "Research question",
      researchQuestion:
        "Can a falsification-oriented evaluation framework distinguish ranking competitiveness, statistical credibility and practical feasibility in TD3-based cross-asset portfolio allocation?",
      questions: [
        "Performs well against matched benchmarks?",
        "Survives uncertainty and data-snooping controls?",
        "Remains plausible under mandates and execution stress?",
      ],
      interpretiveRuleLabel: "Interpretive rule",
      interpretiveRule:
        "Ranking first does not prove statistical superiority, and statistical superiority would still not guarantee deployability.",
    },
    universe: {
      eyebrow: "Test bed",
      constraintsTitle: "Core constraints",
      constraints: [
        "Weekly allocation",
        "Long-only; weights sum to one",
        "Asset-specific transaction costs",
        "Zero-CASH and BIL-CASH protocols",
        "Walk-forward, multi-seed evaluation",
      ],
    },
    mechanism: {
      eyebrow: "TD3 mechanism",
      title: "How TD3 produces portfolio allocations",
      intro: "TD3 is used as a continuous-control learner; the contribution is not a new algorithm variant.",
      state: "Market state",
      actor: "Actor network",
      weights: "Portfolio weights",
      criticInput: "Input [state, action]",
      critics: "Twin critics Q1 / Q2",
      lowerEstimate: "Lower Q estimate",
      reasonsTitle: "Why TD3 fits here",
      reasons: [
        "Portfolio weights are continuous actions",
        "Twin critics reduce overestimation risk",
        "Target smoothing stabilizes critic targets",
        "Actor updates are delayed for stability",
      ],
    },
    evaluation: {
      eyebrow: "Evaluation framework",
      title: "The candidate faces a demanding protocol",
      intro: "Temporal separation and comparison under matching assumptions are part of the test.",
      steps: [
        "Data and feature families",
        "TD3 candidate training",
        "Walk-forward validation and out-of-sample testing",
        "Matched deterministic benchmarks",
        "Bootstrap uncertainty and White Reality Check",
        "Regime, mandate, Pareto, execution and budget diagnostics",
      ],
      flow: ["Train", "Validate", "OOS test"],
      temporalNote: "Temporal separation is part of the test.",
      constantsTitle: "Constants supported by the paper",
      constants: [
        ["Folds", "4"],
        ["Seeds", "Multiple"],
        ["Base budget", "60 episodes"],
        ["Benchmarks", "Broad deterministic set"],
        ["Cash", "Zero-CASH / BIL-CASH"],
      ],
      matchingNote: "Same universe, cash protocol, cost schedule and evaluation window.",
    },
    ranking: {
      eyebrow: "Ranking evidence",
      title: "Competitiveness survives under matched assumptions",
      intro: "The table compares benchmark-matched TD3 candidates with Trend SPY/CASH, the clean comparator used in statistical validation.",
      metric: "Metric",
      td3: "TD3",
      comparator: "Trend SPY/CASH",
      selected: "Selected TD3",
      rows: ["Annualized return", "Sharpe ratio", "Maximum drawdown"],
      boundary: "Cash treatment changes candidate selection and economic interpretation.",
      selectionNote:
        "Candidates are selected through diagnostic rankings; economic interpretation relies on standard metrics and statistical validation.",
    },
    statistics: {
      eyebrow: "Statistical validation",
      title: "The intervals do not establish superiority",
      intro: "Bootstrap Sharpe-difference intervals cross zero in both cash protocols.",
      chartTitle: "Bootstrap Sharpe-difference intervals",
      axis: "Sharpe difference",
      zero: "zero",
      wrc: "WRC p-value",
      conclusion:
        "TD3 remains ranking-competitive, but statistical superiority over the clean benchmark is not established.",
      caveat:
        "The intervals are pairwise evidence; White Reality Check is search-adjusted candidate-set evidence.",
    },
    execution: {
      eyebrow: "Practical feasibility",
      title: "Execution stress and mandates change the reading",
      intro: "The sensitivity check is post-training: it does not retrain TD3, alter selection or create new winners.",
      chartTitle: "Sharpe degradation under spread stress",
      axis: "Sharpe change",
      benchmarkApproximation: "≈ -0.0132 in the paper",
      filtersTitle: "Mandates and practical filters",
      filters: [
        "Conservative hard filter: no strategy passes",
        "Moderate/aggressive feasibility is profile-dependent",
        "Pareto competitiveness depends on trade-offs",
        "Cash treatment changes candidate selection",
      ],
      note:
        "Stress: additional half-spreads of 3/5/5/50/0 bps for SPY/TLT/GLD/BTC-USD/CASH, volatility-adjusted with β = 0.5; post-training sensitivity, with no retraining.",
    },
    claims: {
      eyebrow: "Claim survival",
      title: "Only some claims survive",
      intro: "The final reading separates competitiveness, statistical inference and practical feasibility.",
      headers: ["Claim", "Reading", "Evidence boundary"],
      verdicts: { supported: "Supported", "not-supported": "Not supported", conditional: "Conditional" },
      rows: [
        { claim: "Ranking competitiveness", verdict: "supported", boundary: "Selected candidates remain competitive against the matched comparator; return leadership depends on cash." },
        { claim: "Statistical superiority", verdict: "not-supported", boundary: "Bootstrap intervals include zero and White Reality Check does not reject." },
        { claim: "Cash assumption matters", verdict: "supported", boundary: "Zero-CASH and BIL-CASH select different candidates." },
        { claim: "Execution assumptions matter", verdict: "supported", boundary: "TD3 histories degrade more under spread stress." },
        { claim: "Conservative mandate feasibility", verdict: "not-supported", boundary: "No strategy passes every conservative hard filter." },
        { claim: "Pareto competitiveness", verdict: "conditional", boundary: "Candidates sit on or near relevant frontiers, depending on profile and trade-off." },
        { claim: "Deterministic benchmarks remain credible", verdict: "supported", boundary: "Trend SPY/CASH remains a strong clean comparator." },
      ],
    },
    contribution: {
      eyebrow: "Methodological contribution",
      title: "From an attractive backtest to a defensible claim",
      intro: "TD3 is the case study; the falsification-oriented evaluation framework is the contribution.",
      flow: ["Attractive backtest", "Matched evaluation", "Bootstrap + WRC", "Defensible research claim"],
      feasibility: "Feasibility filters",
      ingredients: [
        "Explicit cash treatment",
        "Transaction costs",
        "Matched deterministic benchmarks",
        "Bootstrap uncertainty",
        "Data-snooping control",
        "Practical feasibility filters",
      ],
      note: "The contribution is methodological rather than algorithmic: it does not propose a new TD3 variant, deployable alpha or universal superiority.",
    },
    final: {
      eyebrow: "Final answer",
      cards: [
        { number: "01", title: "Ranking competitiveness", verdict: "Supported", text: "Selected TD3 candidates remain competitive against matched deterministic benchmarks on risk-adjusted performance.", verdictTone: "supported" },
        { number: "02", title: "Statistical superiority", verdict: "Not established", text: "Bootstrap intervals cross zero and White Reality Check does not reject the search-adjusted null.", verdictTone: "not-supported" },
        { number: "03", title: "Practical feasibility", verdict: "Conditional", text: "Cash, execution stress, mandates, Pareto trade-offs and market regimes materially affect interpretation.", verdictTone: "conditional" },
      ],
      mainAnswer: "TD3 is a competitive research candidate for dynamic allocation—not a statistically dominant trading strategy.",
      mainResultLabel: "Main result",
      mainResult: "Realistic evaluation materially changes what can responsibly be claimed from favourable DRL portfolio experiments.",
    },
    appendix: {
      eyebrow: "Interactive appendix",
      title: "Methods, limits and traceability",
      intro: "These notes extend the protocol without competing with the main evidence sequence.",
      open: "Open",
      close: "Close",
      items: [
        { title: "Net returns include asset-specific costs", text: "SPY, TLT and GLD use 2 bps; BTC-USD uses 10 bps; CASH uses 0 bps under Zero-CASH; BIL uses 2 bps under BIL-CASH. Costs affect realized returns and the learning signal." },
        { title: "Cash is not a footnote", text: "Zero-CASH is a synthetic zero-return, zero-cost sleeve. BIL-CASH uses an investable short-term Treasury proxy. They are different investable environments and are evaluated separately." },
        { title: "TD3 candidate design and feature families", text: "The search evaluates V2-V8 families, including clean macro, GARCH-style volatility, no-volatility ablations and EWMA/GARCH combinations. PCA was audited but is not the default representation." },
        { title: "Candidate search is controlled by protocol", text: "The search combines feature families, caps, seeds, folds and cash. TD3-only selection is separated from benchmark-comparison selection." },
        { title: "Diagnostic selection score", text: "Mandate-aware and robust scores are diagnostic summaries. They are not superiority tests, calibrated probabilities or proof of deployability." },
        { title: "Benchmark families", text: "The set includes buy-and-hold, equal weight, 60/40, defensive rules, momentum, rolling Markowitz, minimum variance, inverse volatility and Trend SPY/CASH under matching assumptions." },
        { title: "Walk-forward evaluation", text: "Candidates are trained only inside each training window and read out of sample. Four temporal folds reduce dependence on one split but do not create independent market histories." },
        { title: "Bootstrap and White Reality Check", text: "Bootstrap quantifies pairwise uncertainty in the Sharpe difference. WRC provides search-adjusted candidate-set evidence. Neither replaces economic interpretation." },
        { title: "TD3 internal update loop", text: "The actor proposes continuous actions; two critics estimate value; target networks, smoothing and delayed updates seek to reduce instability and overestimation." },
        { title: "Reward design", text: "Reward begins with net return and includes an active drawdown penalty. Turnover is penalized economically through costs; concentration is evaluated outside the reward." },
        { title: "Feasible-action projection", text: "The raw action is projected onto the simplex: non-negative weights that sum to one. The same feasible action is executed and stored for learning." },
        { title: "Regime analysis", text: "TD3 leads selected Zero-CASH slices, while benchmarks and momentum rules win many regimes, especially under BIL-CASH. There is no all-weather dominance." },
        { title: "Mandate filters", text: "Conservative, moderate and aggressive profiles apply drawdown, volatility, effective-diversification and turnover limits. No strategy passes the conservative hard-filter layer." },
        { title: "Training-budget convergence", text: "The check compares 30, 60, 100 and 150 episodes. It finds no obvious undertraining at 60 episodes but does not prove global budget optimality." },
        { title: "Scope limits", text: "The universe is compact and US-centric. It excludes credit, real estate, broad commodities, international equities, taxes, market impact, liabilities and withdrawal needs." },
        { title: "Execution limits", text: "Execution modeling is approximate: it does not model order-book depth, market impact, intraday liquidity, broker routing, custody or taxes." },
        {
          title: "Reproducibility",
          text: "The paper documents data, environment, training, benchmark, statistical-validation and robustness scripts. Traceability supports inspection and replication; it does not replace live-forward evidence.",
          link: {
            href: "https://github.com/luiguiHerrera/portfolio_drl_td3",
            label: "Project repository",
            description: "Code, scripts and reproducible evidence for the TD3 protocol.",
          },
        },
      ],
    },
  },
};
