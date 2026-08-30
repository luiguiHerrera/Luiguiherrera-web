"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { localeFromPathname } from "@/lib/i18n/locales";

type ExpandableInsightCardProps = {
  eyebrow?: string;
  title: string;
  reading: string;
  metrics?: Array<{ label: string; value: string; tone?: "neutral" | "sage" | "brass" | "danger" }>;
  status?: string;
  defaultOpen?: boolean;
  summaryExtra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  eyebrowClassName?: string;
  titleClassName?: string;
};

const toneClass = {
  neutral: "border-line bg-white/70 text-ink",
  sage: "border-sage/35 bg-[#eef5f1] text-[#385242]",
  brass: "border-brass/35 bg-[#f7f0e2] text-[#76562d]",
  danger: "border-danger/35 bg-[#f4e9e6] text-[#7b3f3f]",
};

export function ExpandableInsightCard({
  eyebrow,
  title,
  reading,
  metrics = [],
  status,
  defaultOpen = false,
  summaryExtra,
  children,
  className = "",
  eyebrowClassName,
  titleClassName,
}: ExpandableInsightCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const buttonLabel = locale === "en" ? (open ? "Collapse context" : "Expand context") : (open ? "Contraer contexto" : "Ampliar contexto");

  return (
    <section className={`estate-card min-w-0 rounded-[6px] border border-line/90 transition duration-200 hover:border-petrol/35 ${className}`}>
      <div className="p-3.5 md:p-5">
        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? <p className={eyebrowClassName ?? "text-[11px] font-semibold uppercase tracking-[0.16em] text-petrol md:text-xs md:tracking-[0.18em]"}>{eyebrow}</p> : null}
            <h2 className={titleClassName ?? "mt-1.5 text-lg font-semibold leading-snug text-ink md:mt-2 md:text-2xl"}>{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted md:mt-3 md:text-base md:leading-7">{reading}</p>
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-start lg:flex-col lg:items-end">
            {status ? (
              <span className="min-w-0 truncate rounded-[4px] border border-line bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-muted md:text-xs">
                {status}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              className="shrink-0 rounded-[4px] border border-petrol bg-petrol px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-panel hover:text-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20 md:px-4 md:py-2 md:text-sm"
            >
              {buttonLabel}
            </button>
          </div>
        </div>

        {metrics.length ? (
          <div data-insight-metrics className="mt-4 grid grid-cols-2 gap-2 md:mt-5 md:gap-3 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className={`min-w-0 border p-2.5 md:p-3 ${toneClass[metric.tone ?? "neutral"]}`}>
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] opacity-75 md:text-[11px] md:tracking-[0.12em]">{metric.label}</p>
                <p data-insight-metric-value className="mt-1 break-words text-[13px] font-semibold leading-5 md:text-sm">{metric.value}</p>
              </div>
            ))}
          </div>
        ) : null}
        {summaryExtra ? <div className="mt-4 md:mt-5">{summaryExtra}</div> : null}
      </div>

      {open ? <div className="border-t border-line/80 bg-paper/55 p-3.5 md:p-5">{children}</div> : null}
    </section>
  );
}
