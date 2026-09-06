import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { currentEnglishReport, englishReportsNewestFirst, previousEnglishReports } from "./english-reports.ts";
import { marketReports, reportHref } from "./market-reports.ts";
import { getRouteMetadata, languageAlternates, SITE_URL } from "../seo/site.ts";
import { translatePathname } from "../i18n/routes.ts";
import { investorEntryContent } from "../investor/entry-content.ts";

test("Reports index and weekly report have separate canonicals and reciprocal index alternates", () => {
  assert.equal(getRouteMetadata("/en/reports").alternates?.canonical, `${SITE_URL}/en/reports`);
  assert.equal(getRouteMetadata("/en/weekly-report").alternates?.canonical, `${SITE_URL}/en/weekly-report`);
  const alternates = { es: `${SITE_URL}/informes`, en: `${SITE_URL}/en/reports`, "x-default": `${SITE_URL}/informes` };
  assert.deepEqual(languageAlternates("/en/reports"), alternates);
  assert.deepEqual(languageAlternates("/informes"), alternates);
  assert.equal(languageAlternates("/en/weekly-report"), null);
  assert.equal(translatePathname("/informes", "en"), "/en/reports");
  assert.equal(translatePathname("/en/reports", "es"), "/informes");
});

test("listed reports have real English routes and no Spanish-only archive entries", () => {
  const entries = [currentEnglishReport, ...previousEnglishReports];
  const spanishRoutes = new Set(marketReports.map(reportHref));
  assert.equal(new Set(entries.map(report => report.href)).size, entries.length);
  for (const report of entries) {
    assert.ok(report.href.startsWith("/en/"));
    assert.ok(existsSync(`app${report.href}/page.tsx`));
    assert.equal(spanishRoutes.has(report.href), false);
  }
  const weekly = readFileSync("app/en/weekly-report/page.tsx", "utf8");
  assert.match(weekly, /<WeeklyReport data=\{reportData\} locale="en"/);
  assert.doesNotMatch(weekly, /redirect\(/);
});

test("index uses current report metadata and its real data date, and omits empty archive UI", () => {
  const page = readFileSync("app/en/reports/page.tsx", "utf8");
  assert.match(page, /getRouteMetadata\("\/en\/reports"\)/);
  assert.match(page, /currentEnglishReport\.href/);
  assert.match(page, /generatedAt: dataThrough/);
  assert.match(page, /Data through <time dateTime=\{dataThrough\}/);
  assert.match(page, /Read latest report/);
  assert.match(page, /previousReports\.map/);
  assert.match(page, /previousReports\.length > 0 \? \(\s*<section aria-labelledby="previous-reports-title"/);
  assert.doesNotMatch(page, /No previous reports|available in English yet/);
  assert.match(page, /<\/section>\s*\) : null\}/);
});

test("archive ordering is chronological, newest first, without mutating its inventory", () => {
  const older = { href: "/en/test-older" as const, title: "Older", publishedAt: "2026-07-18", summary: "Test fixture" };
  const newer = { href: "/en/test-newer" as const, title: "Newer", publishedAt: "2026-08-14", summary: "Test fixture" };
  const input = [older, newer];
  assert.deepEqual(englishReportsNewestFirst(input), [newer, older]);
  assert.deepEqual(input, [older, newer]);
});

test("Investor and the existing generic English Reports navigation use the index", () => {
  assert.deepEqual(investorEntryContent.es.guided.options[0].actions?.map(action => action.href), ["/dashboard", "/informes"]);
  assert.deepEqual(investorEntryContent.en.guided.options[0].actions?.map(action => action.href), ["/en/dashboard", "/en/reports"]);
  const navigation = readFileSync("lib/i18n/dictionaries/en.ts", "utf8");
  assert.match(navigation, /href: "\/en\/reports", label: "Market reports"/);
});
