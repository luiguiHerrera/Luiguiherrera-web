"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

type TermTooltipProps = {
  helpLabel: string;
  term: string;
  text: string;
};

const VIEWPORT_MARGIN = 12;

export function TermTooltip({ helpLabel, term, text }: TermTooltipProps) {
  const [pinned, setPinned] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [offset, setOffset] = useState(0);
  const containerRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();
  const open = pinned || previewing;

  const position = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const triggerLeft = trigger.getBoundingClientRect().left;
    const width = panel.offsetWidth;
    const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
    const desiredLeft = Math.min(Math.max(triggerLeft, VIEWPORT_MARGIN), maxLeft);
    setOffset(desiredLeft - triggerLeft);
  }, []);

  useLayoutEffect(() => {
    if (open) position();
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", position);
    return () => window.removeEventListener("resize", position);
  }, [open, position]);

  useEffect(() => {
    if (!pinned) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setPinned(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPinned(false);
        setPreviewing(false);
        triggerRef.current?.blur();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pinned]);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setPreviewing(true)}
      onMouseLeave={() => setPreviewing(false)}
      ref={containerRef}
    >
      <button
        aria-describedby={panelId}
        aria-expanded={pinned}
        aria-label={`${helpLabel}: ${term}`}
        className="inline-flex min-h-6 items-center gap-1 rounded-[3px] border border-line bg-white/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted transition hover:border-petrol/45 hover:text-petrol"
        onBlur={() => setPreviewing(false)}
        onClick={() => {
          setPinned((current) => {
            if (current) {
              setPreviewing(false);
              triggerRef.current?.blur();
            }
            return !current;
          });
        }}
        onFocus={() => setPreviewing(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            setPinned(true);
            setPreviewing(false);
          }
          if (event.key === "Escape") {
            setPinned(false);
            setPreviewing(false);
            event.currentTarget.blur();
          }
        }}
        ref={triggerRef}
        type="button"
      >
        {term}
        <span aria-hidden="true" className="text-[9px] leading-none text-line">?</span>
      </button>
      <span
        className={`absolute left-0 top-full z-50 mt-2 w-[min(19rem,calc(100vw-1.5rem))] rounded-[4px] border border-petrol/40 bg-petrol px-3 py-2.5 text-left text-xs font-normal normal-case leading-5 tracking-normal text-white shadow-[0_14px_32px_rgba(11,52,54,0.18)] ${
          open ? "block" : "hidden"
        }`}
        id={panelId}
        ref={panelRef}
        role="tooltip"
        style={{ transform: `translateX(${offset}px)` }}
      >
        {text}
      </span>
    </span>
  );
}

type TermKeyProps = {
  className?: string;
  helpLabel: string;
  label: string;
  terms: { term: string; text: string }[];
};

export function TermKey({ className = "", helpLabel, label, terms }: TermKeyProps) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1.5 ${className}`} data-termkey="">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      {terms.map((entry) => (
        <TermTooltip helpLabel={helpLabel} key={entry.term} term={entry.term} text={entry.text} />
      ))}
    </span>
  );
}
