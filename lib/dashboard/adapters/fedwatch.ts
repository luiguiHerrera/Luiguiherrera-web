import { dashboardModules } from "@/lib/dashboard/manual-data";
import type { DashboardModuleData } from "@/lib/dashboard/types";

export function getFedWatchModule(): DashboardModuleData {
  const fallback = dashboardModules.find((module) => module.id === "rates");

  if (!fallback) {
    throw new Error("Missing FedWatch fallback module");
  }

  return {
    ...fallback,
    status: "Pendiente de automatización",
    dataStatus: "live_pending",
    reliabilityNote: `${fallback.reliabilityNote} Adapter pendiente: se debe revisar fuente, permisos y estabilidad antes de automatizar CME FedWatch.`,
  };
}
