export function DetailGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-3 grid border-y border-line" data-detail-grid>
      {items.map(([label, value]) => (
        <div key={label}>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
          <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
        </div>
      ))}
    </div>
  );
}
