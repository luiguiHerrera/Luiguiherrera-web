import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Internal design preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function InternalRegimePreview({ searchParams }: { searchParams: Promise<{ preview?: string; fixture?: string; edge?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { RegimeV2Preview } = await import("@/components/dashboard/RegimeV2Preview");
  return <RegimeV2Preview locale="en" query={await searchParams} />;
}
