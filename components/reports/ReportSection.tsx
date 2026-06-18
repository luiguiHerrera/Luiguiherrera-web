import type { ReactNode } from "react";

type ReportSectionProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
};

export function ReportSection({ children, eyebrow, title }: ReportSectionProps) {
  return (
    <section className="border border-line bg-panel p-4 md:p-6">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}
