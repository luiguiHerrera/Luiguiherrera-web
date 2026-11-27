"use client";

import styles from "./PersonalFinanceEntry.module.css";

type PersonalFinanceHeroCtaProps = {
  label: string;
};

export function PersonalFinanceHeroCta({ label }: PersonalFinanceHeroCtaProps) {
  function moveToGuidedRoute() {
    const target = document.getElementById("personal-finance-guided-route");
    if (!target) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <button
      type="button"
      aria-controls="personal-finance-guided-route"
      className={styles.heroCta}
      onClick={moveToGuidedRoute}
    >
      {label}
    </button>
  );
}
