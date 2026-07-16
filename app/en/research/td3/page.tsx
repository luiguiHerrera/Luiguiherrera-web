import type { Metadata } from "next";
import { Td3InteractivePaper } from "@/components/research/Td3InteractivePaper";
import { td3PaperContent } from "@/lib/research/td3-paper";

export const metadata: Metadata = {
  title: "Realistic evaluation of DRL portfolio claims | Market Lab",
  description:
    "Interactive paper on TD3 evaluation with costs, explicit cash, matched benchmarks and statistical validation.",
  alternates: {
    canonical: "/en/research/td3",
    languages: { es: "/investigacion/td3", en: "/en/research/td3", "x-default": "/investigacion/td3" },
  },
};

export default function EnglishTd3ResearchPage() {
  return <Td3InteractivePaper content={td3PaperContent.en} />;
}
