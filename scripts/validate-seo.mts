import { readFileSync } from "node:fs";
import {
  absoluteUrl,
  buildSeoMetadata,
  getSeoRoute,
  languageAlternates,
  seoRouteDefinitions,
  SITE_URL,
} from "../lib/seo/site.ts";
import {
  marketReports,
  reportHref,
  reportMetadataTitle,
} from "../lib/reports/market-reports.ts";
import { bilingualRoutePairs } from "../lib/i18n/language-pairs.ts";
import { translatePathname } from "../lib/i18n/routes.ts";
import nextConfig from "../next.config.ts";

const expectedStaticRoutes = [
  "/",
  "/en",
  "/empezar",
  "/en/start",
  "/presupuesto",
  "/en/budget",
  "/deudas",
  "/en/debt",
  "/diagnostico",
  "/en/diagnostic",
  "/inversionista",
  "/en/investor",
  "/proteccion",
  "/en/protection",
  "/protege-tu-dinero",
  "/en/protect-your-money",
  "/dashboard",
  "/en/dashboard",
  "/informes",
  "/en/weekly-report",
  "/niveles-estadisticos",
  "/en/statistical-levels",
  "/tendencias",
  "/en/trends",
  "/recursos",
  "/en/resources",
  "/metodologia",
  "/en/methodology",
  "/investigacion/td3",
  "/en/research/td3",
  "/legal",
  "/en/legal",
] as const;

const errors: string[] = [];
const reportPathnames = marketReports.map(reportHref);
const staticPathnames = seoRouteDefinitions.map(({ pathname }) => pathname);
const pathnames = [
  ...staticPathnames,
  ...reportPathnames,
];
const duplicates = pathnames.filter((pathname, index) => pathnames.indexOf(pathname) !== index);

function hasDuplicateTitleParts(title: string) {
  const normalizedParts = title
    .split("|")
    .map((part) => part.trim().replace(/\s+/g, " ").toLocaleLowerCase())
    .filter(Boolean);
  return new Set(normalizedParts).size !== normalizedParts.length;
}

if (duplicates.length) {
  errors.push(`Duplicate route definitions: ${[...new Set(duplicates)].join(", ")}`);
}

for (const pathname of expectedStaticRoutes) {
  const route = getSeoRoute(pathname);
  if (!route) {
    errors.push(`Missing metadata for ${pathname}`);
    continue;
  }

  if (pathname.startsWith("/en") && route.language !== "en") {
    errors.push(`English route has non-English metadata: ${pathname}`);
  }

  const metadata = buildSeoMetadata(route);
  const canonical = metadata.alternates?.canonical?.toString();
  if (canonical !== SITE_URL && !canonical?.startsWith(`${SITE_URL}/`)) {
    errors.push(`Canonical is not absolute for ${pathname}: ${canonical ?? "missing"}`);
  }

  if (route.alternatePathname) {
    const alternate = getSeoRoute(route.alternatePathname);
    if (!alternate || alternate.alternatePathname !== pathname) {
      errors.push(`Non-reciprocal hreflang pair: ${pathname} -> ${route.alternatePathname}`);
    }
  } else if (languageAlternates(pathname)) {
    errors.push(`Unpaired route received language alternates: ${pathname}`);
  }
}

const unexpectedRoutes = staticPathnames.filter(
  (pathname) => !expectedStaticRoutes.includes(pathname as (typeof expectedStaticRoutes)[number]),
);
if (unexpectedRoutes.length) {
  errors.push(`Unexpected indexable route definitions: ${unexpectedRoutes.join(", ")}`);
}

for (const pathname of ["/informes", "/en/weekly-report"]) {
  if (getSeoRoute(pathname)?.alternatePathname || languageAlternates(pathname)) {
    errors.push(`${pathname} must not have a language alternate`);
  }
}

if (bilingualRoutePairs.length !== 15) {
  errors.push(`Expected 15 bilingual route pairs, found ${bilingualRoutePairs.length}`);
}

for (const { es, en } of bilingualRoutePairs) {
  if (getSeoRoute(es)?.alternatePathname !== en || getSeoRoute(en)?.alternatePathname !== es) {
    errors.push(`SEO metadata does not consume the bilingual route pair: ${es} <-> ${en}`);
  }
}

for (const pathname of pathnames) {
  const pair = bilingualRoutePairs.find(({ es, en }) => es === pathname || en === pathname);
  const isEnglishPath = pathname === "/en" || pathname.startsWith("/en/");
  const expectedEs = pair?.es ?? (isEnglishPath ? "/" : pathname);
  const expectedEn = pair?.en ?? (isEnglishPath ? pathname : "/en");
  const translatedEs = translatePathname(pathname, "es");
  const translatedEn = translatePathname(pathname, "en");

  if (translatedEs !== expectedEs || translatedEn !== expectedEn) {
    errors.push(
      `Language selector mismatch for ${pathname}: `
      + `es=${translatedEs} (expected ${expectedEs}), en=${translatedEn} (expected ${expectedEn})`,
    );
  }
}

for (const route of seoRouteDefinitions) {
  if (absoluteUrl(route.pathname) !== buildSeoMetadata(route).alternates?.canonical?.toString()) {
    errors.push(`Canonical mismatch for ${route.pathname}`);
  }
}

