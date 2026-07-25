export type ReadingCardItem = { label: string; value: string };

export function ReadingCard({ items, title }: { items: ReadingCardItem[]; title: string }) {
  return (
    <aside aria-label={title} className="editorial-surface mt-6 min-w-0 overflow-hidden rounded-[6px] border border-line p-4 md:mt-8 md:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{title}</h2>
      <dl className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="min-w-0 border-l border-petrol/20 pl-3">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-brass">{item.label}</dt>
            <dd className="mt-2 break-words text-sm leading-6 text-muted [overflow-wrap:anywhere]">{item.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
