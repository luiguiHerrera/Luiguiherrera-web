import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

test("dashboard chapter children use an explicit h3 module heading without changing title classes", () => {
  const primitive = source("components/dashboard/DashboardPrimitives.tsx");
  const page = source("app/(es)/dashboard/page.tsx");
  const childModules = [
    "components/dashboard/VixModule.tsx",
    "components/dashboard/VixTermStructureModule.tsx",
    "components/dashboard/GldFlowPressureModule.tsx",
    "components/dashboard/BtcEtfFlowsModule.tsx",
  ];

  assert.match(primitive, /headingLevel: "h2" \| "h3"/);
  assert.match(primitive, /<Heading className=\{dashboardModuleTitleClassName\}>/);
  assert.match(page, /<h2 id="market-participation-section"/);
  assert.match(page, /<h2 id="vix-volatility-section"/);
  assert.match(page, /<h2 id="capital-flows-section"/);

  for (const path of childModules) {
    assert.match(source(path), /<DashboardModuleHeading headingLevel="h3">/);
  }
});

test("standalone dashboard modules retain top-level h2 headings", () => {
  assert.match(source("components/dashboard/IntegratedRegimeModule.tsx"), /<h2 className=\{dashboardModuleTitleClassName\}>/);
  assert.match(source("components/dashboard/QuantRiskPanel.tsx"), /<h2 className=\{dashboardModuleTitleClassName\}>/);
  assert.match(source("components/dashboard/DashboardReadingGuide.tsx"), /<h2 id=/);
});
