import { MethodologyNote } from "@/components/ui/MethodologyNote";
import { SectionHeader } from "@/components/ui/SectionHeader";

const legalSections = [
  ["Aviso legal", "La plataforma ofrece contenido educativo y herramientas de análisis general. No presta asesoría financiera, legal, fiscal ni patrimonial."],
  ["Privacidad", "Como MVP no se guardan respuestas del diagnóstico, portafolios, patrimonio, tolerancia al riesgo ni resultados individuales."],
  ["Cookies y analítica", "No se implementan cookies de marketing. La futura analítica debe ser agregada, anónima y sin inputs financieros del usuario."],
  ["Disclaimer financiero", "Ninguna herramienta predice precios, recomienda comprar o vender activos ni sustituye un análisis personalizado."],
  ["Seguridad de datos", "No hay login, cuentas, base de datos ni API keys en frontend. Los eventos permitidos no incluyen respuestas financieras ni mensajes libres."],
];

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:py-16">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <SectionHeader
          eyebrow="Estructura inicial"
          title="Legal"
          subtitle="Textos base para operar el MVP con límites claros desde el primer día."
        />
        <div className="rounded-lg border border-line bg-panel p-6 text-sm leading-7 text-muted shadow-quiet">
          Esta página resume límites operativos del MVP. La idea es que privacidad, alcance educativo y ausencia de asesoría estén visibles, no escondidos al final.
        </div>
      </div>
      <section className="mt-10 grid gap-5 md:grid-cols-2">
        {legalSections.map(([title, text]) => <MethodologyNote key={title} title={title} text={text} />)}
      </section>
    </div>
  );
}
