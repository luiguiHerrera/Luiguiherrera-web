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
    description: "Señales cuantitativas, backtests y análisis sistemático.",
  },
  {
    title: "Protege tu dinero",
    label: "04",
    href: "/protege-tu-dinero",
    description: "Estrategias y checklist para preservar tu capital en la tormenta.",
  },
];

const fedRows = [
  ["17 Jun 2026", "0.0%", "2.0%", "98.0%", "0.0%", "0.0%"],
  ["29 Jul 2026", "0.0%", "1.7%", "83.7%", "14.7%", "0.0%"],
  ["16 Sep 2026", "0.0%", "1.1%", "54.4%", "39.3%", "5.2%"],
  ["28 Oct 2026", "0.0%", "0.8%", "41.4%", "43.0%", "13.5%"],
  ["09 Dec 2026", "0.0%", "0.5%", "24.4%", "42.3%", "25.8%"],
];

const sectors = [
  ["Energia", "+1.70%", 86, "pos"],
  ["Real Estate", "+0.93%", 58, "pos"],
  ["Healthcare", "+0.80%", 51, "pos"],
  ["Cons. Defensivo", "+0.79%", 49, "pos"],
  ["Industriales", "-0.48%", 24, "neg"],
  ["Utilities", "-0.89%", 34, "neg"],
  ["Tecnologia", "-4.62%", 82, "neg"],
  ["Materiales Basicos", "-5.54%", 88, "neg"],
];

const quantRows = [
  ["TD3 Trend", "Seguimiento de tendencia", "Largo", "2.41%", "6.78%", "1.32", "-6.21%", "Activo"],
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
          <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight text-ink md:text-4xl">El contexto, en tiempo real</h2>
          <p className="mt-4 max-w-xl leading-7 text-muted">Tres pilares para entender el régimen actual y anticipar escenarios.</p>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="min-w-0 border border-line bg-panel p-5">
              <h3 className="font-semibold text-ink">Probabilidades FedWatch</h3>
              <div className="mt-4 min-w-0 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-xs">
                  <thead className="text-muted">
                    <tr className="border-b border-line">
                      {["Reunion", "300-325", "325-350", "350-375", "375-400", "400-425"].map((h) => <th key={h} className="py-2 pr-3 font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {fedRows.map((row) => (
                      <tr key={row[0]} className="border-b border-line/70">
                        {row.map((cell, index) => <td key={`${row[0]}-${index}`} className={`py-2 pr-3 ${index === 3 ? "bg-[#edf2ef] text-ink" : "text-muted"}`}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-muted">Fuente: CME FedWatch Tool</p>
            </div>

            <div className="min-w-0 border border-line bg-panel p-5">
              <h3 className="font-semibold text-ink">Desempeño por sector (1 semana)</h3>
              <div className="mt-4 space-y-2">
                {sectors.map(([name, value, width, tone]) => (
                  <div key={name} className="grid grid-cols-[7rem_1fr_3.5rem] items-center gap-3 text-xs">
                    <span className="text-muted">{name}</span>
                    <span className="h-3 bg-panelSoft">
                      <span className={`block h-3 ${tone === "pos" ? "bg-sage" : "bg-danger"}`} style={{ width: `${width}%` }} />
                    </span>
                    <span className={tone === "pos" ? "text-[#476b5a]" : "text-danger"}>{value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted">Fuente: Datos de mercado</p>
            </div>

            <div className="min-w-0 border border-line bg-panel p-5">
              <h3 className="font-semibold text-ink">Estructura a plazo del VIX</h3>
              <div className="mt-5 flex h-44 items-end gap-3 border-b border-line px-1">
                {[42, 58, 67, 76, 82, 81, 78, 84].map((height, index) => (
                  <div key={`${height}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                    <span className="w-full border-t-2 border-petrol" style={{ height: `${height}%` }} />
                    <span className="text-[10px] text-muted">{["Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Ene"][index]}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted">Fuente: CBOE (cotizaciones con retraso)</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[0.22fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Quant Lab Preview</p>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-ink">Ideas sistemáticas. Proceso disciplinado.</h2>
            <p className="mt-4 text-sm leading-6 text-muted">Señales basadas en datos y reglas claras. Backtests transparentes. Resultados medibles.</p>
          </div>
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr className="border-b border-line">
                  {["Estrategia", "Enfoque", "Señal actual", "Rend. 1M", "Rend. 3M", "Sharpe", "Max DD", "Estado"].map((h) => <th key={h} className="py-3 pr-5 font-semibold">{h}</th>)}
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
