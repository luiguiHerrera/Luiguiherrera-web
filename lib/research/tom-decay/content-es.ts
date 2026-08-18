import type { TomDecayContent } from "./content-types.ts";
import { tomDecayReferences } from "./references.ts";

export const tomDecayContentEs: TomDecayContent = {
  locale: "es",
  pathname: "/investigacion/el-fantasma-de-una-anomalia",
  breadcrumb: { href: "/investigacion", label: "Investigación", navLabel: "Ruta de navegación" },
  descriptor: "Turn-of-the-Month Anomaly Decay · Investigación reproducible",
  documentTitle: "El fantasma de una anomalía",

  nav: {
    label: "Secciones de la investigación",
    items: [
      { id: "pregunta", label: "La pregunta" },
      { id: "hallazgos", label: "Lo que encontré" },
      { id: "publicacion", label: "Publicación" },
      { id: "evidencia", label: "El deterioro" },
      { id: "replicacion", label: "Replicación" },
      { id: "limites", label: "Límites" },
      { id: "reproducir", label: "Reproducir" },
    ],
  },

  hero: {
    kicker: "Investigación · Finanzas empíricas · Reproducible",
    title: "El fantasma de una anomalía",
    subtitle:
      "Una anomalía puede seguir viéndose bien en un backtest largo incluso cuando gran parte de su prima pertenece a un mercado que ya no existe.",
    intro: [
      "Empecé con una pregunta simple: si el efecto turn-of-the-month lleva décadas documentado, ¿sigue perteneciendo al mercado actual?",
      "Lo interesante no fue confirmar que existió. Eso ya se sabía. Lo interesante fue ver que hacerse público no coincide con una desaparición inmediata, mientras que el deterioro fuerte aparece después.",
    ],
    metadata:
      "S&P 500 + Kenneth French US Market · 1950–2026 · HAC/Newey-West · Replicación independiente",
    primaryCta: { href: "#evidencia", label: "Ver evidencia" },
    secondaryCta: { href: "#reproducir", label: "Reproducir en Stata" },
    ribbon: {
      caption: "Abstract visual",
      note: "Ilustración editorial del recorrido del estudio, no una serie medida. Los datos exactos aparecen más abajo.",
      strongLabel: "Prima histórica amplia",
      zeroLabel: "Indistinguible de cero",
      markers: [
        { year: 1987, label: "Etapa de publicación" },
        { year: 1995, label: "T+3" },
        { year: 2001, label: "Decimalización" },
        { year: 2017, label: "T+2" },
        { year: 2024, label: "T+1" },
      ],
    },
  },

  question: {
    eyebrow: "La pregunta",
    title: "¿Cuánto de este resultado sigue siendo del mercado de hoy?",
    body: [
      "El turn-of-the-month es una de las anomalías de calendario más documentadas del mercado estadounidense ([[reference-lakonishok-smidt-1988|Lakonishok y Smidt, 1988]]; [[reference-mcconnell-xu-2008|McConnell y Xu, 2008]]).",
      "No quería volver a demostrar que funcionó históricamente. Quería saber algo más útil: cuánto de ese resultado sigue perteneciendo al mercado que existe hoy.",
      "Para responderlo separé la muestra por tiempo, comparé los días TOM contra todos los demás días de trading y repetí el análisis con una segunda fuente y un universo de mercado distinto.",
    ],
  },

  findings: {
    eyebrow: "Lo que encontré",
    title: "Cuatro lecturas del mismo recorrido",
    items: [
      { value: "{yahooPre}", unit: "bps/día", label: "Prima TOM antes de 1987 en el S&P 500." },
      { value: "{yahooPublished}", unit: "bps/día", label: "Entre la publicación de la anomalía y la etapa pre-decimalización." },
      { value: "{yahooPost}", unit: "bps/día", label: "Después de 2001 y antes de T+2." },
      { value: "≈ 0", label: "Los intervalos HAC al 95 % de las ventanas móviles modernas incluyen cero." },
    ],
    emphasis: "La anomalía sobrevivió a hacerse conocida. Lo que no sobrevivió fue su magnitud.",
    replication:
      "La réplica con el mercado estadounidense de Kenneth French muestra el mismo patrón central.",
  },

  publication: {
    eyebrow: "Primer giro",
    title: "Hacerse pública no parece haberla matado",
    body: [
      "Si la historia fuera simplemente “la anomalía se publicó y los arbitradores la eliminaron”, debería aparecer una ruptura clara alrededor de 1987 ([[reference-ariel-1987|Ariel, 1987]]).",
      "No aparece.",
      "En Yahoo/S&P 500, el premium pasa de {yahooFrom} a {yahooTo} bps diarios. En la réplica French de 1950+, pasa de {frenchFrom} a {frenchTo} bps.",
      "Los tests directos entre ambos regímenes no detectan una diferencia significativa.",
    ],
    chartTitle: "Cambio directo entre regímenes adyacentes",
    chartSummary:
      "Comparación por fuente de la prima TOM antes de 1987 y entre 1987 y 2001, con el p-valor del cambio directo entre ambos regímenes.",
    changeLabel: "Cambio",
    pLabel: "p del cambio",
    verdict: "Sin colapso inmediato detectado",
    note: {
      title: "Nota de investigación",
      body: "No detectar una ruptura no demuestra que la publicación o el arbitraje no importaran. Sólo significa que la explicación simple de una desaparición inmediata no encaja bien con estos datos.",
    },
  },

  rolling: {
    eyebrow: "Evidencia principal",
    title: "El deterioro llegó después",
    body: [
      "Después de 2001, el premium baja a {yahooPost} bps/día en el S&P 500 y a {frenchPost} bps/día en la réplica French.",
      "En los regímenes posteriores la estimación continúa reduciéndose y deja de distinguirse estadísticamente de los demás días del mercado.",
      "Los cambios de microestructura —settlement, decimalización, trading electrónico, costes y liquidez— se solapan. No identifico uno de ellos como causa.",
      "Lo que sí muestran los datos es un deterioro fuerte durante esa transformación del mercado.",
    ],
    chartTitle: "Prima TOM móvil a 10 años",
    chartSubtitle: "Ventana móvil fija de 10 años, con intervalo HAC al 95 %",
    chartSummary:
      "La prima TOM móvil a 10 años arranca por encima de 15 bps/día a mediados del siglo XX, se mantiene amplia durante la etapa de publicación y se comprime hacia cero después de 2001. En las ventanas recientes el intervalo HAC al 95 % incluye cero en ambas fuentes.",
    axisY: "bps/día",
    axisX: "Fin de la ventana móvil",
    zeroLabel: "Cero",
    bandLabel: "Intervalo HAC 95 %",
    controlLabel: "Fuente de datos",
    controlOptions: [
      { id: "yahoo", label: "Yahoo S&P 500" },
      { id: "french", label: "French US Market" },
      { id: "both", label: "Ambas" },
    ],
    eventsLabel: "Cambios de mercado",
    events: [
      { id: "PUBLICATION_ERA_1987", label: "Etapa de publicación" },
      { id: "SETTLEMENT_T5_TO_T3_1995", label: "T+3" },
      { id: "DECIMALIZATION_2001", label: "Decimalización completa" },
      { id: "SETTLEMENT_T3_TO_T2_2017", label: "T+2" },
      { id: "SETTLEMENT_T2_TO_T1_2024", label: "T+1" },
    ],
    tooltip: {
      window: "Ventana",
      premium: "Prima",
      interval: "IC 95 %",
      pValue: "p (HAC)",
      observations: "Observaciones",
      partial: "Ventana incompleta: los datos terminan antes del cierre del año.",
    },
    tableToggle: { show: "Ver los datos en tabla", hide: "Ocultar la tabla" },
    tableCaption: "Prima TOM móvil a 10 años por fin de ventana, en bps/día.",
    tableHeaders: ["Fin de ventana", "Fuente", "Prima (bps/día)", "IC 95 %", "p (HAC)", "Observaciones"],
    takeaway:
      "Las marcas verticales señalan cambios de estructura de mercado. Son referencias temporales, no causas identificadas.",
  },

  replication: {
    eyebrow: "Replicación independiente",
    title: "El mismo patrón, otra fuente",
    body: [
      "La primera muestra usa el S&P 500 de Yahoo Finance.",
      "La segunda reconstruye el retorno del mercado estadounidense a partir de Mkt-RF + RF de Kenneth French, sobre un universo value-weighted basado en CRSP.",
      "No son la misma serie y no pretendo que lo sean.",
      "Precisamente por eso importa la comparación: al cambiar proveedor y universo, el patrón central de decay permanece.",
    ],
    sources: [
      {
        id: "yahoo",
        name: "Yahoo S&P 500",
        provider: "Yahoo Finance vía yfinance",
        universe: "Índice S&P 500 (^GSPC)",
        returnDefinition: "Variación porcentual del cierre ajustado del proveedor",
      },
      {
        id: "french",
        name: "Kenneth French US Market",
        provider: "Kenneth French Data Library",
        universe: "Mercado estadounidense value-weighted basado en CRSP",
        returnDefinition: "(Mkt-RF + RF) / 100",
      },
    ],
    chartTitle: "Prima TOM por régimen y fuente",
    chartSummary:
      "Prima TOM diaria por régimen de publicación en ambas fuentes. Los dos primeros regímenes son amplios y similares; los posteriores caen a unos pocos bps por día.",
    axisY: "bps/día",
    sourceFieldLabels: { provider: "Fuente", universe: "Universo", returnDefinition: "Retorno" },
    shortSampleNote:
      "T+1 tiene una muestra corta. No extraigo de ahí una conclusión fuerte sobre alpha negativo moderno.",
    tableCaption: "Prima TOM diaria por régimen y fuente, en bps/día.",
    regimeHeader: "Régimen",
    takeaway: "Otro proveedor, otro universo de mercado, el mismo decay central.",
  },

  ghost: {
    eyebrow: "Alpha fantasma",
    title: "Lo que un backtest largo puede esconder",
    body: [
      "Una muestra larga suele sentirse más segura.",
      "Pero longitud y estabilidad no son lo mismo.",
      "Si junto décadas en las que el premium fue grande con décadas en las que la estimación oscila alrededor de cero, el promedio histórico sigue conservando parte de la señal antigua.",
      "El backtest no está necesariamente equivocado. Puede estar respondiendo a una pregunta que ya no es la que me interesa.",
    ],
    bridge: "La pregunta que sí me interesa es:",
    question:
      "¿Cuánto del resultado histórico sigue existiendo dentro del régimen que realmente voy a operar?",
    stepsLabel: "Capas de evidencia",
    steps: [
      { label: "1950–1987", caption: "Prima amplia y estadísticamente clara." },
      { label: "1987–2001", caption: "La anomalía es pública y la prima sigue siendo amplia." },
      { label: "2001–2017", caption: "La estimación se comprime a unos pocos bps por día." },
      { label: "Ventanas recientes", caption: "Los intervalos al 95 % incluyen cero." },
    ],
    closing:
      "El promedio histórico puede sobrevivir mucho más tiempo que el fenómeno que lo creó.",
  },

  secondary: {
    eyebrow: "Resultados negativos",
    title: "Busqué el mecanismo. No todo sobrevivió.",
    intro: "También probé varias piezas que podían ayudar a explicar el patrón.",
    verdictLabel: "Veredicto",
    resultLabel: "Resultado",
    cards: [
      {
        id: "pressure",
        finding: "Presión previa → reversión",
        body: "En el S&P 500 aparece una relación compatible con la literatura. En la muestra French de 1950+ la diferencia queda sólo marginalmente significativa.",
        evidence: [
          { source: "yahoo", detail: "Diferencia {yahooDiff} bps · p {yahooP}" },
          { source: "french", detail: "Diferencia {frenchDiff} bps · p {frenchP}" },
        ],
        verdict: "Sugerente, no suficientemente robusta para el titular",
        status: "suggestive",
      },
      {
        id: "calendar",
        finding: "Concentración quarter-end / semi-year",
        body: "Las diferencias no sobreviven de forma robusta en la comparación matched-sample.",
        evidence: [
          { source: "french", detail: "Todos los p-valores pareados > 0,20" },
        ],
        verdict: "No robusta",
        status: "not-robust",
      },
      {
        id: "breakpoint",
        finding: "Breakpoint automático",
        body: "El algoritmo selecciona {yahooYear} en Yahoo y {frenchYear} en French. El desacuerdo es informativo: no hay una fecha única y robusta entre universos.",
        evidence: [
          { source: "yahoo", detail: "Año seleccionado {yahooYear}" },
          { source: "french", detail: "Año seleccionado {frenchYear}" },
        ],
        verdict: "Exploratorio; sin fecha única robusta",
        status: "exploratory",
      },
    ],
    closing:
      "No limpié estos resultados para hacer la historia más bonita. Se quedan porque también son parte de la investigación.",
  },

  boundary: {
    eyebrow: "Límites de la afirmación",
    title: "Lo que puedo decir — y lo que no",
    supportsTitle: "La evidencia respalda",
    supports: [
      "un premium TOM histórico grande;",
      "persistencia alrededor de la etapa de publicación;",
      "un deterioro fuerte posterior;",
      "estimaciones móviles modernas indistinguibles de cero;",
      "replicación del patrón central con una fuente y universo independientes.",
    ],
    limitsTitle: "La evidencia no establece",
    limits: [
      "que la decimalización sea la causa;",
      "una fecha exacta de desaparición;",
      "que T+1 tenga todavía una muestra suficiente;",
      "que el mecanismo presión/reversión replique con igual fuerza;",
      "que esto sea una recomendación de trading actual.",
    ],
  },

  lesson: {
    eyebrow: "Por qué importa",
    title: "La parte que realmente me interesa",
    body: [
      "Al final, esta investigación terminó siendo menos sobre una anomalía de calendario y más sobre una debilidad frecuente del backtesting.",
      "Una muestra de 75 años puede ser estadísticamente correcta y económicamente engañosa si mezcla regímenes en los que el mecanismo era fuerte con otros en los que dejó de distinguirse del ruido.",
      "Para mí, una prueba de robustez no debería preguntar sólo si un resultado sobrevive a costes, parámetros o bootstrap.",
    ],
    question: "¿Sigue existiendo la relación que estoy intentando explotar?",
    closing: [
      "Ese es el motivo por el que separo estabilidad temporal, replicación y falsificación del resultado de muestra completa.",
      "No presento esto como una estrategia nueva. Lo presento como un ejemplo de por qué un resultado histórico puede seguir vivo en el backtest mucho después de haber perdido relevancia en el mercado actual.",
    ],
  },

  verification: {
    eyebrow: "Verificación",
    title: "Reproduce la investigación",
    body: "La página publica el mismo paquete utilizado para validar los resultados.",
    dependencyNote: [
      "Para ejecutar la reproducción necesitas el script `.do` y `qtomdecay v0.3.1`.",
      "Los dos paquetes de outputs contienen los resultados congelados usados en esta página y permiten comprobar que tu reproducción coincide con la publicación.",
    ],
    dependencySummary: "Reproducción: 1 + 2 · Verificación completa: 1 + 2 + 3 + 4",
    traceability:
      "Cada cifra publicada en esta página puede rastrearse hasta un output del paquete de investigación.",
    downloadLabel: "Descargar",
    typeLabel: "Tipo",
    items: [
      {
        id: "do",
        name: "reproduce_tom_decay.do",
        role: "Reproducción · Paso 1",
        purpose: "Script público que reproduce ambas muestras con rutas relativas.",
        fileType: "Stata .do",
        href: "/research/tom-decay/downloads/reproduce_tom_decay.do",
      },
      {
        id: "tool",
        name: "qtomdecay",
        role: "Reproducción · Paso 2",
        purpose: "Herramienta de investigación congelada usada en la validación final.",
        fileType: "ZIP",
        version: "0.3.1",
        href: "/research/tom-decay/downloads/qtomdecay_v0_3_1_statanow185.zip",
      },
      {
        id: "yahoo-data",
        name: "Outputs Yahoo S&P 500 1950+",
        role: "Verificación · Yahoo",
        purpose: "Regímenes, tests adyacentes, breaks, ventanas móviles y reporte de la muestra Yahoo.",
        fileType: "CSV · JSON",
        href: "/research/tom-decay/data/yahoo/manifest.json",
      },
      {
        id: "french-data",
        name: "Outputs French US Market 1950+ matched",
        role: "Verificación · French",
        purpose: "Los mismos outputs para la réplica independiente con horizonte emparejado.",
        fileType: "CSV · JSON",
        href: "/research/tom-decay/data/french-matched/manifest.json",
      },
    ],
    environmentTitle: "Entorno de validación",
    environment: [
      "StataNow 18.5 MP",
      "Python 3.11.16",
      "pandas 2.0.3",
      "Inferencia HAC/Newey-West",
      "Yahoo Finance",
      "Kenneth French Data Library",
    ],
    hashesTitle: "Hashes y manifests",
    hashesHint:
      "SHA-256 de cada archivo publicado. Los manifests originales acompañan a los outputs.",
    copyLabel: "Copiar",
    copiedLabel: "Copiado",
    sourceHashLabel: "Descarga de origen Kenneth French (SHA-256)",
  },

  methods: {
    eyebrow: "Método y fuentes",
    title: "Detalle metodológico",
    intro: "Abierto por sección para no interrumpir la lectura principal.",
    sections: [
      {
        id: "event",
        title: "Definición del evento",
        body: [
          "T = 0 es el último día de trading del mes. La ventana TOM canónica es T, T+1, T+2 y T+3.",
          "El benchmark son todos los demás días de trading. La ventana no se optimiza en ningún momento del estudio.",
        ],
      },
      {
        id: "data",
        title: "Procedencia de los datos",
        body: [
          "Yahoo Finance vía yfinance, símbolo ^GSPC, retorno definido como variación porcentual del cierre ajustado del proveedor.",
          "Kenneth French Data Library, Fama/French 3 Factors [Daily], con el retorno de mercado reconstruido como (Mkt-RF + RF) / 100 sobre un universo value-weighted basado en CRSP.",
          "Ambas series son distintas en proveedor y en universo. La comparación es deliberadamente una réplica independiente, no una duplicación.",
        ],
      },
      {
        id: "inference",
        title: "Inferencia estadística",
        body: [
          "Todas las pruebas usan errores estándar HAC/Newey-West con rezagos seleccionados por longitud de muestra ([[reference-newey-west-1987|Newey y West, 1987]]).",
          "Los p-valores publicados corresponden a los outputs congelados del paquete y no se recalculan en el navegador.",
        ],
      },
      {
        id: "cutoffs",
        title: "Cortes históricos",
        body: [
          "Los cortes son externos y fijados antes del análisis: etapa de publicación (1987), T+5 → T+3 (1995), decimalización completa (2001), T+3 → T+2 (2017) y T+2 → T+1 (2024).",
          "Son fronteras temporales, no identificación causal. Varios cambios estructurales se solapan dentro de cada tramo.",
        ],
      },
      {
        id: "rolling",
        title: "Estimación móvil",
        body: [
          "Ventana móvil fija de 10 años con punto final a cierre de año, intervalo HAC al 95 % y prima expresada en bps por día.",
          "Las ventanas móviles son descriptivas. La última ventana de cada serie termina después del final de los datos y se marca como incompleta.",
        ],
      },
      {
        id: "matched",
        title: "Réplica con muestra emparejada",
        body: [
          "La comparación pública principal usa el horizonte emparejado desde 1950 en ambas fuentes.",
          "La muestra completa de French desde 1926 existe como evidencia de apoyo, pero no sustituye a la comparación emparejada.",
        ],
      },
      {
        id: "exploratory",
        title: "Análisis exploratorio",
        body: [
          "La búsqueda automática de breakpoint es explícitamente exploratoria y su p-valor no está ajustado por multiplicidad.",
          "No debe leerse como una prueba confirmatoria ni como la detección de una fecha de desaparición.",
        ],
      },
      {
        id: "limits",
        title: "Limitaciones",
        body: [
          "Este no es un trabajo de identificación causal.",
          "La muestra T+1 es corta y exploratoria.",
          "El mecanismo presión/reversión no replica con la misma fuerza en la muestra emparejada.",
          "La concentración de calendario no sobrevive de forma robusta.",
          "El estudio no evalúa costes de transacción, capacidad ni implementación, y no constituye una recomendación de inversión.",
        ],
      },
    ],
  },

  glossary: {
    eyebrow: "Referencia",
    title: "Glosario",
    intro: "Definiciones breves de los términos estadísticos utilizados a lo largo del estudio.",
    entries: [
      {
        id: "glossary-bps",
        term: "BPS",
        shortLabel: "Puntos básicos",
        definition: "BPS significa basis points o puntos básicos. 1 bp equivale a 0,01 % y 100 bps equivalen a 1 %.",
        explanation: "Permite expresar diferencias pequeñas de rentabilidad sin confundir porcentajes con puntos porcentuales.",
      },
      {
        id: "glossary-hac",
        term: "HAC",
        shortLabel: "Errores estándar robustos",
        definition: "HAC significa Heteroskedasticity and Autocorrelation Consistent. Es un ajuste de errores estándar robusto a heterocedasticidad y autocorrelación serial.",
        explanation: "Ayuda a que la incertidumbre estadística no parezca artificialmente pequeña cuando la variabilidad cambia o las observaciones cercanas están relacionadas.",
        source: { href: "#reference-newey-west-1987", label: "Newey y West (1987)" },
      },
      {
        id: "glossary-p",
        term: "p / p-valor",
        shortLabel: "Evidencia bajo la hipótesis nula",
        definition: "El p-valor es la probabilidad, bajo la hipótesis nula y el modelo del test, de observar un resultado al menos tan extremo como el obtenido.",
        explanation: "Un valor menor indica mayor incompatibilidad con la hipótesis nula; no mide la probabilidad de que esa hipótesis sea verdadera ni la importancia económica del resultado.",
      },
    ],
  },

  references: {
    eyebrow: "Literatura científica",
    title: "Referencias",
    intro: "Publicaciones citadas para el contexto histórico y metodológico del estudio.",
    externalLabel: "Abrir publicación en una pestaña nueva",
    doiLabel: "DOI",
    entries: tomDecayReferences,
  },

  footer: {
    author: "Luigui Herrera",
    role: "Investigación cuantitativa aplicada y herramientas reproducibles.",
    relatedTitle: "Trabajo relacionado",
    related: [
      {
        href: "/investigacion/td3",
        label: "Evaluación realista de claims DRL",
        description: "Costes, cash explícito, benchmarks comparables y validación estadística.",
      },
      {
        href: "/fragilidad-de-portafolio",
        label: "Fragilidad de portafolio",
        description: "Concentración, correlación, contribución al riesgo y stress.",
      },
      {
        href: "/metodologia",
        label: "Metodología",
        description: "Fuentes, límites y trazabilidad de las herramientas del sitio.",
      },
    ],
    closing: "Código, datos derivados y método disponibles para verificación.",
  },

  labels: {
    datasets: {
      yahoo: { name: "Yahoo S&P 500", short: "Yahoo" },
      french: { name: "French US Market", short: "French" },
    },
    regimes: {
      PRE_PUBLICATION: { name: "Pre-publicación", short: "Pre-1987" },
      PUBLISHED_PRE_DECIMAL: { name: "Publicada / pre-decimalización", short: "1987–2001" },
      POST_DECIMAL_PRE_T2: { name: "Post-decimalización / pre-T+2", short: "2001–2017" },
      T2: { name: "T+2", short: "T+2" },
      T1: { name: "T+1", short: "T+1" },
    },
    bpsPerDay: "bps/día",
    hacP: "p (HAC)",
    tomDays: "Días TOM",
    observations: "Observaciones",
    source: "Fuente",
    premium: "Prima",
    shortSample: "Muestra corta",
    change: "Cambio",
  },
};
