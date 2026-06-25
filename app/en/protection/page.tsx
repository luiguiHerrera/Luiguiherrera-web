import Link from "next/link";

const protectionItems = [
  { title: "Protect your money", href: "/en/protect-your-money", description: "Checklist, warning signs and filters before committing capital." },
  { title: "Cross-signal radar", href: "/en/dashboard", description: "The dashboard integrates regime signals to contrast context, stress and risk support." },
];

export default function EnglishProtectionPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <section className="border-b border-line pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Risk control</p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Protection</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          Checklists and filters to protect the margin of error before committing capital.
        </p>
      </section>
      <section className="mt-8 grid gap-5 md:grid-cols-2">
        {protectionItems.map((item) => (
          <Link key={item.href} href={item.href} className="group flex min-h-[13rem] flex-col rounded-[6px] border border-line bg-white/75 p-5 shadow-[0_12px_32px_rgba(11,52,54,0.045)] transition hover:border-petrol hover:bg-white">
            <h2 className="text-2xl font-semibold text-ink">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{item.description}</p>
            <span className="mt-auto pt-6 text-sm font-semibold text-petrol">Open &rarr;</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
