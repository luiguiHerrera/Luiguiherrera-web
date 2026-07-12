import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Herramientas para inversionistas",
  description: "Diagnósticos, simulaciones y lecturas educativas de mercado.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <JsonLd data={[
          { "@context": "https://schema.org", "@type": "WebSite", name: "Luigui Herrera", url: SITE_URL, inLanguage: ["es", "en"] },
          { "@context": "https://schema.org", "@type": "Person", name: "Luigui Herrera", url: SITE_URL, sameAs: ["https://github.com/luiguiHerrera"] },
        ]} />
        <Suspense fallback={null}>
          <Header />
        </Suspense>
        <main>{children}</main>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </body>
    </html>
  );
}
