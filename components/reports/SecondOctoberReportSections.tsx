import type { ReactNode } from "react";
import type { MarketReport } from "@/lib/reports/market-reports";
import type { ReportEditorialBlock, ReportEditorialSection } from "@/lib/reports/report-editorial-sections";
import { ReportAssetAnchors } from "./ReportAssetAnchors";
import { ReportMonthlyCalendar } from "./ReportMonthlyCalendar";
import { ReportQuantitativePanels } from "./ReportQuantitativePanels";
import { ReportEditorialInline, groupEditorialBlocks } from "./ReportEditorialSections";

// Presentation of the approved October text only. No live data or historical
// automatic snapshot is read here. Quantitative slots stay empty without one.
const assetIds = ["spy", "gld", "fxi", "ewj", "btc", "eth", "stock-picking"];
const watchTargets = ["spy", "stock-picking", "rotacion-octubre", "macro-octubre", "stock-picking", "gld", "fxi", "ewj", "btc", "eth", "stock-picking"];
const sectors = [
  { ticker: "XLP", name: "Consumo básico", value: 5.02, label: "+5,02 %" },
  { ticker: "XLE", name: "Energía", value: 4.86, label: "+4,86 %" },
  { ticker: "XLV", name: "Salud", value: 3.45, label: "+3,45 %" },
  { ticker: "XLK", name: "Tecnología", value: -7.70, label: "−7,70 %" },
];

function copy(text: string) {
  return text
    .replace(/^\*\*Mi conclusión:\*\* el /, "El ")
    .replace(/^\*\*(?:La lectura principal\.|Mi conclusión:)\*\* /, "")
    .replace(/^Hay un matiz que vale la pena destacar: /, "")
    .replace(/^Lo interesante es que, pese a/, "Pese a")
    .replace(/^¿Hay una contradicción\? No necesariamente\. /, "")
    .replace("tabla de megacaps y resumen CDI", "tabla de megacaps y resumen de mercado");
}

function Text({ text }: { text: string }) {
  return <p className="text-sm leading-7 text-muted"><ReportEditorialInline text={copy(text)} /></p>;
}

function Paragraphs({ blocks }: { blocks: ReportEditorialBlock[] }) {
  return <div className="grid gap-4">{blocks.map((block, index) => block.kind === "paragraph" || block.kind === "source"
    ? <Text key={index} text={block.text} /> : null)}</div>;
}

