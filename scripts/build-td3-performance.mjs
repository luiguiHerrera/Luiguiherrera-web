import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const SOURCES = [
  {
    cashAssumption: "bil-cash",
    label: "BIL-CASH",
    absolutePath:
      "/Users/thiagoherrera/Projects/portfolio_drl_outputs/final_corrected_bil_cash_mandate_profile_comparison/mandate_profile_rankings.csv",
    sourceFile: "final_corrected_bil_cash_mandate_profile_comparison/mandate_profile_rankings.csv",
  },
  {
    cashAssumption: "zero-cash",
    label: "Zero-CASH",
    absolutePath:
      "/Users/thiagoherrera/Projects/portfolio_drl_outputs/final_corrected_zero_cash_mandate_profile_comparison/mandate_profile_rankings.csv",
    sourceFile: "final_corrected_zero_cash_mandate_profile_comparison/mandate_profile_rankings.csv",
  },
];

const BENCHMARKS = [
  ["Equal_Weight", "Equal Weight"],
  ["60_40_SPY_TLT", "60/40 SPY/TLT"],
  ["BuyHold_SPY", "Buy & Hold SPY"],
  ["BuyHold_GLD", "Buy & Hold GLD"],
  ["BuyHold_TLT", "Buy & Hold TLT"],
  ["BuyHold_BTC-USD", "Buy & Hold BTC"],
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  const normalized = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell.trim() !== "")) {
      rows.push(row);
    }
  }

  const [headers, ...body] = rows;
  if (!headers) {
    return [];
  }

  return body.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), (cells[index] ?? "").trim()])),
  );
}

