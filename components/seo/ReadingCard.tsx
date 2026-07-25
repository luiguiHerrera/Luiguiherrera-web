export type ReadingCardItem = { label: string; value: string };

export function ReadingCard({
  attached = false,
  className = "",
  items,
  title,
}: {
  attached?: boolean;
  className?: string;
  items: ReadingCardItem[];
  title: string;
}) {
  return (
    <aside
      aria-label={title}
      className={`editorial-surface min-w-0 overflow-hidden border border-line p-4 md:p-5 ${
        attached ? "mt-0 rounded-b-[6px] border-t-0" : "mt-6 rounded-[6px] md:mt-8"
      } ${className}`}
    >
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
