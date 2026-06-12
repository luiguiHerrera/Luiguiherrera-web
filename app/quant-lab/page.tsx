import Link from "next/link";
import { Td3PerformanceTable } from "@/components/quant-lab/Td3PerformanceTable";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import {
  benchmarkRankingResults,
  capSensitivityResults,
  correctedProtocol,
  evaluationStack,
  featureFamilies,
  statisticalValidation,
  td3Project,
} from "@/lib/quant-lab/td3-results";

const chips = ["Deep Reinforcement Learning", "Validación fuera de muestra", "Restricciones realistas"];

const problemItems = [
  "controlar drawdown",
  "evitar concentración excesiva",
  "gestionar turnover",
  "sobrevivir a cambios de régimen",
  "comparar contra benchmarks simples",
  "distinguir robustez de sobreajuste",
];

const architectureSteps = [
  ["Estado del mercado", "Retornos, volatilidad, drawdown y variables de contexto disponibles para el experimento."],
  ["Actor", "Propone pesos porcentuales simulados dentro del universo experimental."],
  ["Entorno de portafolio", "Aplica costes, límites de concentración, cash y evolución histórica del portafolio."],
  ["Recompensa ajustada", "Evalúa retorno neto, riesgo, turnover y restricciones."],
  ["Críticos", "Dos evaluadores reducen estimaciones inestables durante el aprendizaje."],
  ["Actualización", "La política se ajusta en entrenamiento y se valida fuera de muestra."],
];

const universe = [
  ["SPY", "Renta variable", "Proxy amplio de renta variable estadounidense."],
  ["TLT", "Bonos largos", "Duración larga del Tesoro estadounidense."],
  ["GLD", "Oro", "Activo defensivo y reserva histórica de valor."],
  ["BTC", "Criptoactivo", "Componente de alta volatilidad para pruebas de sensibilidad."],
  ["CASH", "Liquidez", "Posición defensiva y punto de control del mandato."],
];

const protocol = [
  ["Train", "La política aprende con datos históricos separados de la evaluación final."],
  ["Validation", "Se ajustan hiperparámetros y restricciones sin mirar el tramo final."],
  ["Test", "Evaluación fuera de muestra con métricas comparables."],
  ["Walk-forward", "Repetición por ventanas para observar estabilidad temporal."],
];

const riskMetrics = [
  ["Max Drawdown", "Profundidad máxima desde un pico hasta un valle dentro del experimento."],
  ["Volatilidad", "Variabilidad anualizada de retornos en la política simulada."],
  ["Turnover", "Magnitud de rotación de pesos y fricción potencial de costes."],
  ["Concentración", "Peso máximo permitido o realizado por activo."],
  ["Effective number of assets", "Diversificación efectiva, no solo número nominal de activos."],
  ["Costes", "Penalización por cambios de asignación y fricción transaccional."],
];

const robustnessItems = [
  ["Múltiples seeds", "Repetir entrenamientos para observar dispersión de resultados."],
  ["Costes", "Medir sensibilidad cuando sube la fricción transaccional."],
  ["Concentración", "Comparar políticas bajo límites más estrictos."],
  ["Benchmarks", "Contrastar con reglas simples y transparentes."],
  ["Walk-forward", "Evaluar estabilidad por ventanas históricas."],
  ["Out-of-sample", "Separar evaluación final del proceso de entrenamiento."],
];

const notMeaning = [
  "No es una recomendación.",
  "No es asesoría financiera.",
  "No es optimización personalizada.",
  "No anticipa retornos futuros.",
  "No garantiza robustez futura.",
  "No reemplaza análisis humano ni criterios patrimoniales.",
  "No está conectado a cuentas ni portafolios reales.",
];

const roadmap = [
  "cargar resultados precalculados del paper",
  "comparar diferentes límites de concentración",
  "agregar sensibilidad a costes",
  "agregar escenarios macro",
  "visualizar pesos históricos",
  "integrar métricas de estabilidad",
  "documentar protocolo completo",
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{children}</p>;
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`min-w-0 border border-line bg-panel p-5 md:p-6 ${className}`}>{children}</section>;
}

