import { ImageResponse } from "next/og";
import { tomDecayContent } from "@/lib/research/tom-decay/content";
import { decayRibbonDataUri, ogContentType, ogImageSize } from "@/lib/research/tom-decay/og";
import { researchShareImage } from "@/components/research/tom-decay/ShareImage";

export const alt = tomDecayContent.en.documentTitle;
export const size = ogImageSize;
export const contentType = ogContentType;

export default function OpengraphImage() {
  return new ImageResponse(
    researchShareImage({ content: tomDecayContent.en, ribbon: decayRibbonDataUri() }),
    size,
  );
}
