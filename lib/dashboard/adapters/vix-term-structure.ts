import type { VixTermStructureData } from "@/lib/dashboard/types";

const CBOE_VIX_FUTURES_SOURCE_URL = "https://www.cboe.com/tradable_products/vix/vix_futures/";

function logVixTermStructureFallback(reason: string, details: Record<string, unknown> = {}) {
  console.info("[dashboard:vix-term-structure]", {
    reason,
    ...details,
  });
}

export async function getVixTermStructureData(): Promise<VixTermStructureData> {
  logVixTermStructureFallback("stable_public_source_pending", {
    source: "Cboe VIX futures delayed quotes",
    sourceUrl: CBOE_VIX_FUTURES_SOURCE_URL,
    note: "No automated request is made until a stable public endpoint or licensed vendor is validated.",
  });

  return {
    source: "Cboe VIX futures",
    sourceUrl: CBOE_VIX_FUTURES_SOURCE_URL,
    sourceStatus: "pending",
    lastUpdated: null,
    points: [
      { label: "VX1", contract: null, value: null },
      { label: "VX2", contract: null, value: null },
      { label: "VX3", contract: null, value: null },
    ],
    m1m2Spread: null,
    m1m2SlopePct: null,
    m1m3Spread: null,
    m1m3SlopePct: null,
    classification: "Pendiente",
    interpretation:
      "Estructura VIX pendiente de fuente automatizada estable. Cuando haya datos confiables, la lectura mostrará si los futuros cercanos están en contango, planos o backwardation.",
    whatItDoesNotMean:
      "La estructura temporal del VIX no predice por sí sola la dirección del mercado y no representa una señal de compra o venta.",
    reliabilityNote:
      "Módulo preparado para una fuente oficial o proveedor estable de VIX futures delayed quotes. Se mantiene en estado pendiente para evitar scraping frágil o datos sin trazabilidad.",
  };
}
