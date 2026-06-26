import type { Metadata } from "next";
import { Td3InteractivePaper } from "@/components/research/Td3InteractivePaper";
import { td3PaperContent } from "@/lib/research/td3-paper";

export const metadata: Metadata = {
  title: "Evaluacion realista de claims DRL | Market Lab",
  description:
    "Paper interactivo sobre evaluacion TD3 con costes, cash explicito, benchmarks comparables y validacion estadistica.",
};

export default function Td3ResearchPage() {
  return <Td3InteractivePaper content={td3PaperContent.es} />;
}
