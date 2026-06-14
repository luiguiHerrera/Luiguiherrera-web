import { crossSignalRadar } from "@/lib/dashboard/manual-data";
import type { CrossSignalRadarRow } from "@/lib/dashboard/types";

export function getRadarRows(): CrossSignalRadarRow[] {
  return crossSignalRadar.map((row) => ({
    ...row,
    dataStatus: "manual",
    reliabilityNote: `${row.reliabilityNote} Modo MVP: actualización manual/curada; no es un feed automatizado.`,
  }));
}
