import { absoluteUrl, SITE_URL } from "@/lib/seo/site";

export type SchemaLanguage = "es" | "en";

type PageInput = { pathname: string; name: string; description: string; language: SchemaLanguage };

const website = { "@id": `${SITE_URL}/#website` };
const person = { "@id": `${SITE_URL}/#person` };

export function buildWebPageJsonLd(input: PageInput, type: "WebPage" | "CollectionPage" = "WebPage") {
  const url = absoluteUrl(input.pathname);
  return { "@context": "https://schema.org", "@type": type, "@id": `${url}#webpage`, url, name: input.name, description: input.description, inLanguage: input.language, isPartOf: website };
}

export function buildBreadcrumbJsonLd(language: SchemaLanguage, items: Array<{ name: string; pathname: string }>) {
  const pageUrl = absoluteUrl(items.at(-1)?.pathname ?? "/");
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", "@id": `${pageUrl}#breadcrumb`, itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: absoluteUrl(item.pathname) })), inLanguage: language };
}

export function buildWebApplicationJsonLd(input: PageInput, applicationCategory: "FinanceApplication" | "EducationalApplication") {
  const url = absoluteUrl(input.pathname);
  return { "@context": "https://schema.org", "@type": "WebApplication", "@id": `${url}#application`, url, name: input.name, description: input.description, inLanguage: input.language, applicationCategory, operatingSystem: "Web", isAccessibleForFree: true, isPartOf: website, author: person };
}

export function buildArticleJsonLd(input: PageInput, type: "Article" | "TechArticle", options?: { headline?: string; datePublished?: string; about?: string[] }) {
  const url = absoluteUrl(input.pathname);
  return { "@context": "https://schema.org", "@type": type, "@id": `${url}#${type === "TechArticle" ? "technical-article" : "article"}`, url, headline: options?.headline ?? input.name, description: input.description, inLanguage: input.language, author: person, publisher: person, isPartOf: website, ...(options?.datePublished ? { datePublished: options.datePublished, dateModified: options.datePublished } : {}), ...(options?.about ? { about: options.about } : {}) };
}
