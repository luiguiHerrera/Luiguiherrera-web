export type RedFlagResult = {
  label: "Riesgo bajo" | "Riesgo medio" | "Riesgo alto";
  tone: "low" | "medium" | "high";
  text: string;
  nextStep: string;
};

export function scoreRedFlags(checkedCount: number): RedFlagResult {
  if (checkedCount >= 5) {
    return {
      label: "Riesgo alto",
      tone: "high",
      text: "Hay suficientes señales de alerta como para detenerse. No significa automáticamente que sea fraude, pero sí que deberías investigar más antes de poner dinero.",
      nextStep: "Pide documentación, verifica regulación en fuentes oficiales y evita transferir dinero bajo presión.",
    };
  }

  if (checkedCount >= 2) {
    return {
      label: "Riesgo medio",
      tone: "medium",
      text: "Hay señales que merecen pausa. Conviene verificar regulación, custodia, costes, liquidez y fuente real de rentabilidad.",
      nextStep: "Haz una lista de dudas concretas y no avances hasta poder responderlas con evidencia verificable.",
    };
  }

  return {
    label: "Riesgo bajo",
    tone: "low",
    text: "No aparecen muchas señales clásicas de alerta, pero eso no valida la oportunidad. La diligencia sigue siendo necesaria.",
    nextStep: "Revisa documentos, costes, liquidez, custodia y regulación antes de decidir.",
  };
}
