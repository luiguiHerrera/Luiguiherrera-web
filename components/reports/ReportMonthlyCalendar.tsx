"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MarketReport, MarketReportCalendarItem } from "@/lib/reports/market-reports";
import { getCalendarConfig, getMonthGrid, isEventInMonth } from "@/lib/reports/report-presentation";

type ReportMonthlyCalendarProps = {
  events: MarketReportCalendarItem[];
  report: MarketReport;
};

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const categoryLabels = {
  macro: "Macro",
  "central-bank": "Bancos centrales",
  earnings: "Resultados",
  options: "Opciones",
  energy: "Energía",
  other: "Otros",
} as const;

const categoryClasses = {
  macro: "border-petrol/35 bg-petrol/10 text-petrol",
  "central-bank": "border-brass/45 bg-brass/10 text-brass",
  earnings: "border-sage/55 bg-sage/10 text-petrol",
  options: "border-danger/35 bg-danger/10 text-danger",
  energy: "border-brass/45 bg-panelSoft text-brass",
  other: "border-line bg-panelSoft text-muted",
} as const;

function categoryFor(event: MarketReportCalendarItem) {
  return event.category ?? "other";
}

function eventId(event: MarketReportCalendarItem) {
  return event.id ?? `${event.dateStart}-${event.event}`;
}

function ExternalMark() {
  return <span aria-hidden="true">↗</span>;
}

