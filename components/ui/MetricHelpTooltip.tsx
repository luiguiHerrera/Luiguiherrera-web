type MetricHelpTooltipProps = {
  label: string;
  text: string;
};

export function MetricHelpTooltip({ label, text }: MetricHelpTooltipProps) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`Ayuda: ${label}`}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-line bg-panel text-[10px] font-semibold leading-none text-muted transition hover:border-petrol hover:text-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20"
      >
        ?
      </button>
      <span className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden max-w-[260px] whitespace-normal break-words rounded-[6px] border border-petrol/40 bg-petrol px-3 py-2 text-left text-xs normal-case leading-5 tracking-normal text-white shadow-[0_12px_28px_rgba(11,52,54,0.16)] group-hover:block group-focus-within:block sm:left-auto sm:right-0 sm:w-64">
        {text}
      </span>
    </span>
  );
}
