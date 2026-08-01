import type { BudgetProjectionHorizonMonths } from "@/lib/personal-finance/budget/projection-types";
import type { BudgetLocale } from "@/lib/personal-finance/budget/types";

type ProjectionScenarioId = "current" | "target" | "educational5010";

type BudgetProjectionCopy = {
  accumulatedIncome: string;
  accumulatedValue: string;
  assumptions: readonly [string, string, string];
  assumptionsTitle: string;
  backToReview: string;
  category: string;
  changeFromScenario: (scenario: string) => string;
  comparedWith: (scenario: string) => string;
  comparisonBase: string;
  detailDescription: string;
  detailTitle: string;
  differenceUnavailable: string;
  disclaimer: string;
  educationText: string;
  educationTitle: string;
  educationalCopy: string;
  excess: string;
  excessDifference: (amount: string, scenario: string) => string;
  exploreProjection: string;
  hiddenAmount: string;
  horizon: string;
  horizons: Record<BudgetProjectionHorizonMonths, string>;
  increaseDifference: (category: string, amount: string, horizon: string, scenario: string, base: string) => string;
  introduction: string;
  knownDifference: string;
  knownSubtotal: string;
  legend: string;
  monthlyAmount: string;
  monthlyShare: string;
  noDifferences: string;
  noComparisonAvailable: string;
  partialDifference: (category: string, scenario: string, base: string) => string;
  partialExplanation: string;
  partialInformation: string;
  privacy: string;
  projectionHighlights: string;
  reduceDifference: (category: string, amount: string, horizon: string, scenario: string, base: string) => string;
  scenarioDescription: string;
  scenarioNames: Record<ProjectionScenarioId, string>;
  scenarios: string;
  selectHorizon: string;
  selectScenarios: string;
  serGivingText: string;
  serGivingTitle: string;
  serLabel: string;
  givingLabel: string;
  statusExact: string;
  statusOver: string;
  statusPartial: string;
  statusUnder: string;
  title: string;
  totalAllocated: string;
  unallocated: string;
  unallocatedDifference: (amount: string, scenario: string) => string;
  undifferentiated: string;
  visualDescription: string;
  visualTitle: string;
  zeroToPositiveDifference: (category: string, amount: string, horizon: string, scenario: string, base: string) => string;
};

