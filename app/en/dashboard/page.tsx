export const revalidate = 3600;

import { DashboardContent } from "@/app/(es)/dashboard/page";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/dashboard");

export default async function EnglishDashboardPage() {
  return <DashboardContent locale="en" />;
}
