export type Td3PaperLocale = "es" | "en";

type TextBlock = {
  title: string;
  text: string;
};

type Claim = {
  claim: string;
  state: string;
};

type ProtocolStep = {
  label: string;
  description: string;
};

type AssetSleeve = {
  ticker: string;
  role: string;
  reason: string;
  limitation: string;
};

export type CashProtocol = {
  id: "zero-cash" | "bil-cash";
  label: string;
  description: string;
  cost: string;
  message: string;
  selectedTd3: string;
  comparator: string;
  td3Metrics: Array<[string, string]>;
  comparatorMetrics: Array<[string, string]>;
  validation: Array<[string, string]>;
  interpretation: string;
};

type EvidenceRow = {
  claim: string;
  evidence: string;
  tone: "yes" | "no" | "mixed";
};

export type Td3PaperContent = {
  locale: Td3PaperLocale;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    badges: string[];
    note: string;
  };
  thesis: {
    title: string;
    text: string;
    claims: Claim[];
  };
  protocol: {
    title: string;
    intro: string;
    input: string;
    output: string;
    steps: ProtocolStep[];
  };
  universe: {
    title: string;
    intro: string;
    sleeves: AssetSleeve[];
  };
  cash: {
    title: string;
    intro: string;
    protocols: CashProtocol[];
  };
  results: {
    title: string;
    intro: string;
  };
  evidence: {
    title: string;
    rows: EvidenceRow[];
  };
  robustness: {
    title: string;
    layers: TextBlock[];
  };
  final: {
    title: string;
    text: string;
    note: string;
  };
};

