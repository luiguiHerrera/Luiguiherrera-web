import Image from "next/image";
import Link from "next/link";
import { HomeDashboardPreview } from "@/components/home/HomeDashboardPreview";
import { TypewriterPrinciples } from "@/components/home/TypewriterPrinciples";
import { ToolCard } from "@/components/ui/ToolCard";
import { getHomeDashboardPreviewData } from "@/lib/dashboard/get-home-dashboard-preview-data";
import { getRouteMetadata } from "@/lib/seo/site";

const principles = [
  ["Entender el contexto", "Leer el tablero antes de mover la ficha."],
  ["Gestionar el riesgo", "Proteger el margen de error antes de buscar rendimiento."],
  ["Decidir con criterio", "Menos reacción. Más método."],
];

const entryways = [
  {
    title: "Leer el mercado",
    label: "01",
    href: "/dashboard",
    description: "Régimen, niveles y contexto.",
  },
  {
    title: "Mi perfil",
    label: "02",
    href: "/diagnostico",
    description: "Riesgo, horizonte y capacidad.",
  },
  {
    title: "Estrategias",
    label: "03",
    href: "/investigacion/td3",
    description: "Modelos y backtests reproducibles.",
  },
  {
    title: "Simulador financiero",
    label: "04",
    href: "/proteccion",
    description: "Decisiones y margen de error.",
  },
  {
    title: "Tendencias",
    label: "05",
    href: "/tendencias",
    description: "Cambios globales como hipótesis.",
  },
  {
    title: "Recursos",
    label: "06",
    href: "/recursos",
    description: "Scripts y herramientas públicas.",
  },
];

const homePathways = [
  {
    title: "Conócete a ti mismo",
    href: "/empezar",
    label: "Camino 01",
    domain: "Finanzas personales",
    description: "Riesgo, horizonte y capacidad antes de mover capital.",
  },
  {
    title: "Conoce el mercado",
    href: "/inversionista",
    label: "Camino 02",
    domain: "Inversión",
    description: "Régimen, volatilidad, estrategias y tendencias.",
  },
];

export const metadata = getRouteMetadata("/");

export default async function Home() {
  const { regimeSummary, sectorRotation, vix, vixTermStructure } = await getHomeDashboardPreviewData();

  return (
    <div>
      <section className="estate-hero home-estate-hero relative overflow-hidden border-b border-line" data-home-hero>
        <div className="mx-auto grid min-h-[470px] max-w-7xl grid-cols-1 px-4 pb-48 pt-10 md:min-h-[650px] md:px-5 md:py-20 lg:grid-cols-[0.7fr_1fr] lg:items-center">
          <div className="relative z-20 max-w-2xl">
            <p className="mb-4 w-fit rounded-full border border-petrol/20 bg-white/65 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-petrol">
              Criterio quant para inversores
            </p>
            <h1 className="home-estate-heading text-3xl font-semibold leading-[1.04] text-ink sm:text-4xl">
              Antes de invertir, entiende cómo respira el mercado
            </h1>
            <TypewriterPrinciples />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap md:mt-8 md:gap-4">
              <Link href="/dashboard" className="inline-flex min-h-11 w-full items-center justify-center rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(11,52,54,0.14)] transition hover:bg-panel hover:text-petrol focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol sm:w-auto md:px-5">
                Leer el mercado
              </Link>
              <Link href="/diagnostico" className="inline-flex min-h-11 w-full items-center justify-center rounded-[4px] border border-petrol/25 bg-white/70 px-4 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol sm:w-auto md:px-5">
                Diagnosticar mi perfil
              </Link>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 block h-48 w-full md:inset-y-0 md:h-auto md:w-full">
            <Image
              src="/images/hero-family-sculptural-ascent.png"
              alt="Familia ascendiendo unida por una escalera escultórica en un espacio luminoso."
              fill
              priority
              sizes="100vw"
              className="object-cover object-[68%_50%] opacity-45 sm:opacity-55 md:object-[50%_50%] md:opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-paper/10 via-paper/45 to-paper md:bg-gradient-to-r md:from-paper md:via-paper/82 md:via-45% md:to-paper/10" />
            <div className="absolute inset-y-0 left-0 w-1/3 bg-paper/55 md:w-1/2 md:bg-paper/35" />
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper" data-home-paths>
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-9 md:px-5 md:py-11 lg:grid-cols-[0.34fr_1fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">Dos caminos</p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-ink">Tú y el mercado</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {homePathways.map((pathway) => (
              <Link key={pathway.href} href={pathway.href} className="estate-card group flex min-h-[11rem] flex-col rounded-[6px] border border-line p-5 transition hover:border-petrol focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{pathway.label}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-brass">{pathway.domain}</p>
                <h3 className="mt-2 text-2xl font-semibold leading-tight text-ink">{pathway.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{pathway.description}</p>
                <span className="mt-auto pt-5 text-sm font-semibold text-petrol transition group-hover:translate-x-0.5">Explorar <span aria-hidden="true">→</span></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="patrimonial-band border-b border-line" data-home-philosophy>
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-7 md:grid-cols-[0.35fr_1fr_0.95fr] md:items-start md:px-5 md:py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">Nuestra filosofía</p>
          <h2 className="border-l-2 border-brass/55 pl-5 text-lg font-medium leading-7 text-ink md:text-2xl md:leading-8">
            El mercado cambia rápido. El riesgo también. La ventaja está en ordenar la información antes de decidir.
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {principles.map(([title, text]) => (
              <div key={title} className="border-l border-petrol/25 pl-5">
                <p className="font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HomeDashboardPreview
        locale="es"
        regimeSummary={regimeSummary}
        sectorRotation={sectorRotation}
        vix={vix}
        vixTermStructure={vixTermStructure}
      />

      <section className="warm-section" aria-labelledby="home-goals-es" data-home-goals>
        <div className="mx-auto max-w-7xl px-4 py-11 md:px-5 md:py-14">
          <h2 id="home-goals-es" className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">Explora por objetivo</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entryways.map((tool) => <ToolCard key={tool.href} {...tool} actionLabel="Explorar" headingLevel="h3" />)}
          </div>
        </div>
      </section>
    </div>
  );
}
