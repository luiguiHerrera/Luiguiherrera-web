import { ProtectYourMoneyContent } from "@/app/(es)/protege-tu-dinero/page";
import { ReadingCard } from "@/components/seo/ReadingCard";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/protect-your-money");

export default function EnglishProtectYourMoneyPage() {
  return <ProtectYourMoneyContent locale="en" readingCard={<ReadingCard title="Reading card" items={[
    { label: "What it is", value: "An educational red-flag checklist before trusting money to an entity, product or investment proposal." },
    { label: "What it is for", value: "It helps review documentation, regulation, custody, promises, commercial pressure, liquidity and exit rights." },
    { label: "Limits", value: "It does not officially verify entities, declare fraud or replace official regulatory sources." },
    { label: "Next step", value: "Verify the entity in official sources and use the protection simulator to practice decisions." },
  ]} />} />;
}
