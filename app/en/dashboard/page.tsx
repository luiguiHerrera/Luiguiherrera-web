export const revalidate = 86400;

import { DashboardContent } from "@/app/dashboard/page";

export default async function EnglishDashboardPage() {
  return <DashboardContent locale="en" />;
}
