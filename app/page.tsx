import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { ToolCard } from "@/components/ui/ToolCard";
import { TypewriterPrinciples } from "@/components/home/TypewriterPrinciples";
import { getHomeDashboardPreviewData } from "@/lib/dashboard/get-home-dashboard-preview-data";
import { displayStatTicker } from "@/lib/statistical-levels/display";
import { getStatisticalLevelsManifest } from "@/lib/statistical-levels/get-statistical-levels-data";
import type { BtcEtfFlowsDashboardData, RegimeBias, RegimeSignal, RegimeSummary, SectorRotationData, VixDashboardData } from "@/lib/dashboard/types";

const principles = [
  ["Entender el contexto", "Leer el tablero antes de mover la ficha."],
  ["Gestionar el riesgo", "Primero proteger el margen de error. Después buscar rendimiento."],
  ["Decidir con criterio", "Menos reacción. Más método."],
];

const entryways = [
  {
    title: "Leer el mercado",
    label: "01",
    href: "/mercado",
    description: "Contexto, régimen y niveles para entender el terreno.",
  },
  {
    title: "Conocer mi perfil",
    label: "02",
    href: "/diagnostico",
    description: "Riesgo, horizonte, sesgos y capacidad antes de mover capital.",
  },
  {
    label: "03",
    title: "Investigar estrategias",
    href: "/investigacion/td3",
    description: "Modelos y backtests puestos a prueba con método.",
  },
  {
    label: "04",
    title: "Proteger capital",
    href: "/proteccion",
    description: "Filtros y checklist para cuidar el margen de error.",
  },
  {
    label: "05",
    title: "Explorar tendencias",
    href: "/tendencias",
    description: "Cambios del mundo convertidos en hipótesis educativas.",
  },
  {
    title: "Usar recursos gratuitos",
    label: "06",
    href: "/recursos",
    description: "Scripts y herramientas públicas para tu proceso.",
  },
];

const homePathways = [
  {
    title: "Empezar simple",
    href: "/empezar",
    label: "Camino 01",
    description: "Ordena lo esencial antes de métricas, modelos o informes avanzados.",
    cta: "Entrar al camino simple",
  },
  {
    title: "Modo inversionista",
    href: "/inversionista",
    label: "Camino 02",
    description: "Explora dashboard, informes de mercado, niveles, tendencias e investigación quant.",
    cta: "Entrar al modo inversionista",
  },
];

function formatPreviewPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatPreviewPercentile(value: number | null | undefined) {
  return value === null || value === undefined ? "n/d" : value.toFixed(1);
}

function formatPreviewNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "n/d" : value.toFixed(2);
}

function formatCompactUsdMillions(value: number | null) {
  if (value === null) return "Pendiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}M`;
}

const riskBiasLabels: Record<RegimeBias, string> = {
  favorable: "Favorable",
  neutral: "Neutral",
  cautious: "Cauteloso",
  stress: "Estrés",
};

