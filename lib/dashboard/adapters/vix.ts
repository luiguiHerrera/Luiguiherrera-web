import { dashboardModules } from "@/lib/dashboard/manual-data";
import type { DashboardModuleData } from "@/lib/dashboard/types";

export function getVixModule(): DashboardModuleData {
  const fallback = dashboardModules.find((module) => module.id === "vix");

  if (!fallback) {
    throw new Error("Missing VIX fallback module");
  }

  return {
    ...fallback,
    status: "Pendiente de automatización",
    dataStatus: "live_pending",
    reliabilityNote: `${fallback.reliabilityNote} Adapter pendiente: se debe revisar proveedor, permisos y timestamp antes de automatizar VIX spot y futuros.`,
  };
}