export function ReportMonthlyCalendar({ events, report }: ReportMonthlyCalendarProps) {
  const calendarConfig = getCalendarConfig(report);
  const [selectedId, setSelectedId] = useState<string | null>(events[0] ? eventId(events[0]) : null);
  const rootRef = useRef<HTMLDivElement>(null);
  const eventButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const eventsByDay = useMemo(() => {
    const grouped = new Map<number, MarketReportCalendarItem[]>();
    for (const event of events) {
      if (!isEventInMonth(event, calendarConfig.year, calendarConfig.month)) continue;
      const day = Number(event.dateStart?.slice(-2));
      grouped.set(day, [...(grouped.get(day) ?? []), event]);
    }
    return grouped;
  }, [calendarConfig.month, calendarConfig.year, events]);
  const selected = events.find((event) => eventId(event) === selectedId) ?? null;
  const selectEvent = (id: string) => setSelectedId(id);
  const closeDetail = (restoreFocus: boolean) => {
    const triggerId = selectedId;
    setSelectedId(null);
    if (restoreFocus && triggerId) {
      requestAnimationFrame(() => eventButtonRefs.current.get(triggerId)?.focus());
    }
  };
  const days = getMonthGrid(calendarConfig.year, calendarConfig.month);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId((currentId) => {
          if (currentId) requestAnimationFrame(() => eventButtonRefs.current.get(currentId)?.focus());
          return null;
        });
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setSelectedId(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0 border border-line bg-panel" aria-label={`Calendario de ${calendarConfig.title}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">Calendario mensual</p>
            <h3 className="mt-1 text-lg font-semibold text-ink">{calendarConfig.title}</h3>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Leyenda del calendario">
            {Object.entries(categoryLabels).map(([category, label]) => (
              <li key={category} className={`border px-2 py-1 text-[10px] font-semibold uppercase ${categoryClasses[category as keyof typeof categoryClasses]}`}>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-7 border-b border-line bg-panelSoft" role="row">
          {weekdays.map((weekday, index) => (
            <div key={weekday} className={`px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] ${index > 4 ? "text-brass" : "text-muted"}`} role="columnheader">
              {weekday}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7" role="grid" aria-label={`Días de ${calendarConfig.title}`}>
          {days.map((day, index) => {
            const dayEvents = day ? eventsByDay.get(day) ?? [] : [];
            const weekend = index % 7 > 4;
            return (
              <div
                key={`${index}-${day ?? "empty"}`}
                className={`min-h-16 min-w-0 border-b border-r border-line p-1 last:border-r-0 sm:min-h-28 sm:p-2 ${day ? (weekend ? "bg-panelSoft/70" : "bg-white") : "bg-paper/45"}`}
                role="gridcell"
                aria-label={day ? `${day} de ${calendarConfig.title}${dayEvents.length ? `, ${dayEvents.length} eventos` : ""}` : undefined}
              >
                {day ? <span className={`text-xs font-semibold ${weekend ? "text-brass" : "text-ink"}`}>{day}</span> : null}
                <div className="mt-1 grid gap-1">
                  {dayEvents.slice(0, 2).map((event) => {
                    const category = categoryFor(event);
                    const active = selectedId === eventId(event);
                    return (
                      <button
                        key={eventId(event)}
                        ref={(node) => {
                          if (node) eventButtonRefs.current.set(eventId(event), node);
                          else eventButtonRefs.current.delete(eventId(event));
                        }}
                        type="button"
                        className={`min-h-8 min-w-0 w-full max-w-full overflow-hidden border px-1.5 py-1 text-left text-[10px] font-semibold leading-tight transition focus-visible:ring-2 focus-visible:ring-petrol/30 sm:min-h-0 ${categoryClasses[category]} ${active ? "ring-2 ring-petrol/25" : ""}`}
                        aria-controls="report-calendar-detail"
                        aria-expanded={active}
                        aria-label={`${event.event}. ${event.displayTimeCest ?? "Hora por confirmar"}`}
                        onClick={() => selectEvent(eventId(event))}
                        onKeyDown={(keyboardEvent) => {
                          if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                            keyboardEvent.preventDefault();
                            selectEvent(eventId(event));
                          }
                        }}
                        onPointerEnter={() => selectEvent(eventId(event))}
                        data-calendar-event={eventId(event)}
                      >
                        <span className="mx-auto block h-2 w-2 rounded-full bg-current sm:hidden" aria-hidden="true" />
                        <span className="hidden truncate sm:block">{event.ticker ?? event.event}</span>
                      </button>
                    );
                  })}
                  {dayEvents.length > 2 ? <details className="relative"><summary className="cursor-pointer text-[10px] font-semibold text-petrol">+{dayEvents.length - 2} más</summary><div className="absolute z-20 mt-1 grid min-w-32 gap-1 border border-line bg-panel p-1 shadow-lg">{dayEvents.slice(2).map((event) => <button key={eventId(event)} ref={(node) => { if (node) eventButtonRefs.current.set(eventId(event), node); else eventButtonRefs.current.delete(eventId(event)); }} type="button" className={`min-h-8 min-w-0 max-w-full overflow-hidden border px-1.5 py-1 text-left text-[10px] font-semibold ${categoryClasses[categoryFor(event)]}`} aria-controls="report-calendar-detail" aria-label={`${event.event}. ${event.displayTimeCest ?? "Hora por confirmar"}`} onClick={() => selectEvent(eventId(event))} onKeyDown={(keyboardEvent) => { if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") { keyboardEvent.preventDefault(); selectEvent(eventId(event)); } }} data-calendar-event={eventId(event)}><span className="block truncate">{event.ticker ?? event.event}</span></button>)}</div></details> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside id="report-calendar-detail" className="self-start border border-line bg-panelSoft p-4 xl:sticky xl:top-24" aria-live="polite">
        {selected ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brass">{categoryLabels[categoryFor(selected)]}</p>
                <h3 className="mt-1 text-lg font-semibold leading-6 text-ink">{selected.event}</h3>
              </div>
              <button type="button" className="min-h-10 min-w-10 border border-line bg-panel text-lg text-muted hover:border-petrol hover:text-petrol" onClick={() => closeDetail(true)} aria-label="Cerrar detalle del evento">
                ×
              </button>
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-[10px] font-semibold uppercase text-brass">Fecha</dt>
                <dd className="mt-1 text-ink">{selected.dateLabel}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase text-brass">Hora y zona</dt>
                <dd className="mt-1 text-ink">
                  {selected.timeStatus === "tba"
                    ? `Hora por confirmar · ${selected.originalTimeZone ?? "Zona por confirmar"}`
                    : `${selected.originalTime} ${selected.originalTimeZone} · ${selected.displayTimeCest}`}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase text-brass">Por qué importa</dt>
                <dd className="mt-1 leading-6 text-muted">{selected.whyItMatters}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase text-brass">Activos o factores</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {selected.affectedAssets?.map((asset) => <span key={asset} className="border border-line bg-panel px-2 py-1 text-xs text-ink">{asset}</span>)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase text-brass">Confirmación</dt>
                <dd className="mt-1 text-ink">{selected.timeStatus === "confirmed" ? "Hora confirmada por fuente primaria" : selected.timeStatus === "approximate" ? "Hora aproximada" : "Hora por confirmar"}</dd>
              </div>
              {selected.impliedMovePct !== undefined ? <div><dt className="text-[10px] font-semibold uppercase text-brass">Movimiento implícito esperado</dt><dd className="mt-1 text-ink">{selected.impliedMoveApproximate ? "≈" : ""}±{selected.impliedMovePct.toFixed(2).replace(".", ",")} % · {selected.impliedMoveProvider}</dd></div> : null}
            </dl>
            <div className="mt-4 grid gap-2 border-t border-line pt-3">
              {selected.trackingHref && selected.trackingLabel ? (
                <a className="inline-flex min-h-10 items-center justify-between gap-2 border border-petrol bg-petrol px-3 py-2 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol" href={selected.trackingHref} target={selected.trackingHref.startsWith("http") ? "_blank" : undefined} rel={selected.trackingHref.startsWith("http") ? "noopener noreferrer" : undefined} aria-label={`${selected.trackingLabel}${selected.trackingHref.startsWith("http") ? ", abre en una pestaña nueva" : ""}`}>
                  {selected.trackingLabel} {selected.trackingHref.startsWith("http") ? <ExternalMark /> : null}
                </a>
              ) : null}
              {selected.sourceHref && selected.sourceLabel ? (
                <a className="inline-flex min-h-10 items-center justify-between gap-2 border-b border-petrol/35 py-2 text-sm font-semibold text-petrol" href={selected.sourceHref} target="_blank" rel="noopener noreferrer" aria-label={`${selected.sourceLabel}, abre en una pestaña nueva`}>
                  {selected.sourceLabel} <ExternalMark />
                </a>
              ) : null}
            </div>
          </>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm font-semibold text-ink">Selecciona un evento</p>
            <p className="mt-2 text-sm leading-6 text-muted">Usa un marcador del calendario para ver hora, fuente y activos relacionados.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
