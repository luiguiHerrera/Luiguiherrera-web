import { DebtPlanner } from "@/components/debt/DebtPlanner";

export default function EnglishDebtPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <section className="grid gap-8 border-b border-line pb-10 lg:grid-cols-[0.58fr_0.42fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">Educational tool</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Before investing, review your debt</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
            An uncertain investment does not always compete well against expensive debt. This tool estimates the real cost of your debt, compares payoff methods, and checks whether your monthly cash flow has enough margin.
          </p>
        </div>
        <div className="rounded-[6px] border border-petrol/20 bg-white/70 p-5 text-sm leading-7 text-muted shadow-[0_12px_32px_rgba(11,52,54,0.045)]">
          It does not save your data. The calculations are approximate and are meant to organize questions, not make automatic decisions.
        </div>
      </section>

      <DebtPlanner locale="en" />
    </div>
  );
}
