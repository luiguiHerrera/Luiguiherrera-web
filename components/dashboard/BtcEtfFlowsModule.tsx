import { dataStatusLabels } from "@/lib/dashboard/status";
import { ExpandableInsightCard } from "@/components/ui/ExpandableInsightCard";
import type { BtcEtfFlowPoint, BtcEtfFlowsDashboardData, BtcEtfFlowsData, BtcEtfFundFlow } from "@/lib/dashboard/types";

type BtcEtfFlowsModuleProps = {
  data: BtcEtfFlowsDashboardData;
};

function formatUsdMillions(value: number | null) {
  if (value === null) return "Dato pendiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)} M USD`;
}

function formatRollingFlow(value: number | null) {
  return value === null ? "Historial insuficiente" : formatUsdMillions(value);
}

function formatPositiveFundFlow(flow: BtcEtfFundFlow | null) {
  return flow ? `${flow.ticker} ${formatUsdMillions(flow.flow)}` : "Sin entradas positivas";
}

function formatNegativeFundFlow(flow: BtcEtfFundFlow | null) {
  return flow ? `${flow.ticker} ${formatUsdMillions(flow.flow)}` : "Sin salidas negativas";
}

function positiveNegativeDaysLabel(flows: BtcEtfFlowsData) {
  const sessions = Math.min(flows.rowsParsed, 10);
  const suffix = flows.rowsParsed >= 10 ? "últimas 10 sesiones" : `${sessions} sesiones disponibles`;
  return `${flows.positiveDaysLast10} positivas / ${flows.negativeDaysLast10} negativas · ${suffix}`;
}

function severityClass(severity: BtcEtfFlowsData["readingSeverity"]) {
  if (severity === "positive") return "border-[#6f8f7b]/40 bg-[#6f8f7b]/10 text-[#47604f]";
  if (severity === "negative") return "border-[#a86464]/40 bg-[#a86464]/10 text-[#7b3f3f]";
  if (severity === "pending") return "border-[#b6905b]/40 bg-[#b6905b]/10 text-[#76562d]";
  return "border-[#a8a29e]/40 bg-[#a8a29e]/10 text-[#5f5a54]";
}

function levelLabel(level: BtcEtfFlowsData["dailyLevel"]) {
  if (level === "strong_inflow") return "Entrada fuerte";
  if (level === "moderate_inflow") return "Entrada moderada";
  if (level === "moderate_outflow") return "Salida moderada";
  if (level === "strong_outflow") return "Salida fuerte";
  if (level === "pending") return "Datos pendientes";
  return "Neutro";
}

function trendLabel(trend: BtcEtfFlowsData["recentTrend"]) {
  if (trend === "sustained_accumulation") return "Acumulación sostenida";
  if (trend === "moderate_inflows") return "Entradas moderadas";
  if (trend === "moderate_outflows") return "Salidas moderadas";
  if (trend === "outflow_pressure") return "Presión de salidas";
  if (trend === "pending") return "Datos pendientes";
  return "Mixto";
}

function windowDirectionLabel(value: number | null) {
  if (value === null) return "historial insuficiente";
  if (value > 0) return "positivo";
  if (value < 0) return "negativo";
  return "neutral";
}

function recentWindowsLabel(flows: BtcEtfFlowsData) {
  return `5D ${windowDirectionLabel(flows.rolling5dNetFlow)} · 20D ${windowDirectionLabel(flows.rolling20dNetFlow)}`;
}

