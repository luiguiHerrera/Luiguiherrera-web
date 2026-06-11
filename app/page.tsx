import Image from "next/image";
import Link from "next/link";
import { ToolCard } from "@/components/ui/ToolCard";

const principles = [
  ["Entender el contexto", "Datos que explican lo que realmente importa."],
  ["Gestionar el riesgo", "No se trata de acertar, sino de sobrevivir y avanzar."],
  ["Decidir con criterio", "Menos impulso. Más proceso."],
];

const tools = [
  {
    title: "Diagnóstico del inversionista",
    label: "01",
    href: "/diagnostico",
    description: "Conoce tu perfil de riesgo, horizonte y sesgos para invertir alineado contigo.",
  },
  {
    title: "Market Regime Dashboard",
    label: "02",
    href: "/dashboard",
    description: "Monitorea tasas, volatilidad y rotación sectorial en un solo lugar.",
  },
  {
    title: "Quant / TD3 Lab",
    label: "03",
    href: "/quant-lab",
    description: "Lecturas cuantitativas, backtests y análisis sistemático.",
  },
  {
    title: "Protege tu dinero",
    label: "04",
    href: "/protege-tu-dinero",
    description: "Estrategias y checklist para preservar tu capital en la tormenta.",
  },
];

const dashboardPreviews = [
  {
    title: "Régimen integrado",
    text: "Combina volatilidad, rotación sectorial y flujos de ETF Bitcoin para leer si el entorno favorece riesgo, neutralidad o cautela.",
    tags: ["VIX", "Rotación", "BTC ETF flows"],
    source: "FedWatch se integrará cuando la fuente automatizada quede habilitada.",
  },
  {
    title: "Mapa relativo por sectores",
    text: "Compara el comportamiento reciente de ETFs sectoriales para observar liderazgo, defensivos y dispersión del mercado.",
    tags: ["1W", "1M", "3M"],
    source: "Alpha Vantage · actualización diaria",
  },
  {
    title: "Presión de volatilidad",
    text: "Clasifica el VIX por nivel absoluto, percentil histórico y momentum reciente, sin presentarlo como anticipación de dirección.",
    tags: ["Nivel", "Percentil", "Momentum"],
    source: "FRED VIXCLS · último cierre disponible",
  },
  {
    title: "Flujos de ETFs Bitcoin",
    text: "Observa entradas, salidas, rachas y presión reciente de flujos en ETFs spot de Bitcoin de EE. UU.",
    tags: ["5D", "20D", "Rachas"],
    source: "Bitbo · según disponibilidad de la fuente",
  },
];


const quantRows = [
  ["TD3 Trend", "Seguimiento de tendencia", "Direccional", "2.41%", "6.78%", "1.32", "-6.21%", "Activo"],
  ["TD3 Macro", "Regimen macro", "Neutral", "0.83%", "2.11%", "0.74", "-4.17%", "Activo"],
  ["TD3 Volatility", "Volatilidad relativa", "Cobertura", "-0.56%", "1.05%", "0.35", "-2.93%", "Activo"],
];

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-line bg-panel">
        <div className="mx-auto grid min-h-[560px] max-w-7xl grid-cols-1 px-5 py-14 md:min-h-[650px] md:py-20 lg:grid-cols-[0.7fr_1fr] lg:items-center">
          <div className="relative z-20 max-w-2xl">
            <h1 className="text-5xl font-semibold leading-[0.98] text-ink md:text-7xl">
              Herramientas para invertir con más criterio y menos impulso
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-muted md:text-lg">
              Entiende el contexto. Gestiona el riesgo. Toma decisiones basadas en datos, no en ruido.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/dashboard" className="border border-ink bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink">
                Explorar dashboard
              </Link>
              <Link href="/diagnostico" className="border border-line bg-panel px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink">
                Empezar diagnóstico
              </Link>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 block h-[30%] w-full md:inset-y-0 md:h-auto md:w-[72%]">
            <Image
              src="/images/hero-family-ascent.png"
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 72vw, 100vw"
              className="object-contain object-[100%_100%] opacity-30 sm:opacity-45 md:object-cover md:object-[60%_50%] md:opacity-90 lg:object-[58%_50%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-panel/10 via-panel/40 to-panel md:bg-gradient-to-r md:from-panel md:via-panel/80 md:via-45% md:to-panel/5" />
            <div className="absolute inset-y-0 left-0 w-1/3 bg-panel/55 md:w-1/2 md:bg-panel/35" />
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 md:grid-cols-[0.35fr_1fr_0.95fr] md:items-start">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Nuestra filosofía</p>
          <p className="text-xl leading-8 text-ink md:text-2xl">
            Los mercados cambian. El riesgo también. Esta plataforma te ayuda a ver el panorama completo antes de tomar decisiones.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {principles.map(([title, text]) => (
              <div key={title} className="border-l border-line pl-5">
                <p className="font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-4 md:grid-cols-4">
          {tools.map((tool) => <ToolCard key={tool.href} {...tool} />)}
        </div>
      </section>

      <section className="border-b border-line bg-[#f7f6f2]">
        <div className="mx-auto max-w-7xl px-5 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Market Regime Dashboard</p>
          <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight text-ink md:text-4xl">Lectura diaria del régimen de mercado</h2>
          <p className="mt-4 max-w-2xl leading-7 text-muted">Volatilidad, rotación sectorial y flujos institucionales organizados en una lectura clara del contexto.</p>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {dashboardPreviews.map((preview) => (
              <div key={preview.title} className="flex min-h-[260px] flex-col border border-line bg-panel p-5">
                <h3 className="font-semibold text-ink">{preview.title}</h3>
                <p className="mt-4 text-sm leading-6 text-muted">{preview.text}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {preview.tags.map((tag) => (
                    <span key={tag} className="border border-line bg-panelSoft px-2.5 py-1 text-xs font-semibold text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-auto pt-6 text-xs leading-5 text-muted">{preview.source}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
            <p className="max-w-2xl text-sm leading-6 text-muted">
              Lectura educativa de contexto. No es recomendación de inversión, no elige activos y no anticipa retornos futuros.
            </p>
            <Link href="/dashboard" className="w-fit border border-ink bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink">
              Ver dashboard de mercado
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[0.22fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Quant Lab Preview</p>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-ink">Ideas sistemáticas. Proceso disciplinado.</h2>
            <p className="mt-4 text-sm leading-6 text-muted">Lecturas basadas en datos y reglas claras. Backtests transparentes. Resultados medibles.</p>
          </div>
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr className="border-b border-line">
                  {["Estrategia", "Enfoque", "Lectura actual", "Rend. 1M", "Rend. 3M", "Sharpe", "Max DD", "Estado"].map((h) => <th key={h} className="py-3 pr-5 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {quantRows.map((row) => (
                  <tr key={row[0]} className="border-b border-line/70">
                    {row.map((cell, index) => <td key={`${row[0]}-${index}`} className={`py-4 pr-5 ${index === 0 ? "font-semibold text-ink" : index === 2 && cell === "Cobertura" ? "font-medium text-danger" : index === 7 ? "text-[#476b5a]" : "text-muted"}`}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-6 flex justify-end">
              <Link href="/quant-lab" className="text-sm font-semibold text-ink hover:text-petrol">Explorar Quant Lab &rarr;</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
