import type { QuantRiskData } from "@/lib/dashboard/types";

const descriptions = {
  es: { ewma:"Volatilidad EWMA anualizada ≥18%",garch:"Volatilidad GARCH anualizada ≥18% (EWMA si GARCH no está disponible)",correlation:"Correlación media de 21 sesiones ≥0,65",dispersion:"Dispersión sectorial 1W ≥4 puntos o 1M ≥8 puntos",leadership:"Liderazgo relativo defensivo" },
  en: { ewma:"Annualized EWMA volatility ≥18%",garch:"Annualized GARCH volatility ≥18% (EWMA if GARCH is unavailable)",correlation:"Average 21-session correlation ≥0.65",dispersion:"Sector dispersion 1W ≥4 points or 1M ≥8 points",leadership:"Defensive relative leadership" },
};

export function SectorFragilityExplanation({data,locale="es"}:{data:QuantRiskData;locale?:"es"|"en"}) {
  const es=locale==="es";
  return <div className="text-base leading-7" data-sector-fragility-explanation>
    <p>{es?"Índice heurístico sobre los 11 ETF sectoriales: cinco condiciones de 20 puntos. Describe condiciones del mercado; 80/100 significa cuatro condiciones activas, no un 80% de probabilidad de caída ni el riesgo de tu cartera.":"A heuristic index of the 11 sector ETFs: five conditions worth 20 points each. It describes market conditions; 80/100 means four active conditions, not an 80% probability of a decline or your portfolio risk."}</p>
    {data.fragilityComponents?.length?<ul className="my-4 grid gap-2">{data.fragilityComponents.map(item=><li key={item.id} className="flex justify-between gap-4 border-b border-line py-2"><span>{descriptions[locale][item.id]}</span><span className="shrink-0 tabular-nums">{item.met?item.points:0}/20</span></li>)}</ul>:<p className="mt-3 text-muted">{es?"Desglose no disponible con esta captura.":"The breakdown is unavailable in this snapshot."}</p>}
    <p className="mt-3 text-muted">{es?"Limitación: EWMA y GARCH no son dos riesgos independientes. Cuando GARCH utiliza el fallback EWMA, ambos criterios leen la misma volatilidad. Este índice anterior se conserva para comparación y no se añade al nuevo régimen como un voto adicional.":"Limitation: EWMA and GARCH are not independent risks. When GARCH falls back to EWMA, both criteria read the same volatility. This previous index is retained for comparison and does not enter the new regime as an additional vote."}</p>
    {data.fragilityUsesEwmaFallback?<p className="mt-3 font-medium text-brass">{es?"En esta captura, el criterio GARCH utiliza EWMA.":"In this snapshot the GARCH criterion uses EWMA."}</p>:null}
  </div>;
}
