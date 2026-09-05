import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { investorEntryContent } from "./entry-content.ts";
import { translatePathname } from "../i18n/routes.ts";

for (const locale of ["es", "en"] as const) {
  test(`${locale}: each intention reaches a distinct real destination without a redirect`, () => {
    const content = investorEntryContent[locale];
    const hrefs = content.guided.options.map((option) => option.href);
    assert.equal(new Set(hrefs).size, 4);
    const bridgeHrefs = content.bridges.items.map((item) => item.href);
    assert.equal(new Set(bridgeHrefs).size, bridgeHrefs.length);
    assert.ok(bridgeHrefs.every((href) => !hrefs.includes(href)), "Bridges must open complementary destinations");
    for (const href of [...hrefs, ...content.bridges.items.map((item) => item.href)]) {
      const file = href.startsWith("/en/") ? `app${href}/page.tsx` : `app/(es)${href}/page.tsx`;
      assert.ok(existsSync(file), `Missing destination ${href}`);
      assert.doesNotMatch(readFileSync(file, "utf8"), /\b(?:permanentRedirect|redirect)\(/);
      assert.equal(href.startsWith("/en/"), locale === "en");
    }
  });
}

test("ES and EN offer equivalent routes in the same order", () => {
  for (const [index, option] of investorEntryContent.es.guided.options.entries()) {
    const english = investorEntryContent.en.guided.options[index];
    assert.equal(option.id, english.id);
    assert.equal(translatePathname(option.href, "en"), english.href);
    assert.equal(option.time, english.time);
  }
  for (const [index, bridge] of investorEntryContent.es.bridges.items.entries()) {
    assert.equal(translatePathname(bridge.href, "en"), investorEntryContent.en.bridges.items[index].href);
  }
});
