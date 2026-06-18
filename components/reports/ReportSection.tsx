import type { ReactNode } from "react";

type ReportSectionProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
};

export function ReportSection({ children, eyebrow, title }: ReportSectionProps) {
  return (
    <section className="border border-line/90 bg-panel p-4 shadow-[0_8px_24px_rgba(31,35,40,0.025)] md:p-6">
      <div className="mb-4 md:mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold leading-tight text-ink md:text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}
