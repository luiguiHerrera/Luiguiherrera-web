import { td3Editorial } from "@/lib/research/td3-editorial";
import { tomDecayEditorial } from "@/lib/research/tom-decay/editorial";

export type ResearchIndexEntry = {
  href: string;
  kicker: string;
  title: string;
  summary: string;
  methods: string[];
  publishedAt: string;
};

export type ResearchIndexContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  entriesLabel: string;
  readLabel: string;
  methodsLabel: string;
  note: string;
  entries: ResearchIndexEntry[];
};

export const researchIndexContent: Record<"es" | "en", ResearchIndexContent> = {
  es: {
    eyebrow: "Investigación",
    title: "Investigación cuantitativa",
    subtitle: "Estudios reproducibles, con sus límites a la vista.",
    description:
      "Cada estudio publica el método, los datos derivados y el código necesario para reproducirlo. Los resultados débiles o negativos se quedan en la página: también son parte del resultado.",
    entriesLabel: "Estudios",
    readLabel: "Leer el estudio",
    methodsLabel: "Método",
    note: "Contenido educativo y de investigación. No es asesoramiento de inversión ni una recomendación de operar.",
    entries: [
      {
        href: tomDecayEditorial.es.pathname,
        kicker: "Anomalías de calendario · Estabilidad temporal",
        title: tomDecayEditorial.es.headline,
        summary:
          "Cuánto de la prima turn-of-the-month sigue perteneciendo al mercado actual, con replicación independiente y separación entre lo exploratorio y lo confirmatorio.",
        methods: ["HAC/Newey-West", "Ventanas móviles a 10 años", "Réplica matched-sample", "Stata + Python"],
        publishedAt: tomDecayEditorial.es.publishedAt,
      },
      {
        href: td3Editorial.es.pathname,
        kicker: "Aprendizaje por refuerzo · Evaluación",
        title: td3Editorial.es.headline,
        summary:
          "Qué queda de un claim de asignación con DRL cuando se añaden costes, cash explícito, benchmarks comparables y validación estadística.",
        methods: ["Walk-forward", "Bootstrap", "Costes de transacción", "Benchmarks emparejados"],
        publishedAt: td3Editorial.es.publishedAt,
      },
    ],
  },
  en: {
    eyebrow: "Research",
    title: "Quantitative research",
    subtitle: "Reproducible studies, with their limits in plain sight.",
    description:
      "Each study publishes the method, the derived data and the code needed to reproduce it. Weak or negative results stay on the page: they are part of the result too.",
    entriesLabel: "Studies",
    readLabel: "Read the study",
    methodsLabel: "Method",
    note: "Educational and research content. It is not investment advice or a recommendation to trade.",
    entries: [
      {
        href: tomDecayEditorial.en.pathname,
        kicker: "Calendar anomalies · Temporal stability",
        title: tomDecayEditorial.en.headline,
        summary:
          "How much of the turn-of-the-month premium still belongs to today's market, with independent replication and a clear split between exploratory and confirmatory work.",
        methods: ["HAC/Newey-West", "10-year rolling windows", "Matched-sample replication", "Stata + Python"],
        publishedAt: tomDecayEditorial.en.publishedAt,
      },
      {
        href: td3Editorial.en.pathname,
        kicker: "Reinforcement learning · Evaluation",
        title: td3Editorial.en.headline,
        summary:
          "What survives of a DRL allocation claim once you add costs, explicit cash, matched benchmarks and statistical validation.",
        methods: ["Walk-forward", "Bootstrap", "Transaction costs", "Matched benchmarks"],
        publishedAt: td3Editorial.en.publishedAt,
      },
    ],
  },
};
