import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Herramientas para inversionistas",
  description: "Diagnósticos, simulaciones y lecturas educativas de mercado.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
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
