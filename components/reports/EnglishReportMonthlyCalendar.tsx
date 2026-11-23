"use client";

import { ReportAnchor, ReportParagraph } from "@/components/reports/ReportSourcePolicy";


import { useEffect, useMemo, useRef, useState } from "react";
import type { MarketReport, MarketReportCalendarItem } from "@/lib/reports/market-reports";
import { formatEvidenceConsultedAt, getCalendarConfig, getMonthGrid, isEventInMonth } from "@/lib/reports/report-presentation";

type EnglishReportMonthlyCalendarProps = {
  events: MarketReportCalendarItem[];
  report: MarketReport;
  /** Historical editions show the recorded agenda without inventing event times. */
  historical?: boolean;
  detailPlacement?: "side" | "below";
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const categoryLabels = {
  macro: "Macro",
  "central-bank": "Central banks",
  earnings: "Earnings",
  options: "Options",
  energy: "Energy",
  other: "Other",
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

function confirmationLabel(event: MarketReportCalendarItem) {
  if (event.dateConfirmationStatus === "editorial-unconfirmed") {
    return "Unconfirmed editorial date · time to be confirmed";
  }
  if (event.timeStatus === "confirmed") return "Date and time confirmed by primary source";
  if (event.timeStatus === "approximate") return "Date confirmed · approximate time";
  return "Date confirmed · time to be confirmed";
}

function ExternalMark() {
  return <span aria-hidden="true">↗</span>;
}

export function EnglishReportMonthlyCalendar({ events, report, historical = false, detailPlacement = "side" }: EnglishReportMonthlyCalendarProps) {
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
  const days = getMonthGrid(calendarConfig.year, calendarConfig.month, calendarConfig);

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
    <div ref={rootRef} className={`grid gap-4 ${detailPlacement === "side" ? "xl:grid-cols-[minmax(0,1fr)_19rem]" : ""}`}>
      <div className="min-w-0 border border-line bg-panel" aria-label={`Calendar for ${calendarConfig.title}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <ReportParagraph className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">Monthly calendar</ReportParagraph>
            <h3 className="mt-1 text-lg font-semibold text-ink">{calendarConfig.title}</h3>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Calendar legend">
            {Object.entries(categoryLabels).filter(([category]) => !historical || events.some(event => categoryFor(event) === category)).map(([category, label]) => (
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
        <div className="grid grid-cols-7" role="grid" aria-label={`Days in ${calendarConfig.title}`}>
          {days.map((day, index) => {
            const dayEvents = day ? eventsByDay.get(day) ?? [] : [];
            const weekend = index % 7 > 4;
            return (
              <div
                key={`${index}-${day ?? "empty"}`}
                className={`min-h-16 min-w-0 border-b border-r border-line p-1 last:border-r-0 sm:min-h-28 sm:p-2 ${day ? (weekend ? "bg-panelSoft/70" : "bg-white") : "bg-paper/45"}`}
                role="gridcell"
                aria-label={day ? `${day} ${calendarConfig.title}${dayEvents.length ? `, ${dayEvents.length} events` : ""}` : undefined}
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
                        aria-label={historical ? `${event.dateLabel}. ${event.event}` : `${event.event}. ${event.displayTimeCest ?? "Time to be confirmed"}`}
                        onClick={() => selectEvent(eventId(event))}
                        onKeyDown={(keyboardEvent) => {
                          if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                            keyboardEvent.preventDefault();
                            selectEvent(eventId(event));
                          }
                        }}
                        onPointerEnter={() => selectEvent(eventId(event))}
                        onFocus={historical ? () => selectEvent(eventId(event)) : undefined}
                        data-calendar-event={eventId(event)}
                      >
                        <span className="mx-auto block h-2 w-2 rounded-full bg-current sm:hidden" aria-hidden="true" />
                        <span className="hidden truncate sm:block">{event.ticker ?? event.event}</span>
                      </button>
                    );
                  })}
                  {dayEvents.length > 2 ? <details className="relative"><summary className="cursor-pointer text-[10px] font-semibold text-petrol">+{dayEvents.length - 2} more</summary><div className="absolute z-20 mt-1 grid min-w-32 gap-1 border border-line bg-panel p-1 shadow-lg">{dayEvents.slice(2).map((event) => <button key={eventId(event)} ref={(node) => { if (node) eventButtonRefs.current.set(eventId(event), node); else eventButtonRefs.current.delete(eventId(event)); }} type="button" className={`min-h-8 min-w-0 max-w-full overflow-hidden border px-1.5 py-1 text-left text-[10px] font-semibold ${categoryClasses[categoryFor(event)]}`} aria-controls="report-calendar-detail" aria-label={`${event.event}. ${event.displayTimeCest ?? "Time to be confirmed"}`} onClick={() => selectEvent(eventId(event))} onKeyDown={(keyboardEvent) => { if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") { keyboardEvent.preventDefault(); selectEvent(eventId(event)); } }} data-calendar-event={eventId(event)}><span className="block truncate">{event.ticker ?? event.event}</span></button>)}</div></details> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside id="report-calendar-detail" className={`self-start border border-line bg-panelSoft p-4 ${detailPlacement === "side" ? "xl:sticky xl:top-24" : ""}`} aria-live="polite">
        {selected ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <ReportParagraph className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brass">{categoryLabels[categoryFor(selected)]}</ReportParagraph>
                <h3 className="mt-1 text-lg font-semibold leading-6 text-ink">{selected.event}</h3>
              </div>
              <button type="button" className="min-h-10 min-w-10 border border-line bg-panel text-lg text-muted hover:border-petrol hover:text-petrol" onClick={() => closeDetail(true)} aria-label="Close event details">
                ×
              </button>
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-[10px] font-semibold uppercase text-brass">Date</dt>
                <dd className="mt-1 text-ink">{selected.dateLabel}</dd>
              </div>
              {!historical ? <div>
                <dt className="text-[10px] font-semibold uppercase text-brass">Time and zone</dt>
                <dd className="mt-1 text-ink">
                  {selected.timeStatus === "tba"
                    ? `Time to be confirmed · ${selected.originalTimeZone ?? "Time zone to be confirmed"}`
                    : `${selected.originalTime} ${selected.originalTimeZone} · ${selected.displayTimeCest}`}
                </dd>
              </div> : null}
              <div>
                <dt className="text-[10px] font-semibold uppercase text-brass">Why it matters</dt>
                <dd className="mt-1 leading-6 text-muted">{selected.whyItMatters}</dd>
              </div>
              {!historical || selected.affectedAssets?.length ? <div>
                <dt className="text-[10px] font-semibold uppercase text-brass">Assets or factors</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {selected.affectedAssets?.map((asset) => <span key={asset} className="border border-line bg-panel px-2 py-1 text-xs text-ink">{asset}</span>)}
                </dd>
              </div> : null}
              {!historical ? <div>
                <dt className="text-[10px] font-semibold uppercase text-brass">Confirmation</dt>
                <dd className="mt-1 text-ink">{confirmationLabel(selected)}</dd>
              </div> : null}
              {selected.impliedMovePct !== undefined ? <div><dt className="text-[10px] font-semibold uppercase text-brass">Expected implied move</dt><dd className="mt-1 text-ink">{selected.impliedMoveApproximate ? "≈" : ""}±{selected.impliedMovePct.toFixed(2)} % · {selected.impliedMoveProviderHref ? <ReportAnchor className="font-semibold text-petrol" href={selected.impliedMoveProviderHref} target="_blank" rel="noopener noreferrer">{selected.impliedMoveProvider} ↗</ReportAnchor> : selected.impliedMoveProvider}{selected.impliedMoveConsultedAt ? ` · accessed ${formatEvidenceConsultedAt(selected.impliedMoveConsultedAt)}` : ""}</dd></div> : null}
            </dl>
            <div className="mt-4 grid gap-2 border-t border-line pt-3">
              {selected.trackingHref && selected.trackingLabel ? (
                <ReportAnchor className="inline-flex min-h-10 items-center justify-between gap-2 border border-petrol bg-petrol px-3 py-2 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol" href={selected.trackingHref} target={selected.trackingHref.startsWith("http") ? "_blank" : undefined} rel={selected.trackingHref.startsWith("http") ? "noopener noreferrer" : undefined} aria-label={`${selected.trackingLabel}${selected.trackingHref.startsWith("http") ? ", opens in a new tab" : ""}`}>
                  {selected.trackingLabel} {selected.trackingHref.startsWith("http") ? <ExternalMark /> : null}
                </ReportAnchor>
              ) : null}
              {selected.sourceHref && selected.sourceLabel ? (
                <ReportAnchor className="inline-flex min-h-10 items-center justify-between gap-2 border-b border-petrol/35 py-2 text-sm font-semibold text-petrol" href={selected.sourceHref} target="_blank" rel="noopener noreferrer" aria-label={`${selected.sourceLabel}, opens in a new tab`}>
                  {selected.sourceLabel} <ExternalMark />
                </ReportAnchor>
              ) : null}
            </div>
          </>
        ) : (
          <div className="py-6 text-center">
            <ReportParagraph className="text-sm font-semibold text-ink">Select an event</ReportParagraph>
            <ReportParagraph className="mt-2 text-sm leading-6 text-muted">{historical ? "Hover, focus or tap an event to view its relevance and source." : "Use a calendar marker to see the time, source and related assets."}</ReportParagraph>
          </div>
        )}
      </aside>
    </div>
  );
}
