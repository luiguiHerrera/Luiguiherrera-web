import type { DailySeasonalityCell } from "@/lib/statistical-levels/types";

type SeasonalityHeatmapProps = {
  cells: DailySeasonalityCell[];
};

const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatPercent(value: number | null, digits = 2) {
  if (value === null) return "n/d";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`;
}

function percentile(values: number[], point: number) {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length) return null;
  const index = (clean.length - 1) * point;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return clean[lower];
  return clean[lower] + (clean[upper] - clean[lower]) * (index - lower);
}

function maxAbsForScale(cells: DailySeasonalityCell[]) {
  const values = cells.map((cell) => Math.abs(cell.averageReturn ?? 0)).filter((value) => value > 0);
  if (!values.length) return 0.003;
  return Math.max(percentile(values, 0.95) ?? 0.003, 0.003);
}

function cellColor(value: number | null, maxAbs: number) {
  if (value === null) return "#f3f0eb";
  const intensity = Math.min(Math.abs(value) / maxAbs, 1);
  if (Math.abs(value) < maxAbs * 0.08) return "#e8e3dc";
  if (value > 0) return `rgba(111, 143, 123, ${0.2 + intensity * 0.62})`;
  return `rgba(168, 100, 100, ${0.2 + intensity * 0.62})`;
}

function textColor(value: number | null, maxAbs: number) {
  if (value === null) return "text-muted";
  return Math.abs(value) / maxAbs > 0.72 ? "text-white" : "text-ink";
}

export function SeasonalityHeatmap({ cells }: SeasonalityHeatmapProps) {
  const maxAbs = maxAbsForScale(cells);
  const byKey = new Map(cells.map((cell) => [`${cell.month}-${cell.day}`, cell]));

  return (
    <div>
      <div className="mt-4 max-w-full overflow-x-auto [contain:paint]">
        <div className="grid min-w-[1120px] gap-1" style={{ gridTemplateColumns: "3.25rem repeat(31, minmax(2rem, 1fr))" }}>
          <div />
          {Array.from({ length: 31 }).map((_, index) => (
            <div key={index + 1} className="pb-1 text-center text-xs font-semibold text-muted">{index + 1}</div>
          ))}
          {monthLabels.map((monthLabel, monthIndex) => {
            const month = monthIndex + 1;
            return (
              <div key={monthLabel} className="contents">
                <div className="py-1.5 text-sm font-semibold text-ink">{monthLabel}</div>
                {Array.from({ length: 31 }).map((_, index) => {
                  const day = index + 1;
                  const cell = byKey.get(`${month}-${day}`);
                  const value = cell?.averageReturn ?? null;
                  const sampleSize = cell?.sampleSize ?? 0;
                  return (
                    <div
                      key={`${month}-${day}`}
                      title={`${day}/${month} · retorno medio ${formatPercent(value)} · win rate ${cell?.winRate === null || cell?.winRate === undefined ? "n/d" : `${(cell.winRate * 100).toFixed(0)}%`} · N ${sampleSize}`}
                      className={`flex min-h-8 items-center justify-center border border-white px-1 text-center text-[10px] font-semibold ${textColor(value, maxAbs)}`}
                      style={{ backgroundColor: cellColor(value, maxAbs) }}
                    >
                      {sampleSize > 0 && sampleSize < 3 ? `N${sampleSize}` : formatPercent(value, 1)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span>Negativo</span>
        <div className="flex items-center gap-1">
          {[-1, -0.5, -0.12, 0, 0.12, 0.5, 1].map((value) => (
            <span key={value} className="h-3 w-7 border border-white" style={{ backgroundColor: cellColor(value * maxAbs, maxAbs) }} />
          ))}
        </div>
        <span>Neutro</span>
        <span>Positivo</span>
        <span className="ml-auto">N marca muestras cortas.</span>
      </div>
    </div>
  );
}
