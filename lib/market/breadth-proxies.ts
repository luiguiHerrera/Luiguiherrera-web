export type BreadthProxy = {
  key: string;
  label: string;
  status: "active_if_available" | "prepared";
  description: string;
};

export const breadthProxyPlan: BreadthProxy[] = [
  {
    key: "rsp-spy",
    label: "RSP/SPY",
    status: "active_if_available",
    description: "Compara S&P 500 equal weight contra S&P 500 ponderado por capitalización para observar concentración.",
  },
  {
    key: "iwm-spy",
    label: "IWM/SPY",
    status: "active_if_available",
    description: "Compara small caps contra S&P 500 para medir participación fuera de mega caps.",
  },
  {
    key: "sector-returns",
    label: "Sectores positivos/negativos",
    status: "active_if_available",
    description: "Cuenta cuántos sectores acompañan el movimiento reciente y cuántos quedan rezagados.",
  },
  {
    key: "sector-long-ma",
    label: "Sectores sobre media larga",
    status: "active_if_available",
    description: "Usa distancia a media larga de ETFs sectoriales cuando el snapshot estadístico la tiene disponible.",
  },
  {
    key: "qqqe-spy",
    label: "QQQE/SPY",
    status: "prepared",
    description: "Queda preparado como lectura de Nasdaq equal weight cuando se integre proveedor soportado.",
  },
];

export function breadthProxyPlanText() {
  return breadthProxyPlan.map((item) => item.label).join(", ");
}
