import { BudgetPlanner } from "@/components/budget/BudgetPlanner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Presupuesto personal | Simulador de ingresos, gastos y ahorro",
  description: "Simulador de presupuesto personal para distribuir ingresos, detectar gastos no mensuales, calcular gastos hormiga y ordenar ahorro, protección financiera e inversión.",
};

export default function PresupuestoPage() {
  return <BudgetPlanner locale="es" />;
}
