export type RedFlagResult = {
  label: "Nivel de alerta bajo" | "Nivel de alerta medio" | "Nivel de alerta alto";
  tone: "low" | "medium" | "high";
  text: string;
  nextStep: string;
};

export function scoreRedFlags(checkedCount: number): RedFlagResult {
  if (checkedCount >= 6) {
    return {
      label: "Nivel de alerta alto",
      tone: "high",
      text: "Hay suficientes señales para hacer una revisión prioritaria antes de avanzar. No significa automáticamente que exista una irregularidad, pero sí exige contraste externo y documentación verificable.",
      nextStep: "Pausa la decisión, no envíes más dinero bajo presión y contrasta entidad, producto y advertencias en fuentes oficiales.",
    };
  }

  if (checkedCount >= 3) {
    return {
      label: "Nivel de alerta medio",
      tone: "medium",
      text: "Hay señales que merecen pausa. Conviene revisar autorización, costes, documentación, canal de captación y coherencia entre riesgo y retorno.",
      nextStep: "Haz una lista de dudas concretas y no avances hasta poder responderlas con evidencia verificable.",
    };
  }

  return {
    label: "Nivel de alerta bajo",
    tone: "low",
    text: "Aparecen pocas señales visibles, pero eso no valida la propuesta. La diligencia y la verificación oficial siguen siendo necesarias.",
    nextStep: "Revisa documentos, costes, liquidez, entidad registrada y advertencias públicas antes de decidir.",
  };
}
