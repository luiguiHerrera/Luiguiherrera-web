export type RedFlagResult = {
  label: "Pocas alertas visibles" | "Alertas moderadas" | "Alertas altas";
  tone: "low" | "medium" | "high";
  text: string;
  nextStep: string;
};

export function scoreRedFlags(checkedCount: number): RedFlagResult {
  if (checkedCount >= 5) {
    return {
      label: "Alertas altas",
      tone: "high",
      text: "Hay suficientes señales de alerta como para detenerse. No significa automáticamente que exista una irregularidad, pero sí que conviene investigar más antes de comprometer dinero.",
      nextStep: "Pide documentación, verifica regulación en fuentes oficiales y evita transferir dinero bajo presión.",
    };
  }

  if (checkedCount >= 2) {
    return {
      label: "Alertas moderadas",
      tone: "medium",
      text: "Hay señales que merecen pausa. Conviene verificar regulación, custodia, costes, liquidez y fuente real de retorno.",
      nextStep: "Haz una lista de dudas concretas y no avances hasta poder responderlas con evidencia verificable.",
    };
  }

  return {
    label: "Pocas alertas visibles",
    tone: "low",
    text: "No aparecen muchas señales clásicas de alerta, pero eso no valida la propuesta. La diligencia sigue siendo necesaria.",
    nextStep: "Revisa documentos, costes, liquidez, custodia y regulación antes de decidir.",
  };
}
