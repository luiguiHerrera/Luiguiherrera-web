export type OptionsProxyContext = {
  sourceStatus: "prepared";
  statusText: string;
  proxyClarification: string;
  nextStep: string;
};

export const optionsProxyContext: OptionsProxyContext = {
  sourceStatus: "prepared",
  statusText: "No hay dato 0DTE real ni proxy de opciones vigente cargado para este bloque.",
  proxyClarification: "Cboe put/call ratios queda como proxy de opciones potencial; no sustituye datos reales por vencimiento 0DTE.",
  nextStep: "Integrar parser server-side validado para put/call ratios o datos por vencimiento antes de mostrar cifras.",
};
