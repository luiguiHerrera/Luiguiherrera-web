import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Primer Informe de Julio | Luigui Herrera",
  description:
    "Lectura de mercado para una cartera multi-activo: IA, flujos, concentración y activos principales.",
};

const executiveSummary = [
  {
    title: "VOO",
    text: "Núcleo constructivo, aunque con concentración elevada y dependencia de grandes compañías.",
  },
  {
    title: "GLD",
    text: "Pausa útil dentro de una lectura defensiva, con rol de diversificación ante tensión macro.",
  },
  {
    title: "EWJ",
    text: "Fortaleza relativa en Asia desarrollada, con mejor lectura frente a otros bloques regionales.",
  },
  {
    title: "FXI",
    text: "Posición táctica, todavía sin liderazgo claro ni confirmación estructural suficiente.",
  },
  {
    title: "BTC/ETH",
    text: "Alta beta, sensible a liquidez, apetito por riesgo y rotación hacia activos especulativos.",
  },
  {
    title: "Stockpicking",
    text: "Más relevante por dispersión, menor correlación y diferencias de calidad entre compañías.",
  },
];

const contents = [
  "Qué pasó.",
  "Tesis de mercado.",
  "Riesgo estructural.",
  "Lectura por activo.",
  "Calendario y eventos.",
  "Escenarios.",
  "Señales a vigilar.",
  "Anexo de gráficos.",
];

const pageWidthStyle = { maxWidth: "min(80rem, 100vw)" };
const viewportWidthStyle = { maxWidth: "calc(100vw - 2rem)" };
const heroTextStyle = { maxWidth: "min(56rem, calc(100vw - 2rem))" };
const subtitleStyle = { maxWidth: "min(48rem, calc(100vw - 2rem))" };
const noteStyle = { maxWidth: "min(42rem, calc(100vw - 2rem))" };

export default function InformeJulioPage() {
  return (
    <main className="mx-auto w-full overflow-x-hidden px-4 py-8 md:px-5 md:py-14" style={pageWidthStyle}>
      <section className="grid gap-6 border-b border-line pb-8 lg:grid-cols-[1fr_0.48fr] lg:items-end">
        <div className="july-report-viewport min-w-0" style={heroTextStyle}>
          <p className="text-xs font-semibold uppercase text-petrol">Primer informe de julio</p>
          <h1 className="mt-4 break-words text-2xl font-semibold leading-[1.08] text-ink sm:text-4xl md:text-6xl">
            IA, flujos y concentración: un mercado fuerte, pero más mecánico
          </h1>
          <p className="july-report-viewport mt-5 break-words text-base leading-7 text-muted md:text-lg" style={subtitleStyle}>
            Lectura de mercado para una cartera multi-activo: VOO, GLD, EWJ, FXI, BTC/ETH y
            selección de acciones.
          </p>
          <p className="july-report-viewport mt-4 break-words border-l border-brass/50 pl-4 text-sm leading-6 text-muted" style={noteStyle}>
            Documento educativo e informativo. No constituye asesoría financiera personalizada.
          </p>
        </div>

        <div className="july-report-viewport flex flex-col gap-3 sm:flex-row lg:flex-col" style={viewportWidthStyle}>
          <a
            className="inline-flex items-center justify-center rounded-[4px] border border-petrol bg-petrol px-5 py-3 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol"
            download
            href="/reports/primer-informe-julio-2026.pdf"
          >
            Descargar PDF
          </a>
          <Link
            className="inline-flex items-center justify-center rounded-[4px] border border-line bg-panel px-5 py-3 text-sm font-semibold text-ink transition hover:border-petrol hover:text-petrol"
            href="/informe-semanal"
          >
            Ver informe semanal
          </Link>
        </div>
      </section>

      <section className="py-8 md:py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-petrol">Resumen ejecutivo</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">Lecturas principales</h2>
          </div>
        </div>
        <div className="july-report-viewport mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" style={viewportWidthStyle}>
          {executiveSummary.map((item) => (
            <article key={item.title} className="min-w-0 border border-line bg-panel p-4">
              <p className="text-sm font-semibold uppercase text-petrol">{item.title}</p>
              <p className="mt-3 break-words text-sm leading-6 text-muted">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 border-y border-line py-8 md:py-10 lg:grid-cols-[0.38fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Tesis principal</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">Fuerza con fragilidad</h2>
        </div>
        <p className="july-report-viewport min-w-0 break-words text-base leading-8 text-muted" style={heroTextStyle}>
          El mercado mantiene sesgo constructivo, apoyado por inteligencia artificial, tecnología,
          momentum, flujos pasivos y participación retail. La misma fuerza que sostiene los precios
          también aumenta la fragilidad: concentración elevada, actividad en opciones de muy corto
          plazo y dependencia de resultados corporativos.
        </p>
      </section>

      <section className="grid gap-6 py-8 md:py-10 lg:grid-cols-[0.7fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Qué contiene el informe</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">Mapa de lectura</h2>
        </div>
        <div className="july-report-viewport grid min-w-0 gap-2 sm:grid-cols-2" style={viewportWidthStyle}>
          {contents.map((item) => (
            <div
              key={item}
              className="min-w-0 break-words border border-line bg-white/70 px-4 py-3 text-sm font-semibold text-ink"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 border-y border-line py-8 md:py-10 lg:grid-cols-[0.38fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Gráficos</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">Anexo visual</h2>
        </div>
        <div className="july-report-viewport min-w-0 border border-line bg-panel p-5" style={viewportWidthStyle}>
          <p className="text-sm leading-6 text-muted">Los gráficos principales se encuentran en el PDF.</p>
        </div>
      </section>

      <section className="grid gap-5 py-8 md:py-10 lg:grid-cols-[0.38fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Fuentes</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">Tratamiento de gráficos</h2>
        </div>
        <p className="july-report-viewport min-w-0 break-words text-sm leading-7 text-muted" style={heroTextStyle}>
          Los gráficos provenientes de informes bancarios pueden conservarse como soporte del
          documento. Los gráficos de redes sociales, capturas no bancarias o materiales sin fuente
          formal deben recrearse, contrastarse con cálculos propios o pasar al anexo interno.
        </p>
      </section>

      <section className="july-report-viewport border border-line bg-panelSoft p-5" style={viewportWidthStyle}>
        <p className="max-w-5xl break-words text-sm leading-7 text-muted">
          Este documento tiene fines educativos e informativos. No constituye asesoría financiera,
          recomendación personalizada ni solicitud de compra o venta de activos. Las decisiones de
          inversión deben considerar objetivos, horizonte, liquidez, tolerancia al riesgo y situación
          financiera individual. Rentabilidades pasadas no garantizan resultados futuros.
        </p>
      </section>
    </main>
  );
}
