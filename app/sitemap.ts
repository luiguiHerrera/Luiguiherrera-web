import type { MetadataRoute } from "next";
import { absoluteUrl, languageAlternates, languagePairs } from "@/lib/seo/site";

const highPriority = new Set(["/dashboard", "/informes", "/proteccion", "/metodologia", "/niveles-estadisticos"]);
const educationalTools = new Set(["/presupuesto", "/deudas", "/diagnostico", "/protege-tu-dinero"]);

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return languagePairs.flatMap(([es, en]) => [es, en].map((pathname) => {
    const spanishPath = pathname.startsWith("/en") ? es : pathname;
    const priority = pathname === "/" || pathname === "/en" ? 1 : highPriority.has(spanishPath) ? 0.9 : spanishPath === "/legal" ? 0.3 : educationalTools.has(spanishPath) ? 0.8 : 0.7;
    return {
      url: absoluteUrl(pathname),
      lastModified,
      changeFrequency: highPriority.has(spanishPath) ? "weekly" as const : "monthly" as const,
      priority,
      alternates: { languages: languageAlternates(pathname)! },
    };
  }));
}
