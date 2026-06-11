import { crossSignalRadar } from "@/lib/dashboard/manual-data";
import type { CrossSignalRadarRow } from "@/lib/dashboard/types";

export function getRadarRows(): CrossSignalRadarRow[] {
  return crossSignalRadar.map((row) => ({
    ...row,
    dataStatus: "live_pending",
    reliabilityNote: `${row.reliabilityNote} Adapter pendiente: short interest y 13F tienen retrasos estructurales y requieren proveedor con permisos claros antes de automatizar.`,
  }));
}
