import { BudgetPlanner } from "@/components/budget/BudgetPlanner";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/presupuesto");

export default function PresupuestoPage() {
  return <BudgetPlanner locale="es" />;
}
