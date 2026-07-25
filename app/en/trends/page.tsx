import type { Metadata } from "next";
import { TrendsExplorer } from "@/components/trends/TrendsExplorer";
import { trendsContent } from "@/lib/trends/trends-content";
import { ReadingCard } from "@/components/seo/ReadingCard";

export const metadata: Metadata = {
  title: "Trends: from the world to the portfolio | Market Lab",
  description: "Explore what is changing in the world and turn trends into educational hypotheses without confusing narrative with investment.",
};

export default function EnglishTrendsPage() {
  return <TrendsExplorer content={trendsContent.en} readingCard={<ReadingCard attached title="Reading card" items={[
    { label: "What it is", value: "An educational framework to turn trends such as AI, robotics, energy, cybersecurity, crypto and infrastructure into prudent hypotheses." },
    { label: "What it is for", value: "It helps separate narrative, vehicle, price, value capture, risk and portfolio role." },
    { label: "Limits", value: "A real trend can still be a bad investment if price, vehicle or time horizon do not fit." },
    { label: "Next step", value: "Compare the trend with statistical levels, methodology and market context." },
  ]} />} />;
}
