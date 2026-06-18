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
        className="ml-1 inline-flex h-4 w-4 items-center justify-center border border-line bg-panel text-[10px] font-semibold leading-none text-muted transition hover:border-ink hover:text-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
      >
        ?
      </button>
      <span className="pointer-events-none absolute right-0 top-full z-30 mt-2 hidden w-[min(18rem,calc(100vw-2rem))] border border-line bg-ink px-3 py-2 text-xs normal-case leading-5 tracking-normal text-white shadow-[0_12px_28px_rgba(31,35,40,0.16)] group-hover:block group-focus-within:block sm:bottom-full sm:left-1/2 sm:right-auto sm:top-auto sm:mb-2 sm:mt-0 sm:w-64 sm:-translate-x-1/2">
        {text}
      </span>
    </span>
  );
}
