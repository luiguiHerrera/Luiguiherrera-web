"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  nextPersonalFinanceOptionIndex,
  personalFinanceDefaultOptionId,
  type PersonalFinanceEntryContent,
  type PersonalFinanceRouteOption,
} from "@/lib/personal-finance/entry-content";
import styles from "./PersonalFinanceEntry.module.css";

function Recommendation({ option, hidden }: { option: PersonalFinanceRouteOption; hidden: boolean }) {
  const panelId = "personal-finance-recommendation-" + option.id;
  const optionId = "personal-finance-option-" + option.id;
  const recommendation = option.recommendation;
  return (
    <div id={panelId} role="region" aria-labelledby={optionId} hidden={hidden} className={styles.recommendation}>
      <p className={styles.eyebrow}>{recommendation.eyebrow}</p>
      <h3>{recommendation.title}</h3>
      <p className={styles.description}>{recommendation.description}</p>
      <div className={styles.outcomes}>
        <p className={styles.eyebrow}>{recommendation.outcomeLabel}</p>
        <ul>{recommendation.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul>
      </div>
      <div className={styles.actionGroup}>
        {recommendation.actionLabel ? <p className={styles.eyebrow}>{recommendation.actionLabel}</p> : null}
        <div className={recommendation.actions.length === 2 ? styles.pairedActions : styles.singleAction}>
          {recommendation.actions.map((action) => (
            <div key={action.href} className={styles.action}>
              {action.label ? <h4>{action.label}</h4> : null}
              <p className={styles.actionTime}>{action.time}</p>
              {action.description ? <p className={styles.actionDescription}>{action.description}</p> : null}
              <Link href={action.href}>{action.cta}</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PersonalFinanceGuidedRoute({ content }: { content: PersonalFinanceEntryContent["guidedRoute"] }) {
  const [activeId, setActiveId] = useState<PersonalFinanceRouteOption["id"]>(personalFinanceDefaultOptionId);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const previousId = useRef(activeId);

  useEffect(() => {
    if (previousId.current === activeId) return;
    previousId.current = activeId;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const option = optionRefs.current[content.options.findIndex((item) => item.id === activeId)];
    if (!option) return;
    const rect = option.getBoundingClientRect();
    if (rect.top < 80 || rect.bottom > window.innerHeight) option.scrollIntoView({ block: "start", behavior: "instant" });
  }, [activeId, content.options]);

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    const nextIndex = nextPersonalFinanceOptionIndex(currentIndex, event.key, content.options.length);
    if (nextIndex === currentIndex && !["Home", "End"].includes(event.key)) return;
    event.preventDefault();
    setActiveId(content.options[nextIndex].id);
    optionRefs.current[nextIndex]?.focus({ preventScroll: true });
  }

  return (
    <div role="group" aria-label={content.title} className={styles.selector}>
      {content.options.map((option, index) => {
        const isActive = option.id === activeId;
        const optionId = "personal-finance-option-" + option.id;
        const panelId = "personal-finance-recommendation-" + option.id;
        return (
          <Fragment key={option.id}>
            <button ref={(node) => { optionRefs.current[index] = node; }} id={optionId} type="button"
              aria-controls={panelId} aria-expanded={isActive} className={styles.option} style={{ gridRow: index + 1 }}
              onClick={() => setActiveId(option.id)} onKeyDown={(event) => handleOptionKeyDown(event, index)}>
              <span className={styles.optionNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span>{option.label}</span>
              <span className={styles.direction} aria-hidden="true">{isActive ? "→" : "›"}</span>
            </button>
            <Recommendation option={option} hidden={!isActive} />
          </Fragment>
        );
      })}
    </div>
  );
}