function buildBarPath(history: BtcEtfFlowPoint[]) {
  const maxAbs = Math.max(...history.map((point) => Math.abs(point.totalNetFlow)), 1);
  const cumulative = history.reduce<number[]>((acc, point) => {
    const previous = acc.at(-1) ?? 0;
    acc.push(previous + point.totalNetFlow);
    return acc;
  }, []);
  const cumulativeMin = cumulative.length ? Math.min(...cumulative) : 0;
  const cumulativeMax = cumulative.length ? Math.max(...cumulative) : 0;
  const cumulativeRange = Math.max(cumulativeMax - cumulativeMin, 1);
  const cumulativePath = cumulative
    .map((value, index) => {
      const x = history.length <= 1 ? 50 : (index / (history.length - 1)) * 100;
      const y = 10 + (1 - (value - cumulativeMin) / cumulativeRange) * 28;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return { cumulativePath, maxAbs };
}

function FlowBarChart({ history }: { history: BtcEtfFlowPoint[] }) {
  const { cumulativePath, maxAbs } = buildBarPath(history);
  const width = 100;
  const height = 62;
  const gap = 0.8;
  const barWidth = history.length ? Math.max((width - gap * (history.length - 1)) / history.length, 1.2) : 1.2;

  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">Últimas sesiones</p>
          <h3 className="mt-1 text-sm font-semibold text-ink">Flujo neto diario y acumulado disponible</h3>
        </div>
        <p className="max-w-[12rem] text-right text-xs leading-5 text-muted">US$ millones, según disponibilidad de la fuente</p>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-56 w-full" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2="100" y1="38" y2="38" stroke="#d8d1c8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        {cumulativePath ? <path d={cumulativePath} fill="none" stroke="#7d8f9a" strokeWidth="1.4" vectorEffect="non-scaling-stroke" /> : null}
        {history.map((point, index) => {
          const magnitude = (Math.abs(point.totalNetFlow) / maxAbs) * 20;
          const x = index * (barWidth + gap);
          const isPositive = point.totalNetFlow > 0;
          const y = isPositive ? 38 - magnitude : 38;
          const fill = isPositive ? "#6f8f7b" : point.totalNetFlow < 0 ? "#a86464" : "#a8a29e";

          return (
            <rect
              key={`${point.date}-${index}`}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(magnitude, 0.8)}
              rx="1"
              fill={fill}
            />
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>-{history.length} sesiones</span>
        <span>Última fecha</span>
      </div>
    </div>
  );
}

export function BtcEtfFlowsModule({ data }: BtcEtfFlowsModuleProps) {
  const flows = data.flows;
  const metrics = [
    ["Rolling 5D", formatUsdMillions(flows.rolling5dNetFlow)],
    ["Rolling 20D", formatRollingFlow(flows.rolling20dNetFlow)],
    ["Racha actual", flows.flowStreak.label],
    ["Días positivos / negativos", positiveNegativeDaysLabel(flows)],
    ["Mayor aporte positivo", formatPositiveFundFlow(flows.largestInflowFundLatestDay)],
    ["Mayor aporte negativo", formatNegativeFundFlow(flows.largestOutflowFundLatestDay)],
  ];

  return (
    <ExpandableInsightCard
      eyebrow="BTC ETF flows"
      title="Presión de flujos vía ETFs"
      reading={flows.readingSubtext}
      status={dataStatusLabels[flows.dataStatus]}
      metrics={[
        { label: "Último flujo neto", value: formatUsdMillions(flows.latestTotalNetFlow), tone: flows.readingSeverity === "positive" ? "sage" : flows.readingSeverity === "negative" ? "danger" : "brass" },
        { label: "Lectura", value: flows.readingLabel },
        { label: "Rolling 5D", value: formatUsdMillions(flows.rolling5dNetFlow) },
        { label: "Racha", value: flows.flowStreak.label },
      ]}
    >
      <div className="grid gap-8 xl:grid-cols-[0.42fr_0.58fr] xl:items-start">
        <div className="border border-line bg-panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Lectura ampliada</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Lectura basada en flujos netos diarios y acumulados recientes. Última fecha detectada: {flows.latestDate}.
          </p>
          <div className="mt-5 grid gap-x-5 gap-y-4 border-y border-line py-4 sm:grid-cols-2">
            {metrics.map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <FlowBarChart history={flows.history} />
      </div>

      <div className="mt-6 grid gap-4 border-t border-line pt-5 text-sm leading-6 text-muted lg:grid-cols-3">
        <div>
          <span className="block text-sm font-semibold text-ink">Driver dominante</span>
          <p className="mt-2">{flows.dominantFlowDriver}</p>
          <p className="mt-2 text-xs">{levelLabel(flows.dailyLevel)} · {recentWindowsLabel(flows)}</p>
        </div>
        <div>
          <span className="block text-sm font-semibold text-ink">Breadth último día</span>
          <p className="mt-2">
            {flows.breadth.positive} con entrada · {flows.breadth.negative} con salida · {flows.breadth.flatOrMissing} sin dato o sin cambio
          </p>
        </div>
        <div>
          <span className="block text-sm font-semibold text-ink">Lectura resumida</span>
          <p className="mt-2">{flows.interpretation.how}</p>
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">
        <span className="font-semibold text-ink">Qué NO significa: </span>
        {flows.interpretation.whatItDoesNotMean}
      </div>

      <div className="mt-4 grid gap-3 border-t border-line pt-4 text-sm leading-6 text-muted md:grid-cols-3">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Fuente</span>
          {flows.sourceUrl ? (
            <a href={flows.sourceUrl} className="mt-1 inline-block text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
              {flows.sourceName}
            </a>
          ) : (
            <span className="mt-1 block text-ink">{flows.sourceName}</span>
          )}
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Actualización</span>
          <span className="mt-1 block text-ink">{flows.lastUpdated}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Estado</span>
          <span className="mt-1 block text-ink">{dataStatusLabels[flows.dataStatus]}</span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-muted">{flows.reliabilityNote}</p>
    </ExpandableInsightCard>
  );
}
