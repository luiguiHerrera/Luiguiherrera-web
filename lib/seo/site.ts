export const SITE_URL = "https://www.luiguiherrera.com";

export const languagePairs = [
  ["/", "/en"],
  ["/empezar", "/en/start"],
  ["/presupuesto", "/en/budget"],
  ["/deudas", "/en/debt"],
  ["/diagnostico", "/en/diagnostic"],
  ["/inversionista", "/en/investor"],
  ["/proteccion", "/en/protection"],
  ["/protege-tu-dinero", "/en/protect-your-money"],
  ["/dashboard", "/en/dashboard"],
  ["/informes", "/en/weekly-report"],
  ["/niveles-estadisticos", "/en/statistical-levels"],
  ["/tendencias", "/en/trends"],
  ["/recursos", "/en/resources"],
  ["/metodologia", "/en/methodology"],
  ["/investigacion/td3", "/en/research/td3"],
  ["/legal", "/en/legal"],
] as const;

export function absoluteUrl(pathname: string) {
  return new URL(pathname, SITE_URL).toString();
}

export function languageAlternates(pathname: string) {
  const pair = languagePairs.find(([es, en]) => es === pathname || en === pathname);
  if (!pair) return null;
  const [es, en] = pair;
  return { es: absoluteUrl(es), en: absoluteUrl(en), "x-default": absoluteUrl(es) };
}
