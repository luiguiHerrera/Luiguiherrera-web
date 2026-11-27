"use client";

import { useId, useState } from "react";
import { DashboardDisclosureButton } from "@/components/dashboard/DashboardPrimitives";

export function DashboardReadingGuide({ locale }: { locale: "es" | "en" }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const copy = locale === "en"
    ? {
        eyebrow: "Guide",
        title: "How to read this dashboard",
        description: "Four complementary views of the market: financial stress, price and participation, risk, and capital flows. Agreement or divergence adds context; no single block is a buy or sell signal on its own.",
        show: "Expand guide",
        hide: "Collapse guide",
        items: [
          ["Financial environment","The OFR Financial Stress Index measures stress in global financial markets relative to its historical average: positive values are above average and negative values are below. The card shows its level, the change over 20 sessions, and stress contributions. This is the index published by the OFR, rather than a score calculated by this website. Check the observation date and publication lag."],
          ["Price and participation","SPY shows the adjusted price and its return; RSP versus SPY compares equal weighting with market-cap weighting. Sectors and RAMO/RASI help show how widely the index’s move is shared. The summary uses the current calendar month; the detail allows other windows. Check the common observation date used to compare prices and breadth."],
          ["Risk","VIX and its futures curve describe implied volatility; EWMA and GARCH estimate volatility from returns. VaR95 and Expected Shortfall describe the loss tail in the historical sample; they do not guarantee a maximum loss. The sector absorption ratio measures how much sector variation is concentrated in common components. Each measure has its own scale, window, and assumptions."],
          ["Capital flows","The cards cover SPY, GLD, spot BTC and ETH ETFs, and EWJ. Each universe has its own effective date and calculation convention, explained in its context; it does not represent the whole market. A delayed snapshot keeps its original date. Distinguish a session without data from one with zero net flow."],
        ],
      }
    : {
        eyebrow: "Guía",
        title: "Cómo leer este dashboard",
        description: "Cuatro lecturas complementarias del mercado: estrés financiero, precio y participación, riesgo y flujos de capital. Su coincidencia o divergencia aporta contexto; ningún bloque constituye por sí solo una señal de compra o venta.",
        show: "Ampliar guía",
        hide: "Contraer guía",
        items: [
          ["Entorno financiero","El índice de estrés financiero de la OFR mide el estrés de los mercados financieros globales respecto a su media histórica: un nivel positivo está por encima y uno negativo, por debajo. La tarjeta muestra su nivel, el cambio en 20 sesiones y las contribuciones al estrés. Es el índice publicado por la OFR, no una puntuación calculada por esta web. Revisa la fecha del dato y su desfase de publicación."],
          ["Precio y participación","SPY muestra el precio ajustado y su rentabilidad; RSP frente a SPY compara la ponderación igual con la ponderación por capitalización. Los sectores y RAMO/RASI ayudan a observar cuánto acompaña el mercado al movimiento del índice. El resumen utiliza el mes natural vigente; el detalle permite otras ventanas. Revisa la fecha común utilizada para comparar precios y amplitud."],
          ["Riesgo","El VIX y su curva de futuros describen la volatilidad implícita; EWMA y GARCH estiman volatilidad a partir de los retornos. VaR95 y Expected Shortfall describen la cola de pérdidas de la muestra histórica; no garantizan una pérdida máxima. El absorption ratio mide cuánto se concentra la variación sectorial en componentes comunes. Cada medida tiene su escala, ventana y supuestos."],
          ["Flujos de capital","Las tarjetas cubren SPY, GLD, ETF spot de BTC y ETH, y EWJ. Cada universo tiene su fecha efectiva y su convención de cálculo, explicadas en el contexto; no representa todo el mercado. Un corte retrasado mantiene su fecha original. Distingue una sesión sin datos de una sesión con flujo neto cero."],
        ],
      };

  return (
    <aside className="mt-6 border-y border-line py-4 md:mt-8 md:py-5" aria-labelledby={`${contentId}-title`} data-dashboard-reading-guide>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">{copy.eyebrow}</p>
          <h2 id={`${contentId}-title`} className="mt-1.5 font-serif text-xl font-semibold text-ink md:text-2xl">{copy.title}</h2>
        </div>
        <DashboardDisclosureButton
          controls={contentId}
          expanded={open}
          collapsedLabel={copy.show}
          expandedLabel={copy.hide}
          onClick={() => setOpen((value) => !value)}
        />
      </div>

      {open ? (
        <div id={contentId} className="mt-4 grid gap-x-8 gap-y-4 border-t border-line pt-4 text-sm leading-6 text-muted md:grid-cols-2">
          <p className="text-sm leading-6 text-muted md:col-span-2">{copy.description}</p>
          {copy.items.map(([label, value]) => (
            <section key={label} className="border-l border-petrol/20 pl-3">
              <h3 className="font-semibold text-ink">{label}</h3>
              <p className="mt-1.5">{value}</p>
            </section>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
