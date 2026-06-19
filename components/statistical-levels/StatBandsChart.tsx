import type { CompactPricePoint } from "@/lib/statistical-levels/types";

type StatBandsChartProps = {
  locale?: "es" | "en";
  series: CompactPricePoint[];
};

function pathFromSeries(series: CompactPricePoint[], key: "close" | "ma200", width = 100, height = 44) {
  const values = series.map((point) => point[key]).filter((value): value is number => typeof value === "number");
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  return series
    .map((point, index) => {
      const value = point[key];
      if (typeof value !== "number") return "";
      const x = (index / Math.max(series.length - 1, 1)) * width;
      const y = height - ((value - min) / spread) * (height - 8) - 4;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .filter(Boolean)
    .join(" ");
}

export function StatBandsChart({ locale = "es", series }: StatBandsChartProps) {
  if (series.length < 2) {
    return (
      <div className="flex h-28 items-center justify-center border border-dashed border-line bg-panelSoft text-sm text-muted">
        {locale === "en" ? "Not enough history for chart" : "Historial insuficiente para gráfico"}
      </div>
    );
  }

  const pricePath = pathFromSeries(series, "close");
  const maPath = pathFromSeries(series, "ma200");

  return (
    <svg viewBox="0 0 100 44" className="h-28 w-full border border-line bg-panelSoft" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2="100" y1="11" y2="11" stroke="#eee9e3" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      <line x1="0" x2="100" y1="22" y2="22" stroke="#e7e2dc" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
      <line x1="0" x2="100" y1="33" y2="33" stroke="#eee9e3" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      {maPath ? <path d={maPath} fill="none" stroke="#b8b2aa" strokeWidth="1.1" vectorEffect="non-scaling-stroke" /> : null}
      <path d={pricePath} fill="none" stroke="#6f8f7b" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