export const budgetProjectionCopy = {
  es: {
    accumulatedIncome: "Ingreso acumulado",
    accumulatedValue: "Acumulado del horizonte",
    assumptions: [
      "El ingreso mensual permanece constante durante todo el horizonte.",
      "La distribución mensual no cambia entre un periodo y otro.",
      "No se aplican rentabilidad, inflación ni aumentos futuros de ingresos.",
    ],
    assumptionsTitle: "Supuestos visibles",
    backToReview: "Volver a mi revisión",
    category: "Categoría",
    changeFromScenario: (scenario) => `Diferencia frente a ${scenario}`,
    comparedWith: (scenario) => `Comparado con ${scenario}`,
    comparisonBase: "Base visible",
    detailDescription: "Los importes son acumulados para el horizonte elegido. Los porcentajes describen la distribución mensual.",
    detailTitle: "Detalle por categoría",
    differenceUnavailable: "La diferencia exacta no está disponible.",
    disclaimer: "Estos importes muestran cuánto destinarías a cada categoría si el ingreso mensual y la distribución permanecieran constantes. No representan rentabilidad, patrimonio garantizado, inflación ni cambios futuros de ingresos.",
    educationText: "Esta cantidad podría financiar formación, certificaciones, idiomas, herramientas, libros o experiencias educativas. La educación puede ampliar capacidades y oportunidades, pero esta herramienta no puede predecir su efecto sobre tus ingresos.",
    educationTitle: "Educación: capacidad que podrías crear",
    educationalCopy: "Asigna el 50 % a básicos y compromisos y el 10 % a cada una de las otras cinco categorías. Es una referencia educativa para comparar alternativas. No es una recomendación ni una proporción universal.",
    excess: "Exceso",
    excessDifference: (amount, scenario) => `${scenario} requiere ${amount} por encima del ingreso acumulado disponible.`,
    exploreProjection: "Explorar mi proyección",
    hiddenAmount: "—",
    horizon: "Horizonte",
    horizons: { 1: "Mensual", 12: "1 año", 60: "5 años" },
    increaseDifference: (category, amount, horizon, scenario, base) => `Con ${scenario} destinarías ${amount} más a ${category} durante ${horizon} que con ${base}.`,
    introduction: "Compara tu situación actual, tu objetivo y un escenario educativo durante un mes, un año y cinco años.",
    knownDifference: "Diferencia conocida",
    knownSubtotal: "Subtotal conocido",
    legend: "Leyenda de categorías",
    monthlyAmount: "Importe mensual",
    monthlyShare: "Porcentaje mensual",
    noDifferences: "No hay diferencias exactas relevantes para mostrar con los escenarios seleccionados.",
    noComparisonAvailable: "Sin comparación disponible",
    partialDifference: (category, scenario, base) => `La comparación de ${category} entre ${scenario} y ${base} es parcial porque faltan datos.`,
    partialExplanation: "Solo se representa el subtotal conocido. Las partes no informadas o no diferenciadas no se convierten en cero ni en una proporción estimada.",
    partialInformation: "Información parcial",
    privacy: "Tus datos se procesan en este dispositivo. No se guardan ni se envían.",
    projectionHighlights: "Diferencias relevantes",
    reduceDifference: (category, amount, horizon, scenario, base) => `Con ${scenario} destinarías ${amount} menos a ${category} durante ${horizon} que con ${base}.`,
    scenarioDescription: "Activa o desactiva escenarios. Debe permanecer visible al menos uno.",
    scenarioNames: {
      current: "Situación actual",
      educational5010: "Escenario educativo 50/10",
      target: "Tu objetivo",
    },
    scenarios: "Escenarios",
    selectHorizon: "Selecciona el horizonte temporal",
    selectScenarios: "Selecciona los escenarios visibles",
    serGivingText: "El valor de esta categoría no tiene por qué aparecer como un aumento de ingresos. Puede reflejarse en bienestar, propósito, relaciones o contribución, pero esos efectos no pueden medirse ni garantizarse desde esta herramienta.",
    serGivingTitle: "SER y Donación: bienestar y contribución",
    serLabel: "SER",
    givingLabel: "Donación",
    statusExact: "Todo el ingreso está distribuido",
    statusOver: "Este escenario requiere más que el ingreso disponible",
    statusPartial: "La distribución contiene información parcial",
    statusUnder: "Parte del ingreso permanece sin asignar",
    title: "Observa cómo se acumulan tus decisiones",
    totalAllocated: "Total asignado",
    unallocated: "Sin asignar",
    unallocatedDifference: (amount, scenario) => `${amount} del ingreso acumulado permanece sin asignar en ${scenario}.`,
    undifferentiated: "Importe no diferenciado",
    visualDescription: "Cada barra identifica las categorías con una leyenda textual. El exceso, cuando existe, se presenta fuera de la composición financiada.",
    visualTitle: "Comparación visual",
    zeroToPositiveDifference: (category, amount, horizon, scenario, base) => `${category} pasa de un importe conocido de cero en ${base} a ${amount} durante ${horizon} en ${scenario}.`,
  },
  en: {
    accumulatedIncome: "Accumulated income",
    accumulatedValue: "Accumulated over the horizon",
    assumptions: [
      "Monthly income stays constant throughout the selected horizon.",
      "The monthly allocation does not change from one period to the next.",
      "No investment returns, inflation, or future income growth are applied.",
    ],
    assumptionsTitle: "Visible assumptions",
    backToReview: "Back to my review",
    category: "Category",
    changeFromScenario: (scenario) => `Difference from ${scenario}`,
    comparedWith: (scenario) => `Compared with ${scenario}`,
    comparisonBase: "Visible baseline",
    detailDescription: "Amounts are accumulated over the selected horizon. Percentages describe the monthly allocation.",
    detailTitle: "Category details",
    differenceUnavailable: "An exact difference is not available.",
    disclaimer: "These amounts show how much you would allocate to each category if your monthly income and allocation stayed constant. They do not represent investment returns, guaranteed wealth, inflation, or future income changes.",
    educationText: "This amount could support training, certifications, languages, tools, books, or educational experiences. Education can expand skills and opportunities, but this tool cannot predict its effect on your income.",
    educationTitle: "Education: capacity you could create",
    educationalCopy: "It assigns 50% to essentials and commitments and 10% to each of the other five categories. It is an educational reference for comparing alternatives. It is not a recommendation or a universal allocation.",
    excess: "Excess",
    excessDifference: (amount, scenario) => `${scenario} requires ${amount} beyond the accumulated income available.`,
    exploreProjection: "Explore my projection",
    hiddenAmount: "—",
    horizon: "Horizon",
    horizons: { 1: "Monthly", 12: "1 year", 60: "5 years" },
    increaseDifference: (category, amount, horizon, scenario, base) => `Under ${scenario}, you would allocate ${amount} more to ${category} over ${horizon} than under ${base}.`,
    introduction: "Compare your current allocation, your target, and an educational scenario over one month, one year, and five years.",
    knownDifference: "Known difference",
    knownSubtotal: "Known subtotal",
    legend: "Category legend",
    monthlyAmount: "Monthly amount",
    monthlyShare: "Monthly percentage",
    noDifferences: "There are no relevant exact differences to show for the selected scenarios.",
    noComparisonAvailable: "No comparison available",
    partialDifference: (category, scenario, base) => `The comparison for ${category} between ${scenario} and ${base} is partial because information is missing.`,
    partialExplanation: "Only the known subtotal is represented. Missing or undifferentiated amounts are not converted to zero or to an estimated proportion.",
    partialInformation: "Partial information",
    privacy: "Your data is processed on this device. It is not stored or sent anywhere.",
    projectionHighlights: "Notable differences",
    reduceDifference: (category, amount, horizon, scenario, base) => `Under ${scenario}, you would allocate ${amount} less to ${category} over ${horizon} than under ${base}.`,
    scenarioDescription: "Turn scenarios on or off. At least one must remain visible.",
    scenarioNames: {
      current: "Current allocation",
      educational5010: "Educational 50/10 scenario",
      target: "Your target",
    },
    scenarios: "Scenarios",
    selectHorizon: "Select the projection horizon",
    selectScenarios: "Select the visible scenarios",
    serGivingText: "The value of this category may not appear as additional income. It may show up through well-being, purpose, relationships, or contribution, but those effects cannot be measured or guaranteed by this tool.",
    serGivingTitle: "SER and Giving: well-being and contribution",
    serLabel: "SER",
    givingLabel: "Giving",
    statusExact: "All income is allocated",
    statusOver: "This scenario requires more than the available income",
    statusPartial: "The allocation contains partial information",
    statusUnder: "Part of the income remains unallocated",
    title: "See how your decisions add up",
    totalAllocated: "Total allocated",
    unallocated: "Unallocated",
    unallocatedDifference: (amount, scenario) => `${amount} of accumulated income remains unallocated in ${scenario}.`,
    undifferentiated: "Undifferentiated amount",
    visualDescription: "Each bar identifies categories through a text legend. Any excess is shown outside the funded composition.",
    visualTitle: "Visual comparison",
    zeroToPositiveDifference: (category, amount, horizon, scenario, base) => `${category} moves from a known zero amount under ${base} to ${amount} over ${horizon} under ${scenario}.`,
  },
} satisfies Record<BudgetLocale, BudgetProjectionCopy>;
