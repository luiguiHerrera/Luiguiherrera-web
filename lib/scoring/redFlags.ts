export type RedFlagResult = {
  label: "Riesgo bajo" | "Riesgo medio" | "Riesgo alto";
  tone: "low" | "medium" | "high";
  text: string;
};

export function scoreRedFlags(checkedCount: number): RedFlagResult {
  if (checkedCount >= 5) {
    return {
      label: "Riesgo alto",
      tone: "high",
      text: "Hay suficientes señales de alerta como para detenerse. No significa automáticamente que sea fraude, pero sí que deberías investigar más antes de poner dinero.",
    };
  }

  if (checkedCount >= 2) {
    return {
      label: "Riesgo medio",
      tone: "medium",
      text: "Hay señales que merecen pausa. Conviene verificar regulación, custodia, costes, liquidez y fuente real de rentabilidad.",
    };
  }

  return {
    label: "Riesgo bajo",
    tone: "low",
    text: "No aparecen muchas señales clásicas de alerta, pero eso no valida la oportunidad. La diligencia sigue siendo necesaria.",
  };
}
