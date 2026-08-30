export const dashboardModuleEyebrowClassName = "text-xs font-semibold uppercase tracking-[0.2em] text-brass";

export const dashboardModuleTitleClassName = "font-serif text-2xl font-semibold tracking-[-0.02em] text-ink md:text-3xl";

type DashboardStatusProps = {
  label: string;
  tone?: "positive" | "warning" | "neutral";
};

const statusDotClass = {
  positive: "bg-sage/70",
  warning: "bg-brass/70",
  neutral: "bg-muted/50",
};

export function DashboardStatus({ label, tone = "neutral" }: DashboardStatusProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-[11px] font-normal text-muted/80">
      <span className={`h-1 w-1 shrink-0 rounded-full ${statusDotClass[tone]}`} aria-hidden="true" />
      <span className="break-words">{label}</span>
    </span>
  );
}

type DashboardDisclosureButtonProps = {
  controls: string;
  expanded: boolean;
  expandedLabel: string;
  collapsedLabel: string;
  onClick: () => void;
};

export function DashboardDisclosureButton({
  controls,
  expanded,
  expandedLabel,
  collapsedLabel,
  onClick,
}: DashboardDisclosureButtonProps) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 bg-transparent px-1 py-1 text-xs font-medium text-muted/80 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
    >
      {expanded ? expandedLabel : collapsedLabel}
      <span aria-hidden="true">{expanded ? "↑" : "↓"}</span>
    </button>
  );
}
