import { tomDecayContentEn } from "./content-en.ts";
import { tomDecayContentEs } from "./content-es.ts";
import type { TomDecayContent, TomDecayLocale } from "./content-types.ts";

export const tomDecayContent: Record<TomDecayLocale, TomDecayContent> = {
  es: tomDecayContentEs,
  en: tomDecayContentEn,
};

export type { TomDecayContent, TomDecayLocale };
