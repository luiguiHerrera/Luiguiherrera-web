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

const regimePreview = {
  label: "Cautela",
  score: 14,
  confidence: 74,
  bias: "Cauteloso",
  readings: ["Rotación defensiva", "VIX en vigilancia", "BTC ETF flows con salidas"],
};

const sectorPreviewRows = [
  { name: "Consumo defensivo", ticker: "XLP", value: 4.1 },
  { name: "Salud", ticker: "XLV", value: 3.6 },
  { name: "Real Estate", ticker: "XLRE", value: 3.4 },
  { name: "Comunicación", ticker: "XLC", value: -6.4 },
  { name: "Consumo discrecional", ticker: "XLY", value: -7.8 },
  { name: "Tecnología", ticker: "XLK", value: -10.0 },
];

const vixPreviewSeries = [15.3, 16.8, 17.4, 18.1, 17.7, 19.2, 18.6, 19.9];
const btcFlowPreview = [0, -220, -420, -35, -842, 7, -12, -426, -83];


const quantRows = [
  ["TD3 Trend", "Seguimiento de tendencia", "Direccional", "2.41%", "6.78%", "1.32", "-6.21%", "Activo"],
  ["TD3 Macro", "Regimen macro", "Neutral", "0.83%", "2.11%", "0.74", "-4.17%", "Activo"],
  ["TD3 Volatility", "Volatilidad relativa", "Cobertura", "-0.56%", "1.05%", "0.35", "-2.93%", "Activo"],
];

function formatPreviewPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function sparklinePath(values: number[], width = 100, height = 40) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / spread) * (height - 8) - 4;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function RegimePreviewPanel() {
  return (
    <div className="border border-petrol/30 bg-panel p-6 md:p-7">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Régimen integrado</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <span className="inline-flex border border-petrol/40 bg-[#edf3f1] px-4 py-2 text-sm font-semibold text-petrol">
              {regimePreview.label}
            </span>
            <span className="pb-1 text-sm text-muted">Sesgo {regimePreview.bias.toLowerCase()}</span>
          </div>
        </div>
        <div className="text-left md:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Confianza</p>
          <p className="mt-1 text-xl font-semibold text-ink">{regimePreview.confidence}%</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Score compuesto</p>
            <p className="mt-2 text-5xl font-semibold leading-none text-ink md:text-6xl">{regimePreview.score}</p>
          </div>
          <p className="max-w-[12rem] text-right text-sm leading-6 text-muted">
            Volatilidad, rotación y flujos organizados en una lectura común.
          </p>
        </div>
        <div className="mt-5 h-2 border border-line bg-panelSoft">
          <div className="h-full bg-[#a86464]" style={{ width: `${regimePreview.score}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.12em] text-muted">
          <span>Cautela</span>
          <span>Neutral</span>
          <span>Riesgo</span>
        </div>
      </div>

      <div className="mt-7 grid gap-3 md:grid-cols-3">
        {regimePreview.readings.map((reading) => (
          <div key={reading} className="border-l border-brass/60 bg-panelSoft px-4 py-3">
            <p className="text-sm font-semibold leading-5 text-ink">{reading}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-muted">
        FedWatch queda como contexto pendiente hasta confirmar fuente automatizada estable.
      </p>
    </div>
  );
}

function SectorMiniChart() {
  const maxAbs = Math.max(...sectorPreviewRows.map((row) => Math.abs(row.value)), 1);

  return (
    <div className="border border-line bg-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Rotación sectorial</p>
          <h3 className="mt-2 font-semibold text-ink">Mapa relativo 1W</h3>
        </div>
        <span className="border border-line bg-panelSoft px-2.5 py-1 text-xs font-semibold text-muted">Alpha Vantage</span>
      </div>
      <div className="mt-5 grid gap-2">
        {sectorPreviewRows.map((row) => {
          const width = Math.max((Math.abs(row.value) / maxAbs) * 46, 2);
          const isPositive = row.value > 0;
          const fill = isPositive ? "#6f8f7b" : "#a86464";

          return (
            <div key={row.ticker} className="grid grid-cols-[minmax(6.5rem,0.8fr)_1fr_3.4rem] items-center gap-3 text-xs">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{row.name}</p>
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted">{row.ticker}</p>
              </div>
              <svg viewBox="0 0 100 12" className="h-5 w-full" preserveAspectRatio="none" aria-hidden="true">
                <line x1="4" x2="96" y1="6" y2="6" stroke="#e7e2dc" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
                <line x1="50" x2="50" y1="1" y2="11" stroke="#b8b2aa" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                <rect
                  x={isPositive ? 50 : 50 - width}
                  y="4"
                  width={width}
                  height="4"
                  rx="1.2"
                  fill={fill}
                />
              </svg>
              <span className={isPositive ? "text-right font-semibold text-[#47604f]" : "text-right font-semibold text-[#7b3f3f]"}>
                {formatPreviewPercent(row.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VixMiniPanel() {
  return (
    <div className="border border-line bg-panel p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">VIX</p>
          <h3 className="mt-3 text-5xl font-semibold leading-none text-ink">19.9</h3>
          <p className="mt-3 text-sm font-semibold text-ink">Vigilancia</p>
        </div>
        <span className="border border-[#b6905b]/40 bg-[#b6905b]/10 px-2.5 py-1 text-xs font-semibold text-[#76562d]">
          Subiendo
        </span>
      </div>
      <p className="mt-4 max-w-sm text-sm leading-6 text-muted">
        Volatilidad implícita en zona de mayor sensibilidad, sin lectura direccional por sí sola.
      </p>
      <svg viewBox="0 0 100 46" className="mt-6 h-28 w-full" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2="100" y1="10" y2="10" stroke="#eee9e3" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
        <line x1="0" x2="100" y1="38" y2="38" stroke="#e7e2dc" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        <path d={sparklinePath(vixPreviewSeries, 100, 46)} fill="none" stroke="#6f8f7b" strokeWidth="2.1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-3 flex justify-between border-t border-line pt-3 text-xs leading-5 text-muted">
        <span>FRED VIXCLS</span>
        <span>Último cierre</span>
      </div>
    </div>
  );
}

function BtcFlowsMiniPanel() {
  const maxAbs = Math.max(...btcFlowPreview.map((value) => Math.abs(value)), 1);
  const barWidth = 100 / btcFlowPreview.length;

  return (
    <div className="border border-line bg-panel p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">BTC ETF flows</p>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-3xl font-semibold leading-none text-ink">-83M</h3>
          <p className="mt-2 text-sm font-semibold text-ink">Último flujo neto</p>
        </div>
        <div className="text-right text-xs leading-5 text-muted">
          <p>5D -1.393M</p>
          <p>Racha: 3 salidas</p>
        </div>
      </div>
      <svg viewBox="0 0 100 44" className="mt-5 h-20 w-full" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2="100" y1="22" y2="22" stroke="#d8d1c8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        {btcFlowPreview.map((value, index) => {
          const magnitude = Math.max((Math.abs(value) / maxAbs) * 18, 0.7);
          const x = index * barWidth + 0.8;
          const y = value >= 0 ? 22 - magnitude : 22;
          const fill = value > 0 ? "#6f8f7b" : value < 0 ? "#a86464" : "#a8a29e";

          return <rect key={`${value}-${index}`} x={x} y={y} width={Math.max(barWidth - 1.6, 2)} height={magnitude} rx="0.9" fill={fill} />;
        })}
      </svg>
      <p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-muted">Bitbo · según disponibilidad de la fuente</p>
    </div>
  );
}

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-line bg-panel">
        <div className="mx-auto grid min-h-[560px] max-w-7xl grid-cols-1 px-5 py-14 md:min-h-[650px] md:py-20 lg:grid-cols-[0.7fr_1fr] lg:items-center">
          <div className="relative z-20 max-w-2xl">
            <h1 className="text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">
              Herramientas para invertir con más criterio y menos impulso
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-muted md:text-lg">
              Entiende el contexto. Gestiona el riesgo. Toma decisiones basadas en datos, no en ruido.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/dashboard" className="border border-ink bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink">
                Explorar dashboard
              </Link>
              <Link href="/diagnostico" className="border border-line bg-panel px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-ink">
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
        <div className="mx-auto max-w-7xl px-5 py-14 md:py-16">
          <div className="grid gap-6 lg:grid-cols-[0.56fr_0.44fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Market Regime Dashboard</p>
              <h2 className="mt-4 max-w-2xl text-2xl font-semibold leading-tight text-ink md:text-3xl">Lectura diaria del régimen de mercado</h2>
            </div>
            <p className="max-w-xl leading-7 text-muted lg:justify-self-end">
              Volatilidad, rotación sectorial y flujos institucionales organizados en una lectura clara del contexto.
            </p>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <RegimePreviewPanel />
            <div className="grid gap-5">
              <SectorMiniChart />
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <VixMiniPanel />
                <BtcFlowsMiniPanel />
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
            <p className="max-w-2xl text-sm leading-6 text-muted">
              Lectura educativa de contexto. No es recomendación de inversión, no elige activos y no anticipa retornos futuros.
            </p>
            <Link href="/dashboard" className="w-fit border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink">
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
            <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
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
