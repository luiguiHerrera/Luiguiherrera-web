import { ReportText } from "@/components/reports/ReportSourcePolicy";
import type { ReactNode } from "react";
import styles from "./report-premium.module.css";

type ReportSectionProps = {
  id?: string;
  presentation?: "default" | "editorial";
  eyebrow: string;
  title: string;
  headingLevel?: 2 | 3;
  children: ReactNode;
};

export function ReportSection({ children, eyebrow, title, headingLevel = 2, id, presentation = "default" }: ReportSectionProps) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <section id={id} className={presentation === "editorial" ? styles.chapter : "border border-line/90 bg-panel p-4 shadow-[0_8px_24px_rgba(31,35,40,0.025)] md:p-6"}>
      <div className="mb-4 md:mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{eyebrow}</p>
        <Heading className="mt-2 text-xl font-semibold leading-tight text-ink md:text-2xl"><ReportText>{title}</ReportText></Heading>
      </div>
      {children}
    </section>
  );
}