for (const report of marketReports) {
  const pathname = reportHref(report);
  const title = reportMetadataTitle(report);
  const metadata = buildSeoMetadata({
    pathname,
    language: "es",
    title,
    description: report.summary,
    socialTitle: report.title,
    type: "article",
  });
  const socialTitles = [
    title,
    metadata.openGraph?.title?.toString() ?? "",
    metadata.twitter?.title?.toString() ?? "",
  ];
  if (socialTitles.some(hasDuplicateTitleParts)) {
    errors.push(`Duplicate title segment for report ${pathname}: ${socialTitles.join(" / ")}`);
  }
  if (metadata.alternates?.canonical?.toString() !== absoluteUrl(pathname)) {
    errors.push(`Canonical mismatch for report ${pathname}`);
  }
  if (metadata.alternates?.languages) {
    errors.push(`Spanish-only report received language alternates: ${pathname}`);
  }
}

type ExpectedReportHeaders = {
  canonical?: string;
  robots?: string;
};

const expectedReportHeaders = new Map<string, ExpectedReportHeaders>();
for (const report of marketReports) {
  const canonicalUrl = absoluteUrl(reportHref(report));
  const canonicalHeader = `<${canonicalUrl}>; rel="canonical"`;

  if (report.htmlHref) {
    expectedReportHeaders.set(report.htmlHref, { canonical: canonicalHeader });
    const downloadableHtml = readFileSync(
      new URL(`../public${report.htmlHref}`, import.meta.url),
      "utf8",
    );
    if (!downloadableHtml.includes(`<link rel="canonical" href="${canonicalUrl}">`)) {
      errors.push(`HTML canonical mismatch for ${report.htmlHref}`);
    }
  }
  if (report.pdfHref) {
    expectedReportHeaders.set(report.pdfHref, { canonical: canonicalHeader });
  }
  if (report.markdownHref) {
    expectedReportHeaders.set(report.markdownHref, { robots: "noindex, follow" });
  }
  if (report.calendarHref) {
    expectedReportHeaders.set(report.calendarHref, { robots: "noindex, follow" });
  }
}

const headerRules = nextConfig.headers ? await nextConfig.headers() : [];
const reportHeaderRules = headerRules.filter(({ source }) => source.startsWith("/reports/"));
const expectedReportSources = new Set(expectedReportHeaders.keys());

for (const rule of headerRules) {
  const hasCanonical = rule.headers.some(
    ({ key, value }) =>
      key.toLocaleLowerCase() === "link"
      && value.toLocaleLowerCase().includes('rel="canonical"'),
  );
  const hasNoindex = rule.headers.some(
    ({ key, value }) =>
      key.toLocaleLowerCase() === "x-robots-tag"
      && value.toLocaleLowerCase().includes("noindex"),
  );
  if (hasCanonical && hasNoindex) {
    errors.push(`Header rule combines canonical and noindex: ${rule.source}`);
  }
}

for (const rule of reportHeaderRules) {
  if (!expectedReportSources.has(rule.source)) {
    errors.push(`Unexpected or overly broad report header rule: ${rule.source}`);
  }
}

for (const [source, expected] of expectedReportHeaders) {
  const matchingRules = reportHeaderRules.filter((rule) => rule.source === source);
  if (matchingRules.length !== 1) {
    errors.push(`Expected one exact header rule for ${source}, found ${matchingRules.length}`);
    continue;
  }

  const configuredHeaders = matchingRules[0].headers;
  const duplicateKeys = configuredHeaders
    .map(({ key }) => key.toLocaleLowerCase())
    .filter((key, index, keys) => keys.indexOf(key) !== index);
  if (duplicateKeys.length) {
    errors.push(`Duplicate headers for ${source}: ${[...new Set(duplicateKeys)].join(", ")}`);
  }

  const link = configuredHeaders.find(({ key }) => key.toLocaleLowerCase() === "link")?.value;
  const robots = configuredHeaders.find(
    ({ key }) => key.toLocaleLowerCase() === "x-robots-tag",
  )?.value;

  if (link !== expected.canonical) {
    errors.push(
      `Canonical HTTP header mismatch for ${source}: ${link ?? "missing"} `
        + `(expected ${expected.canonical ?? "none"})`,
    );
  }
  if (robots !== expected.robots) {
    errors.push(
      `X-Robots-Tag mismatch for ${source}: ${robots ?? "missing"} `
        + `(expected ${expected.robots ?? "none"})`,
    );
  }
  if (link && robots?.toLocaleLowerCase().includes("noindex")) {
    errors.push(`Resource combines canonical and noindex: ${source}`);
  }
  if (pathnames.includes(source)) {
    errors.push(`Downloadable resource must remain outside indexable sitemap paths: ${source}`);
  }
}

for (const source of ["/reports/manifest.json", "/llms.txt"]) {
  const indexingHeaders = headerRules
    .filter((rule) => rule.source === source || rule.source === "/:path*")
    .flatMap((rule) => rule.headers)
    .filter(({ key }) => ["link", "x-robots-tag"].includes(key.toLocaleLowerCase()));
  if (indexingHeaders.length) {
    errors.push(`${source} received report indexing headers`);
  }
}

if (errors.length) {
  console.error(`SEO validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `SEO validation passed: ${pathnames.length} indexable routes, `
    + `${seoRouteDefinitions.filter(({ alternatePathname }) => alternatePathname).length / 2} reciprocal language pairs.`,
);
