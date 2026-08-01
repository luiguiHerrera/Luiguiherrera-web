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

function earningsCalendarItem(item: MarketReportEarningsItem): MarketReportCalendarItem {
  const date = new Date(`${item.reportDate}T12:00:00Z`);
  const dateLabel = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" }).format(date);
  const timeConfirmed = item.confirmationStatus === "confirmed" && Boolean(item.startDateTimeUtc);
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
    affectedAssets: [item.ticker, "Stockpicking"],
    sourceLabel: item.dateTimeSourceLabel,
    sourceHref: item.dateTimeSourceHref,
    trackingHref: item.dateTimeSourceHref,
    trackingLabel: `Seguir resultados de ${item.ticker}`,
    impliedMovePct: item.impliedMovePct,
    impliedMoveApproximate: item.impliedMoveApproximate,
    impliedMoveProvider: item.impliedMoveProvider,
    impliedMoveProviderHref: item.impliedMoveProviderHref,
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
