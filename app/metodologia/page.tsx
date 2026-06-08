import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { MethodologyNote } from "@/components/ui/MethodologyNote";
import { SectionHeader } from "@/components/ui/SectionHeader";

const notes = [
  ["La web no recomienda productos", "Las herramientas organizan información educativa y preguntas de análisis. No sugieren operaciones, productos ni asignaciones personalizadas."],
  ["Resultados educativos", "Las lecturas dependen de inputs simplificados, supuestos y datos mockeados en esta primera versión."],
  ["Lecturas aproximadas", "Un portafolio no se entiende cuando todo sube. Se entiende cuando algo se rompe."],
  ["Datos con límites", "Los datos pueden estar incompletos, retrasados, mal interpretados o sujetos a errores de origen."],
  ["Consulta profesional", "Cuando corresponda, el usuario debe consultar profesionales autorizados en inversión, impuestos o asuntos legales."],
];

export default function MetodologiaPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:py-16">
      <SectionHeader
        eyebrow="Cómo leer la plataforma"
        title="Metodología"
        subtitle="Esto no es una instrucción operativa. Es una lectura de contexto."
      />
      <section className="mt-10 grid gap-5 md:grid-cols-2">
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
