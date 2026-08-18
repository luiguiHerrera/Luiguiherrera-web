import type { TomDecayContent } from "@/lib/research/tom-decay/content";

const WIDTH = 1000;
const HEIGHT = 260;
const BASELINE = 206;
const LEFT = 26;
const RIGHT = 974;
const START_YEAR = 1950;
const END_YEAR = 2026;

const yearToX = (year: number) =>
  LEFT + ((year - START_YEAR) / (END_YEAR - START_YEAR)) * (RIGHT - LEFT);

function envelope(progress: number) {
  const plateau = 1 - 0.16 * progress;
  const collapse = 1 / (1 + Math.exp((progress - 0.68) * 13));
  const texture = 0.055 * Math.sin(progress * 21) + 0.035 * Math.sin(progress * 8.5 + 1.2);
  return Math.max(0, plateau * collapse + texture * collapse);
}

function ribbonPoints(samples: number) {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const progress = index / samples;
    const amplitude = envelope(progress);
    const x = LEFT + progress * (RIGHT - LEFT);
    const center = BASELINE - amplitude * 150;
    const spread = 6 + amplitude * 26;
    return { x, center, high: center - spread, low: Math.min(BASELINE + 4, center + spread) };
  });
}

const points = ribbonPoints(160);

const line = points
  .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.center.toFixed(1)}`)
  .join(" ");

const band = `${points
  .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.high.toFixed(1)}`)
  .join(" ")} ${[...points]
  .reverse()
  .map((point) => `L${point.x.toFixed(1)} ${point.low.toFixed(1)}`)
  .join(" ")} Z`;

const ghost = points
  .map((point, index) => {
    const progress = index / (points.length - 1);
    const y = BASELINE - (1 - 0.2 * progress) * 150;
    return `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${y.toFixed(1)}`;
  })
  .join(" ");

export function DecayRibbon({ ribbon }: { ribbon: TomDecayContent["hero"]["ribbon"] }) {
  return (
    <figure className="mt-8 min-w-0">
      <svg
        aria-label={ribbon.note}
        className="h-auto w-full"
        role="img"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      >
        <defs>
          <linearGradient id="tom-ribbon-fill" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#0B3436" stopOpacity="0.24" />
            <stop offset="58%" stopColor="#6F8F82" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#9A7A44" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="tom-ribbon-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#0B3436" />
            <stop offset="62%" stopColor="#3F6058" />
            <stop offset="100%" stopColor="#9A7A44" />
          </linearGradient>
        </defs>

        <line
          stroke="#D8D2C8"
          strokeWidth="1"
          x1={LEFT}
          x2={RIGHT}
          y1={BASELINE}
          y2={BASELINE}
        />

        {ribbon.markers.map((marker) => (
          <g className="tom-decay-ribbon-tick" key={marker.year}>
            <line
              stroke="#0B3436"
              strokeDasharray="2 4"
              strokeOpacity="0.28"
              strokeWidth="1"
              x1={yearToX(marker.year)}
              x2={yearToX(marker.year)}
              y1={36}
              y2={BASELINE}
            />
            <text
              fill="#69706D"
              fontSize="12"
              fontWeight="600"
              textAnchor="middle"
              x={yearToX(marker.year)}
              y={BASELINE + 20}
            >
              {marker.year}
            </text>
            <text
              fill="#8A8F8B"
              fontSize="10.5"
              textAnchor="middle"
              x={yearToX(marker.year)}
              y={BASELINE + 36}
            >
              {marker.label}
            </text>
          </g>
        ))}

        <path
          className="tom-decay-ribbon-ghost"
          d={ghost}
          fill="none"
          stroke="#0B3436"
          strokeDasharray="1 6"
          strokeLinecap="round"
          strokeOpacity="0.2"
          strokeWidth="1.5"
        />
        <path className="tom-decay-ribbon-fill" d={band} fill="url(#tom-ribbon-fill)" />
        <path
          className="tom-decay-ribbon-line"
          d={line}
          fill="none"
          pathLength={1}
          stroke="url(#tom-ribbon-line)"
          strokeLinecap="round"
          strokeWidth="2.6"
        />

        <text fill="#0B3436" fontSize="12" fontWeight="600" x={LEFT} y={28}>
          {ribbon.strongLabel}
        </text>
        <text fill="#69706D" fontSize="12" textAnchor="end" x={RIGHT} y={BASELINE - 14}>
          {ribbon.zeroLabel}
        </text>
      </svg>
      <figcaption className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line pt-3 text-xs leading-6 text-muted">
        <span className="font-semibold uppercase tracking-[0.16em] text-brass">{ribbon.caption}</span>
        <span className="min-w-0 flex-1">{ribbon.note}</span>
      </figcaption>
    </figure>
  );
}
