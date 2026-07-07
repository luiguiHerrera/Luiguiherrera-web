export type IcsEvent = {
  uid: string;
  summary: string;
  description: string;
  startDate: string;
  endDate?: string;
};

export type IcsCalendar = {
  name: string;
  events: IcsEvent[];
};

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function formatDate(value: string) {
  return value.replaceAll("-", "");
}

function addOneDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return date.toISOString().slice(0, 10);
}

function foldLine(line: string) {
  const chunks: string[] = [];
  let remaining = line;
  while (remaining.length > 75) {
    chunks.push(remaining.slice(0, 75));
    remaining = ` ${remaining.slice(75)}`;
  }
  chunks.push(remaining);
  return chunks.join("\r\n");
}

export function buildIcsCalendar(calendar: IcsCalendar) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Luigui Herrera//Market Reports//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendar.name)}`,
  ];

  calendar.events.forEach((event) => {
    const endDate = addOneDay(event.endDate ?? event.startDate);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(event.uid)}`,
      `DTSTAMP:${formatDate(new Date().toISOString().slice(0, 10))}T000000Z`,
      `DTSTART;VALUE=DATE:${formatDate(event.startDate)}`,
      `DTEND;VALUE=DATE:${formatDate(endDate)}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
      `DESCRIPTION:${escapeIcsText(event.description)}`,
      "END:VEVENT",
    );
  });

  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

export function buildIcsDataUri(calendar: IcsCalendar) {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcsCalendar(calendar))}`;
}
