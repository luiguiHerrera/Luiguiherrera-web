import type { Metadata } from "next";
import { TrendsExplorer } from "@/components/trends/TrendsExplorer";
import { trendsContent } from "@/lib/trends/trends-content";

export const metadata: Metadata = {
  title: "Trends: from the world to the portfolio | Market Lab",
  description: "Explore what is changing in the world and turn trends into educational hypotheses without confusing narrative with investment.",
};

export default function EnglishTrendsPage() {
  return <TrendsExplorer content={trendsContent.en} />;
}
