"use client";

import { useRef, useSyncExternalStore, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import type { ResourceCategory } from "@/lib/resources/resources-content";
import styles from "./ResourcesPage.module.css";

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  window.addEventListener("resources-platform-change", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
    window.removeEventListener("resources-platform-change", callback);
  };
}

function snapshot() { return window.location.hash.slice(1); }
function serverSnapshot() { return "tradingview"; }

export function ResourcesLibrary({ categories, label, children }: {
  categories: ResourceCategory[];
  label: string;
  children: ReactNode[];
}) {
  const hash = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const selected = categories.some((category) => category.id === hash) ? hash : categories[0].id;
  const links = useRef<Record<string, HTMLAnchorElement | null>>({});

  function select(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (window.location.hash !== href) window.history.pushState(null, "", href);
    window.dispatchEvent(new Event("resources-platform-change"));
  }

  function navigate(event: KeyboardEvent<HTMLAnchorElement>, index: number) {
    let next: number;
    switch (event.key) {
      case "ArrowRight": next = (index + 1) % categories.length; break;
      case "ArrowLeft": next = (index - 1 + categories.length) % categories.length; break;
      case "Home": next = 0; break;
      case "End": next = categories.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const link = links.current[categories[next].id];
    link?.click();
    link?.focus({ preventScroll: true });
    link?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  return (
    <div className={styles.library} data-resources-library>
      <div role="tablist" aria-label={label} className={styles.tabs}>
        {categories.map((category, index) => (
          <a
            key={category.id}
            ref={(element) => { links.current[category.id] = element; }}
            id={"resource-tab-" + category.id}
            role="tab"
            href={category.href}
            aria-selected={selected === category.id}
            aria-controls={category.id}
            tabIndex={selected === category.id ? 0 : -1}
            className={styles.tab}
            data-available={category.id === "tradingview"}
            onClick={(event) => select(event, category.href)}
            onKeyDown={(event) => navigate(event, index)}
          >
            <span className={styles.tabName}>{category.name}</span>
            <span className={styles.tabStatus}>{category.status}</span>
          </a>
        ))}
      </div>
      {categories.map((category, index) => (
        <section
          key={category.id}
          id={category.id}
          role="tabpanel"
          aria-labelledby={"resource-tab-" + category.id}
          hidden={selected !== category.id}
          tabIndex={0}
          className={styles.panel}
        >
          {children[index]}
        </section>
      ))}
    </div>
  );
}