function nullableNumber(value) {
  if (value == null || value === "" || value.toLowerCase() === "nan") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableBoolean(value) {
  if (value == null || value === "") {
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }
  return null;
}

function normalizeProfile(value) {
  return value.trim().toLowerCase();
}

function isTd3(row) {
  const type = row.strategy_type?.toLowerCase() ?? "";
  const name = row.strategy_name ?? "";
  return type === "td3" || (/^V\d/i.test(name) && type !== "benchmark");
}

function byProfileRank(a, b) {
  const aRank = nullableNumber(a.profile_rank) ?? Number.POSITIVE_INFINITY;
  const bRank = nullableNumber(b.profile_rank) ?? Number.POSITIVE_INFINITY;
  return aRank - bRank;
}

function pickTd3(rows) {
  const td3Rows = rows.filter(isTd3).sort(byProfileRank);
  const eligible = td3Rows.filter((row) => nullableBoolean(row.profile_eligible) === true).sort(byProfileRank);
  return eligible[0] ?? td3Rows[0] ?? null;
}

function toPerformanceRow(row, source, displayName, strategyType) {
  return {
    cashAssumption: source.cashAssumption,
    profile: normalizeProfile(row.profile),
    displayName,
    strategyName: row.strategy_name,
    strategyType,
    strategyGroup: row.strategy_group || null,
    annualizedReturn: nullableNumber(row.annualized_return),
    annualizedVolatility: nullableNumber(row.annualized_volatility),
    sharpe: nullableNumber(row.sharpe),
    sortino: null,
    maxDrawdown: nullableNumber(row.max_drawdown),
    averageTurnover: nullableNumber(row.average_turnover),
    averageMaxWeight: nullableNumber(row.average_max_weight),
    effectiveAssets: nullableNumber(row.average_effective_number_of_assets),
    mandateEligible: nullableBoolean(row.profile_eligible),
    failedConstraints: row.failed_constraints || null,
    drawdownPass: nullableBoolean(row.drawdown_pass),
    volatilityPass: nullableBoolean(row.volatility_pass),
    effectiveAssetsPass: nullableBoolean(row.effective_assets_pass),
    turnoverPass: nullableBoolean(row.turnover_pass),
    profileRank: nullableNumber(row.profile_rank),
    robustScore: nullableNumber(row.robust_score),
    profileScore: nullableNumber(row.profile_score),
    sourceFile: source.sourceFile,
  };
}

function generate() {
  const rows = [];
  const profiles = new Set();
  const sourceFiles = [];
  const unavailableCashAssumptions = [];

  for (const source of SOURCES) {
    let csv;
    try {
      csv = readFileSync(source.absolutePath, "utf8");
    } catch (error) {
      unavailableCashAssumptions.push(source.cashAssumption);
      console.warn(`[td3-performance] Warning: ${source.label} no disponible: ${source.absolutePath}`);
      continue;
    }

    sourceFiles.push(source.sourceFile);
    const parsedRows = parseCsv(csv);
    for (const row of parsedRows) {
      if (row.profile) {
        profiles.add(normalizeProfile(row.profile));
      }
    }

    const profileValues = [...new Set(parsedRows.map((row) => normalizeProfile(row.profile)).filter(Boolean))];
    for (const profile of profileValues) {
      const profileRows = parsedRows.filter((row) => normalizeProfile(row.profile) === profile);
      const selectedTd3 = pickTd3(profileRows);
      if (selectedTd3) {
        rows.push(toPerformanceRow(selectedTd3, source, "TD3 constrained", "td3"));
      }

      for (const [strategyName, displayName] of BENCHMARKS) {
        const benchmark = profileRows.find((row) => row.strategy_name === strategyName);
        if (benchmark) {
          rows.push(toPerformanceRow(benchmark, source, displayName, "benchmark"));
        }
      }
    }

    console.log(
      `[td3-performance] ${source.label}: ${parsedRows.length} filas, ${profileValues.length} perfiles, ${rows.filter((row) => row.cashAssumption === source.cashAssumption).length} filas exportadas`,
    );
  }

  if (rows.length === 0) {
    throw new Error("No se pudo generar td3-performance.ts: no hay filas disponibles.");
  }

  const output = `export type CashAssumption = "bil-cash" | "zero-cash";

export type QuantProfile = "conservative" | "moderate" | "aggressive" | string;

export type QuantPerformanceRow = {
  cashAssumption: CashAssumption;
  profile: QuantProfile;
  displayName: string;
  strategyName: string;
  strategyType: "td3" | "benchmark";
  strategyGroup: string | null;
  annualizedReturn: number | null;
  annualizedVolatility: number | null;
  sharpe: number | null;
  sortino: number | null;
  maxDrawdown: number | null;
  averageTurnover: number | null;
  averageMaxWeight: number | null;
  effectiveAssets: number | null;
  mandateEligible: boolean | null;
  failedConstraints: string | null;
  drawdownPass: boolean | null;
  volatilityPass: boolean | null;
  effectiveAssetsPass: boolean | null;
  turnoverPass: boolean | null;
  profileRank: number | null;
  robustScore: number | null;
  profileScore: number | null;
  sourceFile: string;
};

export const td3PerformanceRows: QuantPerformanceRow[] = ${JSON.stringify(rows, null, 2)};

export const td3PerformanceMeta = {
  generatedAt: ${JSON.stringify(new Date().toISOString())},
  sourceFiles: ${JSON.stringify(sourceFiles, null, 2)},
  availableProfiles: ${JSON.stringify([...profiles].sort(), null, 2)},
  availableCashAssumptions: ${JSON.stringify([...new Set(rows.map((row) => row.cashAssumption))].sort(), null, 2)},
  unavailableCashAssumptions: ${JSON.stringify(unavailableCashAssumptions, null, 2)},
  note:
    "Sortino no está disponible en mandate_profile_rankings.csv; se deja como N/D para no mezclar fuentes con granularidades distintas.",
};
`;

  const outputPath = "lib/quant-lab/td3-performance.ts";
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output);

  console.log(`[td3-performance] Archivo generado: ${outputPath}`);
  console.log(`[td3-performance] Perfiles detectados: ${[...profiles].sort().join(", ")}`);
}

generate();
