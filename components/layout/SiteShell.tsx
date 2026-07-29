import { Suspense } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/seo/site";
import { RouteStructuredData } from "@/components/seo/RouteStructuredData";

export function SiteShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <JsonLd data={[
        { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "Luigui Herrera", url: SITE_URL, inLanguage: ["es", "en"] },
        { "@context": "https://schema.org", "@type": "Person", "@id": `${SITE_URL}/#person`, name: "Luigui Herrera", url: SITE_URL, sameAs: ["https://github.com/luiguiHerrera"] },
      ]} />
      <RouteStructuredData />
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main>{children}</main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </>
  );
}
