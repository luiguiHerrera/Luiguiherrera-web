export type DiagnosticAnswers = Record<string, string | number>;

export type DiagnosticResult = {
  profile: string;
  emotionalRisk: string;
  liquidityRisk: string;
  concentrationRisk: string;
  vulnerabilities: string[];
  questions: string[];
};

const defensiveAnswers = new Set(["Preservar", "Menos de 1 año", "Vender una parte", "Vender todo", "Sí, dependo de él"]);
const aggressiveAnswers = new Set(["Crecer", "Más de 10 años", "Comprar más", "Mantener", "Más de 40%"]);

export function scoreDiagnostic(answers: DiagnosticAnswers): DiagnosticResult {
  const values = Object.values(answers).map(String);
  const defensiveScore = values.filter((value) => defensiveAnswers.has(value)).length;
  const aggressiveScore = values.filter((value) => aggressiveAnswers.has(value)).length;
  const crypto = Number(answers.crypto ?? 0);
  const stocks = Number(answers.stocks ?? 0);
  const realEstate = Number(answers.realEstate ?? 0);
  const cash = Number(answers.cash ?? 0);

  const profile =
    defensiveScore >= 4
      ? "Conservador por necesidad de liquidez"
      : aggressiveScore >= 5
        ? "Crecimiento con alta tolerancia declarada"
        : "Balanceado con señales mixtas";

  const emotionalRisk = values.includes("Vender todo") || values.includes("Vender una parte") ? "Alto" : "Medio";
  const liquidityRisk = values.includes("Menos de 1 año") || values.includes("Sí, dependo de él") || cash < 10 ? "Alto" : "Medio";
  const concentrationRisk = crypto + stocks > 75 || realEstate > 60 ? "Alto" : crypto + stocks > 50 ? "Medio" : "Bajo";

  return {
    profile,
    emotionalRisk,
    liquidityRisk,
    concentrationRisk,
    vulnerabilities: [
      liquidityRisk === "Alto" ? "Dependencia de dinero que podría necesitarse pronto." : "La liquidez parece manejable, pero debe revisarse con datos reales.",
      concentrationRisk === "Alto" ? "Exposición concentrada a pocos motores de riesgo." : "Concentración no extrema en esta lectura inicial.",
      emotionalRisk === "Alto" ? "Riesgo de vender en momentos de estrés." : "Tolerancia emocional declarada razonable, pendiente de contrastar con experiencia real.",
    ],
    questions: [
      "¿Qué pérdida temporal podrías tolerar sin cambiar el plan?",
      "¿Qué parte del portafolio tiene una función clara?",
      "¿Qué tendría que pasar para que tu tesis deje de tener sentido?",
      "¿Tienes liquidez suficiente antes de asumir más riesgo?",
    ],
  };
}
