import type { DailySeasonalityCell } from "@/lib/statistical-levels/types";

type SeasonalityMonthExplorerProps = {
  cells: DailySeasonalityCell[];
  month: number;
};

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function formatPercent(value: number | null, digits = 2) {
  if (value === null) return "n/d";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`;
}

function formatRate(value: number | null) {
  if (value === null) return "n/d";
  return `${(value * 100).toFixed(0)}%`;
}

function usableCells(cells: DailySeasonalityCell[], month: number) {
  return cells.filter((cell) => cell.month === month && cell.sampleSize > 0);
}

export function SeasonalityMonthExplorer({ cells, month }: SeasonalityMonthExplorerProps) {
  const rows = usableCells(cells, month);
  const ranked = [...rows].sort((a, b) => (b.averageReturn ?? Number.NEGATIVE_INFINITY) - (a.averageReturn ?? Number.NEGATIVE_INFINITY));
  const best = ranked.slice(0, 5);
  const weakest = ranked.slice(-5).reverse();
  const average = rows.length ? rows.reduce((sum, cell) => sum + (cell.averageReturn ?? 0), 0) / rows.length : null;
  const averageWinRate = rows.length ? rows.reduce((sum, cell) => sum + (cell.winRate ?? 0), 0) / rows.length : null;

  return (
    <div className="grid gap-4 xl:grid-cols-[0.72fr_1fr]">
      <div className="border border-line bg-panelSoft p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Vista general</p>
        <h3 className="mt-2 text-lg font-semibold text-ink">{monthNames[month - 1]}</h3>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3 xl:grid-cols-1">
          <Metric label="Promedio diario" value={formatPercent(average)} />
          <Metric label="% positivo medio" value={formatRate(averageWinRate)} />
          <Metric label="Días con muestra" value={String(rows.length)} />
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">
          Muestra patrones históricos por día del mes. Úsalo como contexto, junto con régimen, riesgo y precio actual.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DayList title="Días históricamente más fuertes" cells={best} />
        <DayList title="Días históricamente más débiles" cells={weakest} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-panel px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function DayList({ title, cells }: { title: string; cells: DailySeasonalityCell[] }) {
  return (
    <div className="border border-line bg-panelSoft p-4">
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      <div className="mt-3 grid gap-2">
        {cells.length ? (
          cells.map((cell) => (
            <div key={`${title}-${cell.month}-${cell.day}`} className="grid grid-cols-[2.5rem_1fr_3.5rem_4.4rem] items-center gap-3 border-b border-line/70 pb-2 text-sm last:border-b-0 last:pb-0">
              <span className="font-semibold text-ink">{cell.day}</span>
              <span className="text-muted">Retorno medio</span>
              <span className="text-right font-semibold text-ink">{formatPercent(cell.averageReturn)}</span>
              <span className="text-right text-xs text-muted">{cell.sampleSize < 5 ? "Muestra baja" : `N ${cell.sampleSize}`}</span>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-muted">Historial insuficiente para este mes.</p>
        )}
      </div>
    </div>
  );
}
