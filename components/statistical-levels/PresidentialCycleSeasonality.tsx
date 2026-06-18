import type { DailySeasonalityCell, PresidentialCyclePhase } from "@/lib/statistical-levels/types";

type PresidentialCycleSeasonalityProps = {
  cells: Record<PresidentialCyclePhase, DailySeasonalityCell[]>;
  month: number;
  phase: PresidentialCyclePhase;
  setPhase: (phase: PresidentialCyclePhase) => void;
};

const phaseLabels: Record<PresidentialCyclePhase, string> = {
  all: "Todos los años",
  post_election: "Año 1 · Post-elección",
  midterm: "Año 2 · Midterm",
  pre_election: "Año 3 · Pre-elección",
  election: "Año 4 · Elección",
};

const phaseOrder: PresidentialCyclePhase[] = ["all", "post_election", "midterm", "pre_election", "election"];

function formatPercent(value: number | null, digits = 2) {
  if (value === null) return "n/d";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`;
}

function formatRate(value: number | null) {
  if (value === null) return "n/d";
  return `${(value * 100).toFixed(0)}%`;
}

export function PresidentialCycleSeasonality({ cells, month, phase, setPhase }: PresidentialCycleSeasonalityProps) {
  const monthCells = (cells[phase] ?? []).filter((cell) => cell.month === month && cell.sampleSize > 0);
  const strongest = [...monthCells].sort((a, b) => (b.averageReturn ?? Number.NEGATIVE_INFINITY) - (a.averageReturn ?? Number.NEGATIVE_INFINITY)).slice(0, 5);
  const average = monthCells.length ? monthCells.reduce((sum, cell) => sum + (cell.averageReturn ?? 0), 0) / monthCells.length : null;
  const averageWinRate = monthCells.length ? monthCells.reduce((sum, cell) => sum + (cell.winRate ?? 0), 0) / monthCells.length : null;

  return (
    <div className="border border-line bg-panelSoft p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Ciclo presidencial EE. UU.</p>
          <h3 className="mt-2 text-lg font-semibold text-ink">{phaseLabels[phase]}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Clasificación por año calendario: elección, post-elección, midterm y pre-elección. La lectura resume comportamiento histórico descriptivo.
          </p>
        </div>
        <div className="flex max-w-full flex-wrap gap-2">
          {phaseOrder.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPhase(item)}
              className={`border px-3 py-2 text-xs font-semibold transition ${phase === item ? "border-ink bg-ink text-white" : "border-line bg-panel text-muted hover:border-ink hover:text-ink"}`}
            >
              {phaseLabels[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <Metric label="Días con muestra" value={String(monthCells.length)} />
        <Metric label="Promedio diario" value={formatPercent(average)} />
        <Metric label="% positivo medio" value={formatRate(averageWinRate)} />
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-5">
        {strongest.length ? (
          strongest.map((cell) => (
            <div key={`${phase}-${cell.month}-${cell.day}`} className="border border-line bg-panel p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Día {cell.day}</p>
              <p className="mt-1 font-semibold text-ink">{formatPercent(cell.averageReturn)}</p>
              <p className="mt-1 text-xs text-muted">Win rate {formatRate(cell.winRate)} · N {cell.sampleSize}</p>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-muted md:col-span-5">Historial insuficiente para esta fase y mes.</p>
        )}
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
