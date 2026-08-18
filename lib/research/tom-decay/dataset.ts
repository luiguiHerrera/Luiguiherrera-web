import { frozenDataHashes, frozenDownloadHashes, frozenTomDecaySources, frozenToolVersion } from "./generated/frozen-sources.ts";
import { buildDataset, TomDecayDataError } from "./parse.ts";
import type {
  AdjacentRegimeTest,
  CumulativeBreakTest,
  RegimeEstimate,
  TomBreakId,
  TomDatasetId,
  TomDecayData,
  TomDecayDataset,
  TomRegimeId,
} from "./types.ts";

export const tomDecayData: TomDecayData = {
  yahoo: buildDataset("yahoo", frozenTomDecaySources.yahoo),
  french: buildDataset("french", frozenTomDecaySources.french),
};

export const tomDatasetIds: readonly TomDatasetId[] = ["yahoo", "french"];

export const tomToolVersion = frozenToolVersion;

export const tomDataHashes = frozenDataHashes;

export const tomDownloadHashes = frozenDownloadHashes;

export function regime(dataset: TomDecayDataset, id: TomRegimeId): RegimeEstimate {
  const found = dataset.regimes.find((estimate) => estimate.regime === id);
  if (!found) throw new TomDecayDataError(`${dataset.id} has no regime ${id}`);
  return found;
}

export function adjacentTest(
  dataset: TomDecayDataset,
  from: TomRegimeId,
  to: TomRegimeId,
): AdjacentRegimeTest {
  const found = dataset.adjacentTests.find((test) => test.from === from && test.to === to);
  if (!found) throw new TomDecayDataError(`${dataset.id} has no adjacent test ${from} -> ${to}`);
  return found;
}

export function breakTest(dataset: TomDecayDataset, id: TomBreakId): CumulativeBreakTest {
  const found = dataset.breakTests.find((test) => test.breakId === id);
  if (!found) throw new TomDecayDataError(`${dataset.id} has no break test ${id}`);
  return found;
}

export function rollingAt(dataset: TomDecayDataset, year: number) {
  const found = dataset.rolling.find((point) => point.year === year);
  if (!found) throw new TomDecayDataError(`${dataset.id} has no rolling window ending ${year}`);
  return found;
}

export const tomEventMarkers = [
  { id: "PUBLICATION_ERA_1987", year: 1987 },
  { id: "SETTLEMENT_T5_TO_T3_1995", year: 1995 },
  { id: "DECIMALIZATION_2001", year: 2001 },
  { id: "SETTLEMENT_T3_TO_T2_2017", year: 2017 },
  { id: "SETTLEMENT_T2_TO_T1_2024", year: 2024 },
] as const satisfies readonly { id: TomBreakId; year: number }[];
