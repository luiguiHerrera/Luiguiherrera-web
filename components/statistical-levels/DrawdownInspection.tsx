'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { drawdownInspectionText, nearestObservationIndex } from './interaction-presentation';

type Props = {
  series: Array<{ date: string }>;
  drawdowns: number[];
  path: string;
  area: string;
  minDrawdown: number;
  locale: 'es' | 'en';
};

export function DrawdownInspection({ series, drawdowns, path, area, minDrawdown, locale }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const retained = useRef(false);
  const id = useId();
  const en = locale === 'en';
  const selected = active ?? 0;
  const text = drawdownInspectionText(series[selected].date, drawdowns[selected], locale);
  const x = series.length === 1 ? 0 : selected / (series.length - 1) * 100;
  const y = 8 + Math.abs(drawdowns[selected]) / Math.abs(minDrawdown) * 82;

  useEffect(() => {
    const dismiss = (event: globalThis.PointerEvent) => {
      if (!surface.current?.contains(event.target as Node)) {
        retained.current = false;
        setActive(null);
      }
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);

  const inspect = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setActive(nearestObservationIndex(event.clientX - bounds.left, bounds.width, series.length));
  };
  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    let next = selected;
    if (event.key === 'ArrowLeft') next = Math.max(0, selected - 1);
    else if (event.key === 'ArrowRight') next = Math.min(series.length - 1, selected + 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = series.length - 1;
    else if (event.key === 'Escape') { retained.current = false; setActive(null); return; }
    else return;
    event.preventDefault();
    retained.current = false;
    setActive(next);
  };

  return <>
    <div ref={surface} className="sl-drawdown-inspection" role="slider" tabIndex={0}
      aria-label={en ? 'Inspect drawdown history' : 'Inspeccionar historial de drawdown'}
      aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={series.length - 1} aria-valuenow={selected}
      aria-valuetext={`${text.date} · ${text.value}`} aria-describedby={`${id}-help`}
      data-selected-date={active === null ? undefined : series[selected].date}
      data-selected-drawdown={active === null ? undefined : drawdowns[selected]}
      onPointerMove={event => { if (event.pointerType === 'mouse') { retained.current = false; inspect(event); } }}
      onPointerDown={event => { retained.current = true; inspect(event); }}
      onPointerLeave={() => { if (!retained.current && document.activeElement !== surface.current) setActive(null); }}
      onFocus={() => setActive(value => value ?? 0)}
      onBlur={() => { if (!retained.current) setActive(null); }}
      onKeyDown={navigate}>
      <svg viewBox="0 0 100 100" className="h-56 w-full" preserveAspectRatio="none" aria-hidden="true">
        <rect x="0" y="0" width="100" height="100" fill="#fbfaf8" />
        <line x1="0" x2="100" y1="8" y2="8" stroke="#b8b2aa" strokeWidth="0.45" vectorEffect="non-scaling-stroke" />
        {area ? <path d={area} fill="#e6dece" /> : null}
        {path ? <path d={path} fill="none" stroke="#9a7a44" strokeWidth="1.4" vectorEffect="non-scaling-stroke" /> : null}
        {active !== null ? <line className="sl-drawdown-crosshair" x1={x} x2={x} y1="0" y2="100" stroke="#123b3d" strokeWidth="1" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      {active !== null ? <>
        <span className="sl-drawdown-point" aria-hidden="true" style={{ left: `${x}%`, top: `${y}%` }} />
        <div className="sl-drawdown-tooltip" role="tooltip" style={{ left: `clamp(8px, calc(${x}% - 70px), calc(100% - 148px))`, top: `clamp(8px, calc(${y}% ${y > 45 ? '- 76px' : '+ 12px'}), calc(100% - 72px))` }}>
          <span>{text.date}</span><strong>{text.value}</strong>
        </div>
      </> : null}
    </div>
    <p id={`${id}-help`} className="sl-caption sl-drawdown-help">
      <span className="sl-drawdown-help-desktop">{en ? 'Hover or tap to inspect. Keyboard: ← → move through observations; Home / End jump to the extremes; Esc closes.' : 'Pasa el cursor o toca para inspeccionar. Teclado: ← → recorren observaciones; Inicio / Fin van a los extremos; Esc cierra.'}</span>
      <span className="sl-drawdown-help-mobile">{en ? 'Tap the chart to inspect. Tap outside to close.' : 'Toca el gráfico para inspeccionar. Toca fuera para cerrar.'}</span>
    </p>
  </>;
}
