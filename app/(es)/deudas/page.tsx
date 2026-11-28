import { DebtEditorial } from "@/components/debt/DebtEditorial";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/deudas");

export default function DeudasPage() {
  return (
    <DebtEditorial
      locale="es"
      chips={["Avalancha", "Bola de nieve", "Flujo", "Coste estimado"]}
      description="Estima el coste de tus deudas, compara métodos de pago y revisa si tu flujo mensual tiene margen suficiente. Explora el efecto de los pagos y su impacto sobre tu liquidez."
      eyebrow="Herramienta educativa"
      note="No guarda tus datos. Los cálculos son aproximados y sirven para ordenar preguntas, no para tomar decisiones automáticas."
      subtitle="Compara métodos de pago, coste y liquidez antes de decidir."
      title="Gestión de deudas"
      items={[
        { label: "Qué es", value: "Una herramienta educativa para comparar deuda, pagos mínimos, flujo mensual, avalancha, bola de nieve y abonos extraordinarios." },
        { label: "Para qué sirve", value: "Sirve para estimar qué costes podrían evitarse al amortizar y contrastarlos con la liquidez utilizada y el rendimiento incierto de otras alternativas." },
        { label: "Límites", value: "No sustituye asesoría financiera, legal, fiscal ni de insolvencia. Los resultados dependen de los datos ingresados." },
        { label: "Siguiente paso", value: "Después de revisar deuda, pasar al diagnóstico del inversionista o a protección del inversor." },
      ]}
    />
  );
}
