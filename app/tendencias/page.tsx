import type { Metadata } from "next";
import { TrendsExplorer } from "@/components/trends/TrendsExplorer";
import { trendsContent } from "@/lib/trends/trends-content";

export const metadata: Metadata = {
  title: "Tendencias: del mundo al portafolio | Market Lab",
  description: "Explora cambios del mundo y conviértelos en hipótesis educativas de inversión sin confundir narrativa con recomendación.",
};

export default function TendenciasPage() {
  return <TrendsExplorer content={trendsContent.es} />;
}