function SectionTitle({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) {
  return (
    <div>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-2 text-xl font-semibold text-ink md:text-3xl">{title}</h2>
      {text ? <p className="mt-3 max-w-3xl text-sm leading-6 text-muted md:text-base md:leading-7">{text}</p> : null}
    </div>
  );
}

function formatScore(value: number) {
  return value.toFixed(6);
}

function formatDecimal(value: number, digits = 4) {
  return value.toFixed(digits);
}

function formatProbability(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function ScoreBar({ label, value, tone = "sage" }: { label: string; value: number; tone?: "sage" | "brass" }) {
  const color = tone === "sage" ? "#6f8f7b" : "#b18b5a";
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted">
        <span>{label}</span>
        <span className="font-semibold text-ink">{formatScore(value)}</span>
      </div>
      <div className="mt-2 h-2 bg-panel">
        <div className="h-2" style={{ width: `${Math.min(value, 1) * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function CapSensitivityChart() {
  return (
    <Panel>
      <SectionTitle
        eyebrow="Resultados disponibles"
        title="TD3-only cap sensitivity"
        text="La hipótesis de cash afecta la selección del modelo. Estos scores resumen rankings TD3 bajo dos supuestos de cash, no una tabla completa de performance."
      />
      <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-2">
        {capSensitivityResults.map((result) => (
          <div key={result.cashAssumption} className="min-w-0 border border-line bg-panelSoft p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{result.cashAssumption}</p>
            <h3 className="mt-3 break-all text-lg font-semibold text-ink">{result.model}</h3>
            <div className="mt-5 grid gap-4">
              <ScoreBar label="Mandate-aware score" value={result.mandateAwareScore} />
              <ScoreBar label="Robust score" value={result.robustScore} tone="brass" />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm leading-6 text-muted">
        Competitivo no significa dominante. Un ranking experimental no equivale a evidencia estadística de superioridad.
      </p>
    </Panel>
  );
}

function ValidationChart() {
  const min = -1;
  const max = 1;
  const x = (value: number) => ((value - min) / (max - min)) * 100;

  return (
    <Panel>
      <SectionTitle
        eyebrow="Validación estadística"
        title="Intervalos y White Reality Check"
        text="Los intervalos cruzan cero y los p-values WRC son altos; no hay evidencia suficiente para afirmar superioridad estadística."
      />
      <div className="mt-6 grid gap-5">
        {statisticalValidation.map((row) => (
          <div key={row.cashAssumption} className="border border-line bg-panelSoft p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{row.cashAssumption}</p>
                <p className="mt-1 text-sm text-muted">
                  Sharpe delta {formatDecimal(row.sharpeDelta)} · P(TD3 beats) {formatProbability(row.td3Probability)} · WRC p-value {formatDecimal(row.wrcPValue)}
                </p>
              </div>
            </div>
            <svg viewBox="0 0 100 24" className="mt-4 h-12 w-full" role="img" aria-label={`Validación estadística ${row.cashAssumption}`}>
              <line x1="0" x2="100" y1="12" y2="12" stroke="#ded8d0" strokeWidth="1" />
              <line x1={x(0)} x2={x(0)} y1="4" y2="20" stroke="#8d8580" strokeWidth="0.8" />
              <line x1={x(row.bootstrapCi[0])} x2={x(row.bootstrapCi[1])} y1="12" y2="12" stroke="#6f7478" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx={x(row.sharpeDelta)} cy="12" r="2.8" fill="#6f8f7b" />
              <text x="0" y="23" fontSize="4" fill="#6f7478">{row.bootstrapCi[0].toFixed(2)}</text>
              <text x="50" y="23" fontSize="4" fill="#6f7478" textAnchor="middle">0</text>
              <text x="100" y="23" fontSize="4" fill="#6f7478" textAnchor="end">{row.bootstrapCi[1].toFixed(2)}</text>
            </svg>
          </div>
        ))}
      </div>
      <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">
        TD3 no sobrevive pruebas de superioridad estadística. No debe hacerse una afirmación de dominancia.
      </p>
    </Panel>
  );
}

function EvaluationStackChart() {
  return (
    <Panel>
      <SectionTitle
        eyebrow="Marco de evaluación"
        title="Capas de evaluación"
        text="El laboratorio no se queda en un ranking superficial. La lectura avanza desde rankings internos hasta restricciones, validación estadística y análisis por régimen."
      />
      <div className="mt-6 grid gap-2">
        {evaluationStack.map((item, index) => (
          <div key={item} className="grid grid-cols-[3rem_1fr] items-center gap-3">
            <span className="text-xs font-semibold text-brass">{String(index + 1).padStart(2, "0")}</span>
            <div className="border border-line bg-panelSoft p-3 text-sm font-semibold text-ink" style={{ marginLeft: `${index * 10}px` }}>
              {item}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

type QuantLabPageProps = {
  searchParams?: Promise<{
    cash?: string;
    profile?: string;
  }>;
};

export default async function QuantLabPage({ searchParams }: QuantLabPageProps) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
      <section className="grid gap-8 border-b border-line pb-9 lg:grid-cols-[1fr_0.72fr] lg:items-end">
        <div>
          <Eyebrow>Investigación cuantitativa</Eyebrow>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">
            TD3 Portfolio Research Lab
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted">
            Evaluación experimental de políticas de asignación de portafolios bajo restricciones, costes y validación fuera de muestra.
          </p>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-muted">
            El objetivo no es mostrar una IA que adivina el mercado. El objetivo es evaluar si una política de asignación puede mantenerse robusta
            cuando se enfrenta a costes, límites de concentración, turnover y benchmarks exigentes.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span key={chip} className="border border-line bg-panelSoft px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <DisclaimerBox>
          Este laboratorio es educativo y metodológico. No genera recomendaciones de inversión, no optimiza portafolios personales y no constituye asesoría financiera.
        </DisclaimerBox>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.82fr]">
        <Panel>
          <SectionTitle eyebrow="Repositorio" title="Repositorio del proyecto" text="Código, documentación, pruebas y protocolo experimental del laboratorio TD3." />
          <div className="mt-5 border border-line bg-panelSoft p-5">
            <p className="text-sm font-semibold text-ink">{td3Project.title}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{td3Project.description}</p>
            <p className="mt-4 text-sm leading-6 text-muted">
              Los resultados mostrados aquí son un resumen metodológico. Los outputs completos pueden vivir fuera del repositorio principal cuando son demasiado pesados.
            </p>
            <a
              href={td3Project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex min-h-10 items-center border border-ink px-4 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white"
            >
              Ver repositorio en GitHub
            </a>
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Conclusión general" title="Competitivo no significa dominante" />
          <p className="mt-4 text-sm leading-6 text-muted">{td3Project.focus}</p>
          <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-muted">{td3Project.conclusion}</p>
        </Panel>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <SectionTitle
            eyebrow="El problema"
            title="Asignar capital no es solo maximizar retorno"
            text="Una estrategia puede verse atractiva en una simulación simple y deteriorarse cuando se incorporan costes, restricciones de concentración, ventanas fuera de muestra y comparación contra benchmarks. Este laboratorio parte de esa tensión."
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {problemItems.map((item) => (
              <div key={item} className="border-l border-line bg-panelSoft px-4 py-3 text-sm font-semibold text-ink">
                {item}
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            eyebrow="Universo experimental"
            title="Cinco motores para una prueba interpretable"
            text="El universo es deliberadamente reducido para facilitar interpretación, comparación y control experimental. No representa una recomendación de asignación ni una cartera sugerida."
          />
          <div className="mt-6 grid gap-3">
            {universe.map(([ticker, label, text]) => (
              <div key={ticker} className="grid gap-3 border border-line bg-panelSoft p-4 sm:grid-cols-[5rem_1fr]">
                <p className="text-xl font-semibold text-ink">{ticker}</p>
                <div>
                  <p className="text-sm font-semibold text-ink">{label}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-6">
        <SectionTitle
          eyebrow="Arquitectura TD3"
          title="Arquitectura del experimento"
          text="TD3 se usa aquí como marco de investigación para políticas continuas. La política propone pesos simulados y el entorno evalúa su comportamiento bajo restricciones, costes y métricas de riesgo."
        />
        <div className="mt-7 max-w-full overflow-x-auto">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:min-w-[900px] xl:grid-cols-6">
            {architectureSteps.map(([title, text], index) => (
              <div key={title} className="relative border border-line bg-panelSoft p-4">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">0{index + 1}</span>
                <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
                {index < architectureSteps.length - 1 ? <span className="absolute -right-3 top-1/2 hidden text-muted xl:block">→</span> : null}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Panel>
          <SectionTitle
            eyebrow="Protocolo"
            title="Protocolo experimental"
            text="La evaluación separa entrenamiento, validación y prueba. La prioridad no es maximizar una corrida aislada, sino observar estabilidad, robustez y comportamiento bajo restricciones."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {protocol.map(([title, text], index) => (
              <div key={title} className="border-t border-line pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">Fase {index + 1}</p>
                <h3 className="mt-2 text-lg font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 text-sm leading-6 text-muted sm:grid-cols-2">
            {["múltiples seeds", "benchmarks", "costes de transacción", "control de concentración", "cash", "restricciones realistas"].map((item) => (
              <p key={item} className="border border-line bg-panelSoft p-3">
                {item}
              </p>
            ))}
          </div>
          <div className="mt-6 border border-line bg-panelSoft p-4 text-sm leading-6 text-muted">
            <p><span className="font-semibold text-ink">Assets:</span> {correctedProtocol.assets.join(" · ")}</p>
            <p><span className="font-semibold text-ink">Portfolio:</span> {correctedProtocol.portfolio}</p>
            <p><span className="font-semibold text-ink">Costs:</span> {correctedProtocol.costs.join(" · ")}</p>
            <p><span className="font-semibold text-ink">BIL robustness:</span> {correctedProtocol.bilRobustness}</p>
            <p><span className="font-semibold text-ink">Reward:</span> {correctedProtocol.reward}</p>
            <p><span className="font-semibold text-ink">Risk:</span> {correctedProtocol.risk}</p>
            <p><span className="font-semibold text-ink">Macro:</span> {correctedProtocol.macro}</p>
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            eyebrow="Recompensa"
            title="Recompensa y restricciones"
            text="La recompensa es una construcción experimental. Cambiarla puede alterar materialmente los resultados."
          />
          <div className="mt-6 border border-line bg-panelSoft p-5">
            <p className="font-mono text-sm font-semibold text-ink">
              Reward = retorno - costes - penalización por drawdown - penalización por turnover
            </p>
          </div>
          <div className="mt-5 grid gap-3 text-sm leading-6 text-muted">
            {["retorno neto", "penalización por drawdown", "penalización por turnover", "control de costes", "componente Sharpe/Sortino si aplica", "restricciones de concentración"].map((item) => (
              <p key={item} className="border-l border-line pl-4">
                {item}
              </p>
            ))}
          </div>
        </Panel>
      </div>

      <section className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <CapSensitivityChart />
        <ValidationChart />
      </section>

      <section className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.86fr)]">
        <Panel>
          <SectionTitle
            eyebrow="Resultados disponibles"
            title="TD3 + benchmark ranking"
            text="Estos rankings son informativos, pero no constituyen evidencia de superioridad estadística."
          />
          <div className="mt-6 max-w-full overflow-x-auto [contain:paint]">
            <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="py-2.5 pr-4 font-medium">Cash assumption</th>
                  <th className="py-2.5 pr-4 font-medium">Modelo TD3 destacado</th>
                  <th className="py-2.5 pr-4 font-medium">Benchmark destacado</th>
                </tr>
              </thead>
              <tbody>
                {benchmarkRankingResults.map((row) => (
                  <tr key={row.cashAssumption} className="border-b border-line/70">
                    <td className="py-3 pr-4 font-semibold text-ink">{row.cashAssumption}</td>
                    <td className="py-3 pr-4 text-muted">{row.topTd3Model}</td>
                    <td className="py-3 pr-4 text-muted">{row.benchmarkReference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-5 text-sm leading-6 text-muted">
            El análisis por régimen muestra competitividad seleccionada, no dominancia amplia. Los benchmarks siguen ganando segmentos relevantes.
          </p>
        </Panel>

        <EvaluationStackChart />
      </section>

      <Panel className="mt-6">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1fr]">
          <div>
            <SectionTitle
              eyebrow="Feature families"
              title="Familias evaluadas"
              text="Las familias resumen bloques de variables y variantes de macro, volatilidad y estado financiero evaluadas dentro del protocolo."
            />
            <div className="mt-6 grid gap-2">
              {featureFamilies.map((family) => (
                <p key={family} className="break-all border border-line bg-panelSoft px-3 py-2 text-sm font-semibold text-ink">
                  {family}
                </p>
              ))}
            </div>
          </div>
          <div>
            <SectionTitle eyebrow="Mandato" title="Constraint-first canonical hard constraints" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {correctedProtocol.mandate.map((item) => (
                <p key={item} className="border-l border-line bg-panelSoft px-4 py-3 text-sm font-semibold text-ink">
                  {item}
                </p>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-muted">
              Los resultados dependen del universo, costes, cash assumption, ventanas, restricciones y protocolo de validación.
            </p>
          </div>
        </div>
      </Panel>

      <Panel className="mt-6">
        <Td3PerformanceTable selectedCashParam={params?.cash} selectedProfileParam={params?.profile} />
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <Panel>
          <SectionTitle
            eyebrow="Riesgo"
            title="Riesgo antes que narrativa"
            text="Una política que obtiene retorno pero concentra demasiado, rota en exceso o falla fuera de muestra no es robusta para asignación patrimonial."
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {riskMetrics.map(([title, text]) => (
              <div key={title} className="border border-line bg-panelSoft p-4">
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            eyebrow="Robustez"
            title="Robustez y sensibilidad"
            text="La robustez importa más que una simulación llamativa. El valor del laboratorio está en observar qué se sostiene cuando cambian supuestos y restricciones."
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {robustnessItems.map(([title, text]) => (
              <div key={title} className="border-l border-line bg-panelSoft px-4 py-3">
                <p className="font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-6">
        <div className="grid gap-6 lg:grid-cols-[0.78fr_1fr] lg:items-center">
          <SectionTitle
            eyebrow="Variables"
            title="De variables estadísticas a modelos"
            text="El laboratorio de niveles estadísticos muestra variables como retornos por periodo, drawdown, volatilidad, distancia a medias, percentiles y z-scores. Estas variables pueden alimentar análisis cuantitativos. TD3 aborda otro nivel del problema: aprender una política de asignación continua bajo restricciones."
          />
          <div className="border border-line bg-panelSoft p-5">
            <p className="text-sm leading-6 text-muted">
              La conexión es metodológica: primero se entiende la estructura estadística de los activos; después se evalúa cómo una política simulada podría responder bajo un entorno definido.
            </p>
            <Link
              href="/niveles-estadisticos"
              className="mt-5 inline-flex min-h-10 items-center border border-ink px-4 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white"
            >
              Explorar niveles estadísticos
            </Link>
          </div>
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <Panel>
          <SectionTitle
            eyebrow="Interpretación"
            title="Qué no debe interpretarse"
            text="Un buen resultado experimental no convierte al modelo en una instrucción de inversión. La utilidad del laboratorio está en evaluar metodología, restricciones y comportamiento comparado, no en producir órdenes operativas."
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {notMeaning.map((item) => (
              <p key={item} className="border border-line bg-panelSoft p-3 text-sm font-semibold text-ink">
                {item}
              </p>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Roadmap" title="Próximas mejoras del laboratorio" text="Lista de trabajo metodológico, no promesa de disponibilidad ni de resultado." />
          <div className="mt-6 grid gap-3">
            {roadmap.map((item, index) => (
              <div key={item} className="grid grid-cols-[2.4rem_1fr] gap-3 border-b border-line pb-3 text-sm leading-6 text-muted">
                <span className="font-semibold text-brass">{String(index + 1).padStart(2, "0")}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