export const td3PaperContent: Record<Td3PaperLocale, Td3PaperContent> = {
  es: {
    locale: "es",
    hero: {
      eyebrow: "Paper interactivo",
      title: "Evaluación realista de claims DRL",
      subtitle:
        "Un paper interactivo sobre cómo cambian las conclusiones de un modelo TD3 cuando se evalúa con costes, cash explícito, benchmarks comparables y validación estadística.",
      badges: ["Caso TD3", "Costes", "Protocolos cash", "Benchmarks comparables", "Bootstrap", "White Reality Check"],
      note: "Investigación educativa. No es recomendación de inversión ni estrategia desplegable.",
    },
    thesis: {
      title: "Tesis central",
      text: "La pregunta no es si un backtest puede verse fuerte. La pregunta es qué queda en pie después de imponer fricciones realistas.",
      claims: [
        { claim: "Competitividad de ranking", state: "Sí, sobrevive de forma acotada." },
        { claim: "Superioridad estadística", state: "No queda respaldada." },
        { claim: "Viabilidad práctica", state: "Depende de restricciones, cash, spreads y mandato." },
      ],
    },
    protocol: {
      title: "Protocolo como sistema de evidencia",
      intro: "TD3 es el caso de estudio. La contribución principal es el protocolo de evaluación.",
      input: "Fortaleza aparente de un portafolio DRL",
      output: "Interpretación, no afirmación de superioridad",
      steps: [
        { label: "Universo", description: "Un banco de pruebas compacto para aislar riesgos económicos distintos." },
        { label: "Asignación semanal", description: "Asignación semanal long-only, plenamente invertida y comparable." },
        { label: "Candidatos TD3", description: "Familias de variables y límites de concentración evaluados como candidatos." },
        { label: "Protocolos cash", description: "Zero-CASH y BIL-CASH separan supuestos defensivos." },
        { label: "Costes por activo", description: "Costes por componente para evitar una lectura sin fricciones." },
        { label: "Benchmarks comparables", description: "Comparadores simples alineados con el mismo entorno invertible." },
        { label: "Bootstrap de diferencias Sharpe", description: "Intervalos para preguntar si la diferencia sobrevive al ruido." },
        { label: "White Reality Check", description: "Control de sesgo de búsqueda entre candidatos." },
        { label: "Análisis por régimen", description: "Lectura por tramos para evitar una conclusión de dominio en todos los regímenes." },
        { label: "Viabilidad por mandato y Pareto", description: "Restricciones prácticas y competencia Pareto." },
        { label: "Estrés de spreads de ejecución", description: "Sensibilidad a ejecución menos benevolente." },
        { label: "Convergencia del presupuesto de entrenamiento", description: "Prueba de si más entrenamiento cambia la interpretación." },
      ],
    },
    universe: {
      title: "Universo de activos",
      intro:
        "El universo es deliberadamente compacto. No busca representar todo el mercado global; busca crear un banco de pruebas interpretable.",
      sleeves: [
        {
          ticker: "SPY",
          role: "Renta variable / riesgo de crecimiento",
          reason: "Introduce beta de crecimiento y riesgo de renta variable estadounidense.",
          limitation: "No representa todo el mercado accionario global ni estilos regionales.",
        },
        {
          ticker: "TLT",
          role: "Duración / riesgo de tipos",
          reason: "Aporta sensibilidad a tipos y duración larga del Tesoro.",
          limitation: "Puede sufrir en ciclos de inflación o subidas agresivas de tipos.",
        },
        {
          ticker: "GLD",
          role: "Refugio real / exposición a activo duro",
          reason: "Permite probar diversificación defensiva y exposición a activo real.",
          limitation: "No genera cash flow y su rol cambia por régimen.",
        },
        {
          ticker: "BTC-USD",
          role: "Alternativo digital / convexidad especulativa",
          reason: "Introduce convexidad especulativa y volatilidad extrema.",
          limitation: "Tiene drawdowns profundos y sensibilidad fuerte a ejecución y régimen.",
        },
        {
          ticker: "CASH",
          role: "Liquidez defensiva / opcionalidad",
          reason: "Sirve como componente defensivo y control del mandato.",
          limitation: "La forma de modelarlo cambia el entorno invertible.",
        },
      ],
    },
    cash: {
      title: "Protocolos de cash",
      intro: "Cash no es un detalle cosmético. Cambia el entorno invertible y puede cambiar el candidato seleccionado.",
      protocols: [
        {
          id: "zero-cash",
          label: "Zero-CASH",
          description: "Sleeve defensivo sintético con retorno cero.",
          cost: "Coste de 0 bps",
          message: "Cash actúa como refugio sin rendimiento; el protocolo aísla el valor defensivo puro.",
          selectedTd3: "V3 clean macro cap 0.70",
          comparator: "Trend SPY/CASH",
          td3Metrics: [
            ["Retorno anualizado", "0.0869"],
            ["Volatilidad anualizada", "0.1143"],
            ["Sharpe", "0.9234"],
            ["Drawdown máximo", "-0.1040"],
          ],
          comparatorMetrics: [
            ["Retorno anualizado", "0.0979"],
            ["Volatilidad anualizada", "0.1136"],
            ["Sharpe", "0.8802"],
            ["Drawdown máximo", "-0.1782"],
          ],
          validation: [
            ["Delta Sharpe", "0.1559"],
            ["IC Bootstrap", "[-0.6011, 0.9767]"],
            ["P(beats)", "0.629"],
            ["WRC p-value", "0.7136"],
          ],
          interpretation: "Aparece competitividad de ranking, pero no queda respaldada la superioridad estadística.",
        },
        {
          id: "bil-cash",
          label: "BIL-CASH",
          description: "Proxy ETF de Treasuries de corto plazo.",
          cost: "Coste de 2 bps",
          message: "Cash incorpora una proxy invertible; el candidato seleccionado cambia bajo este supuesto.",
          selectedTd3: "V7 macro+GARCH cap 0.80",
          comparator: "Trend SPY/CASH",
          td3Metrics: [
            ["Retorno anualizado", "0.1065"],
            ["Volatilidad anualizada", "0.1270"],
            ["Sharpe", "1.1415"],
            ["Drawdown máximo", "-0.1030"],
          ],
          comparatorMetrics: [
            ["Retorno anualizado", "0.1024"],
            ["Volatilidad anualizada", "0.1135"],
            ["Sharpe", "0.9169"],
            ["Drawdown máximo", "-0.1730"],
          ],
          validation: [
            ["Delta Sharpe", "0.1170"],
            ["IC Bootstrap", "[-0.7172, 0.9963]"],
            ["P(beats)", "0.588"],
            ["WRC p-value", "0.6767"],
          ],
          interpretation:
            "BIL-CASH cambia el candidato seleccionado, pero la capa estadística sigue rechazando una afirmación fuerte de superioridad.",
        },
      ],
    },
    results: {
      title: "Resultados principales",
      intro:
        "Las cifras se presentan como evidencia para interpretar el protocolo, no como una promesa de rendimiento ni como una estrategia recomendada.",
    },
    evidence: {
      title: "Jerarquía de evidencia",
      rows: [
        { claim: "La competitividad de ranking sobrevive.", evidence: "Sí.", tone: "yes" },
        { claim: "Se establece superioridad estadística.", evidence: "No.", tone: "no" },
        { claim: "El supuesto de cash importa.", evidence: "Sí.", tone: "yes" },
        { claim: "60 episodios implican entrenamiento insuficiente.", evidence: "No hay evidencia.", tone: "mixed" },
        { claim: "Los supuestos de ejecución importan.", evidence: "Sí.", tone: "yes" },
        { claim: "Se logra viabilidad bajo mandato estricto.", evidence: "No.", tone: "no" },
        { claim: "El candidato aprendido es Pareto-competitivo.", evidence: "Sí.", tone: "yes" },
        { claim: "Los scores propios son suficientes.", evidence: "No.", tone: "no" },
        { claim: "Los benchmarks son débiles.", evidence: "No.", tone: "no" },
      ],
    },
    robustness: {
      title: "Capas de robustez",
      layers: [
        {
          title: "Dependencia por régimen",
          text: "TD3 lidera en algunos tramos seleccionados, pero benchmarks deterministas y reglas de momentum siguen siendo fuertes en muchos regímenes. No hay dominancia en todos los entornos.",
        },
        {
          title: "Viabilidad por mandato y Pareto",
          text: "Los candidatos TD3 seleccionados permanecen Pareto-competitivos, pero ninguna estrategia satisface todos los filtros canónicos duros.",
        },
        {
          title: "Estrés de spreads de ejecución",
          text: "Los candidatos TD3 seleccionados se degradan más que Trend SPY/CASH. La realidad de ejecución cambia la interpretación.",
        },
        {
          title: "Convergencia del presupuesto de entrenamiento",
          text: "No hay evidencia de que 60 episodios sea obviamente insuficiente. Entrenar más tiempo no mejora automáticamente los resultados.",
        },
      ],
    },
    final: {
      title: "Interpretación final",
      text:
        "Bajo este protocolo, TD3 es mejor entendido como un candidato competitivo de investigación para asignación dinámica, no como una estrategia estadísticamente dominante.",
      note:
        "El resultado principal no es que DRL falle. El resultado principal es que una evaluación realista cambia lo que se puede afirmar.",
    },
  },
  en: {
    locale: "en",
    hero: {
      eyebrow: "Interactive paper",
      title: "Realistic evaluation of DRL portfolio claims",
      subtitle:
        "An interactive paper on how conclusions from a TD3 model change when evaluated with costs, explicit cash, matched benchmarks and statistical validation.",
      badges: ["TD3 case study", "Costs", "Cash protocols", "Matched benchmarks", "Bootstrap", "White Reality Check"],
      note: "Educational research. Not investment advice and not a deployable strategy.",
    },
    thesis: {
      title: "Central thesis",
      text: "The question is not whether a backtest can look strong. The question is what remains after imposing realistic frictions.",
      claims: [
        { claim: "Ranking competitiveness", state: "Yes, in a bounded way." },
        { claim: "Statistical superiority", state: "Not supported." },
        { claim: "Practical feasibility", state: "Depends on constraints, cash, spreads and mandate." },
      ],
    },
    protocol: {
      title: "Protocol as an evidence system",
      intro: "TD3 is the case study. The main contribution is the evaluation protocol.",
      input: "Apparent DRL portfolio strength",
      output: "Interpretation, not superiority claim",
      steps: [
        { label: "Universe", description: "A compact test bed for isolating different economic risks." },
        { label: "Weekly allocation", description: "Weekly long-only, fully invested and comparable allocation." },
        { label: "TD3 candidates", description: "Feature families and concentration caps evaluated as candidates." },
        { label: "Cash protocols", description: "Zero-CASH and BIL-CASH separate defensive assumptions." },
        { label: "Asset-specific costs", description: "Sleeve-level costs avoid a frictionless reading." },
        { label: "Matched benchmarks", description: "Simple comparators aligned to the same investable environment." },
        { label: "Bootstrap Sharpe differences", description: "Intervals ask whether the difference survives noise." },
        { label: "White Reality Check", description: "Search-bias control across candidates." },
        { label: "Regime analysis", description: "Slice-level reading avoids an all-weather conclusion." },
        { label: "Mandate / Pareto feasibility", description: "Practical constraints and Pareto competitiveness." },
        { label: "Spread stress", description: "Sensitivity to less benevolent execution." },
        { label: "Training-budget convergence", description: "Tests whether more training changes the interpretation." },
      ],
    },
    universe: {
      title: "Asset universe",
      intro:
        "The universe is deliberately compact. It does not try to represent the whole global market; it creates an interpretable test bed.",
      sleeves: [
        {
          ticker: "SPY",
          role: "Equity / growth risk",
          reason: "Adds growth beta and broad US equity risk.",
          limitation: "It does not represent every global equity market or regional style.",
        },
        {
          ticker: "TLT",
          role: "Duration / interest-rate risk",
          reason: "Adds long-duration Treasury and rate sensitivity.",
          limitation: "Can suffer in inflationary or aggressive hiking cycles.",
        },
        {
          ticker: "GLD",
          role: "Real safe-haven / hard-asset exposure",
          reason: "Tests defensive diversification and hard-asset exposure.",
          limitation: "It does not produce cash flow and its role changes by regime.",
        },
        {
          ticker: "BTC-USD",
          role: "Digital alternative / speculative convexity",
          reason: "Adds speculative convexity and extreme volatility.",
          limitation: "It carries deep drawdowns and high regime/execution sensitivity.",
        },
        {
          ticker: "CASH",
          role: "Defensive liquidity / optionality",
          reason: "Serves as the defensive sleeve and mandate control.",
          limitation: "How it is modeled changes the investable environment.",
        },
      ],
    },
    cash: {
      title: "Cash protocols",
      intro: "Cash is not a cosmetic detail. It changes the investable environment and can change the selected candidate.",
      protocols: [
        {
          id: "zero-cash",
          label: "Zero-CASH",
          description: "Synthetic zero-return defensive sleeve.",
          cost: "0 bps cost",
          message: "Cash acts as a no-yield refuge; the protocol isolates pure defensive value.",
          selectedTd3: "V3 clean macro cap 0.70",
          comparator: "Trend SPY/CASH",
          td3Metrics: [
            ["Annual return", "0.0869"],
            ["Annual volatility", "0.1143"],
            ["Sharpe", "0.9234"],
            ["Max drawdown", "-0.1040"],
          ],
          comparatorMetrics: [
            ["Annual return", "0.0979"],
            ["Annual volatility", "0.1136"],
            ["Sharpe", "0.8802"],
            ["Max drawdown", "-0.1782"],
          ],
          validation: [
            ["Sharpe delta", "0.1559"],
            ["Bootstrap CI", "[-0.6011, 0.9767]"],
            ["P(beats)", "0.629"],
            ["WRC p-value", "0.7136"],
          ],
          interpretation: "Ranking competitiveness appears, but statistical superiority is not supported.",
        },
        {
          id: "bil-cash",
          label: "BIL-CASH",
          description: "Short-term Treasury ETF proxy.",
          cost: "2 bps cost",
          message: "Cash uses an investable proxy; the selected candidate changes under this assumption.",
          selectedTd3: "V7 macro+GARCH cap 0.80",
          comparator: "Trend SPY/CASH",
          td3Metrics: [
            ["Annual return", "0.1065"],
            ["Annual volatility", "0.1270"],
            ["Sharpe", "1.1415"],
            ["Max drawdown", "-0.1030"],
          ],
          comparatorMetrics: [
            ["Annual return", "0.1024"],
            ["Annual volatility", "0.1135"],
            ["Sharpe", "0.9169"],
            ["Max drawdown", "-0.1730"],
          ],
          validation: [
            ["Sharpe delta", "0.1170"],
            ["Bootstrap CI", "[-0.7172, 0.9963]"],
            ["P(beats)", "0.588"],
            ["WRC p-value", "0.6767"],
          ],
          interpretation:
            "BIL-CASH changes the selected candidate, but the statistical layer still rejects a strong superiority claim.",
        },
      ],
    },
    results: {
      title: "Main results",
      intro:
        "The figures are presented as evidence for interpreting the protocol, not as a return promise or a recommended strategy.",
    },
    evidence: {
      title: "Evidence hierarchy",
      rows: [
        { claim: "Ranking competitiveness survives.", evidence: "Yes.", tone: "yes" },
        { claim: "Statistical superiority is established.", evidence: "No.", tone: "no" },
        { claim: "Cash assumption matters.", evidence: "Yes.", tone: "yes" },
        { claim: "60 episodes is undertrained.", evidence: "No evidence.", tone: "mixed" },
        { claim: "Execution assumptions matter.", evidence: "Yes.", tone: "yes" },
        { claim: "Hard mandate feasibility is achieved.", evidence: "No.", tone: "no" },
        { claim: "The learning candidate is Pareto-competitive.", evidence: "Yes.", tone: "yes" },
        { claim: "Custom scores are sufficient.", evidence: "No.", tone: "no" },
        { claim: "Benchmarks are weak.", evidence: "No.", tone: "no" },
      ],
    },
    robustness: {
      title: "Robustness layers",
      layers: [
        {
          title: "Regime dependence",
          text: "TD3 leads in selected slices, but deterministic benchmarks and momentum rules remain strong in many regimes. There is no all-weather dominance.",
        },
        {
          title: "Mandate and Pareto feasibility",
          text: "Selected TD3 candidates remain Pareto-competitive, but no strategy satisfies all hard canonical filters.",
        },
        {
          title: "Execution-spread stress",
          text: "Selected TD3 candidates degrade more than Trend SPY/CASH. Execution realism changes the interpretation.",
        },
        {
          title: "Training-budget convergence",
          text: "There is no evidence that 60 episodes is obviously undertrained. Longer training does not automatically improve results.",
        },
      ],
    },
    final: {
      title: "Final interpretation",
      text:
        "Under this protocol, TD3 is best understood as a competitive research candidate for dynamic allocation, not as a statistically dominant trading strategy.",
      note:
        "The main result is not that DRL fails. The main result is that realistic evaluation changes what can be claimed.",
    },
  },
};
