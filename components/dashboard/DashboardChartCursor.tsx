/** Shared visual marker; each chart keeps its existing scales and inspection state. */
export function DashboardChartCursor({ x, y1 = 0, y2 = 78, date }: { x: number | null | undefined; y1?: number; y2?: number; date?: string }) {
  if (x == null) return null;
  return <line data-chart-cursor data-chart-date={date} x1={x} x2={x} y1={y1} y2={y2}
    stroke="#82734f" strokeOpacity=".65" strokeWidth=".8" vectorEffect="non-scaling-stroke" pointerEvents="none" />;
}
