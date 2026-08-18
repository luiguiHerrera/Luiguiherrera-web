import { ImageResponse } from "next/og";
import { tomDecayContent } from "@/lib/research/tom-decay/content";
import { decayRibbonDataUri, ogContentType, ogImageSize } from "@/lib/research/tom-decay/og";
import { researchShareImage } from "@/components/research/tom-decay/ShareImage";

export const alt = tomDecayContent.es.documentTitle;
export const size = ogImageSize;
export const contentType = ogContentType;

export default function OpengraphImage() {
  return new ImageResponse(
    researchShareImage({ content: tomDecayContent.es, ribbon: decayRibbonDataUri() }),
    size,
  );
}
