import { ExpandableInsightCard } from "@/components/ui/ExpandableInsightCard";
import type { GldFlowPressure } from "@/lib/dashboard/types";

function formatPercent(value: number | null, locale: "es" | "en") {
  if (value === null) return locale === "en" ? "Pending" : "Dato pendiente";
  const formatted = new Intl.NumberFormat(locale === "en" ? "en-US" : "es-ES", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  return value > 0 ? `+${formatted}` : formatted;
}

function formatShares(value: number | null, locale: "es" | "en") {
  if (value === null) return locale === "en" ? "Pending" : "Dato pendiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat(locale === "en" ? "en-US" : "es-ES", { maximumFractionDigits: 0 }).format(value)}`;
}

function formatUsd(value: number | null, locale: "es" | "en") {
  if (value === null) return locale === "en" ? "Pending" : "Dato pendiente";
  const sign = value > 0 ? "+" : "";
  const abs = Math.abs(value);
  const divisor = abs >= 1_000_000_000 ? 1_000_000_000 : 1_000_000;
  const suffix = divisor === 1_000_000_000 ? "B USD" : "M USD";
  return `${sign}${(value / divisor).toFixed(1)} ${suffix}`;
}

export function GldFlowPressureModule({ data, locale = "es" }: { data: GldFlowPressure; locale?: "es" | "en" }) {
  const isEnglish = locale === "en";
  const status = data.dataStatus === "delayed" ? (isEnglish ? "Delayed data" : "Dato retrasado") : data.dataStatus === "available" ? (isEnglish ? "Data available" : "Datos disponibles") : (isEnglish ? "Pending data" : "Dato pendiente");
  const label = isEnglish
    ? data.pressureState === "inflow" ? "Probable net creation" : data.pressureState === "outflow" ? "Probable net redemption" : data.pressureState === "neutral" ? "Neutral pressure" : "Pending data"
    : data.pressureLabel;

  return (
    <ExpandableInsightCard
      eyebrow={isEnglish ? "Gold · GLD" : "Oro · GLD"}
      title={isEnglish ? "Flow-pressure proxy" : "Proxy de presión de flujos"}
      reading={label}
      status={status}
      metrics={[
        { label: "1D", value: formatPercent(data.oneDayShareChangePct, locale) },
        { label: "5D", value: formatPercent(data.fiveDayShareChangePct, locale), tone: data.pressureState === "inflow" ? "sage" : data.pressureState === "outflow" ? "brass" : undefined },
        { label: "20D", value: formatPercent(data.twentyDayShareChangePct, locale) },
        { label: isEnglish ? "As of" : "Fecha", value: data.asOf ?? (isEnglish ? "Pending" : "Dato pendiente") },
      ]}
    >
      <p className="text-sm leading-6 text-muted">
        {isEnglish
          ? "This proxy observes changes in GLD shares outstanding over 1, 5 and 20 sessions. Positive changes suggest probable net creations; negative changes suggest probable net redemptions."
          : "Este proxy observa cambios en las participaciones en circulación de GLD durante 1, 5 y 20 sesiones. Los cambios positivos sugieren creaciones netas probables; los negativos, redenciones netas probables."}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [isEnglish ? "Shares 1D" : "Participaciones 1D", formatShares(data.oneDayShareChange, locale)],
          [isEnglish ? "Shares 5D" : "Participaciones 5D", formatShares(data.fiveDayShareChange, locale)],
          [isEnglish ? "Shares 20D" : "Participaciones 20D", formatShares(data.twentyDayShareChange, locale)],
          [isEnglish ? "Approximate implied amount 5D" : "Importe implícito aproximado 5D", formatUsd(data.fiveDayImpliedPressureUsd, locale)],
        ].map(([labelText, value]) => (
          <div key={labelText} className="border border-line bg-panelSoft p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{labelText}</p>
            <p className="mt-2 font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-line pt-4 text-xs leading-5 text-muted">
        <p>{data.sourceNote}</p>
        <p className="mt-2">{data.reliabilityNote}</p>
        <a className="mt-2 inline-block font-semibold text-petrol underline-offset-4 hover:underline" href={data.sourceUrl} target="_blank" rel="noreferrer">
          {data.source}
        </a>
      </div>
    </ExpandableInsightCard>
  );
}
