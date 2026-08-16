import type { MarketReport, MarketReportCalendarItem, MarketReportEarningsItem } from "./market-reports";

export function getCalendarConfig(report: MarketReport) {
  const [fallbackYear, fallbackMonth] = report.monthKey.split("-").map(Number);
  const year = report.presentation?.year ?? fallbackYear;
  const month = report.presentation?.month ?? fallbackMonth;
  const locale = report.presentation?.locale ?? "es-ES";
  return {
    year,
    month,
    locale,
    title: report.presentation?.localizedTitle ?? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1))),
    primaryTimeZone: report.presentation?.primaryTimeZone ?? "UTC",
    displayTimeZones: report.presentation?.displayTimeZones ?? [],
  };
}

export function getMonthGrid(year: number, month: number) {
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const sundayIndex = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const mondayOffset = (sundayIndex + 6) % 7;
  const cellCount = Math.ceil((mondayOffset + dayCount) / 7) * 7;
  return Array.from({ length: cellCount }, (_, index) => {
    const day = index - mondayOffset + 1;
    return day >= 1 && day <= dayCount ? day : null;
  });
}

export function isEventInMonth(event: MarketReportCalendarItem, year: number, month: number) {
  return event.dateStart?.startsWith(`${year}-${String(month).padStart(2, "0")}-`) ?? false;
}

export function formatImpliedMove(item: Pick<MarketReportEarningsItem, "impliedMovePct" | "impliedMoveApproximate">) {
  return `${item.impliedMoveApproximate ? "≈" : ""}±${item.impliedMovePct.toFixed(2).replace(".", ",")} %`;
}

export function formatEvidenceConsultedAt(value: string) {
  // Una consulta registrada solo por fecha no debe mostrar una hora que la fuente no aportó.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(dateOnly ? {} : { hour: "2-digit", minute: "2-digit", timeZoneName: "short" }),
    timeZone: "UTC",
  }).format(new Date(dateOnly ? `${value}T00:00:00Z` : value));
}

export function earningsScheduleLabel(item: MarketReportEarningsItem) {
  if (item.dateConfirmationStatus === "editorial-unconfirmed") {
    return "Fecha prevista editorial no confirmada · hora por confirmar";
  }
  if (item.timeConfirmationStatus !== "confirmed") {
    return item.timeConfirmationStatus === "unconfirmed"
      ? "Fecha confirmada · hora por confirmar"
      : "Fecha confirmada · hora no registrada";
  }
  const timeLabel = [
    item.originalTime && item.originalTimeZone ? `${item.originalTime} ${item.originalTimeZone}` : null,
    item.displayTime,
  ].filter(Boolean).join(" · ");
  if (timeLabel) return timeLabel;
  if (item.session === "before-open") return "Fecha y sesión confirmadas · antes de apertura";
  if (item.session === "after-close") return "Fecha y sesión confirmadas · después del cierre";
  return "Fecha confirmada · hora no registrada";
}

function earningsCalendarItem(item: MarketReportEarningsItem): MarketReportCalendarItem {
  const date = new Date(`${item.reportDate}T12:00:00Z`);
  const dateLabel = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" }).format(date);
  const timeConfirmed = item.timeConfirmationStatus === "confirmed" && Boolean(item.startDateTimeUtc);
  return {
    id: `earnings-${item.ticker.toLowerCase()}`,
    dateLabel,
    dateStart: item.reportDate,
    ...(timeConfirmed ? { startDateTimeUtc: item.startDateTimeUtc } : {}),
    event: `Resultados de ${item.company} (${item.ticker})`,
    company: item.company,
    ticker: item.ticker,
    whyItMatters: `Movimiento implícito esperado ${formatImpliedMove(item)}; ventana para evaluar resultados, guía y reacción posterior.`,
    category: "earnings",
    originalTime: timeConfirmed ? item.originalTime : "Hora por confirmar",
    originalTimeZone: timeConfirmed ? item.originalTimeZone : "ET",
    displayTimeCest: timeConfirmed ? item.displayTime : "Hora por confirmar",
    timeStatus: timeConfirmed ? "confirmed" : "tba",
    dateConfirmationStatus: item.dateConfirmationStatus,
    affectedAssets: [item.ticker, "Stockpicking"],
    sourceLabel: item.dateTimeSourceLabel,
    sourceHref: item.dateTimeSourceHref,
    trackingHref: item.dateTimeSourceHref,
    trackingLabel: item.dateConfirmationStatus === "editorial-unconfirmed"
      ? `Consultar página de IR de ${item.ticker}`
      : `Seguir resultados de ${item.ticker}`,
    impliedMovePct: item.impliedMovePct,
    impliedMoveApproximate: item.impliedMoveApproximate,
    impliedMoveProvider: item.impliedMoveProvider,
    impliedMoveProviderHref: item.impliedMoveProviderHref,
    impliedMoveConsultedAt: item.consultedAt,
  };
}

export function getReportCalendar(report: MarketReport) {
  const earnings = report.stockpicking?.earnings.upcoming.map(earningsCalendarItem) ?? [];
  return [...report.calendar, ...earnings].sort((a, b) => `${a.dateStart ?? "9999"}-${a.startDateTimeUtc ?? a.event}`.localeCompare(`${b.dateStart ?? "9999"}-${b.startDateTimeUtc ?? b.event}`));
}

export function exclusiveAllDayEnd(dateStart: string, dateEnd?: string) {
  const inclusive = new Date(`${dateEnd ?? dateStart}T00:00:00Z`);
  inclusive.setUTCDate(inclusive.getUTCDate() + 1);
  return inclusive.toISOString().slice(0, 10);
}
