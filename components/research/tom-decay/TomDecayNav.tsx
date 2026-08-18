"use client";

import { useEffect, useState } from "react";
import type { TomDecayContent } from "@/lib/research/tom-decay/content";

export function TomDecayNav({ nav }: { nav: TomDecayContent["nav"] }) {
  const [activeId, setActiveId] = useState(nav.items[0]?.id ?? "");

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id || !nav.items.some((item) => item.id === id)) return;

    let attempts = 0;
    let timer = 0;

    const align = () => {
      const target = document.getElementById(id);
      if (target) {
        const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
        if (Math.abs(target.getBoundingClientRect().top - margin) > 4) {
          target.scrollIntoView({ behavior: "instant", block: "start" });
          setActiveId(id);
        }
      }
      attempts += 1;
      if (attempts < 8) timer = window.setTimeout(align, 120);
    };

    timer = window.setTimeout(align, 50);
    return () => window.clearTimeout(timer);
  }, [nav.items]);

  useEffect(() => {
    const sections = nav.items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [nav.items]);

  return (
    <nav
      aria-label={nav.label}
      className="tom-decay-scroll sticky top-[3.25rem] z-30 -mx-4 overflow-x-auto border-y border-line bg-[#fffdf8]/95 px-4 backdrop-blur md:-mx-5 md:px-5"
    >
      <ul className="mx-auto flex min-w-max items-center gap-1 py-2">
        {nav.items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                aria-current={active ? "true" : undefined}
                className={`inline-flex min-h-9 items-center whitespace-nowrap rounded-[3px] border px-3 py-1.5 text-[11px] font-semibold transition ${
                  active
                    ? "border-petrol/30 bg-paper text-petrol"
                    : "border-transparent text-muted hover:bg-paper hover:text-petrol"
                }`}
                href={`#${item.id}`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
