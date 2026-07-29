export const revalidate = 86400;

import { DashboardContent } from "@/app/dashboard/page";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/dashboard");

export default async function EnglishDashboardPage() {
  return <DashboardContent locale="en" />;
}
