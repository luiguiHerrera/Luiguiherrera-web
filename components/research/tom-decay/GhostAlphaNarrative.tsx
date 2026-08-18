"use client";

import { useEffect, useRef, useState } from "react";
import { narrativeMeasure } from "@/components/research/tom-decay/TomDecaySection";
import type { TomDecayContent } from "@/lib/research/tom-decay/content";

export function GhostAlphaNarrative({ content }: { content: TomDecayContent }) {
  const copy = content.ghost;
  const [entered, setEntered] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const node = listRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setEntered(true);
      },
      { rootMargin: "-10% 0px -20% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-w-0">
      <div className={`${narrativeMeasure} border-l-2 border-petrol/50 pl-5`}>
        <p className="text-sm leading-7 text-muted md:text-base">{copy.bridge}</p>
        <p className="mt-2 text-base font-semibold leading-8 text-ink md:text-lg">{copy.question}</p>
      </div>

      <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        {copy.stepsLabel}
      </p>

      <ol className="mt-4 grid gap-3 md:grid-cols-4" data-entered={entered ? "true" : undefined} ref={listRef}>
        {copy.steps.map((step, index) => (
          <li
            className="tom-decay-step min-w-0 border border-line bg-white/75 p-5"
            key={step.label}
            style={{ "--tom-step-index": index } as React.CSSProperties}
          >
            <span
              aria-hidden="true"
              className="block h-1 w-full rounded-full bg-petrol"
              style={{ opacity: 0.15 + (1 - index / copy.steps.length) * 0.75 }}
            />
            <p className="mt-4 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-petrol">
              {step.label}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">{step.caption}</p>
          </li>
        ))}
      </ol>

      <p className={`${narrativeMeasure} mt-7 border-t border-line pt-5 text-lg font-semibold leading-8 text-ink md:text-2xl md:leading-10`}>
        {copy.closing}
      </p>
    </div>
  );
}
