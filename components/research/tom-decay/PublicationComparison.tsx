import type { TomDecayContent } from "@/lib/research/tom-decay/content";
import type { TomFormatters } from "@/lib/research/tom-decay/format";
import type { TomDecayView } from "@/lib/research/tom-decay/presentation";

type PublicationComparisonProps = {
  content: TomDecayContent;
  format: TomFormatters;
  pairs: TomDecayView["publicationPairs"];
};

const WIDTH = 460;
const HEIGHT = 132;
const LEFT = 74;
const RIGHT = 386;

export function PublicationComparison({ content, format, pairs }: PublicationComparisonProps) {
  const copy = content.publication;
  const labels = content.labels;
  const maxBps = Math.max(...pairs.flatMap((pair) => [pair.fromBps, pair.toBps]));
  const scale = (value: number) => HEIGHT - 46 - (value / (maxBps * 1.18)) * (HEIGHT - 78);

  return (
    <div className="min-w-0">
      <div className="grid gap-4 lg:grid-cols-2">
        {pairs.map((pair) => (
          <figure className="min-w-0 border border-line bg-white/75 p-5" key={pair.id}>
            <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm font-semibold text-ink">{pair.name}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                {labels.bpsPerDay}
              </span>
            </figcaption>

            <svg className="mt-4 h-auto w-full" role="img" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
              <title>{`${pair.name}: ${format.bps(pair.fromBps)} → ${format.bps(pair.toBps)} ${labels.bpsPerDay}`}</title>
              <line
                stroke="#C9C2B6"
                strokeWidth="1"
                x1={LEFT - 40}
                x2={RIGHT + 40}
                y1={HEIGHT - 42}
                y2={HEIGHT - 42}
              />
              <line
                stroke="#0B3436"
                strokeOpacity="0.45"
                strokeWidth="2"
                x1={LEFT}
                x2={RIGHT}
                y1={scale(pair.fromBps)}
                y2={scale(pair.toBps)}
              />
              {[
                { x: LEFT, value: pair.fromBps, label: labels.regimes.PRE_PUBLICATION.short },
                { x: RIGHT, value: pair.toBps, label: labels.regimes.PUBLISHED_PRE_DECIMAL.short },
              ].map((dot) => (
                <g key={dot.label}>
                  <circle cx={dot.x} cy={scale(dot.value)} fill="#0B3436" r="7" />
                  <text
                    fill="#111716"
                    fontSize="16"
                    fontWeight="600"
                    textAnchor="middle"
                    x={dot.x}
                    y={scale(dot.value) - 15}
                  >
                    {format.bps(dot.value)}
                  </text>
                  <text fill="#69706D" fontSize="12" textAnchor="middle" x={dot.x} y={HEIGHT - 22}>
                    {dot.label}
                  </text>
                </g>
              ))}
            </svg>

            <dl className="mt-4 grid gap-2 border-t border-line pt-3 text-xs">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted">{copy.changeLabel}</dt>
                <dd className="font-mono tabular-nums text-ink">
                  {format.signedBps(pair.changeBps)} {labels.bpsPerDay}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted">{copy.pLabel}</dt>
                <dd className="font-mono tabular-nums text-ink">{format.pValue(pair.changeHacP)}</dd>
              </div>
            </dl>
          </figure>
        ))}
      </div>

      <p className="sr-only">{copy.chartSummary}</p>

      <p className="mt-4 inline-flex items-center gap-2 border border-petrol/25 bg-petrol px-4 py-2.5 text-xs font-semibold text-white">
        {copy.verdict}
      </p>

      <div className="mt-6 border-l-4 border-brass bg-[#f8f2e7] px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d6132]">
          {copy.note.title}
        </p>
        <p className="mt-2 text-sm leading-7 text-ink">{copy.note.body}</p>
      </div>
    </div>
  );
}
