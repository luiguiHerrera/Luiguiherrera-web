import { DebtPlanner } from "@/components/debt/DebtPlanner";
import type { Metadata } from "next";
import { ReadingCard } from "@/components/seo/ReadingCard";

export const metadata: Metadata = {
  title: "Gestión de deudas | Avalancha, bola de nieve y flujo mensual",
  description: "Herramienta educativa para evaluar deudas, pagos mínimos, flujo mensual, avalancha, bola de nieve, abonos extraordinarios y rentabilidad mínima comparable.",
};

export default function DeudasPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <section className="institutional-hero institutional-hero--educational grid gap-8 px-5 py-7 md:px-7 md:py-9 lg:grid-cols-[0.58fr_0.42fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">Herramienta educativa</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Gestión de deudas</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
            Una inversión incierta no siempre compite bien contra una deuda cara y segura. Esta herramienta estima el costo real de tus deudas, compara métodos de pago y revisa si tu flujo mensual tiene margen suficiente.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Compara avalancha, bola de nieve, pagos mínimos, abonos extraordinarios y rentabilidad mínima comparable antes de invertir.
          </p>
        </div>
        <div className="institutional-hero-note p-5 text-sm leading-7 text-muted">
          No guarda tus datos. Los cálculos son aproximados y sirven para ordenar preguntas, no para tomar decisiones automáticas.
        </div>
      </section>

      <ReadingCard title="Ficha de lectura" items={[
        { label: "Qué es", value: "Una herramienta educativa para comparar deuda, pagos mínimos, flujo mensual, avalancha, bola de nieve y abonos extraordinarios." },
        { label: "Para qué sirve", value: "Sirve para ver si una deuda es manejable o frágil y si invertir compite contra una rentabilidad segura al pagar deuda cara." },
        { label: "Límites", value: "No sustituye asesoría financiera, legal, fiscal ni de insolvencia. Los resultados dependen de los datos ingresados." },
        { label: "Siguiente paso", value: "Después de revisar deuda, pasar al diagnóstico del inversionista o a protección del inversor." },
      ]} />

      <DebtPlanner locale="es" />
    </div>
  );
}
