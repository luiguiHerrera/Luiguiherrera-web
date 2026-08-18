import type { TomDecayContent } from "./content-types.ts";
import { tomDecayReferences } from "./references.ts";

export const tomDecayContentEn: TomDecayContent = {
  locale: "en",
  pathname: "/en/research/the-ghost-of-an-anomaly",
  breadcrumb: { href: "/en/research", label: "Research", navLabel: "Breadcrumb" },
  descriptor: "Turn-of-the-Month Anomaly Decay · Reproducible Research",
  documentTitle: "The Ghost of an Anomaly",

  nav: {
    label: "Research sections",
    items: [
      { id: "question", label: "The question" },
      { id: "findings", label: "What I found" },
      { id: "publication", label: "Publication" },
      { id: "evidence", label: "The decay" },
      { id: "replication", label: "Replication" },
      { id: "limits", label: "Claim boundary" },
      { id: "reproduce", label: "Reproduce" },
    ],
  },

  hero: {
    kicker: "Research · Empirical finance · Reproducible",
    title: "The Ghost of an Anomaly",
    subtitle:
      "An anomaly can still look compelling in a long backtest even when much of its premium belongs to a market that no longer exists.",
    intro: [
      "I started with a simple question: if the turn-of-the-month effect has been documented for decades, does it still belong to today's market?",
      "The interesting part was not confirming that it once existed. That was already known. The interesting part was that becoming public does not coincide with an immediate collapse, while the large deterioration appears later.",
    ],
    metadata:
      "S&P 500 + Kenneth French US Market · 1950–2026 · HAC/Newey-West · Independent replication",
    primaryCta: { href: "#evidence", label: "See the evidence" },
    secondaryCta: { href: "#reproduce", label: "Reproduce in Stata" },
    ribbon: {
      caption: "Visual abstract",
      note: "An editorial illustration of the study's arc, not a measured series. The exact data appear further down.",
      strongLabel: "Wide historical premium",
      zeroLabel: "Indistinguishable from zero",
      markers: [
        { year: 1987, label: "Publication era" },
        { year: 1995, label: "T+3" },
        { year: 2001, label: "Decimalization" },
        { year: 2017, label: "T+2" },
        { year: 2024, label: "T+1" },
      ],
    },
  },

  question: {
    eyebrow: "The question",
    title: "How much of this result still belongs to today's market?",
    body: [
      "The turn-of-the-month effect is one of the most documented calendar anomalies in U.S. equities ([[reference-lakonishok-smidt-1988|Lakonishok and Smidt, 1988]]; [[reference-mcconnell-xu-2008|McConnell and Xu, 2008]]).",
      "I was not interested in proving again that it worked historically. I wanted to know something more useful: how much of that historical result still belongs to the market that exists today.",
      "I split the sample through time, compared canonical TOM days with every other trading day, and repeated the analysis using a second data source and a different market universe.",
    ],
  },

  findings: {
    eyebrow: "What I found",
    title: "Four readings of the same arc",
    items: [
      { value: "{yahooPre}", unit: "bps/day", label: "Pre-1987 TOM premium in the S&P 500." },
      { value: "{yahooPublished}", unit: "bps/day", label: "Between the publication era and the pre-decimalization period." },
      { value: "{yahooPost}", unit: "bps/day", label: "After 2001 and before T+2." },
      { value: "≈ 0", label: "Modern 10-year rolling HAC 95% intervals include zero." },
    ],
    emphasis: "The anomaly survived becoming well known. Its magnitude did not.",
    replication:
      "The independent Kenneth French U.S. market replication shows the same central pattern.",
  },

  publication: {
    eyebrow: "First twist",
    title: "Becoming public did not appear to kill it",
    body: [
      "If the story were simply “the anomaly was published and arbitrage removed it,” I should see a clear break around 1987 ([[reference-ariel-1987|Ariel, 1987]]).",
      "I do not.",
      "In Yahoo/S&P 500 data, the premium moves from {yahooFrom} to {yahooTo} bps per day. In the matched 1950+ French replication, it moves from {frenchFrom} to {frenchTo} bps.",
      "Direct tests between those regimes do not detect a significant difference.",
    ],
    chartTitle: "Direct change between adjacent regimes",
    chartSummary:
      "Per-source comparison of the TOM premium before 1987 and between 1987 and 2001, with the p-value of the direct change between the two regimes.",
    changeLabel: "Change",
    pLabel: "Change p",
    verdict: "No immediate collapse detected",
    note: {
      title: "Research note",
      body: "Failing to detect a break does not prove that publication or arbitrage had no effect. It only means that the simple story of an immediate disappearance does not fit these data particularly well.",
    },
  },

  rolling: {
    eyebrow: "Main evidence",
    title: "The decay came later",
    body: [
      "After 2001, the premium falls to {yahooPost} bps/day in the S&P 500 and {frenchPost} bps/day in the matched French replication.",
      "In later regimes the estimate continues to compress and is no longer statistically distinguishable from the rest of the market.",
      "Several microstructure changes overlap — settlement, decimalization, electronic trading, costs, and liquidity. I do not identify any single one as the cause.",
      "What the data do show is a large deterioration during that broader transformation of the market.",
    ],
    chartTitle: "Rolling 10-year TOM premium",
    chartSubtitle: "Fixed 10-year trailing window, with HAC 95% interval",
    chartSummary:
      "The rolling 10-year TOM premium starts above 15 bps/day in the mid-twentieth century, stays wide through the publication era, and compresses toward zero after 2001. In recent windows the HAC 95% interval includes zero in both sources.",
    axisY: "bps/day",
    axisX: "Rolling window end",
    zeroLabel: "Zero",
    bandLabel: "HAC 95% interval",
    controlLabel: "Data source",
    controlOptions: [
      { id: "yahoo", label: "Yahoo S&P 500" },
      { id: "french", label: "French US Market" },
      { id: "both", label: "Both" },
    ],
    eventsLabel: "Market changes",
    events: [
      { id: "PUBLICATION_ERA_1987", label: "Publication era" },
      { id: "SETTLEMENT_T5_TO_T3_1995", label: "T+3" },
      { id: "DECIMALIZATION_2001", label: "Decimalization complete" },
      { id: "SETTLEMENT_T3_TO_T2_2017", label: "T+2" },
      { id: "SETTLEMENT_T2_TO_T1_2024", label: "T+1" },
    ],
    tooltip: {
      window: "Window",
      premium: "Premium",
      interval: "95% CI",
      pValue: "p (HAC)",
      observations: "Observations",
      partial: "Incomplete window: the data end before the close of the year.",
    },
    tableToggle: { show: "View the data as a table", hide: "Hide the table" },
    tableCaption: "Rolling 10-year TOM premium by window end, in bps/day.",
    tableHeaders: ["Window end", "Source", "Premium (bps/day)", "95% CI", "p (HAC)", "Observations"],
    takeaway:
      "The vertical marks flag changes in market structure. They are time references, not identified causes.",
  },

  replication: {
    eyebrow: "Independent replication",
    title: "Same pattern, independent data",
    body: [
      "The first sample uses the S&P 500 from Yahoo Finance.",
      "The second reconstructs the U.S. market return from Kenneth French's Mkt-RF + RF, using a CRSP-based value-weighted market universe.",
      "They are not the same series, and I do not treat them as if they were.",
      "That is exactly why the comparison is useful: change the provider and the market universe, and the central decay pattern remains.",
    ],
    sources: [
      {
        id: "yahoo",
        name: "Yahoo S&P 500",
        provider: "Yahoo Finance via yfinance",
        universe: "S&P 500 index (^GSPC)",
        returnDefinition: "Provider adjusted-close percentage change",
      },
      {
        id: "french",
        name: "Kenneth French US Market",
        provider: "Kenneth French Data Library",
        universe: "CRSP-based value-weighted U.S. market",
        returnDefinition: "(Mkt-RF + RF) / 100",
      },
    ],
    chartTitle: "TOM premium by regime and source",
    chartSummary:
      "Daily TOM premium by publication regime in both sources. The first two regimes are wide and similar; later regimes fall to a few bps per day.",
    axisY: "bps/day",
    sourceFieldLabels: { provider: "Source", universe: "Universe", returnDefinition: "Return" },
    shortSampleNote:
      "T+1 is a short sample. I do not draw a strong modern negative-alpha conclusion from it.",
    tableCaption: "Daily TOM premium by regime and source, in bps/day.",
    regimeHeader: "Regime",
    takeaway: "A different provider, a different market universe, the same central decay.",
  },

  ghost: {
    eyebrow: "Ghost alpha",
    title: "What a long backtest can hide",
    body: [
      "A longer sample often feels safer.",
      "But length and stability are not the same thing.",
      "If I combine decades in which the premium was large with decades in which the estimate fluctuates around zero, the historical average still carries part of the old signal.",
      "The backtest is not necessarily wrong. It may simply be answering a question that is no longer the one I care about.",
    ],
    bridge: "The question I do care about is:",
    question: "How much of the historical result still exists inside the regime I would actually trade?",
    stepsLabel: "Layers of evidence",
    steps: [
      { label: "1950–1987", caption: "A wide and statistically clear premium." },
      { label: "1987–2001", caption: "The anomaly is public and the premium is still wide." },
      { label: "2001–2017", caption: "The estimate compresses to a few bps per day." },
      { label: "Recent windows", caption: "The 95% intervals include zero." },
    ],
    closing: "A historical average can survive much longer than the phenomenon that created it.",
  },

  secondary: {
    eyebrow: "Negative results",
    title: "I tested the mechanism. Not everything survived.",
    intro: "I also tested several pieces that could help explain the pattern.",
    verdictLabel: "Verdict",
    resultLabel: "Result",
    cards: [
      {
        id: "pressure",
        finding: "Prior pressure → reversal",
        body: "The S&P 500 result is consistent with the proposed mechanism. In the matched 1950+ French sample, the difference is only marginally significant.",
        evidence: [
          { source: "yahoo", detail: "Difference {yahooDiff} bps · p {yahooP}" },
          { source: "french", detail: "Difference {frenchDiff} bps · p {frenchP}" },
        ],
        verdict: "Suggestive, not robust enough to headline",
        status: "suggestive",
      },
      {
        id: "calendar",
        finding: "Quarter-end / semi-year concentration",
        body: "The differences do not survive robustly in the matched-sample comparison.",
        evidence: [
          { source: "french", detail: "All pairwise p-values > 0.20" },
        ],
        verdict: "Not robust",
        status: "not-robust",
      },
      {
        id: "breakpoint",
        finding: "Automatic breakpoint",
        body: "The exploratory algorithm selects {yahooYear} in Yahoo and {frenchYear} in French. The disagreement is informative: no single robust date is selected across universes.",
        evidence: [
          { source: "yahoo", detail: "Selected year {yahooYear}" },
          { source: "french", detail: "Selected year {frenchYear}" },
        ],
        verdict: "Exploratory; no single robust date",
        status: "exploratory",
      },
    ],
    closing:
      "I did not remove these results to make the story cleaner. They stay because they are part of the research.",
  },

  boundary: {
    eyebrow: "Claim boundary",
    title: "What the evidence supports — and what it doesn't",
    supportsTitle: "The evidence supports",
    supports: [
      "a large historical TOM premium;",
      "persistence around the publication era;",
      "substantial later decay;",
      "modern rolling estimates statistically indistinguishable from zero;",
      "independent replication of the central decay pattern.",
    ],
    limitsTitle: "The evidence does not establish",
    limits: [
      "decimalization as the cause;",
      "an exact date of disappearance;",
      "enough T+1 history for a strong conclusion;",
      "equally strong replication of the pressure/reversal mechanism;",
      "a current trading recommendation.",
    ],
  },

  lesson: {
    eyebrow: "Why it matters",
    title: "The part I actually care about",
    body: [
      "This research ended up being less about a calendar anomaly and more about a recurring weakness in backtesting.",
      "A 75-year sample can be statistically correct and economically misleading if it combines regimes in which the mechanism was strong with regimes in which it became indistinguishable from noise.",
      "For me, robustness should not only ask whether a result survives costs, parameters, or a bootstrap.",
    ],
    question: "Does the relationship I am trying to exploit still exist?",
    closing: [
      "That is why I separate temporal stability, replication, and falsification from the full-sample result.",
      "I am not presenting this as a new trading strategy. I am presenting it as an example of why a historical result can remain alive inside a backtest long after it has lost relevance in the current market.",
    ],
  },

  verification: {
    eyebrow: "Verification",
    title: "Reproduce the research",
    body: "The page publishes the same verification package used for the final validation.",
    dependencyNote: [
      "To run the reproduction you need the `.do` script and `qtomdecay v0.3.1`.",
      "The two output bundles contain the frozen results used on this page and let you verify that your reproduction matches the published analysis.",
    ],
    dependencySummary: "Reproduction: 1 + 2 · Full verification: 1 + 2 + 3 + 4",
    traceability:
      "Every number published on this page can be traced back to an output from the research bundle.",
    downloadLabel: "Download",
    typeLabel: "Type",
    items: [
      {
        id: "do",
        name: "reproduce_tom_decay.do",
        role: "Reproduction · Step 1",
        purpose: "Public script that reproduces both samples using relative output paths.",
        fileType: "Stata .do",
        href: "/research/tom-decay/downloads/reproduce_tom_decay.do",
      },
      {
        id: "tool",
        name: "qtomdecay",
        role: "Reproduction · Step 2",
        purpose: "The frozen research tool used in the final validation.",
        fileType: "ZIP",
        version: "0.3.1",
        href: "/research/tom-decay/downloads/qtomdecay_v0_3_1_statanow185.zip",
      },
      {
        id: "yahoo-data",
        name: "Yahoo S&P 500 1950+ outputs",
        role: "Verification · Yahoo",
        purpose: "Regimes, adjacent tests, breaks, rolling windows and report for the Yahoo sample.",
        fileType: "CSV · JSON",
        href: "/research/tom-decay/data/yahoo/manifest.json",
      },
      {
        id: "french-data",
        name: "French US Market 1950+ matched outputs",
        role: "Verification · French",
        purpose: "The same outputs for the independent, horizon-matched replication.",
        fileType: "CSV · JSON",
        href: "/research/tom-decay/data/french-matched/manifest.json",
      },
    ],
    environmentTitle: "Validation environment",
    environment: [
      "StataNow 18.5 MP",
      "Python 3.11.16",
      "pandas 2.0.3",
      "HAC/Newey-West inference",
      "Yahoo Finance",
      "Kenneth French Data Library",
    ],
    hashesTitle: "Hashes and manifests",
    hashesHint:
      "SHA-256 for every published file. The original manifests ship alongside the outputs.",
    copyLabel: "Copy",
    copiedLabel: "Copied",
    sourceHashLabel: "Kenneth French source download (SHA-256)",
  },

  methods: {
    eyebrow: "Methods and sources",
    title: "Methodological detail",
    intro: "Opened section by section so it does not interrupt the main read.",
    sections: [
      {
        id: "event",
        title: "Event definition",
        body: [
          "T = 0 is the last trading day of the month. The canonical TOM window is T, T+1, T+2 and T+3.",
          "The benchmark is every other trading day. The window is never optimized at any point in the study.",
        ],
      },
      {
        id: "data",
        title: "Data provenance",
        body: [
          "Yahoo Finance via yfinance, symbol ^GSPC, with the return defined as the provider's adjusted-close percentage change.",
          "Kenneth French Data Library, Fama/French 3 Factors [Daily], with the market return reconstructed as (Mkt-RF + RF) / 100 over a CRSP-based value-weighted universe.",
          "The two series differ in both provider and market universe. The comparison is deliberately an independent replication, not a duplication.",
        ],
      },
      {
        id: "inference",
        title: "Statistical inference",
        body: [
          "All tests use HAC/Newey-West standard errors with lags selected by sample length ([[reference-newey-west-1987|Newey and West, 1987]]).",
          "Published p-values come from the frozen bundle outputs and are not recomputed in the browser.",
        ],
      },
      {
        id: "cutoffs",
        title: "Historical cutoffs",
        body: [
          "Cutoffs are external and fixed ahead of the analysis: publication era (1987), T+5 → T+3 (1995), decimalization complete (2001), T+3 → T+2 (2017) and T+2 → T+1 (2024).",
          "They are time boundaries, not causal identification. Several structural changes overlap inside each span.",
        ],
      },
      {
        id: "rolling",
        title: "Rolling estimation",
        body: [
          "A fixed 10-year trailing window with a year-end endpoint, a HAC 95% interval, and the premium expressed in bps per day.",
          "Rolling windows are descriptive. The final window in each series ends after the data end and is marked as incomplete.",
        ],
      },
      {
        id: "matched",
        title: "Matched-sample replication",
        body: [
          "The main public comparison uses the matched horizon from 1950 onward in both sources.",
          "The full French sample from 1926 exists as supporting evidence, but it does not replace the matched comparison.",
        ],
      },
      {
        id: "exploratory",
        title: "Exploratory analyses",
        body: [
          "The automatic breakpoint search is explicitly exploratory and its p-value is not adjusted for multiplicity.",
          "It must not be read as a confirmatory test or as the detection of a disappearance date.",
        ],
      },
      {
        id: "limits",
        title: "Limitations",
        body: [
          "This is not a causal-identification study.",
          "The T+1 sample is short and exploratory.",
          "The pressure/reversal mechanism does not replicate with the same strength in the matched sample.",
          "Calendar concentration does not survive robustly.",
          "The study does not evaluate transaction costs, capacity or implementation, and is not an investment recommendation.",
        ],
      },
    ],
  },

  glossary: {
    eyebrow: "Reference",
    title: "Glossary",
    intro: "Concise definitions of the statistical terms used throughout the study.",
    entries: [
      {
        id: "glossary-bps",
        term: "BPS",
        shortLabel: "Basis points",
        definition: "BPS means basis points. 1 bp equals 0.01%, and 100 bps equal 1%.",
        explanation: "They express small return differences clearly without confusing percentages with percentage points.",
      },
      {
        id: "glossary-hac",
        term: "HAC",
        shortLabel: "Robust standard errors",
        definition: "HAC means Heteroskedasticity and Autocorrelation Consistent. It is a standard-error adjustment robust to heteroskedasticity and serial correlation.",
        explanation: "It helps prevent statistical uncertainty from looking artificially small when variability changes or nearby observations are related.",
        source: { href: "#reference-newey-west-1987", label: "Newey and West (1987)" },
      },
      {
        id: "glossary-p",
        term: "p / p-value",
        shortLabel: "Evidence under the null",
        definition: "A p-value is the probability, under the null hypothesis and the test model, of observing a result at least as extreme as the one obtained.",
        explanation: "A smaller value indicates greater incompatibility with the null; it does not measure the probability that the null is true or the result's economic importance.",
      },
    ],
  },

  references: {
    eyebrow: "Scientific literature",
    title: "References",
    intro: "Publications cited for the study's historical and methodological context.",
    externalLabel: "Open publication in a new tab",
    doiLabel: "DOI",
    entries: tomDecayReferences,
  },

  footer: {
    author: "Luigui Herrera",
    role: "Applied quantitative research and reproducible tooling.",
    relatedTitle: "Related work",
    related: [
      {
        href: "/en/research/td3",
        label: "Realistic evaluation of DRL portfolio claims",
        description: "Costs, explicit cash, matched benchmarks and statistical validation.",
      },
      {
        href: "/en/portfolio-fragility",
        label: "Portfolio fragility",
        description: "Concentration, correlation, risk contribution and stress.",
      },
      {
        href: "/en/methodology",
        label: "Methodology",
        description: "Sources, limits and traceability for the tools on this site.",
      },
    ],
    closing: "Code, derived outputs, and methodology are available for verification.",
  },

  labels: {
    datasets: {
      yahoo: { name: "Yahoo S&P 500", short: "Yahoo" },
      french: { name: "French US Market", short: "French" },
    },
    regimes: {
      PRE_PUBLICATION: { name: "Pre-publication", short: "Pre-1987" },
      PUBLISHED_PRE_DECIMAL: { name: "Published / pre-decimalization", short: "1987–2001" },
      POST_DECIMAL_PRE_T2: { name: "Post-decimalization / pre-T+2", short: "2001–2017" },
      T2: { name: "T+2", short: "T+2" },
      T1: { name: "T+1", short: "T+1" },
    },
    bpsPerDay: "bps/day",
    hacP: "p (HAC)",
    tomDays: "TOM days",
    observations: "Observations",
    source: "Source",
    premium: "Premium",
    shortSample: "Short sample",
    change: "Change",
  },
};
