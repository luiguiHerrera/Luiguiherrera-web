import assert from "node:assert/strict";
import test, { mock } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { sessionDates } from "../research/mcclellan-core.mjs";
import { PRICE_PARTICIPATION_SECTOR_TICKERS, buildPriceParticipation } from "./price-participation.ts";
import { buildPriceParticipationMonthSummary } from "./price-participation-month.ts";

let selectedWindow = 20;
const realUseState = React.useState;
mock.module("react", { defaultExport: React, namedExports: { ...React,
  useState: initial => realUseState(initial === 20 ? selectedWindow : initial),
} });
const { default: PriceParticipationCard } = await import("../../components/dashboard/PriceParticipationCard.tsx");
const asOf = "2026-11-25T12:00:00Z";
const dates = sessionDates("2026-06-01", "2026-11-23");
const input = {
  series: ["SPY", "RSP", ...PRICE_PARTICIPATION_SECTOR_TICKERS].map((ticker, asset) => ({ ticker,
    points: dates.map((date, index) => ({ date, close: 100 * (1 + (asset % 2 ? 0.0015 : -0.0007) * index) })),
  })),
  priceThrough: dates.at(-1), breadth: null,
  authority: { id: "summary-fixture", retrievedAt: asOf, sourceUrl: "https://finance.yahoo.com/" }, refreshStatus: "current",
};

/** Render the real component with only its selected-session state injected. */
function render(sessions, locale = "es") {
  selectedWindow = sessions;
  return renderToStaticMarkup(React.createElement(PriceParticipationCard, { input, asOf, locale }));
}

test("monthly overview is unchanged across session controls while the detail readout follows 5/20/60", () => {
  const month = buildPriceParticipationMonthSummary(input, asOf);
  const monthlyHtml = [];
  const readouts = [];
  for (const sessions of [5, 20, 60]) {
    const html = render(sessions);
    monthlyHtml.push(html.match(/<dl[^>]*data-columns="5" data-price-month="2026-11">([\s\S]*?)<\/dl>/u)?.[1]);
    const readout = html.match(/<dl[^>]*data-price-relative-readout[^>]*>([\s\S]*?)<\/dl>/u)?.[1];
    assert.ok(readout);
    const expected = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" }).format(buildPriceParticipation(input, sessions).rsp.relativePp).replace(/-/gu, "−");
    assert.ok(readout.includes(expected));
    assert.ok(readout.includes(`${sessions} sesiones`));
    readouts.push(readout);
    assert.match(html, /data-overview-item="sectors-month"/u);
    assert.ok(html.includes(`+${month.participation.positive}`));
    assert.ok(html.includes(`−${month.participation.negative}`));
    assert.match(html, /positivos \/ negativos/u);
    assert.match(html, /Noviembre de 2026/u);
  }
  assert.ok(monthlyHtml[0]);
  assert.equal(monthlyHtml[0], monthlyHtml[1]);
  assert.equal(monthlyHtml[1], monthlyHtml[2]);
  assert.equal(new Set(readouts).size, 3);
});

test("monthly summary and dynamic detail labels are available in English", () => {
  const html = render(60, "en");
  assert.match(html, /Sectors · current month/u);
  assert.match(html, /positive \/ negative/u);
  assert.match(html, /November 2026/u);
  assert.match(html, /percentage points · 60 sessions/u);
  assert.doesNotMatch(html, /Sectores · mes vigente|positivos \/ negativos|puntos porcentuales/u);
});
