import { ExpandableInsightCard } from "@/components/ui/ExpandableInsightCard";
import type { VixTermStructureData, VixTermStructurePoint, VixTermStructureSourceStatus } from "@/lib/dashboard/types";

type VixTermStructureModuleProps = {
  data: VixTermStructureData;
};

const sourceStatusLabels: Record<VixTermStructureSourceStatus, string> = {
  automated: "Datos automatizados",
  manual_fallback: "Fallback manual",
  pending: "Fuente pendiente",
  unavailable: "No disponible",
};

function formatPointValue(value: number | null) {
  return value === null ? "Pendiente" : value.toFixed(2);
}

function formatSpread(value: number | null) {
  if (value === null) return "Pendiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} pts`;
}

function formatSlope(value: number | null) {
  if (value === null) return "Pendiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function classificationClass(classification: VixTermStructureData["classification"]) {
  const normalized = classification.toLowerCase();
  if (normalized.includes("backwardation")) return "border-[#a86464]/40 bg-[#a86464]/10 text-[#7b3f3f]";
  if (normalized.includes("contango")) return "border-[#6f8f7b]/40 bg-[#6f8f7b]/10 text-[#47604f]";
  if (classification === "Plano") return "border-[#b6905b]/40 bg-[#b6905b]/10 text-[#76562d]";
  return "border-[#a8a29e]/40 bg-[#a8a29e]/10 text-[#5f5a54]";
}

function buildCurvePath(points: VixTermStructurePoint[]) {
  const validPoints = points.filter((point): point is VixTermStructurePoint & { value: number } => point.value !== null);
  if (validPoints.length < 2) return "";

  const values = validPoints.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.01);
  const step = 88 / Math.max(validPoints.length - 1, 1);

  return validPoints
    .map((point, index) => {
      const x = 6 + index * step;
      const y = 44 - ((point.value - min) / range) * 30;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function TermStructureChart({ data }: { data: VixTermStructureData }) {
  const curvePath = buildCurvePath(data.points);
  const hasCurve = Boolean(curvePath);

  return (
    <div className="border border-line bg-panelSoft p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">Curva cercana</p>
          <h3 className="mt-1 text-sm font-semibold text-ink">VX1 / VX2 / VX3</h3>
        </div>
        <span className={`border px-3 py-1 text-xs font-semibold ${classificationClass(data.classification)}`}>
          {data.classification}
        </span>
      </div>

      <svg viewBox="0 0 100 54" className="mt-4 h-28 w-full" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2="100" y1="14" y2="14" stroke="#eee9e3" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
        <line x1="0" x2="100" y1="29" y2="29" stroke="#e7e2dc" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        <line x1="0" x2="100" y1="44" y2="44" stroke="#eee9e3" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
        {hasCurve ? (
          <path d={curvePath} fill="none" stroke="#6f8f7b" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        ) : (
          <text x="50" y="31" textAnchor="middle" className="fill-muted text-[4px]">
            Estructura VIX pendiente de fuente automatizada estable.
          </text>
        )}
      </svg>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {data.points.map((point) => (
          <div key={point.label} className="border border-line bg-panel px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">{point.label}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{point.symbol ?? "Pendiente"}</p>
            </div>
            <p className="mt-1 font-semibold text-ink">{formatPointValue(point.value)}</p>
            <p className="mt-1 text-xs text-muted">
              {point.contract ?? "Contrato pendiente"}
              {point.expirationDate ? ` · ${point.expirationDate}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VixTermStructureModule({ data }: VixTermStructureModuleProps) {
  const metrics = [
    ["Spread VX2-VX1", formatSpread(data.m1m2Spread)],
    ["Pendiente VX1-VX2", formatSlope(data.m1m2SlopePct)],
    ["Spread VX3-VX1", formatSpread(data.m1m3Spread)],
    ["Pendiente VX1-VX3", formatSlope(data.m1m3SlopePct)],
  ];

  return (
    <ExpandableInsightCard
      eyebrow="VIX term structure"
      title="Contango / Backwardation"
      reading={data.interpretation}
      status={sourceStatusLabels[data.sourceStatus]}
      metrics={[
        { label: "Clasificación", value: data.classification, tone: data.classification.toLowerCase().includes("backwardation") ? "danger" : data.classification.toLowerCase().includes("contango") ? "sage" : "brass" },
        { label: "Spread VX2-VX1", value: formatSpread(data.m1m2Spread) },
        { label: "Pendiente VX1-VX2", value: formatSlope(data.m1m2SlopePct) },
        { label: "Spread VX3-VX1", value: formatSpread(data.m1m3Spread) },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
        <div className="border border-line bg-panelSoft p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">VIX term structure</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">Contango / Backwardation</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            La estructura temporal del VIX compara futuros cercanos para observar si la protección inmediata se valora por encima o por debajo de vencimientos posteriores.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`border px-3 py-1 text-sm font-semibold ${classificationClass(data.classification)}`}>
              {data.classification}
            </span>
            <span className="border border-line bg-panel px-3 py-1 text-sm font-semibold text-muted">
              {sourceStatusLabels[data.sourceStatus]}
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-muted">{data.interpretation}</p>
          <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">
            Lectura contextual para ubicar la demanda relativa de protección entre vencimientos cercanos.
          </p>
        </div>

        <TermStructureChart data={data} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="border border-line bg-panelSoft p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
            <p className="mt-2 font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 text-sm leading-6 text-muted lg:grid-cols-2">
        <div className="border border-line bg-panelSoft p-3">
          <span className="block text-sm font-semibold text-ink">Qué NO significa</span>
          <p className="mt-2">{data.whatItDoesNotMean}</p>
        </div>
        <div className="border border-line bg-panelSoft p-3">
          <span className="block text-sm font-semibold text-ink">Nota de fuente</span>
          <p className="mt-2">{data.reliabilityNote}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-line pt-4 text-sm leading-6 text-muted md:grid-cols-3">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Fuente</span>
          {data.sourceUrl ? (
            <a href={data.sourceUrl} className="mt-1 inline-block text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
              {data.source}
            </a>
          ) : (
            <span className="mt-1 block text-ink">{data.source}</span>
          )}
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Actualización</span>
          <span className="mt-1 block text-ink">{data.lastUpdated ?? "Pendiente"}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Estado</span>
          <span className="mt-1 block text-ink">{sourceStatusLabels[data.sourceStatus]}</span>
        </div>
      </div>
    </ExpandableInsightCard>
  );
}
