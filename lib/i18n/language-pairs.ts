export const bilingualRoutePairs = [
  { es: "/", en: "/en" },
  { es: "/empezar", en: "/en/start" },
  { es: "/presupuesto", en: "/en/budget" },
  { es: "/deudas", en: "/en/debt" },
  { es: "/diagnostico", en: "/en/diagnostic" },
  { es: "/inversionista", en: "/en/investor" },
  { es: "/fragilidad-de-portafolio", en: "/en/portfolio-fragility" },
  { es: "/proteccion", en: "/en/protection" },
  { es: "/protege-tu-dinero", en: "/en/protect-your-money" },
  { es: "/dashboard", en: "/en/dashboard" },
  { es: "/niveles-estadisticos", en: "/en/statistical-levels" },
  { es: "/tendencias", en: "/en/trends" },
  { es: "/recursos", en: "/en/resources" },
  { es: "/metodologia", en: "/en/methodology" },
  { es: "/investigacion", en: "/en/research" },
  { es: "/investigacion/td3", en: "/en/research/td3" },
  { es: "/investigacion/el-fantasma-de-una-anomalia", en: "/en/research/the-ghost-of-an-anomaly" },
  { es: "/legal", en: "/en/legal" },
] as const;

export type BilingualRouteLocale = keyof (typeof bilingualRoutePairs)[number];

export function findBilingualRoutePair(pathname: string) {
  return bilingualRoutePairs.find((pair) => pair.es === pathname || pair.en === pathname);
}

export function getTranslatedPathname(pathname: string, targetLocale: BilingualRouteLocale) {
  return findBilingualRoutePair(pathname)?.[targetLocale];
}
