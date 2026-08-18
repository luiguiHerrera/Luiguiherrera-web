import Link from "next/link";
import type { TomDecayContent } from "@/lib/research/tom-decay/content";

export function TomDecayFooter({ content }: { content: TomDecayContent }) {
  const copy = content.footer;

  return (
    <footer className="border-t border-line py-12 md:py-16">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink">{copy.author}</p>
          <p className="mt-2 max-w-sm text-sm leading-7 text-muted">{copy.role}</p>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            {copy.relatedTitle}
          </p>
          <ul className="mt-4 grid gap-2">
            {copy.related.map((item) => (
              <li key={item.href}>
                <Link
                  className="block border border-line bg-white/70 px-4 py-3 transition hover:border-petrol/45 hover:bg-white"
                  href={item.href}
                >
                  <span className="block text-sm font-semibold text-ink">{item.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">{item.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-10 border-t border-line pt-6 text-xs leading-6 text-muted">{copy.closing}</p>
    </footer>
  );
}
