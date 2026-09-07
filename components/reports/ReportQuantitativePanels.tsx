import type { ReportQuantitativePanel } from '@/lib/reports/report-statistical-panels';

export function ReportQuantitativePanels({ panels, asset }: { panels: ReportQuantitativePanel[]; asset: string }) {
  return <div className="grid min-w-0 gap-5">
    {panels.map(panel => <section key={panel.title} className="min-w-0 border border-line bg-paper p-3 sm:p-4" aria-label={`${panel.title} · ${asset}`}>
      <h4 className="text-sm font-semibold text-petrol">{panel.title}</h4>
      <p className="mt-2 text-sm leading-6 text-muted">{panel.intro}</p>
      {panel.range ? <StatisticalRange range={panel.range} asset={asset} /> : null}
      {panel.rows.length ? <div className="mt-3 overflow-x-auto" role="region" aria-label={`Tabla de ${panel.title} · ${asset}`} tabIndex={0}>
        <table className="w-full border-collapse text-left text-xs sm:text-sm">
          <caption className="sr-only">{panel.title} · {asset}</caption>
          <thead><tr>{panel.headers.map(header=><th key={header} scope="col" className="border-b border-line bg-panelSoft p-2 font-semibold text-ink">{header}</th>)}</tr></thead>
          <tbody>{panel.rows.map(row=><tr key={row[0]}>{row.map((cell,index)=>index===0?<th key={index} scope="row" className="border-b border-line p-2 font-medium text-ink">{cell}</th>:<td key={index} className="border-b border-line p-2 tabular-nums text-muted">{cell}</td>)}</tr>)}</tbody>
        </table>
      </div> : null}
      {panel.notes.map(note=><p key={note} className="mt-3 text-xs leading-5 text-muted">{note}</p>)}
    </section>)}
  </div>;
}
function StatisticalRange({ range, asset }: { range: NonNullable<ReportQuantitativePanel['range']>; asset: string }) {
  const x=(value:number)=>28+(value-range.low)/(range.high-range.low||1)*444;
  return <svg viewBox="0 0 500 82" className="mt-3 w-full" role="img" aria-label={`Rango estadístico semanal de ${asset}; precio al snapshot ${range.current}. Los valores exactos figuran en la tabla.`}>
    <line x1="28" y1="44" x2="472" y2="44" stroke="#d8d2c6" strokeWidth="8" />
    {range.marks.map(mark=><g key={mark.label}><line x1={x(mark.value)} x2={x(mark.value)} y1="34" y2="53" stroke="#153638" strokeWidth="2"/><text x={x(mark.value)} y="72" textAnchor="middle" fill="#153638" fontSize="12">{mark.label}</text></g>)}
    <circle cx={x(range.current)} cy="44" r="6" fill="#9a7a45"/>
    <text x={Math.min(443,Math.max(60,x(range.current)))} y="19" textAnchor="middle" fill="#796037" fontSize="12">Precio al corte</text>
  </svg>;
}
