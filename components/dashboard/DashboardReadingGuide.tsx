"use client";

import { useId, useState } from "react";
import { DashboardDisclosureButton } from "@/components/dashboard/DashboardPrimitives";

export function DashboardReadingGuide({ locale }: { locale: "es" | "en" }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const copy = locale === "en"
    ? {
        eyebrow: "Reading guide",
        title: "How to read this dashboard",
        description: "This dashboard combines market regime, sector rotation, market breadth, quantitative risk, implied volatility, and capital flows to provide complementary views of the market environment. No individual block—including VIX, GLD, or spot Bitcoin ETFs—is a buy or sell signal on its own; the readings gain context when they agree or diverge.",
        show: "Expand guide",
        hide: "Collapse guide",
        items: [
          ["Integrated regime", "The integrated regime synthesizes several dimensions into one contextual reading; it is not a standalone trading instruction."],
          ["Rotation and breadth", "Sector rotation shows where leadership is concentrated, while market breadth shows how widely it is shared. Narrow leadership can describe a different environment from broad participation."],
          ["Quantitative risk", "Quantitative risk organizes statistical fragility and historical conditions under explicit assumptions; it does not determine future outcomes."],
          ["VIX and term structure", "VIX approximates the current level of implied volatility, while the futures term structure distinguishes contango from backwardation. They answer different questions."],
          ["Capital flows", "Capital flows add context about pressure toward GLD and spot Bitcoin ETFs. Proxies and sources have limits that should be read alongside their methodology."],
          ["Cross-reading", "Agreement or divergence between modules can be informative, but it does not trigger an automatic action."],
        ],
      }
    : {
        eyebrow: "Guía de lectura",
        title: "Cómo leer este dashboard",
        description: "Este dashboard combina régimen de mercado, rotación sectorial, amplitud de mercado, riesgo cuantitativo, volatilidad implícita y flujos de capital para ofrecer perspectivas complementarias del entorno. Ningún bloque —incluidos VIX, GLD y los ETF spot de Bitcoin— constituye por sí solo una señal de compra o venta; las lecturas ganan contexto cuando coinciden o divergen.",
        show: "Ampliar guía",
        hide: "Contraer guía",
        items: [
          ["Régimen integrado", "El régimen integrado sintetiza varias dimensiones en una lectura de contexto; no es una instrucción operativa independiente."],
          ["Rotación y amplitud", "La rotación sectorial muestra dónde se concentra el liderazgo y la amplitud de mercado indica cuánto participa. Un liderazgo estrecho puede describir un entorno distinto de una participación amplia."],
          ["Riesgo cuantitativo", "El riesgo cuantitativo organiza fragilidad estadística y condiciones históricas bajo supuestos explícitos; no determina resultados futuros."],
          ["VIX y estructura temporal", "El VIX aproxima el nivel actual de volatilidad implícita, mientras la estructura temporal de los futuros distingue contango de backwardation. Responden preguntas diferentes."],
          ["Flujos de capital", "Los flujos de capital aportan contexto sobre la presión hacia GLD y los ETF spot de Bitcoin. Los proxies y las fuentes tienen límites que deben leerse junto a su metodología."],
          ["Lectura cruzada", "La coincidencia o divergencia entre módulos puede ser informativa, pero no activa una acción automática."],
        ],
      };

  return (
    <aside className="mt-6 border-y border-line py-4 md:mt-8 md:py-5" aria-labelledby={`${contentId}-title`} data-dashboard-reading-guide>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">{copy.eyebrow}</p>
          <h2 id={`${contentId}-title`} className="mt-1.5 font-serif text-xl font-semibold text-ink md:text-2xl">{copy.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{copy.description}</p>
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
