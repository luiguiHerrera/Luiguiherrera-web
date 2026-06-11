import type { DataStatus } from "@/lib/dashboard/types";

export const dataStatusLabels: Record<DataStatus, string> = {
  demo: "Datos demo",
  manual: "Datos manuales",
  live_pending: "Pendiente de automatización",
  automated: "Datos automatizados",
};
