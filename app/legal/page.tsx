import { MethodologyNote } from "@/components/ui/MethodologyNote";
import { SectionHeader } from "@/components/ui/SectionHeader";

const legalSections = [
  [
    "No asesoría personalizada",
    "El contenido es educativo e informativo. No constituye asesoría financiera, legal, fiscal, patrimonial ni recomendación personalizada. Ninguna herramienta evalúa formalmente idoneidad, conveniencia ni adecuación regulatoria del usuario.",
  ],
  [
    "Sin recomendaciones de inversión",
    "La plataforma no recomienda comprar, vender, mantener ni contratar activos, productos financieros o estrategias. Las lecturas del dashboard son contexto general y no deben usarse como única base para tomar decisiones de inversión.",
  ],
  [
    "Datos de terceros",
    "Algunas secciones usan datos de proveedores externos. Estos datos pueden estar retrasados, incompletos, sujetos a revisión, contener errores o dejar de estar disponibles. La plataforma no garantiza exactitud, continuidad ni actualización permanente de las fuentes.",
  ],
  [
    "Régimen de mercado",
    "El régimen de mercado es una clasificación educativa construida a partir de variables observables. No anticipa retornos futuros, no anticipa movimientos de precio y no representa una instrucción operativa.",
  ],
  [
    "Fallbacks y estados pendientes",
    "Cuando una fuente falla o no está disponible, el sitio puede mostrar estados pendientes, estructuras educativas, fallback visual o datos demo claramente identificados. Esos estados no deben interpretarse como datos actuales de mercado.",
  ],
  [
    "Privacidad",
    "Como MVP no se guardan respuestas del diagnóstico, portafolios, patrimonio, tolerancia al riesgo ni resultados individuales. No hay cuentas de usuario, login ni base de datos de perfiles personales en esta versión.",
  ],
  [
    "Cookies y analítica",
    "No se implementan cookies de marketing. La futura analítica debe ser agregada, anónima y sin inputs financieros del usuario.",
  ],
  [
    "Seguridad de datos",
    "No hay API keys en frontend. La configuración sensible debe permanecer server-side y no debe exponerse al navegador.",
  ],
  [
    "Uso bajo responsabilidad del usuario",
    "El usuario es responsable de contrastar la información y, cuando corresponda, consultar profesionales autorizados antes de tomar decisiones financieras, fiscales, legales o patrimoniales.",
  ],
];

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <SectionHeader
          eyebrow="Estructura inicial"
          title="Legal"
          subtitle="Textos base para operar el MVP con límites claros desde el primer día."
        />
        <div className="border border-line bg-panel p-6 text-sm leading-7 text-muted">
          Esta página resume límites operativos del MVP. La idea es que privacidad, alcance educativo y ausencia de asesoría estén visibles, no escondidos al final.
        </div>
      </div>
      <section className="mt-8 grid gap-5 md:grid-cols-2">
        {legalSections.map(([title, text]) => <MethodologyNote key={title} title={title} text={text} />)}
      </section>
    </div>
  );
}
