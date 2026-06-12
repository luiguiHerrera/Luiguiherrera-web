const principles = [
  ["Prudencia", "Preferimos lecturas sobrias antes que conclusiones llamativas."],
  ["Trazabilidad", "Cada módulo declara fuente, estado, frecuencia y límite principal."],
  ["Privacidad", "No se guardan respuestas personales, portafolios ni patrimonio."],
  ["No predicción", "El sistema ordena contexto; no anticipa precios."],
  ["Educación", "Las herramientas ayudan a pensar mejor, no a delegar criterio."],
  ["Separación", "Contexto de mercado no equivale a recomendación personalizada."],
];

const systemMap = [
  ["Datos públicos / fuentes", "Mercado, volatilidad, flujos, outputs cuantitativos y criterios educativos."],
  ["Procesamiento", "Adapters server-side, cálculos estáticos, validaciones y fallbacks prudentes."],
  ["Lecturas estadísticas", "Régimen, rotación, niveles, drawdowns, métricas y señales relativas."],
  ["Herramientas educativas", "Diagnóstico, protección, metodología y laboratorios de lectura."],
  ["Decisión humana", "La persona contrasta, pregunta, documenta y decide fuera de la plataforma."],
];

const tools = [
  {
    name: "Dashboard de régimen",
    does: "Ordena volatilidad, rotación sectorial y flujos de ETFs BTC.",
    doesNot: "No da señales de compra o venta.",
    source: "Alpha Vantage, FRED/VIX, Bitbo y estados pendientes donde aplica.",
    limit: "Fuentes externas pueden retrasarse, fallar o cambiar formato.",
  },
  {
    name: "Diagnóstico del inversor",
    does: "Ayuda a ordenar horizonte, tolerancia, comportamiento y experiencia.",
    doesNot: "No reemplaza una evaluación regulatoria formal de idoneidad.",
    source: "Cuestionario educativo interno.",
    limit: "No guarda respuestas ni construye un perfil legal del usuario.",
  },
  {
    name: "Niveles estadísticos",
    does: "Calcula niveles, extremos, drawdowns y patrones históricos por activo.",
    doesNot: "No predice rupturas ni soportes futuros.",
    source: "Dataset histórico generado localmente.",
    limit: "La calidad depende del historial disponible por activo.",
  },
  {
    name: "Quant Lab",
    does: "Expone resultados TD3, benchmarks y restricciones del protocolo experimental.",
    doesNot: "No afirma superioridad estadística ni recomienda asignaciones.",
    source: "Outputs trazables del repositorio de investigación.",
    limit: "Resultados históricos y experimentales no garantizan comportamiento futuro.",
  },
  {
    name: "Protege tu dinero",
    does: "Organiza señales educativas de alerta antes de confiar en una propuesta.",
    doesNot: "No verifica oficialmente entidades ni declara fraude.",
    source: "Criterios públicos CNMV / MiFID II.",
    limit: "Debe complementarse con verificación en fuentes oficiales.",
  },
];

const sourceNotes = [
  ["Mercado", "ETFs sectoriales como proxies, VIX de cierre, flujos publicados y datos históricos precalculados."],
  ["Actualización", "Algunos módulos se actualizan server-side con caché; otros se regeneran mediante scripts estáticos."],
  ["Fallbacks", "Si una fuente falla, el módulo debe mostrar estado prudente sin presentar datos demo como reales."],
  ["FedWatch", "Permanece pendiente o con peso cero hasta que la fuente automatizada esté correctamente habilitada."],
];

const privacyItems = ["Sin cuentas", "Sin cookies actuales", "Sin analytics reales", "Sin respuestas personales guardadas", "Sin portafolios almacenados", "Sin persistencia en navegador"];

const limits = [
  "No constituye asesoría financiera, legal, fiscal ni patrimonial.",
  "No recomienda activos, productos, pesos ni momentos de ejecución.",
  "No predice precios, rendimientos, volatilidad ni flujos futuros.",
  "No sustituye una evaluación regulatoria formal de idoneidad o conveniencia.",
  "Los datos pueden fallar, retrasarse, revisarse o quedar temporalmente no disponibles.",
  "Los modelos cuantitativos muestran resultados históricos, no garantías futuras.",
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{children}</p>;
}

export default function MetodologiaPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
      <section className="border-b border-line pb-9">
        <Eyebrow>Cómo funciona el sistema</Eyebrow>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Metodología</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          Cómo se construyen las lecturas, qué datos usan y qué límites tienen.
        </p>
      </section>

      <section className="mt-8">
        <Eyebrow>Principios</Eyebrow>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {principles.map(([title, text]) => (
            <article key={title} className="border border-line bg-panel p-4">
              <h2 className="font-semibold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 border border-line bg-panel p-5 md:p-6">
        <div className="max-w-3xl">
          <Eyebrow>Mapa del sistema</Eyebrow>
          <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Del dato público a la decisión humana</h2>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-5">
          {systemMap.map(([title, text], index) => (
            <article key={title} className="relative border border-line bg-panelSoft p-4">
              <span className="text-xs font-semibold text-brass">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
              {index < systemMap.length - 1 ? <span className="absolute right-3 top-3 hidden text-muted lg:block">→</span> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="max-w-3xl">
          <Eyebrow>Herramienta por herramienta</Eyebrow>
          <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Qué hace, qué no hace y dónde termina</h2>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-3 pr-4 font-medium">Herramienta</th>
                <th className="py-3 pr-4 font-medium">Qué hace</th>
                <th className="py-3 pr-4 font-medium">Qué no hace</th>
                <th className="py-3 pr-4 font-medium">Fuente / criterio</th>
                <th className="py-3 pr-4 font-medium">Límite principal</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((tool) => (
                <tr key={tool.name} className="border-b border-line/70 align-top">
                  <td className="py-4 pr-4 font-semibold text-ink">{tool.name}</td>
                  <td className="py-4 pr-4 text-muted">{tool.does}</td>
                  <td className="py-4 pr-4 text-muted">{tool.doesNot}</td>
                  <td className="py-4 pr-4 text-muted">{tool.source}</td>
                  <td className="py-4 pr-4 text-muted">{tool.limit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="border border-line bg-panel p-5 md:p-6">
          <Eyebrow>Fuentes y actualización</Eyebrow>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Datos con estado visible</h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            La plataforma distingue entre dato automatizado, dato manual, demo educativo y fuente pendiente. El estado importa tanto como el número.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {sourceNotes.map(([title, text]) => (
            <article key={title} className="border border-line bg-panelSoft p-4">
              <h3 className="font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="border border-line bg-panel p-5 md:p-6">
          <Eyebrow>Privacidad</Eyebrow>
          <h2 className="mt-2 text-2xl font-semibold text-ink">La lectura ocurre sin guardar tu vida financiera</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {privacyItems.map((item) => (
              <span key={item} className="border border-line bg-panelSoft px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                {item}
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-muted">
            Algunas selecciones pueden vivir temporalmente en la interfaz o en la URL para que una vista sea reproducible, pero no se almacenan respuestas personales ni perfiles patrimoniales.
          </p>
        </div>

        <div className="border border-line bg-panel p-5 md:p-6">
          <Eyebrow>Límites</Eyebrow>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Lo que la plataforma no debe prometer</h2>
          <ul className="mt-5 grid gap-2 text-sm leading-6 text-muted">
            {limits.map((item) => (
              <li key={item} className="border-l border-line pl-3">{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
