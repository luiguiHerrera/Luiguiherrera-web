"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";

/** Only disclosure navigation crosses the client boundary; no engine or data props. */
export function RegimeV2Disclosure({ children, className }: { children: ReactNode; className: string }) {
  const root = useRef<HTMLDivElement>(null);
  function reveal(id: string, focus: boolean) {
    const target = document.getElementById(id);
    if (!id.startsWith("v2-") || !target || !root.current?.contains(target)) return false;
    let ancestor: HTMLElement | null = target;
    while (ancestor && root.current.contains(ancestor)) {
      if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
      ancestor = ancestor.parentElement;
    }
    if (focus) {
      const destination = target.querySelector<HTMLElement>("h2, h3") ?? target;
      destination.tabIndex = -1;
      destination.focus({ preventScroll: true });
      target.scrollIntoView({ block: "start", behavior: "instant" });
    }
    return true;
  }
  useEffect(() => {
    const followHash = () => { if (window.location.hash) reveal(window.location.hash.slice(1), true); };
    followHash();
    window.addEventListener("hashchange", followHash);
    return () => window.removeEventListener("hashchange", followHash);
  }, []);
  function navigate(event: MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#v2-"]');
    if (!anchor || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = anchor.getAttribute("href")!.slice(1);
    if (reveal(id, true)) { event.preventDefault(); window.history.replaceState(null, "", `#${id}`); }
  }
  return <div ref={root} className={className} onClick={navigate}>{children}</div>;
}
