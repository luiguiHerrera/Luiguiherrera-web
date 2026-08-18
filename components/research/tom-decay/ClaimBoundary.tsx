import type { TomDecayContent } from "@/lib/research/tom-decay/content";

export function ClaimBoundary({ content }: { content: TomDecayContent }) {
  const copy = content.boundary;

  const columns = [
    { title: copy.supportsTitle, items: copy.supports, accent: true },
    { title: copy.limitsTitle, items: copy.limits, accent: false },
  ];

  return (
    <div className="grid min-w-0 gap-px overflow-hidden border border-line bg-line md:grid-cols-2">
      {columns.map((column) => (
        <div
          className={`min-w-0 p-6 md:p-8 ${column.accent ? "bg-petrol text-white" : "bg-white/85"}`}
          key={column.title}
        >
          <h3
            className={`text-sm font-semibold uppercase tracking-[0.14em] ${
              column.accent ? "text-white/70" : "text-muted"
            }`}
          >
            {column.title}
          </h3>
          <ul className="mt-5 grid gap-3.5">
            {column.items.map((item) => (
              <li
                className={`grid grid-cols-[0.75rem_1fr] gap-3 text-sm leading-7 ${
                  column.accent ? "text-white/90" : "text-ink"
                }`}
                key={item}
              >
                <span
                  aria-hidden="true"
                  className={`mt-3 h-px w-3 ${column.accent ? "bg-brass" : "bg-line"}`}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
