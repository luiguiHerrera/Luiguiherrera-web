import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { RegimeContextPreview } from "@/components/dashboard/RegimeContextPreview";

export const metadata = { title: "Preview de régimen de mercado", robots: { index: false, follow: false } };
export default async function RegimePreviewPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  await connection();
  return <RegimeContextPreview data={await getDashboardData()} locale="es" />;
}
