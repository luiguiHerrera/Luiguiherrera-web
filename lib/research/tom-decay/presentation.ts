import { adjacentTest, regime, tomDecayData } from "./dataset.ts";
import { createTomFormatters, fillTemplate, type TomFormatters } from "./format.ts";
import type { TomDecayContent } from "./content-types.ts";
import type { TomDatasetId } from "./types.ts";

export type TomDecayView = {
  content: TomDecayContent;
  format: TomFormatters;
  findings: { value: string; unit?: string; label: string }[];
  publicationBody: string[];
  rollingBody: string[];
  publicationPairs: {
    id: TomDatasetId;
    name: string;
    fromBps: number;
    toBps: number;
    changeBps: number;
    changeHacP: number;
  }[];
  secondaryCards: {
    id: string;
    finding: string;
    body: string;
    evidence: { sourceName: string; detail: string }[];
    verdict: string;
    status: "suggestive" | "not-robust" | "exploratory";
  }[];
};

export function buildTomDecayView(content: TomDecayContent): TomDecayView {
  const format = createTomFormatters(content.locale);
  const { yahoo, french } = tomDecayData;

  const yahooPublication = adjacentTest(yahoo, "PRE_PUBLICATION", "PUBLISHED_PRE_DECIMAL");
  const frenchPublication = adjacentTest(french, "PRE_PUBLICATION", "PUBLISHED_PRE_DECIMAL");

  const narrativeValues = {
    yahooPre: format.bps(regime(yahoo, "PRE_PUBLICATION").premiumBps),
    yahooPublished: format.bps(regime(yahoo, "PUBLISHED_PRE_DECIMAL").premiumBps),
    yahooPost: format.bps(regime(yahoo, "POST_DECIMAL_PRE_T2").premiumBps),
    frenchPost: format.bps(regime(french, "POST_DECIMAL_PRE_T2").premiumBps),
    yahooFrom: format.bps(yahooPublication.premiumFromBps),
    yahooTo: format.bps(yahooPublication.premiumToBps),
    frenchFrom: format.bps(frenchPublication.premiumFromBps),
    frenchTo: format.bps(frenchPublication.premiumToBps),
  };

  const mechanismValues = {
    yahooDiff: format.bps(yahoo.pressureReversal.differenceBps),
    frenchDiff: format.bps(french.pressureReversal.differenceBps),
    yahooP: format.pValue(yahoo.pressureReversal.differenceHacP),
    frenchP: format.pValue(french.pressureReversal.differenceHacP),
    yahooYear: format.year(yahoo.exploratoryBreakpoint.selectedYear),
    frenchYear: format.year(french.exploratoryBreakpoint.selectedYear),
  };

  return {
    content,
    format,
    findings: content.findings.items.map((item) => ({
      ...item,
      value: fillTemplate(item.value, narrativeValues),
    })),
    publicationBody: content.publication.body.map((line) => fillTemplate(line, narrativeValues)),
    rollingBody: content.rolling.body.map((line) => fillTemplate(line, narrativeValues)),
    publicationPairs: [
      { id: "yahoo" as const, test: yahooPublication },
      { id: "french" as const, test: frenchPublication },
    ].map(({ id, test }) => ({
      id,
      name: content.labels.datasets[id].name,
      fromBps: test.premiumFromBps,
      toBps: test.premiumToBps,
      changeBps: test.changeBps,
      changeHacP: test.changeHacP,
    })),
    secondaryCards: content.secondary.cards.map((card) => ({
      id: card.id,
      finding: card.finding,
      body: fillTemplate(card.body, mechanismValues),
      evidence: card.evidence.map((item) => ({
        sourceName: content.labels.datasets[item.source as TomDatasetId].name,
        detail: fillTemplate(item.detail, mechanismValues),
      })),
      verdict: card.verdict,
      status: card.status,
    })),
  };
}
