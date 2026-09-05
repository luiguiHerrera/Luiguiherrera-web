"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { InvestorEntryContent } from "@/lib/investor/entry-content";
import styles from "./InvestorEntry.module.css";

export function InvestorHeroCta({ children }: { children: React.ReactNode }) {
  return (
    <a className={styles.primaryCta} href="#investor-guided-route" onClick={(event) => {
      const option = document.querySelector<HTMLButtonElement>("#investor-guided-route button[aria-expanded='true']");
      if (!option) return;
      event.preventDefault();
      option.focus({ preventScroll: true });
      document.getElementById("investor-guided-route")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    }}>
      {children} <span aria-hidden="true">↓</span>
    </a>
  );
}

export function InvestorGuidedRoute({ content }: { content: InvestorEntryContent["guided"] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const previousIndex = useRef(activeIndex);

  useEffect(() => {
    if (previousIndex.current === activeIndex) return;
    previousIndex.current = activeIndex;
    // Collapsing the previous mobile panel can move the chosen option above
    // the viewport. Keep it visible without scrolling on the initial render.
    const option = optionRefs.current[activeIndex];
    if (!option || !window.matchMedia("(max-width: 767px)").matches) return;
    const rect = option.getBoundingClientRect();
    if (rect.top < 80 || rect.bottom > window.innerHeight) {
      option.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [activeIndex]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case "ArrowDown": next = (index + 1) % content.options.length; break;
      case "ArrowUp": next = (index - 1 + content.options.length) % content.options.length; break;
      case "Home": next = 0; break;
      case "End": next = content.options.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setActiveIndex(next);
    optionRefs.current[next]?.focus({ preventScroll: true });
  }

  return (
    <div className={styles.selector} role="group" aria-labelledby="investor-guide-title">
      {content.options.map((option, index) => (
        <Fragment key={option.id}>
          <button
            ref={(node) => { optionRefs.current[index] = node; }}
            id={`investor-option-${option.id}`}
            type="button"
            className={styles.option}
            style={{ gridRow: index + 1 }}
            aria-expanded={activeIndex === index}
            aria-controls={`investor-panel-${option.id}`}
            onClick={() => setActiveIndex(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span>{option.label}</span>
            <span className={styles.direction} aria-hidden="true">{activeIndex === index ? "→" : "›"}</span>
          </button>
          <div
            id={`investor-panel-${option.id}`}
            role="region"
            aria-labelledby={`investor-option-${option.id}`}
            hidden={activeIndex !== index}
            className={styles.recommendation}
          >
            <p className={styles.eyebrow}>{content.eyebrow}</p>
            <h3>{option.title}</h3>
            <p className={styles.description}>{option.description}</p>
            <ul>
              {option.outcomes.map((outcome) => (
                <li key={outcome}><span aria-hidden="true">✓</span>{outcome}</li>
              ))}
            </ul>
            <p className={styles.time}>{option.time} <span>· {content.timeLabel}</span></p>
            <Link className={styles.primaryCta} href={option.href}>{option.cta} <span aria-hidden="true">→</span></Link>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
