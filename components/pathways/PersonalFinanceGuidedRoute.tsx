"use client";

import Link from "next/link";
import { Fragment, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import styles from "./PersonalFinanceGuidedRoute.module.css";
import {
  nextPersonalFinanceOptionIndex,
  personalFinanceDefaultOptionId,
  type PersonalFinanceEntryContent,
  type PersonalFinanceRouteOption,
} from "@/lib/personal-finance/entry-content";

type PersonalFinanceGuidedRouteProps = {
  content: PersonalFinanceEntryContent["guidedRoute"];
};

const desktopRows = [
  "md:row-start-1",
  "md:row-start-2",
  "md:row-start-3",
  "md:row-start-4",
] as const;

function Recommendation({ option }: { option: PersonalFinanceRouteOption }) {
  const panelId = "personal-finance-recommendation-" + option.id;
  const optionId = "personal-finance-option-" + option.id;

  return (
    <div
      id={panelId}
      role="region"
      aria-labelledby={optionId}
      className={[
        styles.recommendation,
        "border-l-2 border-brass bg-white/55 px-5 py-6",
        "md:col-start-2 md:row-span-4 md:row-start-1 md:border-l md:border-line md:bg-transparent md:px-10 md:py-2 lg:px-12",
      ].join(" ")}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">
        {option.recommendation.eyebrow}
      </p>
      <h3 className="mt-3 max-w-[24ch] [font-family:var(--font-personal-finance-display)] text-[clamp(1.75rem,3vw,2.15rem)] font-medium leading-[1.03] tracking-[-0.025em] text-ink">
        {option.recommendation.title}
      </h3>
      <p className="mt-4 max-w-[44rem] text-base leading-7 text-muted">
        {option.recommendation.description}
      </p>

      <div className="mt-6 border-t border-line pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">
          {option.recommendation.outcomeLabel}
        </p>
        <ul className="mt-3 grid gap-2.5 text-sm leading-6 text-muted">
          {option.recommendation.outcomes.map((outcome) => (
            <li key={outcome} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 text-brass">✓</span>
              <span>{outcome}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        {option.recommendation.actionLabel ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">
            {option.recommendation.actionLabel}
          </p>
        ) : null}
        <div
          className={[
            option.recommendation.actionLabel ? "mt-3" : "",
            option.recommendation.actions.length === 2
              ? "grid gap-4 lg:grid-cols-2"
              : "",
          ].join(" ")}
        >
          {option.recommendation.actions.map((action) => (
            <div
              key={action.href}
              className={option.recommendation.actions.length === 2
                ? "flex min-w-0 flex-col border-t border-line pt-4"
                : ""}
            >
              {action.label ? (
                <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-petrol">
                  {action.label}
                </h4>
              ) : null}
              <p className={[
                "text-sm leading-6 text-muted",
                action.label ? "mt-2" : "",
              ].join(" ")}>{action.time}</p>
              {action.description ? (
                <p className="mt-2 text-sm leading-6 text-muted">{action.description}</p>
              ) : null}
              <Link
                href={action.href}
                className={[
                  "inline-flex min-h-12 items-center justify-center rounded-[4px] border border-petrol px-5 py-3 text-center text-sm font-semibold transition",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol",
                  option.recommendation.actions.length === 2
                    ? "mt-4 bg-white/70 text-petrol hover:bg-petrol hover:text-white lg:mt-auto"
                    : "mt-5 bg-petrol text-white shadow-[0_10px_22px_rgba(11,52,54,0.12)] hover:bg-white hover:text-petrol",
                ].join(" ")}
              >
                {action.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PersonalFinanceGuidedRoute({ content }: PersonalFinanceGuidedRouteProps) {
  const [activeId, setActiveId] = useState<PersonalFinanceRouteOption["id"]>(
    personalFinanceDefaultOptionId,
  );
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    const nextIndex = nextPersonalFinanceOptionIndex(currentIndex, event.key, content.options.length);
    if (nextIndex === currentIndex && !["Home", "End"].includes(event.key)) return;

    event.preventDefault();
    const nextOption = content.options[nextIndex];
    setActiveId(nextOption.id);
    optionRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      role="group"
      aria-label={content.title}
      className="mt-7 grid min-w-0 md:grid-cols-[minmax(0,0.43fr)_minmax(0,0.57fr)] md:grid-rows-4"
    >
      {content.options.map((option, index) => {
        const isActive = option.id === activeId;
        const optionId = "personal-finance-option-" + option.id;
        const panelId = "personal-finance-recommendation-" + option.id;
        const optionClasses = [
          "group col-start-1 grid min-h-[5.5rem] w-full grid-cols-[2.25rem_minmax(0,1fr)_1.25rem] items-center gap-3",
          "border-b border-l-2 px-4 py-4 text-left transition",
          "focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-petrol",
          "md:min-h-[6rem] md:px-5",
          desktopRows[index],
          index === 0 ? "border-t" : "",
          isActive
            ? "border-l-brass bg-panelSoft/70 text-ink"
            : "border-l-transparent bg-transparent text-muted hover:bg-white/55 hover:text-ink",
        ].filter(Boolean).join(" ");

        return (
          <Fragment key={option.id}>
            <button
              ref={(node) => { optionRefs.current[index] = node; }}
              id={optionId}
              type="button"
              aria-controls={panelId}
              aria-expanded={isActive}
              className={optionClasses}
              onClick={() => setActiveId(option.id)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
            >
              <span aria-hidden="true" className={["font-serif text-lg", isActive ? "text-brass" : "text-muted"].join(" ")}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={["text-[15px] leading-6", isActive ? "font-semibold" : "font-medium"].join(" ")}>
                {option.label}
              </span>
              <span
                aria-hidden="true"
                className={[
                  "text-base transition-transform",
                  isActive ? "translate-x-0 text-brass" : "text-muted group-hover:translate-x-0.5",
                ].join(" ")}
              >
                {isActive ? "→" : "›"}
              </span>
            </button>
            {isActive ? <Recommendation option={option} /> : null}
          </Fragment>
        );
      })}
    </div>
  );
}
