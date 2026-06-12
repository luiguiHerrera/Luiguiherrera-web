import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { MethodologyNote } from "@/components/ui/MethodologyNote";
import { SectionHeader } from "@/components/ui/SectionHeader";

const notes = [
  [
    "Qué hace la plataforma",
    "Organiza datos de mercado y preguntas de análisis para construir una lectura educativa del contexto. No anticipa precios, no recomienda activos y no sustituye análisis personalizado.",
  ],
  [
    "Qué no hace",
    "No evalúa idoneidad regulatoria, no diseña portafolios personales, no recomienda productos y no debe usarse como única base para tomar decisiones financieras, fiscales, legales o patrimoniales.",
  ],
  [
    "Fuentes de datos",
    "El dashboard combina fuentes externas y cálculos propios. La rotación sectorial usa ETFs sectoriales vía Alpha Vantage; el VIX se obtiene desde FRED VIXCLS; los flujos de ETFs Bitcoin se leen desde Bitbo; FedWatch queda pendiente hasta que la fuente automatizada esté habilitada.",
  ],
  [
    "Cómo se construye el régimen",
    "El régimen actual combina volatilidad, rotación sectorial y flujos. FedWatch no entra al score mientras esté pendiente. El resultado es una forma de ordenar información para entender si el entorno muestra apetito por riesgo, neutralidad, cautela o estrés.",
  ],
  [
    "Actualización y límites",
    "La lectura se actualiza según disponibilidad de las fuentes. No es intradía. Las fuentes pueden retrasarse, fallar, cambiar formato, revisar datos o contener errores; cuando una fuente no está disponible, la plataforma puede mostrar estado pendiente o fallback visual sin presentar datos demo como reales.",
  ],
  [
    "Privacidad y datos del usuario",
    "Algunos módulos usan datos automatizados de terceros; otros pueden mostrar estructuras educativas, datos demo o estados pendientes cuando una fuente no está disponible. La plataforma no guarda respuestas del diagnóstico, portafolios, patrimonio ni tolerancia al riesgo.",
  ],
];

export default function MetodologiaPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
      <SectionHeader
        eyebrow="Cómo leer la plataforma"
        title="Metodología"
        subtitle="La plataforma organiza datos de mercado para construir una lectura educativa del contexto. No anticipa precios, no recomienda activos y no sustituye análisis personalizado."
      />
      <section className="mt-8 grid gap-5 md:grid-cols-2">
        {notes.map(([title, text]) => <MethodologyNote key={title} title={title} text={text} />)}
      </section>
      <div className="mt-8">
        <DisclaimerBox>
          Las herramientas están diseñadas para aprender, contrastar hipótesis y ordenar riesgos. No sustituyen análisis personalizado ni criterio profesional.
        </DisclaimerBox>
      </div>
    </div>
  );
}
