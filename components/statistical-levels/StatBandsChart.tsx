import { commonPricePaths } from "@/lib/statistical-levels/defect-repairs.mjs";
import type { CompactPricePoint } from "@/lib/statistical-levels/types";

type StatBandsChartProps = {
  locale?: "es" | "en";
  series: CompactPricePoint[];
};

export function StatBandsChart({ locale = "es", series }: StatBandsChartProps) {
  if (series.length < 2) {
    return (
      <div className="flex h-28 items-center justify-center border border-dashed border-line bg-panelSoft text-sm text-muted">
        {locale === "en" ? "Not enough history for chart" : "Historial insuficiente para gráfico"}
      </div>
    );
  }

  const { close: pricePath, ma200: maPath } = commonPricePaths(series);

  return (
    <figure><figcaption className="mb-2 text-xs text-muted">{locale === "en" ? "Price (dark green) and moving average (gray) · shared price scale" : "Precio (verde oscuro) y media móvil (gris) · escala de precios compartida"}</figcaption><svg viewBox="0 0 100 44" className="h-28 w-full border border-line bg-panelSoft" preserveAspectRatio="none" role="img" aria-label={locale === "en" ? "Adjusted price and moving average on the same scale" : "Precio ajustado y media móvil en la misma escala"}>
      <line x1="0" x2="100" y1="11" y2="11" stroke="#eee9e3" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      <line x1="0" x2="100" y1="22" y2="22" stroke="#e7e2dc" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
      <line x1="0" x2="100" y1="33" y2="33" stroke="#eee9e3" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      {maPath ? <path d={maPath} fill="none" stroke="#b8b2aa" strokeWidth="1.1" vectorEffect="non-scaling-stroke" /> : null}
      <path d={pricePath} fill="none" stroke="#123b3d" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
    </svg></figure>
  );
}
