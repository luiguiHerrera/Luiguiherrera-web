import type { Metadata } from "next";
import { Td3InteractivePaper } from "@/components/research/Td3InteractivePaper";
import { td3PaperContent } from "@/lib/research/td3-paper";

export const metadata: Metadata = {
  title: "Evaluación realista de claims DRL | Market Lab",
  description:
    "Paper interactivo sobre evaluación TD3 con costes, cash explícito, benchmarks comparables y validación estadística.",
  alternates: {
    canonical: "/investigacion/td3",
    languages: { es: "/investigacion/td3", en: "/en/research/td3", "x-default": "/investigacion/td3" },
  },
};

export default function Td3ResearchPage() {
  return <Td3InteractivePaper content={td3PaperContent.es} />;
}
