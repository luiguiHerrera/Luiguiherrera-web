import { QuantLabContent } from "@/app/quant-lab/page";

export default function EnglishQuantLabPage({ searchParams }: { searchParams?: Promise<{ cost?: string; cap?: string; cash?: string; profile?: string }> }) {
  return <QuantLabContent searchParams={searchParams} locale="en" />;
}