function sparklinePath(values: number[], width = 100, height = 40) {
  if (values.length === 0) return "";

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

function getPreviewSignals(regimeSummary: RegimeSummary) {
  const primarySignals = regimeSummary.cautionSignals.length > 0 ? regimeSummary.cautionSignals : regimeSummary.riskSupportSignals;
  return primarySignals.slice(0, 3);
}

function RegimePreviewPanel({ regimeSummary }: { regimeSummary: RegimeSummary }) {
  const signals = getPreviewSignals(regimeSummary);
  const scoreWidth = `${Math.max(0, Math.min(regimeSummary.regimeScore, 100))}%`;

  return (
    <div className="rounded-[6px] border border-petrol/25 bg-white/80 p-4 shadow-[0_18px_48px_rgba(11,52,54,0.07)] md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Régimen integrado</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <span className="inline-flex rounded-[4px] border border-petrol/35 bg-[#eef5f2] px-4 py-2 text-sm font-semibold text-petrol">
              {regimeSummary.current}
            </span>
            <span className="pb-1 text-sm text-muted">Sesgo {riskBiasLabels[regimeSummary.bias].toLowerCase()}</span>
          </div>
        </div>
        <div className="text-left md:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Confianza</p>
          <p className="mt-1 text-xl font-semibold text-ink">{regimeSummary.confidence}%</p>
        </div>
      </div>

      <div className="mt-6 md:mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Score compuesto</p>
            <p className="mt-2 text-4xl font-semibold leading-none text-ink md:text-6xl">{regimeSummary.regimeScore}</p>
          </div>
          <p className="max-w-[11rem] text-right text-xs leading-5 text-muted md:text-sm md:leading-6">
            Resumen del régimen actual con las mismas lecturas del dashboard.
          </p>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full border border-line bg-panelSoft">
          <div className="h-full bg-danger" style={{ width: scoreWidth }} />
        </div>
        <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.12em] text-muted">
          <span>Cautela</span>
          <span>Neutral</span>
          <span>Riesgo</span>
        </div>
      </div>

      <div className="mt-5 grid gap-2 md:mt-7 md:grid-cols-3 md:gap-3">
        {signals.map((signal: RegimeSignal, index) => (
          <div key={`${signal.label}-${index}`} className="rounded-[4px] border-l border-petrol/55 bg-paper px-3 py-2.5 md:px-4 md:py-3">
            <p className="text-sm font-semibold leading-5 text-ink">{signal.label}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{signal.detail}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm leading-6 text-muted">{regimeSummary.interpretation}</p>
      <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-muted">
        {regimeSummary.dataQualityNote}
      </p>
      <div className="mt-6">
        <StatisticalLevelsMiniPanel />
      </div>
    </div>
  );
}

function SectorMiniChart({ data }: { data: SectorRotationData | null }) {
  const rows = data
    ? [
        ...[...data.sectors].sort((a, b) => b.return1w - a.return1w).slice(0, 3),
        ...[...data.sectors].sort((a, b) => a.return1w - b.return1w).slice(0, 3),
      ].map((sector) => ({
        name: sector.sectorName,
        ticker: sector.etfTicker,
        value: sector.return1w,
      }))
    : [];
  const maxAbs = Math.max(...rows.map((row) => Math.abs(row.value)), 1);

  return (
    <div className="rounded-[6px] border border-line bg-white/80 p-4 shadow-[0_12px_32px_rgba(11,52,54,0.045)] md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Rotación sectorial</p>
          <h3 className="mt-2 font-semibold text-ink">Mapa relativo 1W</h3>
        </div>
        <span className="rounded-[4px] border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-muted">
          {data?.dataStatus === "automated" ? "Alpha Vantage" : "Fallback"}
        </span>
      </div>
      <div className="mt-5 grid gap-2">
        {rows.map((row) => {
          const width = Math.max((Math.abs(row.value) / maxAbs) * 46, 2);
          const isPositive = row.value > 0;
          const fill = isPositive ? "#6F8F82" : "#8A4E45";

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
      <p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-muted">
        {data?.metrics.interpretation ?? "Rotación sectorial temporalmente no disponible."}
      </p>
    </div>
  );
}

function VixMiniPanel({ data }: { data: VixDashboardData | null }) {
  const spot = data?.spot;
  const latestVix = spot?.latestVix;
  const history = spot?.history.map((point) => point.value).slice(-24) ?? [];
  const path = sparklinePath(history, 100, 46);
  const trendLabel = spot?.vixTrend === "rising_fast" ? "Subiendo rápido" : spot?.vixTrend === "rising" ? "Subiendo" : spot?.vixTrend === "falling" ? "Bajando" : "Estable";

  return (
    <div className="rounded-[6px] border border-line bg-white/80 p-4 shadow-[0_12px_32px_rgba(11,52,54,0.045)] md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">VIX</p>
          <h3 className="mt-3 text-4xl font-semibold leading-none text-ink md:text-5xl">{latestVix === null || latestVix === undefined ? "--" : latestVix.toFixed(1)}</h3>
          <p className="mt-3 text-sm font-semibold text-ink">{spot?.vixCompositeLabel ?? "Dato pendiente"}</p>
        </div>
        <span className="rounded-[4px] border border-brass/35 bg-[#f7f0e2] px-2.5 py-1 text-xs font-semibold text-brass">
          {trendLabel}
        </span>
      </div>
      <p className="mt-4 max-w-sm text-sm leading-6 text-muted">
        {spot?.vixCompositeSubtext ?? "Volatilidad implícita pendiente de actualización."}
      </p>
      <svg viewBox="0 0 100 46" className="mt-5 h-20 w-full md:mt-6 md:h-28" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2="100" y1="10" y2="10" stroke="#eee9e3" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
        <line x1="0" x2="100" y1="38" y2="38" stroke="#e7e2dc" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        {path ? <path d={path} fill="none" stroke="#6F8F82" strokeWidth="2.1" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      <div className="mt-3 flex justify-between border-t border-line pt-3 text-xs leading-5 text-muted">
        <span>FRED VIXCLS</span>
        <span>{spot?.dataStatus === "automated" ? "Último cierre" : "Fallback"}</span>
      </div>
    </div>
  );
}

function BtcFlowsMiniPanel({ data }: { data: BtcEtfFlowsDashboardData | null }) {
  const flows = data?.flows;
  const history = flows?.history.map((point) => point.totalNetFlow).slice(-12) ?? [];
  const maxAbs = Math.max(...history.map((value) => Math.abs(value)), 1);
  const barWidth = history.length > 0 ? 100 / history.length : 100;

  return (
    <div className="rounded-[6px] border border-line bg-white/80 p-4 shadow-[0_12px_32px_rgba(11,52,54,0.045)] md:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">BTC ETF flows</p>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-3xl font-semibold leading-none text-ink">{formatCompactUsdMillions(flows?.latestTotalNetFlow ?? null)}</h3>
          <p className="mt-2 text-sm font-semibold text-ink">Último flujo neto</p>
        </div>
        <div className="text-right text-xs leading-5 text-muted">
          <p>5D {formatCompactUsdMillions(flows?.rolling5dNetFlow ?? null)}</p>
          <p>{flows?.flowStreak.label ?? "Racha pendiente"}</p>
        </div>
      </div>
      <svg viewBox="0 0 100 44" className="mt-5 h-20 w-full" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2="100" y1="22" y2="22" stroke="#d8d1c8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        {history.map((value, index) => {
          const magnitude = Math.max((Math.abs(value) / maxAbs) * 18, 0.7);
          const x = index * barWidth + 0.8;
          const y = value >= 0 ? 22 - magnitude : 22;
          const fill = value > 0 ? "#6F8F82" : value < 0 ? "#8A4E45" : "#a8a29e";

          return <rect key={`${value}-${index}`} x={x} y={y} width={Math.max(barWidth - 1.6, 2)} height={magnitude} rx="0.9" fill={fill} />;
        })}
      </svg>
      <p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-muted">
        {flows ? `${flows.sourceName} · ${flows.readingLabel}` : "Fuente temporalmente no disponible"}
      </p>
    </div>
  );
}

async function StatisticalLevelsMiniPanel() {
  const manifest = await getStatisticalLevelsManifest();
  const byTicker = new Map(manifest.summaries.map((asset) => [asset.ticker, asset]));
  const assets = ["SPY", "GLD", "BTCUSD", "ETHUSD"].map((ticker) => {
    const asset = byTicker.get(ticker);
    return {
      ticker: displayStatTicker(ticker),
      percentile: asset?.extension.percentile5Y ?? null,
      zScore: asset?.extension.zScore5Y ?? null,
      distance: asset?.distanceToMovingAverages.ma200 ?? null,
    };
  });

  return (
    <div className="rounded-[6px] border border-line bg-white/80 p-4 shadow-[0_12px_32px_rgba(11,52,54,0.045)] md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Niveles estadísticos</p>
          <h3 className="mt-2 font-semibold text-ink">Posición actual frente a su propio historial</h3>
        </div>
        <Link href="/niveles-estadisticos" className="shrink-0 text-xs font-semibold text-petrol underline-offset-4 hover:underline">
          Abrir laboratorio
        </Link>
      </div>

      <div className="mt-5 grid gap-3">
        {assets.map((asset) => (
          <div key={asset.ticker} className="grid gap-2 border-b border-line/70 pb-3 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-ink">{asset.ticker}</span>
              <span className="text-xs text-muted">Percentil {formatPreviewPercentile(asset.percentile)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full border border-line bg-panelSoft">
              <div className="h-full bg-sage" style={{ width: `${asset.percentile ?? 0}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-muted">
              <span>z-score <strong className="font-semibold text-ink">{formatPreviewNumber(asset.zScore)}</strong></span>
              <span className="text-right">media larga <strong className="font-semibold text-ink">{asset.distance === null ? "n/d" : formatPreviewPercent(asset.distance)}</strong></span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-muted">
        Vista resumida del laboratorio. Las lecturas comparan cada activo contra su propio historial y no representan una instrucción de inversión.
      </p>
    </div>
  );
}

export default async function Home() {
  const { btcEtfFlows, regimeSummary, sectorRotation, vix } = await getHomeDashboardPreviewData();

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line bg-paper">
        <div className="mx-auto grid min-h-[470px] max-w-7xl grid-cols-1 px-4 py-10 md:min-h-[650px] md:px-5 md:py-20 lg:grid-cols-[0.7fr_1fr] lg:items-center">
          <div className="relative z-20 max-w-2xl">
            <p className="mb-4 w-fit rounded-full border border-petrol/20 bg-white/65 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-petrol">
              Criterio quant para inversores
            </p>
            <h1 className="text-3xl font-semibold leading-[1.04] text-ink sm:text-4xl md:text-6xl">
              Antes de invertir, entiende cómo respira el mercado
            </h1>
            <TypewriterPrinciples />
            <p className="mt-5 max-w-xl text-sm leading-6 text-muted">
              Herramientas educativas para inversionistas: presupuesto, deudas, diagnóstico, protección, mercado e investigación cuantitativa.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap md:mt-8 md:gap-4">
              <Link href="/mercado" className="inline-flex w-full items-center justify-center rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(11,52,54,0.14)] transition hover:bg-panel hover:text-petrol sm:w-auto md:px-5">
                Leer el mercado
              </Link>
              <Link href="/diagnostico" className="inline-flex w-full items-center justify-center rounded-[4px] border border-petrol/25 bg-white/70 px-4 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol hover:bg-white sm:w-auto md:px-5">
                Diagnosticar mi perfil
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
            <div className="absolute inset-0 bg-gradient-to-t from-paper/10 via-paper/45 to-paper md:bg-gradient-to-r md:from-paper md:via-paper/82 md:via-45% md:to-paper/10" />
            <div className="absolute inset-y-0 left-0 w-1/3 bg-paper/55 md:w-1/2 md:bg-paper/35" />
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white/70">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-5 md:py-10 lg:grid-cols-[0.34fr_1fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">Dos caminos</p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-ink">Elige el nivel de lectura</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Puedes empezar por lo esencial o entrar directo a las herramientas avanzadas. Ambos caminos son educativos y no guardan respuestas.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {homePathways.map((pathway) => (
              <Link key={pathway.href} href={pathway.href} className="group flex min-h-[13rem] flex-col rounded-[6px] border border-line bg-white/75 p-5 shadow-[0_12px_32px_rgba(11,52,54,0.045)] transition hover:border-petrol hover:bg-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{pathway.label}</p>
                <h3 className="mt-4 text-2xl font-semibold leading-tight text-ink">{pathway.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{pathway.description}</p>
                <span className="mt-auto pt-6 text-sm font-semibold text-petrol transition group-hover:translate-x-0.5">{pathway.cta} &rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white/55">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-7 md:grid-cols-[0.35fr_1fr_0.95fr] md:items-start md:px-5 md:py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">Nuestra filosofía</p>
          <p className="text-lg leading-7 text-ink md:text-2xl md:leading-8">
            El mercado cambia rápido. El riesgo también. La ventaja está en ordenar la información antes de decidir.
          </p>
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

      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-5 md:py-12">
          <div className="grid gap-6 lg:grid-cols-[0.28fr_1fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">Puertas de entrada</p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight text-ink">Elige por dónde entrar</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 md:gap-5 xl:grid-cols-6">
              {entryways.map((tool) => <ToolCard key={tool.href} {...tool} />)}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-[#f3efe6]">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-16">
          <div className="grid gap-6 lg:grid-cols-[0.56fr_0.44fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">Market Regime Dashboard</p>
              <h2 className="mt-4 max-w-2xl text-2xl font-semibold leading-tight text-ink md:text-3xl">Lectura diaria del régimen de mercado</h2>
            </div>
            <p className="max-w-xl leading-7 text-muted lg:justify-self-end">
              Resumen del régimen actual con las mismas lecturas del dashboard.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:mt-9 md:gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <RegimePreviewPanel regimeSummary={regimeSummary} />
            <div className="grid gap-4 md:gap-5">
              <SectorMiniChart data={sectorRotation} />
              <div className="grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-1 xl:grid-cols-2">
                <VixMiniPanel data={vix} />
                <BtcFlowsMiniPanel data={btcEtfFlows} />
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
            <p className="max-w-2xl text-sm leading-6 text-muted">
              Lectura educativa de contexto. No es recomendación de inversión, no elige activos y no anticipa retornos futuros.
            </p>
            <Link href="/dashboard" className="w-fit rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol">
              Ver dashboard de mercado
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-9 md:grid-cols-4 md:gap-5 md:px-5 md:py-12">
          <Link href="/mercado" className="rounded-[6px] border border-line bg-white/75 p-4 shadow-[0_10px_28px_rgba(11,52,54,0.035)] transition hover:border-petrol md:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Mercado</p>
            <h2 className="mt-3 text-xl font-semibold text-ink">Régimen, niveles e informes de mercado</h2>
          </Link>
          <Link href="/investigacion/td3" className="rounded-[6px] border border-line bg-white/75 p-4 shadow-[0_10px_28px_rgba(11,52,54,0.035)] transition hover:border-petrol md:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Investigación</p>
            <h2 className="mt-3 text-xl font-semibold text-ink">Protocolo DRL y evidencia reproducible</h2>
          </Link>
          <Link href="/proteccion" className="rounded-[6px] border border-line bg-white/75 p-4 shadow-[0_10px_28px_rgba(11,52,54,0.035)] transition hover:border-petrol md:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Protección</p>
            <h2 className="mt-3 text-xl font-semibold text-ink">Checklist antes de entregar capital</h2>
          </Link>
          <Link href="/tendencias" className="rounded-[6px] border border-line bg-white/75 p-4 shadow-[0_10px_28px_rgba(11,52,54,0.035)] transition hover:border-petrol md:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Tendencias</p>
            <h2 className="mt-3 text-xl font-semibold text-ink">Del cambio global a una hipótesis educativa</h2>
          </Link>
        </div>
      </section>
    </div>
  );
}
export const metadata: Metadata = {
  title: "Herramientas para inversionistas | Riesgo, mercado y finanzas personales",
  description: "Herramientas educativas para ordenar presupuesto, deudas, perfil de riesgo, protección del capital, informes de mercado, dashboard, niveles estadísticos e investigación cuantitativa.",
  alternates: { canonical: "/", languages: { es: "/", en: "/en", "x-default": "/" } },
};
