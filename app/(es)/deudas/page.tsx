import { DebtPlanner } from "@/components/debt/DebtPlanner";
import { ReadingCard } from "@/components/seo/ReadingCard";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/deudas");

export default function DeudasPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <InstitutionalHero
        chips={["Avalancha", "Bola de nieve", "Flujo", "Costo real"]}
        description="Una inversión incierta no siempre compite bien contra una deuda cara y segura. Esta herramienta estima el costo real de tus deudas, compara métodos de pago y revisa si tu flujo mensual tiene margen suficiente."
        eyebrow="Herramienta educativa"
        note="No guarda tus datos. Los cálculos son aproximados y sirven para ordenar preguntas, no para tomar decisiones automáticas."
        subtitle="Compara métodos de pago y rentabilidad mínima comparable antes de invertir."
        title="Gestión de deudas"
        variant="educational"
      />

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