function Detail({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return <details open={open} className="group min-w-0 border border-line bg-panel">
    <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-petrol marker:text-brass">
      {title}<span aria-hidden="true" className="text-brass"><span className="details-open-label">+</span><span className="details-close-label">−</span></span>
    </summary>
    <div className="grid gap-4 border-t border-line p-4 md:p-5">{children}</div>
  </details>;
}

function Table({ block, caption }: { block: Extract<ReportEditorialBlock, { kind: "table" }>; caption: string }) {
  return <div className="overflow-x-auto border border-line" role="region" aria-label={caption} tabIndex={0}>
    <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className="bg-panelSoft"><tr>{block.headers.map(header => <th key={header} scope="col" className="border-b border-line px-4 py-3 font-semibold text-petrol">{header}</th>)}</tr></thead>
      <tbody>{block.rows.map((row, index) => <tr key={row[0]} className={index % 2 ? "bg-panelSoft/45" : "bg-panel"}>
        {row.map((cell, column) => column === 0
          ? <th key={column} scope="row" className="border-b border-line px-4 py-3 font-medium text-ink"><ReportEditorialInline text={cell} /></th>
          : <td key={column} className="border-b border-line px-4 py-3 tabular-nums text-muted"><ReportEditorialInline text={cell} /></td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}

function Section({ section, title = section.title, note, children }: { section: ReportEditorialSection; title?: string; note?: string; children: ReactNode }) {
  return <section id={section.id} data-native-report-section={section.id} className="grid min-w-0 scroll-mt-24 gap-6 border-b border-line py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-petrol">{section.eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">{title}</h2>
      {note ? <p className="mt-3 text-sm leading-6 text-muted">{note}</p> : null}
    </div>
    <div className="grid min-w-0 gap-5">{children}</div>
  </section>;
}

function Rotation({ blocks }: { blocks: ReportEditorialBlock[] }) {
  return <section id="rotacion-octubre" className="scroll-mt-24 border border-line bg-panel p-4 md:p-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h3 className="text-xl font-semibold text-ink">Rotación sectorial</h3>
      <span className="border border-brass/40 bg-panelSoft px-3 py-1 text-sm font-semibold text-petrol">7 de 11 sectores en positivo</span>
    </div>
    <p className="mt-2 text-xs leading-5 text-muted">Retorno del 09/10 al 16/10 · cuatro sectores destacados, no el universo completo. [M1]</p>
    <figure className="mt-5">
      <div className="grid gap-3 sm:grid-cols-2">{sectors.map(sector => <div key={sector.ticker} className="border border-line bg-panelSoft p-4">
        <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-petrol">{sector.ticker} · {sector.name}</span><strong className={`text-lg tabular-nums ${sector.value < 0 ? "text-danger" : "text-petrol"}`}>{sector.label}</strong></div>
        <div className="mt-3 h-1.5 bg-line" aria-hidden="true"><div className={`h-full ${sector.value < 0 ? "bg-danger" : "bg-petrol"}`} style={{ width: `${Math.abs(sector.value) / 7.70 * 100}%` }} /></div>
      </div>)}</div>
      <figcaption className="mt-3 text-xs leading-5 text-muted">Las barras comparan la magnitud de las variaciones; el signo indica su dirección.</figcaption>
    </figure>
    <div className="mt-4"><Detail title="Ventana de cálculo y alcance de la mejora"><Paragraphs blocks={blocks} /></Detail></div>
  </section>;
}

function Halloween({ blocks }: { blocks: ReportEditorialBlock[] }) {
  return <section className="border border-line bg-panel p-4 md:p-5" aria-labelledby="halloween-octubre">
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">Estacionalidad</p>
    <h3 id="halloween-octubre" className="mt-2 text-xl font-semibold text-ink">Halloween: alcance y límites de la pauta</h3>
    <p className="mt-2 text-sm leading-6 text-muted">Ventana entre finales de octubre y principios de noviembre · estudio aportado [A8].</p>
    <figure className="mt-5 grid gap-4">
      {[{ period: "1993–2025", positive: 24, total: 33, otherLabel: "negativos", mean: "+1,67 %" }, { period: "2016–2025", positive: 6, total: 10, otherLabel: "no positivos", mean: "+0,50 %" }].map(sample => <div key={sample.period} className="border border-line bg-panelSoft p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold text-ink">{sample.period}</h4><span className="text-sm text-muted">Media simple <strong className="tabular-nums text-petrol">{sample.mean}</strong></span></div>
        <div className="mt-3 flex h-3 overflow-hidden" aria-hidden="true"><span className="bg-petrol" style={{ width: `${sample.positive / sample.total * 100}%` }} /><span className="flex-1 bg-danger opacity-60" /></div>
        <p className="mt-2 text-xs text-muted">{sample.positive} de {sample.total} años positivos · {sample.total - sample.positive} {sample.otherLabel}</p>
      </div>)}
      <figcaption className="text-xs leading-5 text-muted">Sin 1997 y 2008, la media de la muestra larga baja a aproximadamente +1,07 %. Es una comparación de muestras, no una serie anual reconstruida.</figcaption>
    </figure>
    <div className="mt-4"><Detail title="Muestras, cálculo y limitaciones"><Paragraphs blocks={blocks.slice(0, 2)} /></Detail></div>
    <div className="mt-4 border-l-2 border-brass pl-4"><Paragraphs blocks={blocks.slice(2)} /></div>
  </section>;
}

export function SecondOctoberReportSections({ report }: { report: MarketReport }) {
  const sections = report.editorialSections!;
  const section = (id: string) => sections.find(item => item.id === id)!;
  const market = section("lecturas-mercado-cierre");
  const [comparison, rotation, macro, sentiment, technology, oil] = groupEditorialBlocks(market);
  const tables = comparison.blocks.filter(block => block.kind === "table");
  const assets = section("lectura-seguimiento");
  const assetGroups = groupEditorialBlocks(assets);
  const season = section("estacionalidad-calendario");
  const [seasonContext, halloween, calendar] = groupEditorialBlocks(season);
  const scenarios = section("rutas-probables");
  const watch = section("lista-control");
  const sources = section("fuentes-y-aviso");
  const sourceBlocks = sources.blocks.filter((block): block is Exclude<ReportEditorialBlock, { kind: "table" }> => block.kind === "source");
  const sourceGroups = [
    { title: "Precios y amplitud", ids: [1, 6, 7] },
    { title: "Economía y calendario", ids: [2, 3, 4, 5, 9, 16] },
    { title: "Sentimiento y flujos", ids: [8, 10, 11, 12] },
    { title: "Crédito, energía y cripto", ids: [13, 14, 15] },
  ];
  const octoberCalendar = report.calendar.filter(event => event.dateStart?.startsWith("2026-10")).map((event, index) => ({
    ...event,
    category: (["earnings", "macro", "central-bank", "macro"] as const)[index],
    affectedAssets: [
      ["Beneficios", "Previsiones", "Inversión", "Márgenes"],
      ["Actividad", "Confianza", "Inflación esperada"],
      ["Tipos", "Mensaje de la Fed"],
      ["Crecimiento", "Inflación"],
    ][index],
  }));

  return <>
    <ReportAssetAnchors />
    <nav aria-label="Secciones del informe" className="border-b border-line py-4"><ul className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-petrol">{sections.map(item => <li key={item.id}><a className="underline decoration-petrol/30 underline-offset-4" href={`#${item.id}`}>{item.eyebrow}</a></li>)}</ul></nav>

    <Section section={section("contexto-general")}><Paragraphs blocks={section("contexto-general").blocks} /></Section>

    <Section section={market} note="Comparación con el primer informe de octubre.">
      <aside className="border-l-2 border-brass bg-panelSoft px-5 py-4" aria-label="Contexto de congelación de datos">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">Datos congelados</p>
        <p className="mt-2 text-sm leading-6 text-ink">Cierre de mercado: 16 de octubre de 2026 · corte editorial: 19 de octubre. Cada encuesta y fuente conserva su propia fecha de observación.</p>
      </aside>
      <Table block={tables[0]} caption="Mercado al cierre: comparación del 2 y el 16 de octubre de 2026" />
      {report.marketClose?.quantitativePanels?.length ? <ReportQuantitativePanels panels={report.marketClose.quantitativePanels} asset="Mercado al cierre" /> : null}
      <Detail title="Amplitud y comparabilidad de los cortes"><Paragraphs blocks={comparison.blocks.filter(block => block.kind === "paragraph" && !block.text.startsWith("Lo primero") && !block.text.startsWith("También hay") && !block.text.startsWith("Hay un matiz"))} /></Detail>
      <Rotation blocks={rotation.blocks} />
      <section id="macro-octubre" className="grid scroll-mt-24 gap-4">
        <h3 className="text-xl font-semibold text-ink">Inflación, bonos y energía</h3>
        <div className="grid gap-4 sm:grid-cols-3">{[
          ["CPI · septiembre", "+3,7 %", "Interanual · +0,6 % mensual [M2]"],
          ["PPI · septiembre", "+6,3 %", "Interanual · +1,3 % mensual [M3]"],
          ["Treasury · 16/10", "5,09 %", "10 años · −19 pb desde el 02/10 [M5]"],
        ].map(([label, value, note]) => <article key={label} className="border border-line bg-panelSoft p-4"><h4 className="text-xs font-semibold text-petrol">{label}</h4><p className="mt-3 text-2xl font-semibold tabular-nums text-ink">{value}</p><p className="mt-2 text-xs leading-5 text-muted"><ReportEditorialInline text={note} /></p></article>)}</div>
        <Detail title="Inflación, consumo y coste de financiación"><Paragraphs blocks={macro.blocks} /></Detail>
        <Detail title="Petróleo y transporte · J.P. Morgan"><Paragraphs blocks={oil.blocks} /></Detail>
      </section>
      <section className="grid gap-4">
        <h3 className="text-xl font-semibold text-ink">Sentimiento, posicionamiento y flujos</h3>
        <Table block={tables[1]} caption="Encuestas y posicionamiento: fechas propias de cada observación" />
        <div className="grid gap-3 sm:grid-cols-3">{[
          ["Fondos de acciones de EE. UU.", "+13.010"],
          ["Fondos tecnológicos", "−5.210"],
          ["Fondos de bonos de EE. UU.", "+6.450"],
        ].map(([label, value]) => <article key={label} className="border border-line bg-panelSoft p-4"><h4 className="text-xs font-semibold text-petrol">{label}</h4><p className="mt-3 text-xl font-semibold tabular-nums text-ink">{value} <span className="text-xs font-normal text-muted">M USD</span></p><p className="mt-2 text-xs leading-5 text-muted">Flujo neto · semana terminada el 14/10. <ReportEditorialInline text="[M12]" /></p></article>)}</div>
        <Detail title="Encuestas, exposición y flujos: qué mide cada uno"><Paragraphs blocks={comparison.blocks.filter(block => block.kind === "paragraph" && block.text.startsWith("Hay un matiz"))} /><Paragraphs blocks={sentiment.blocks} /></Detail>
      </section>
    </Section>

    <Section section={assets} title="Lectura por activo" note="Evolución entre el 2 y el 16 de octubre. Abre cada activo para ver su contexto y condiciones de seguimiento.">
      <nav aria-label="Activos del informe" className="flex flex-wrap gap-2">{assetGroups.map((group, index) => <a key={assetIds[index]} className="border border-line bg-panel px-3 py-2 text-xs font-semibold text-petrol hover:border-petrol" href={`#octubre-${assetIds[index]}`}>{report.assetReadings[index].asset.split(" · ").at(-1)}</a>)}</nav>
      {assetGroups.map((group, index) => <details id={`octubre-${assetIds[index]}`} key={group.title} className="group min-w-0 scroll-mt-24 border border-line bg-panel open:border-petrol/45">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden"><h3 className="text-lg font-semibold text-ink">{group.title}</h3><span className="text-xs font-semibold uppercase text-brass"><span className="details-open-label">Abrir</span><span className="details-close-label">Cerrar</span></span></summary>
        <div className="grid gap-5 border-t border-line p-5">
          {group.blocks.map((block, position) => block.kind === "paragraph" ? <section key={position} className={position === 2 ? "border-l-2 border-brass bg-panelSoft p-4" : ""}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-petrol">{["Evolución", "Contexto", "Seguimiento"][position]}</h4>
            <Text text={block.text.replace(/^\*\*(?:Qué pasó\.|Cómo lo leo\.|Qué quiero ver\.)\*\* /, "")} />
          </section> : null)}
          {report.assetReadings[index].quantitativePanels?.length ? <ReportQuantitativePanels panels={report.assetReadings[index].quantitativePanels!} asset={report.assetReadings[index].asset} /> : null}
          {index === 6 ? <Detail title="Empresas, bancos y analistas · BofA y J.P. Morgan"><Paragraphs blocks={technology.blocks} /></Detail> : null}
          <a href="#lista-control" className="w-fit border-b border-petrol/30 text-sm font-semibold text-petrol">Ir a la lista de control ↓</a>
        </div>
      </details>)}
    </Section>

    <Section section={season} title="Estacionalidad y calendario">
      <Detail title="La expectativa del primer informe y sus límites"><Paragraphs blocks={seasonContext.blocks} /></Detail>
      <Halloween blocks={halloween.blocks} />
      <div id="calendario-octubre" className="grid scroll-mt-24 gap-4">
        <h3 className="text-xl font-semibold text-ink">Calendario de seguimiento</h3>
        <Paragraphs blocks={calendar.blocks} />
        <div className="[&>div>div]:self-start"><ReportMonthlyCalendar report={{ ...report, presentation: { ...report.presentation, calendarView: "remaining", calendarStartDate: "2026-10-19" } }} events={octoberCalendar} /></div>
        {report.calendar.filter(event => event.dateStart?.startsWith("2026-11")).map(event => <article key={event.event} className="border border-brass/40 bg-panelSoft p-4">
          <p className="text-xs font-semibold uppercase text-brass">{event.dateLabel} · continuidad en noviembre</p><h4 className="mt-2 text-lg font-semibold text-ink">{event.event}</h4><p className="mt-2 text-sm leading-6 text-muted">{event.whyItMatters}</p><p className="mt-3 text-xs text-muted">Fecha prevista editorial no confirmada · hora por confirmar</p>
        </article>)}
      </div>
    </Section>

    <Section section={scenarios} title="Rutas probables" note="Tres escenarios condicionales, sin probabilidades asignadas.">
      <div className="grid gap-3 md:grid-cols-3">{groupEditorialBlocks(scenarios).map((group, index) => <article key={group.title} className={`border border-line border-t-2 bg-panelSoft p-4 ${index === 2 ? "border-t-danger" : index === 1 ? "border-t-petrol" : "border-t-brass"}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brass">{["Base", "Favorable", "Adverso"][index]}</p><h3 className="mb-4 mt-2 text-lg font-semibold leading-6 text-ink">{group.title?.split(" · ")[1]}</h3><Paragraphs blocks={group.blocks} />
      </article>)}</div>
    </Section>

    <Section section={watch} title="Lista de control" note="Señales que confirmarían la lectura y condiciones que obligarían a revisarla.">
      <div className="grid gap-3 md:grid-cols-2">{report.watchlist.map((item, index) => <article key={item.key} className="flex flex-col border border-line bg-panel p-4">
        <h3 className="text-base font-semibold text-ink">{item.name}</h3><dl className="mt-4 grid flex-1 gap-3 text-sm leading-6"><div><dt className="text-xs font-semibold uppercase text-petrol">Señal a seguir</dt><dd className="mt-1 text-muted">{item.whatLooksAt}</dd></div><div className="border-l-2 border-brass pl-3"><dt className="text-xs font-semibold uppercase text-brass">Qué cambiaría la lectura</dt><dd className="mt-1 text-muted">{item.whatWouldChange}</dd></div></dl>
        <a href={`#${["rotacion-octubre", "macro-octubre"].includes(watchTargets[index]) ? watchTargets[index] : `octubre-${watchTargets[index]}`}`} className="mt-4 w-fit border-b border-petrol/30 py-1 text-xs font-semibold text-petrol" aria-label={`Ver contexto de ${item.name}`}>Ver contexto ↑</a>
      </article>)}</div>
      <div className="border-l-2 border-brass pl-4"><Paragraphs blocks={watch.blocks} /></div>
    </Section>

    <Section section={sources} title="Fuentes y metodología">
      <Detail title="Cortes, unidades y método de cálculo" open><Paragraphs blocks={sources.blocks.slice(0, 1)} /></Detail>
      <Detail title="Cobertura de niveles y métricas estadísticas"><Paragraphs blocks={sources.blocks.slice(1, 2)} /></Detail>
      <Detail title="Bancos, analistas y material atribuido [A1–A8]"><Paragraphs blocks={sources.blocks.slice(2, 3)} /></Detail>
      <div className="grid gap-4 sm:grid-cols-2">{sourceGroups.map(group => <section key={group.title} className="border border-line bg-panel p-4"><h3 className="mb-3 text-base font-semibold text-ink">{group.title}</h3><ul className="grid gap-4">{sourceBlocks.filter(block => group.ids.some(id => block.text.startsWith(`[M${id}]`))).map(block => <li key={block.text} className="break-words text-xs leading-6 text-muted"><ReportEditorialInline text={block.text} /></li>)}</ul></section>)}</div>
      <Detail title="Limitaciones"><Paragraphs blocks={sources.blocks.slice(-2, -1)} /></Detail>
      <div className="border-t border-line pt-4"><Paragraphs blocks={sources.blocks.slice(-1)} /></div>
    </Section>
  </>;
}
