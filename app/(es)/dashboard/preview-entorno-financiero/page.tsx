import { DashboardContent } from "@/app/(es)/dashboard/page";
import { getOfrFsiData } from "@/lib/dashboard/get-ofr-fsi-data";
import { connection } from "next/server";
import { notFound } from "next/navigation";

export const metadata = { title: "Entorno financiero · Vista previa", robots: { index: false, follow: false } };
export default async function FinancialEnvironmentPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();
  await connection();
  return <DashboardContent locale="es" financialEnvironment={await getOfrFsiData()} />;
}
