import { jpmSpxLevelsContext } from "@/lib/market/jpm-spx-levels";

type JpmSpxLevelsPanelProps = {
  locale?: "es" | "en";
};

export function JpmSpxLevelsPanel({ locale = "es" }: JpmSpxLevelsPanelProps) {
  const copy = locale === "en"
    ? {
        eyebrow: "Prepared structure",
        status: "Current status",
        clarification: "Scope",
        nextStep: "Next step",
      }
    : {
        eyebrow: "Estructura preparada",
        status: "Estado actual",
        clarification: "Alcance",
        nextStep: "Siguiente paso",
      };

  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{copy.eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold text-ink">{locale === "en" ? "JPM/SPX levels" : jpmSpxLevelsContext.title}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="border border-line bg-panelSoft p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{copy.status}</p>
          <p className="mt-2 text-sm leading-6 text-ink">{locale === "en" ? "Pending manual data: no current internal numerical JPM collar levels are available." : jpmSpxLevelsContext.statusText}</p>
        </div>
        <div className="border border-line bg-panelSoft p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{copy.clarification}</p>
          <p className="mt-2 text-sm leading-6 text-ink">{locale === "en" ? "This context concerns SPX; these are not levels for SPY or VOO." : jpmSpxLevelsContext.clarification}</p>
        </div>
        <div className="border border-line bg-panelSoft p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{copy.nextStep}</p>
          <p className="mt-2 text-sm leading-6 text-ink">{locale === "en" ? "Numerical levels require a validated source before they can be shown." : "Los niveles numéricos requieren una fuente validada antes de poder mostrarse."}</p>
          <a
            className="mt-3 inline-block border-b border-petrol/30 text-sm font-semibold text-petrol transition hover:border-petrol"
            href={jpmSpxLevelsContext.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            {locale === "en" ? "View indicator on TradingView" : "Ver indicador en TradingView"}
          </a>
        </div>
      </div>
    </section>
  );
}
