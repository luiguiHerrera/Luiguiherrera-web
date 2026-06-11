import { dashboardModules } from "@/lib/dashboard/manual-data";
import type { DashboardModuleData } from "@/lib/dashboard/types";

const REVALIDATE_SECONDS = 60 * 60 * 24;
const FARSIDE_URL = "https://farside.co.uk/btc/";

type FlowRow = {
  date: string;
  total: number;
  contributors: Array<{ ticker: string; flow: number }>;
};

function fallbackBtcFlowsModule(reason: string): DashboardModuleData {
  const fallback = dashboardModules.find((module) => module.id === "btc-flows");

  if (!fallback) {
    throw new Error("Missing BTC ETF flows fallback module");
  }

  return {
    ...fallback,
    status: "Fallback manual",
    dataStatus: "manual",
    lastUpdated: "Fallback manual",
    reliabilityNote: `${fallback.reliabilityNote} Fallback activo: ${reason}.`,
  };
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFlowValue(value: string) {
  const clean = value
    .replace(/,/g, "")
    .replace(/\$/g, "")
    .replace(/m$/i, "")
    .trim();

  if (!clean || clean === "-" || clean.toLowerCase() === "n/a") {
    return 0;
  }

  const parenthetical = clean.match(/^\(([-\d.]+)\)$/);
  const normalized = parenthetical ? `-${parenthetical[1]}` : clean;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatUsdMillions(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)} M USD`;
}

function formatStreak(rows: FlowRow[]) {
  const firstDirection = rows[0]?.total > 0 ? "entrada" : rows[0]?.total < 0 ? "salida" : "neutral";

  if (firstDirection === "neutral") {
    return "Último dato neutral";
  }

  let count = 0;
  for (const row of rows) {
    if ((firstDirection === "entrada" && row.total > 0) || (firstDirection === "salida" && row.total < 0)) {
      count += 1;
    } else {
      break;
    }
  }

  return `${count} día${count === 1 ? "" : "s"} de ${firstDirection}${count === 1 ? "" : "s"}`;
}

function parseFarsideRows(html: string): FlowRow[] {
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];

  for (const table of tableMatches) {
    const rawRows = table.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
    const parsedRows = rawRows.map((row) => {
      const cellMatches = row.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) ?? [];
      return cellMatches.map(stripHtml);
    });
    const headerIndex = parsedRows.findIndex((row) => row.some((cell) => cell.toLowerCase() === "date") && row.some((cell) => cell.toLowerCase() === "total"));

    if (headerIndex === -1) {
      continue;
    }

    const headers = parsedRows[headerIndex];
    const totalIndex = headers.findIndex((cell) => cell.toLowerCase() === "total");
    const dateIndex = headers.findIndex((cell) => cell.toLowerCase() === "date");

    if (dateIndex === -1 || totalIndex === -1) {
      continue;
    }

    const rows = parsedRows
      .slice(headerIndex + 1)
      .map((cells) => {
        const date = cells[dateIndex];
        const total = parseFlowValue(cells[totalIndex] ?? "");
        const contributors = headers
          .map((ticker, index) => ({ ticker, flow: parseFlowValue(cells[index] ?? "") }))
          .filter(({ ticker }, index) => index !== dateIndex && index !== totalIndex && ticker.length > 0)
          .sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow))
          .slice(0, 3);

        return { date, total, contributors };
      })
      .filter((row) => row.date && Number.isFinite(row.total));

    if (rows.length >= 5) {
      return rows;
    }
  }

  return [];
}

async function fetchFarsideHtml() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(FARSIDE_URL, {
      headers: {
        "User-Agent": "MarketRegimeDashboard/1.0",
      },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Farside HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function getBtcEtfFlowsModule(): Promise<DashboardModuleData> {
  try {
    const html = await fetchFarsideHtml();
    const rows = parseFarsideRows(html);

    if (rows.length < 5) {
      throw new Error("no se pudo interpretar la tabla pública de Farside");
    }

    const latest = rows[0];
    const fiveDayFlow = rows.slice(0, 5).reduce((sum, row) => sum + row.total, 0);
    const twentyDayFlow = rows.slice(0, 20).reduce((sum, row) => sum + row.total, 0);
    const contributors = latest.contributors
      .filter((contributor) => contributor.flow !== 0)
      .map((contributor) => `${contributor.ticker} ${formatUsdMillions(contributor.flow)}`)
      .join(", ");

    return {
      id: "btc-flows",
      title: "BTC ETF Flows",
      status: latest.total >= 0 ? "Entradas netas" : "Salidas netas",
      sourceName: "Farside BTC ETF flows",
      sourceUrl: FARSIDE_URL,
      lastUpdated: `Automático con fuente pública: ${latest.date}`,
      updateFrequency: "Automática server-side con caché diaria; revisión semanal sugerida",
      dataStatus: "automated",
      reliabilityNote: "Adapter experimental sobre tabla pública de Farside. La estructura de la fuente puede cambiar y los datos deben tratarse como informativos, con posible retraso y necesidad de verificación manual.",
      observedData: [
        ["Último flujo diario neto", formatUsdMillions(latest.total)],
        ["Flujo 5 días", formatUsdMillions(fiveDayFlow)],
        ["Flujo 20 días", formatUsdMillions(twentyDayFlow)],
        ["Racha", formatStreak(rows)],
        ["Principales contribuyentes", contributors || "No disponible en la tabla interpretada"],
      ],
      interpretation: {
        lookingAt: "Flujos netos hacia o desde ETFs spot de Bitcoin como proxy de demanda por exposición vía vehículo regulado.",
        why: "Ayuda a observar presión de demanda o salida en productos ETF, separada del precio spot diario.",
        how: "Entradas persistentes sugieren demanda por el vehículo; salidas persistentes sugieren menor apetito por esa exposición.",
        whatItDoesNotMean: "Los flujos ayudan a leer demanda por exposición a Bitcoin vía ETF, pero no eliminan la volatilidad ni son una señal de ejecución.",
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error desconocido de fuente";
    return fallbackBtcFlowsModule(reason);
  }
}
