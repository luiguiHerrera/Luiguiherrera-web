import type { Metadata } from "next";
import { TrendsExplorer } from "@/components/trends/TrendsExplorer";
import { trendsContent } from "@/lib/trends/trends-content";

export const metadata: Metadata = {
  title: "Tendencias sin hype | Hipótesis de inversión prudentes",
  description: "Marco educativo para convertir tendencias como inteligencia artificial, robótica, energía, ciberseguridad, cripto e infraestructura en hipótesis de inversión prudentes.",
};

export default function TendenciasPage() {
  return <TrendsExplorer content={trendsContent.es} />;
}
