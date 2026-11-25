import { DashboardContent } from "@/app/(es)/dashboard/page";
import { getOfrFsiData } from "@/lib/dashboard/get-ofr-fsi-data";
import { getPriceParticipationData } from "@/lib/dashboard/get-price-participation-data";
import { connection } from "next/server";
import { notFound } from "next/navigation";

export const metadata = { title: "Price and participation · Preview", robots: { index: false, follow: false } };
export default async function PriceParticipationPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();
  await connection();
  const [financialEnvironment, priceParticipation] = await Promise.all([getOfrFsiData(), getPriceParticipationData()]);
  return <DashboardContent locale="en" financialEnvironment={financialEnvironment} priceParticipation={priceParticipation} />;
}
