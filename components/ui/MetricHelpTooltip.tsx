"use client";

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type MetricHelpTooltipProps = {
  label: string;
  text: string;
  locale?: 'es' | 'en';
};

export function MetricHelpTooltip({ label, text, locale = 'es' }: MetricHelpTooltipProps) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const tooltip = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      if (!button.current || !tooltip.current) return;
      const anchor = button.current.getBoundingClientRect();
      const box = tooltip.current.getBoundingClientRect();
      const margin = 12;
      const left = Math.max(margin, Math.min(anchor.left - 4, window.innerWidth - box.width - margin));
      const below = anchor.bottom + 8;
      const top = below + box.height <= window.innerHeight - margin ? below : Math.max(margin, anchor.top - box.height - 8);
      setPosition({ left, top });
    };
    const dismiss = (event: PointerEvent) => {
      if (!button.current?.contains(event.target as Node)) setOpen(false);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    document.addEventListener('pointerdown', dismiss);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      document.removeEventListener('pointerdown', dismiss);
    };
  }, [open, text]);
  return (
    <span className="sl-metric-help relative inline-flex align-middle" onPointerEnter={() => setOpen(true)} onPointerLeave={() => { if (document.activeElement !== button.current) setOpen(false); }}>
      <button
        ref={button}
        type="button"
        aria-label={`${locale === 'en' ? 'Help' : 'Ayuda'}: ${label}`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)}
        onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); } }}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-line bg-panel text-[10px] font-semibold leading-none text-muted transition hover:border-petrol hover:text-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20"
      >
        ?
      </button>
      {open ? createPortal(<span ref={tooltip} id={id} role="tooltip" style={{ left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? 'visible' : 'hidden', width: 'min(300px, calc(100vw - 24px))' }} className="sl-metric-tooltip pointer-events-none fixed z-[100] whitespace-normal break-words rounded-[6px] border border-petrol/40 bg-petrol px-3 py-2 text-left text-xs font-normal normal-case leading-5 tracking-normal text-white shadow-[0_12px_28px_rgba(11,52,54,0.16)]">
        {text}
      </span>, document.body) : null}
    </span>
  );
}
