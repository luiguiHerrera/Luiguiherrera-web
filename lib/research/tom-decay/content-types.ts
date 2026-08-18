import type { TomBreakId, TomDatasetId, TomRegimeId } from "./types.ts";

export type TomDecayLocale = "es" | "en";

export type LabelledLink = {
  href: string;
  label: string;
};

export type BreadcrumbLink = LabelledLink & {
  navLabel: string;
};

export type TomDecayContent = {
  locale: TomDecayLocale;
  pathname: string;
  breadcrumb: BreadcrumbLink;
  descriptor: string;
  documentTitle: string;

  nav: {
    label: string;
    items: { id: string; label: string }[];
  };

  hero: {
    kicker: string;
    title: string;
    subtitle: string;
    intro: string[];
    metadata: string;
    primaryCta: LabelledLink;
    secondaryCta: LabelledLink;
    ribbon: {
      caption: string;
      note: string;
      strongLabel: string;
      zeroLabel: string;
      markers: { year: number; label: string }[];
    };
  };

  question: {
    eyebrow: string;
    title: string;
    body: string[];
  };

  findings: {
    eyebrow: string;
    title: string;
    items: { value: string; unit?: string; label: string }[];
    emphasis: string;
    replication: string;
  };

  publication: {
    eyebrow: string;
    title: string;
    body: string[];
    chartTitle: string;
    chartSummary: string;
    changeLabel: string;
    pLabel: string;
    verdict: string;
    note: { title: string; body: string };
  };

  rolling: {
    eyebrow: string;
    title: string;
    body: string[];
    chartTitle: string;
    chartSubtitle: string;
    chartSummary: string;
    axisY: string;
    axisX: string;
    zeroLabel: string;
    bandLabel: string;
    controlLabel: string;
    controlOptions: { id: TomDatasetId | "both"; label: string }[];
    eventsLabel: string;
    events: { id: TomBreakId; label: string }[];
    tooltip: {
      window: string;
      premium: string;
      interval: string;
      pValue: string;
      observations: string;
      partial: string;
    };
    tableToggle: { show: string; hide: string };
    tableCaption: string;
    tableHeaders: string[];
    takeaway: string;
  };

  replication: {
    eyebrow: string;
    title: string;
    body: string[];
    sources: {
      id: TomDatasetId;
      name: string;
      provider: string;
      universe: string;
      returnDefinition: string;
    }[];
    chartTitle: string;
    chartSummary: string;
    axisY: string;
    sourceFieldLabels: { provider: string; universe: string; returnDefinition: string };
    shortSampleNote: string;
    tableCaption: string;
    regimeHeader: string;
    takeaway: string;
  };

  ghost: {
    eyebrow: string;
    title: string;
    body: string[];
    bridge: string;
    question: string;
    stepsLabel: string;
    steps: { label: string; caption: string }[];
    closing: string;
  };

  secondary: {
    eyebrow: string;
    title: string;
    intro: string;
    verdictLabel: string;
    resultLabel: string;
    cards: {
      id: string;
      finding: string;
      body: string;
      evidence: { source: string; detail: string }[];
      verdict: string;
      status: "suggestive" | "not-robust" | "exploratory";
    }[];
    closing: string;
  };

  boundary: {
    eyebrow: string;
    title: string;
    supportsTitle: string;
    supports: string[];
    limitsTitle: string;
    limits: string[];
  };

  lesson: {
    eyebrow: string;
    title: string;
    body: string[];
    question: string;
    closing: string[];
  };

  verification: {
    eyebrow: string;
    title: string;
    body: string;
    dependencyNote: string[];
    dependencySummary: string;
    traceability: string;
    downloadLabel: string;
    typeLabel: string;
    items: {
      id: string;
      name: string;
      role: string;
      purpose: string;
      fileType: string;
      href: string;
      version?: string;
    }[];
    environmentTitle: string;
    environment: string[];
    hashesTitle: string;
    hashesHint: string;
    copyLabel: string;
    copiedLabel: string;
    sourceHashLabel: string;
  };

  methods: {
    eyebrow: string;
    title: string;
    intro: string;
    sections: { id: string; title: string; body: string[] }[];
  };

  footer: {
    author: string;
    role: string;
    relatedTitle: string;
    related: { href: string; label: string; description: string }[];
    closing: string;
  };

  labels: {
    datasets: Record<TomDatasetId, { name: string; short: string }>;
    regimes: Record<TomRegimeId, { name: string; short: string }>;
    bpsPerDay: string;
    hacP: string;
    tomDays: string;
    observations: string;
    source: string;
    premium: string;
    shortSample: string;
    change: string;
    helpLabel: string;
    termsLabel: string;
    terms: { term: string; text: string }[];
  };
};
