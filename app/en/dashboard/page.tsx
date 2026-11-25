export const revalidate = 3600;

import { getOfrFsiData } from "@/lib/dashboard/get-ofr-fsi-data";
import { DashboardContent } from "@/app/(es)/dashboard/page";
import { getRouteMetadata } from "@/lib/seo/site";
import { connection } from "next/server";

export const metadata = getRouteMetadata("/en/dashboard");

export default async function EnglishDashboardPage() {
  await connection();
  return <DashboardContent locale="en" financialEnvironment={await getOfrFsiData()} />;
}
