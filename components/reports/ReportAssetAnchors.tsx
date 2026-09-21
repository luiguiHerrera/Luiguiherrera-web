"use client";

import { useEffect } from "react";

/** Open the native disclosure targeted by a report deep link. */
export function ReportAssetAnchors() {
  useEffect(() => {
    function revealTarget(hash: string = window.location.hash) {
      let id: string;
      try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (target instanceof HTMLDetailsElement) {
        target.open = true;
        target.scrollIntoView({ block: "start" });
      }
    }
    function onClick(event: MouseEvent) {
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (anchor?.target !== "_blank" && !event.metaKey && !event.ctrlKey && anchor?.hash && anchor.pathname === window.location.pathname && anchor.origin === window.location.origin) {
        requestAnimationFrame(() => revealTarget(anchor.hash));
      }
    }
    const onHashChange = () => revealTarget();
    revealTarget();
    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      document.removeEventListener("click", onClick);
    };
  }, []);
  return null;
}
