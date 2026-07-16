import type { CashProtocol, Td3PaperContent } from "@/lib/research/td3-paper";
import type { ClaimVerdict, Td3VisualContent } from "@/lib/research/td3-visual-content";

type Locale = Td3PaperContent["locale"];

function FigureShell({
  eyebrow,
  title,
  intro,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-t border-line py-12 md:py-16 ${className}`}>
      <div className="max-w-4xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">{eyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold leading-tight text-ink md:text-4xl">{title}</h2>
        {intro ? <p className="mt-4 max-w-3xl text-sm leading-7 text-muted md:text-base">{intro}</p> : null}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Connector({ vertical = false, responsiveAt }: { vertical?: boolean; responsiveAt?: "md" | "lg" }) {
  const className = vertical
    ? "h-8 w-5 rotate-90"
    : responsiveAt === "md"
      ? "h-8 w-5 rotate-90 md:h-5 md:w-8 md:rotate-0"
      : responsiveAt === "lg"
        ? "h-8 w-5 rotate-90 lg:h-5 lg:w-8 lg:rotate-0"
        : "h-5 w-8 shrink-0";
  return (
    <svg
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      viewBox="0 0 32 20"
      fill="none"
    >
      <path d="M1 10h27M22 4l6 6-6 6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function FalseConfidenceFigure({ content }: { content: Td3VisualContent["backtest"] }) {
  return (
    <FigureShell eyebrow={content.eyebrow} title={content.title} className="border-t-0 pt-10 md:pt-14">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="border border-[#1f4e79]/25 bg-white/80 p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1f4e79]">{content.apparentTitle}</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{content.apparentText}</p>
          <div className="mt-6 rounded-[4px] border border-line bg-[#f7f8fa] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{content.chartLabel}</p>
            <svg className="mt-2 h-auto w-full" viewBox="0 0 520 190" role="img" aria-label={content.chartLabel}>
              <path d="M42 18v137h444" fill="none" stroke="#9aa0a6" strokeWidth="1" />
              <path
                d="M58 139 C110 134 133 120 172 113 S239 96 274 83 S348 63 385 43 S444 31 472 17"
                fill="none"
                stroke="#1f4e79"
                strokeLinecap="round"
                strokeWidth="4"
              />
              <path d="M58 139 C110 134 133 120 172 113 S239 96 274 83 S348 63 385 43 S444 31 472 17 V155 H58Z" fill="#1f4e79" opacity="0.06" />
              <text x="455" y="177" fill="#69706d" fontSize="12">{content.axes[0]}</text>
              <text x="10" y="17" fill="#69706d" fontSize="12">{content.axes[1]}</text>
            </svg>
          </div>
        </div>

        <div className="border border-[#8b1e3f]/25 bg-[#fbf5f6] p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b1e3f]">{content.sourcesTitle}</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{content.sourcesText}</p>
          <ul className="mt-5 grid gap-3">
            {content.risks.map((risk) => (
              <li key={risk} className="flex gap-3 text-sm leading-6 text-ink">
                <span aria-hidden="true" className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#8b1e3f]" />
                {risk}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-5 border border-petrol/20 bg-petrol px-5 py-4 text-center text-sm font-semibold leading-6 text-white">
        {content.conclusion}
      </p>
    </FigureShell>
  );
}

export function ClaimLadder({ content }: { content: Td3VisualContent["ladder"] }) {
  const names = ["Ranking", "Statistics", "Feasibility"];
  return (
    <FigureShell eyebrow={content.eyebrow} title={content.title}>
      <div className="border border-petrol/25 bg-petrol px-5 py-5 text-white md:px-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">{content.researchQuestionLabel}</p>
        <p className="mt-2 max-w-5xl text-base font-semibold leading-7 md:text-lg">{content.researchQuestion}</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {content.questions.map((question, index) => (
          <div key={question} className="relative min-h-44 border border-line bg-white/80 p-5 shadow-[0_12px_28px_rgba(11,52,54,0.035)]">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-mono text-3xl font-semibold text-petrol/25">0{index + 1}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">{names[index]}</span>
            </div>
            <p className="mt-8 text-sm font-semibold leading-6 text-ink">{question}</p>
            {index < 2 ? <span aria-hidden="true" className="absolute -right-2 top-1/2 z-10 hidden h-4 w-4 rotate-45 border-r border-t border-line bg-white md:block" /> : null}
          </div>
        ))}
      </div>

      <div className="mt-5 border-l-4 border-[#8b1e3f] bg-[#f8f1f3] px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b1e3f]">{content.interpretiveRuleLabel}</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-ink">{content.interpretiveRule}</p>
      </div>
    </FigureShell>
  );
}

export function PortfolioUniverseFigure({
  content,
  universe,
}: {
  content: Td3VisualContent["universe"];
  universe: Td3PaperContent["universe"];
}) {
  return (
    <FigureShell eyebrow={content.eyebrow} title={universe.title} intro={universe.intro}>
      <div className="grid gap-5 lg:grid-cols-[1fr_0.42fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          {universe.sleeves.map((sleeve, index) => (
            <div
              key={sleeve.ticker}
              className={`border p-5 ${index === universe.sleeves.length - 1 ? "border-brass/35 bg-[#f8f2e7] sm:col-span-2" : "border-line bg-white/80"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="font-mono text-lg font-semibold text-petrol">{sleeve.ticker === "CASH" ? "CASH / BIL" : sleeve.ticker}</p>
                <span className="font-mono text-xs text-muted">0{index + 1}</span>
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-ink">{sleeve.role}</p>
              <p className="mt-2 text-xs leading-5 text-muted">{sleeve.reason}</p>
            </div>
          ))}
        </div>
        <aside className="border border-petrol/20 bg-petrol p-5 text-white md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">{content.constraintsTitle}</p>
          <ul className="mt-5 grid gap-4">
            {content.constraints.map((constraint) => (
              <li key={constraint} className="flex gap-3 text-sm leading-6 text-white/85">
                <span aria-hidden="true" className="mt-2.5 h-px w-4 shrink-0 bg-white/45" />
                {constraint}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </FigureShell>
  );
}

export function TD3MechanismDiagram({ content }: { content: Td3VisualContent["mechanism"] }) {
  return (
    <FigureShell eyebrow={content.eyebrow} title={content.title} intro={content.intro}>
      <div className="grid gap-5 lg:grid-cols-[1fr_0.42fr]">
        <div className="border border-line bg-white/75 p-4 md:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1f4e79]">{content.actor}</p>
          <div className="mt-4 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
            <div className="border border-line bg-[#f7f8fa] px-4 py-4 text-center text-sm font-semibold text-ink md:w-36">{content.state}</div>
            <Connector responsiveAt="md" />
            <div className="flex-1 border border-[#1f4e79]/30 bg-[#edf3f8] px-4 py-5 text-center text-sm font-semibold text-[#1f4e79]">
              <div className="mx-auto mb-3 grid max-w-40 grid-cols-5 gap-2" aria-hidden="true">
                {Array.from({ length: 15 }).map((_, index) => (
                  <span key={index} className={`h-2.5 w-2.5 rounded-full ${index % 3 === 0 ? "bg-[#1f4e79]/70" : "bg-[#1f4e79]/20"}`} />
                ))}
              </div>
              {content.actor}
            </div>
            <Connector responsiveAt="md" />
            <div className="border border-sage/45 bg-[#eef5f2] px-4 py-4 text-center text-sm font-semibold text-[#3f604f] md:w-40">{content.weights}</div>
          </div>

          <div className="my-5 flex justify-center text-petrol/45"><Connector vertical /></div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a46d2b]">{content.critics}</p>
          <div className="mt-4 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
            <div className="border border-line bg-[#f7f8fa] px-4 py-4 text-center text-sm font-semibold text-ink md:w-44">{content.criticInput}</div>
            <Connector responsiveAt="md" />
            <div className="grid flex-1 grid-cols-2 gap-3">
              <div className="border border-[#a46d2b]/35 bg-[#faf3e9] px-4 py-5 text-center font-mono text-sm font-semibold text-[#8a5c27]">Q1</div>
              <div className="border border-[#a46d2b]/35 bg-[#faf3e9] px-4 py-5 text-center font-mono text-sm font-semibold text-[#8a5c27]">Q2</div>
            </div>
            <Connector responsiveAt="md" />
            <div className="border border-[#8b1e3f]/30 bg-[#f8f1f3] px-4 py-4 text-center text-sm font-semibold text-[#8b1e3f] md:w-40">{content.lowerEstimate}</div>
          </div>
        </div>

        <aside className="border border-petrol/20 bg-[#f2f5f3] p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-petrol">{content.reasonsTitle}</p>
          <ol className="mt-5 grid gap-4">
            {content.reasons.map((reason, index) => (
              <li key={reason} className="grid grid-cols-[1.75rem_1fr] gap-3 text-sm leading-6 text-muted">
                <span className="font-mono text-xs font-semibold text-brass">0{index + 1}</span>
                {reason}
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </FigureShell>
  );
}

export function EvaluationProtocolFigure({ content }: { content: Td3VisualContent["evaluation"] }) {
  return (
    <FigureShell eyebrow={content.eyebrow} title={content.title} intro={content.intro}>
      <div className="grid gap-5 lg:grid-cols-[1fr_0.42fr]">
        <div className="border border-line bg-white/80 p-5 md:p-6">
          <ol className="grid gap-3">
            {content.steps.map((step, index) => (
              <li key={step} className="grid grid-cols-[2rem_1fr] items-start gap-3 border-b border-line pb-3 last:border-b-0 last:pb-0">
                <span className="font-mono text-xs font-semibold text-brass">0{index + 1}</span>
                <span className="text-sm font-semibold leading-6 text-ink">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-7 flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-center">
            {content.flow.map((step, index) => (
              <div key={step} className="contents">
                <div className={`min-w-36 border px-5 py-3 text-center text-sm font-semibold ${index === 0 ? "border-[#1f4e79]/35 bg-[#edf3f8] text-[#1f4e79]" : index === 1 ? "border-[#a46d2b]/35 bg-[#faf3e9] text-[#8a5c27]" : "border-[#8b1e3f]/30 bg-[#f8f1f3] text-[#8b1e3f]"}`}>{step}</div>
                {index < content.flow.length - 1 ? <Connector responsiveAt="md" /> : null}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs leading-5 text-muted">{content.temporalNote}</p>
        </div>

        <aside className="border border-petrol/25 bg-petrol p-5 text-white md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">{content.constantsTitle}</p>
          <dl className="mt-5 grid gap-3">
            {content.constants.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 border-b border-white/15 pb-3 last:border-b-0 last:pb-0">
                <dt className="text-sm text-white/70">{label}</dt>
                <dd className="text-right font-mono text-xs font-semibold text-white">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 border-t border-white/20 pt-4 text-xs leading-5 text-white/65">{content.matchingNote}</p>
        </aside>
      </div>
    </FigureShell>
  );
}

function parseMetric(value: string) {
  return Number.parseFloat(value);
}

function percent(value: string, decimals: number) {
  return `${(parseMetric(value) * 100).toFixed(decimals)}%`;
}

function protocolDisplayRows(protocol: CashProtocol) {
  return [
    [percent(protocol.td3Metrics[0][1], 2), percent(protocol.comparatorMetrics[0][1], 2)],
    [parseMetric(protocol.td3Metrics[2][1]).toFixed(3), parseMetric(protocol.comparatorMetrics[2][1]).toFixed(3)],
    [percent(protocol.td3Metrics[3][1], 1), percent(protocol.comparatorMetrics[3][1], 1)],
  ];
}

function protocolMetricSummary(protocol: CashProtocol) {
  const [drawdownLabel, drawdownValue] = protocol.td3Metrics[3];
  const [bootstrapLabel, bootstrapValue] = protocol.validation[1];
  const [probabilityLabel, probabilityValue] = protocol.validation[2];
  const [wrcLabel, wrcValue] = protocol.validation[3];

  return `${protocol.label}. ${drawdownLabel}: ${drawdownValue}; ${bootstrapLabel}: ${bootstrapValue}; ${probabilityLabel}: ${probabilityValue}; ${wrcLabel}: ${wrcValue}.`;
}

export function RankingEvidenceTables({
  content,
  protocols,
}: {
  content: Td3VisualContent["ranking"];
  protocols: CashProtocol[];
}) {
  return (
    <FigureShell eyebrow={content.eyebrow} title={content.title} intro={content.intro}>
      <div className="grid gap-5 lg:grid-cols-2">
        {protocols.map((protocol) => {
          const rows = protocolDisplayRows(protocol);
          return (
            <div key={protocol.id} className="overflow-hidden border border-line bg-white/80">
              <div className="border-b border-line bg-[#f7f8fa] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-petrol">{protocol.label}</p>
              </div>
              <div className="overflow-x-auto px-4 py-3 md:px-5">
                <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                  <caption className="sr-only">{protocolMetricSummary(protocol)}</caption>
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-muted">
                      <th className="py-3 pr-4 font-semibold">{content.metric}</th>
                      <th className="px-3 py-3 text-right font-semibold">{content.td3}</th>
                      <th className="pl-3 py-3 text-right font-semibold">{content.comparator}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.rows.map((label, index) => (
                      <tr key={label} className="border-b border-line/80 last:border-b-0">
                        <th className="py-3 pr-4 font-medium text-muted">{label}:</th>
                        <td className="px-3 py-3 text-right font-mono font-semibold text-petrol">{rows[index][0]}</td>
                        <td className="pl-3 py-3 text-right font-mono text-ink">{rows[index][1]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-line bg-[#fbfaf6] px-5 py-4 text-xs leading-5 text-muted">
                <span className="font-semibold text-ink">{content.selected}:</span> {protocol.selectedTd3}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_0.85fr]">
        <p className="border-l-4 border-[#8b1e3f] bg-[#f8f1f3] px-5 py-4 text-sm font-semibold leading-6 text-ink">{content.boundary}</p>
        <p className="border border-line bg-white/65 px-5 py-4 text-xs leading-5 text-muted">{content.selectionNote}</p>
      </div>
    </FigureShell>
  );
}

function ciData(protocol: CashProtocol) {
  const interval = protocol.validation[1][1].replace(/[\[\]]/g, "").split(",").map((part) => Number.parseFloat(part.trim()));
  return {
    low: interval[0],
    high: interval[1],
    delta: Number.parseFloat(protocol.validation[0][1]),
    wrc: Number.parseFloat(protocol.validation[3][1]),
  };
}

const ciX = (value: number) => 118 + ((value + 0.8) / 1.8) * 492;

export function BootstrapValidationFigure({
  content,
  protocols,
}: {
  content: Td3VisualContent["statistics"];
  protocols: CashProtocol[];
}) {
  const colors = ["#1f4e79", "#8b1e3f"];
  return (
    <FigureShell eyebrow={content.eyebrow} title={content.title} intro={content.intro}>
      <div className="grid gap-5 lg:grid-cols-[1fr_0.38fr]">
        <div className="border border-line bg-white/80 p-4 md:p-6">
          <p className="text-xs font-semibold text-ink">{content.chartTitle}</p>
          <svg className="mt-4 h-auto w-full" viewBox="0 0 660 250" role="img" aria-label={content.chartTitle}>
            <line x1={ciX(0)} y1="34" x2={ciX(0)} y2="190" stroke="#8b9095" strokeDasharray="4 4" />
            <text x={ciX(0)} y="24" textAnchor="middle" fill="#69706d" fontSize="11">{content.zero}</text>
            {protocols.map((protocol, index) => {
              const values = ciData(protocol);
              const y = index === 0 ? 83 : 145;
              return (
                <g key={protocol.id}>
                  <text x="6" y={y + 4} fill="#111716" fontSize="13">{protocol.label}</text>
                  <line x1={ciX(values.low)} y1={y} x2={ciX(values.high)} y2={y} stroke={colors[index]} strokeWidth="4" strokeLinecap="round" />
                  <line x1={ciX(values.low)} y1={y - 8} x2={ciX(values.low)} y2={y + 8} stroke={colors[index]} strokeWidth="2" />
                  <line x1={ciX(values.high)} y1={y - 8} x2={ciX(values.high)} y2={y + 8} stroke={colors[index]} strokeWidth="2" />
                  <circle cx={ciX(values.delta)} cy={y} r="5" fill={colors[index]} />
                  <text x={ciX(values.low)} y={y - 14} textAnchor="middle" fill="#69706d" fontSize="10">{values.low.toFixed(4)}</text>
                  <text x={ciX(values.high)} y={y - 14} textAnchor="middle" fill="#69706d" fontSize="10">{values.high.toFixed(4)}</text>
                </g>
              );
            })}
            <line x1="118" y1="194" x2="610" y2="194" stroke="#8b9095" />
            {[-0.8, -0.4, 0, 0.4, 0.8].map((tick) => (
              <g key={tick}>
                <line x1={ciX(tick)} y1="190" x2={ciX(tick)} y2="200" stroke="#8b9095" />
                <text x={ciX(tick)} y="218" textAnchor="middle" fill="#69706d" fontSize="11">{tick.toFixed(1)}</text>
              </g>
            ))}
            <text x="610" y="241" textAnchor="end" fill="#69706d" fontSize="11">{content.axis}</text>
          </svg>
        </div>

        <aside className="border border-line bg-[#f7f8fa] p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">White Reality Check</p>
          <dl className="mt-5 grid gap-5">
            {protocols.map((protocol) => (
              <div key={protocol.id} className="border-b border-line pb-4 last:border-b-0 last:pb-0">
                <dt className="text-sm font-semibold text-ink">{protocol.label}</dt>
                <dd className="mt-2 flex items-baseline justify-between gap-4 text-sm text-muted">
                  {content.wrc}:
                  <span className="font-mono text-base font-semibold text-[#8b1e3f]">{ciData(protocol).wrc.toFixed(4)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
      <p className="mt-5 border border-petrol/25 bg-petrol px-5 py-4 text-sm font-semibold leading-6 text-white">{content.conclusion}</p>
      <p className="mt-3 text-xs leading-5 text-muted">{content.caveat}</p>
    </FigureShell>
  );
}

export function ExecutionStressFigure({ content }: { content: Td3VisualContent["execution"] }) {
  const rows = [
    { label: "Zero-CASH TD3", value: -0.1321, tone: "bg-[#8b1e3f]" },
    { label: "BIL-CASH TD3", value: -0.118, tone: "bg-[#8b1e3f]" },
    { label: "Zero-CASH Trend", value: -0.0132, tone: "bg-[#1f4e79]" },
    { label: "BIL-CASH Trend", value: -0.0132, tone: "bg-[#1f4e79]" },
  ];
  return (
    <FigureShell eyebrow={content.eyebrow} title={content.title} intro={content.intro}>
      <div className="grid gap-5 lg:grid-cols-[1fr_0.42fr]">
        <div className="border border-line bg-white/80 p-5 md:p-6">
          <p className="text-xs font-semibold text-ink">{content.chartTitle}</p>
          <div className="mt-6 grid gap-4">
            {rows.map((row) => (
              <div key={row.label} className="grid gap-2 sm:grid-cols-[9rem_1fr_4rem] sm:items-center">
                <span className="text-xs font-medium text-muted">{row.label}</span>
                <div className="relative h-7 border-r border-line bg-[#f7f8fa]">
                  <div className={`absolute right-0 top-1/2 h-3 -translate-y-1/2 ${row.tone}`} style={{ width: `${Math.abs(row.value) / 0.15 * 100}%` }} />
                </div>
                <span className="font-mono text-xs font-semibold text-ink">{row.value.toFixed(4)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-4 text-right font-mono text-[10px] text-muted">
            <span>-0.15</span><span>-0.10</span><span>-0.05</span><span>0</span>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">{content.axis} · {content.benchmarkApproximation}</p>
        </div>

        <aside className="border border-petrol/20 bg-[#f2f5f3] p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-petrol">{content.filtersTitle}</p>
          <ul className="mt-5 grid gap-4">
            {content.filters.map((filter) => (
              <li key={filter} className="flex gap-3 text-sm leading-6 text-muted">
                <span aria-hidden="true" className="mt-2.5 h-px w-4 shrink-0 bg-petrol/45" />
                {filter}
              </li>
            ))}
          </ul>
        </aside>
      </div>
      <p className="mt-5 border border-brass/35 bg-[#f8f2e7] px-5 py-4 text-xs leading-6 text-muted">{content.note}</p>
    </FigureShell>
  );
}

function verdictClass(verdict: ClaimVerdict) {
  if (verdict === "supported") return "border-sage/45 bg-[#eef5f2] text-[#3f604f]";
  if (verdict === "not-supported") return "border-[#8b1e3f]/30 bg-[#f8f1f3] text-[#8b1e3f]";
  return "border-brass/40 bg-[#f8f2e7] text-[#8a6328]";
}

export function ClaimsSurvivalTable({ content }: { content: Td3VisualContent["claims"] }) {
  return (
    <FigureShell eyebrow={content.eyebrow} title={content.title} intro={content.intro}>
      <div className="overflow-x-auto border border-line bg-white/80">
        <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
          <thead className="bg-[#f7f8fa] text-[10px] uppercase tracking-[0.14em] text-muted">
            <tr>
              {content.headers.map((header) => <th key={header} className="border-b border-line px-5 py-4 font-semibold">{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {content.rows.map((row) => (
              <tr key={row.claim} className="border-b border-line/80 align-top last:border-b-0">
                <th className="w-[27%] px-5 py-4 font-semibold leading-6 text-ink">{row.claim}</th>
                <td className="w-[20%] px-5 py-4">
                  <span className={`inline-flex rounded-[3px] border px-2.5 py-1.5 text-xs font-semibold ${verdictClass(row.verdict)}`}>{content.verdicts[row.verdict]}</span>
                </td>
                <td className="px-5 py-4 leading-6 text-muted">{row.boundary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FigureShell>
  );
}

export function ContributionFlow({ content }: { content: Td3VisualContent["contribution"] }) {
  return (
    <FigureShell eyebrow={content.eyebrow} title={content.title} intro={content.intro}>
      <div className="border border-line bg-white/80 p-5 md:p-7">
        <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
          {content.flow.map((step, index) => (
            <div key={step} className="contents">
              <div className={`flex min-h-20 flex-1 items-center justify-center border px-4 py-4 text-center text-sm font-semibold leading-5 ${index === 0 ? "border-[#8b1e3f]/30 bg-[#f8f1f3] text-[#8b1e3f]" : index === content.flow.length - 1 ? "border-sage/45 bg-[#eef5f2] text-[#3f604f]" : "border-line bg-[#f7f8fa] text-ink"}`}>{step}</div>
              {index < content.flow.length - 1 ? <Connector responsiveAt="lg" /> : null}
            </div>
          ))}
        </div>
        <div className="mt-4 grid items-center gap-3 lg:grid-cols-[1fr_2rem_1fr] lg:px-[25%]">
          <div className="border border-brass/35 bg-[#f8f2e7] px-4 py-3 text-center text-sm font-semibold text-[#8a6328]">{content.feasibility}</div>
          <Connector responsiveAt="lg" />
          <div className="text-center text-xs leading-5 text-muted">{content.flow[3]}</div>
        </div>
      </div>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {content.ingredients.map((ingredient, index) => (
          <li key={ingredient} className="flex gap-3 border border-line bg-white/65 px-4 py-3 text-sm leading-6 text-muted">
            <span className="font-mono text-xs font-semibold text-brass">0{index + 1}</span>
            {ingredient}
          </li>
        ))}
      </ul>
      <p className="mt-5 border-l-4 border-petrol bg-[#f2f5f3] px-5 py-4 text-sm font-semibold leading-6 text-ink">{content.note}</p>
    </FigureShell>
  );
}

export function FinalAnswerCards({ content }: { content: Td3VisualContent["final"] }) {
  return (
    <section className="py-12 md:py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">{content.eyebrow}</p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {content.cards.map((card) => (
          <div key={card.number} className="border border-line bg-white/80 p-5 shadow-[0_12px_28px_rgba(11,52,54,0.04)] md:p-6">
            <div className="flex items-start justify-between gap-4">
              <span className="font-mono text-xs font-semibold text-brass">{card.number}</span>
              <span className={`rounded-[3px] border px-2.5 py-1 text-xs font-semibold ${verdictClass(card.verdictTone)}`}>{card.verdict}</span>
            </div>
            <h2 className="mt-8 text-xl font-semibold leading-tight text-ink">{card.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{card.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 border border-petrol bg-petrol p-6 text-white shadow-[0_20px_55px_rgba(11,52,54,0.11)] md:p-8">
        <p className="max-w-5xl text-xl font-semibold leading-8 md:text-3xl md:leading-tight">{content.mainAnswer}</p>
        <p className="mt-6 border-t border-white/20 pt-5 text-sm leading-7 text-white/75">
          <span className="font-semibold text-white">{content.mainResultLabel}:</span> {content.mainResult}
        </p>
      </div>
    </section>
  );
}

export function AppendixSection({ content, id }: { content: Td3VisualContent["appendix"]; id: string }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-line py-12 md:py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">{content.eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold leading-tight text-ink md:text-4xl">{content.title}</h2>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-muted md:text-base">{content.intro}</p>
      <div className="mt-8 grid gap-3 lg:grid-cols-2">
        {content.items.map((item) => (
          <details key={item.title} className="group border border-line bg-white/70 open:border-petrol/30 open:bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-4 text-sm font-semibold leading-6 text-ink marker:content-none">
              {item.title}
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-brass">
                <span className="details-open-label">{content.open}</span>
                <span className="details-close-label">{content.close}</span>
              </span>
            </summary>
            <div className="border-t border-line px-5 py-4">
              <p className="text-sm leading-6 text-muted">{item.text}</p>
              {item.link ? (
                <div className="mt-4 border-l-2 border-petrol/35 pl-4">
                  <a href={item.link.href} className="inline-flex items-center gap-2 text-sm font-semibold text-petrol underline decoration-petrol/25 underline-offset-4 transition hover:decoration-petrol">
                    {item.link.label}
                    <span aria-hidden="true">&rarr;</span>
                  </a>
                  {item.link.description ? <p className="mt-1 text-xs leading-5 text-muted">{item.link.description}</p> : null}
                </div>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export function PaperNavigation({ items, label }: { items: Td3VisualContent["navigation"]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 border-y border-line bg-paper/95 px-4 md:-mx-5 md:px-5">
      <div className="mx-auto flex max-w-7xl gap-5 overflow-x-auto py-3">
        {items.map((item, index) => (
          <a key={item.href} href={item.href} className="flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted transition hover:text-petrol">
            <span className="font-mono text-[10px] text-brass">0{index + 1}</span>{item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function PaperHero({ content, locale }: { content: Td3PaperContent["hero"]; locale: Locale }) {
  const labels = locale === "en" ? { framework: "Falsification-oriented evaluation framework", paper: "Interactive research paper" } : { framework: "Marco de evaluación orientado a falsación", paper: "Paper interactivo de investigación" };
  return (
    <header className="grid gap-8 py-10 md:py-16 lg:grid-cols-[1fr_0.38fr] lg:items-end">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">{labels.paper}</p>
        <h1 className="mt-4 max-w-5xl text-3xl font-semibold leading-[1.08] text-ink sm:text-4xl md:text-6xl">{content.title}</h1>
        <p className="mt-6 max-w-3xl text-base leading-7 text-muted md:text-lg md:leading-8">{content.subtitle}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {content.badges.map((badge) => <span key={badge} className="border border-petrol/20 bg-white/75 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-petrol">{badge}</span>)}
        </div>
      </div>
      <aside className="border-l-4 border-petrol bg-white/65 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brass">{labels.framework}</p>
        <p className="mt-3 text-sm font-semibold leading-6 text-petrol">{content.note}</p>
      </aside>
    </header>
  );
}
