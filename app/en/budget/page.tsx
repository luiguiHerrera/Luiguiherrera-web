import { BudgetPlanner } from "@/components/budget/BudgetPlanner";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/budget");

export default function EnglishBudgetPage() {
  return <BudgetPlanner locale="en" />;
}
