import { Fragment } from "react";

const glossaryPattern =
  /(HAC\/Newey-West|HAC|BPS|bps(?:\/(?:day|día)| per day| por día| diarios)?|p-values?|p-valores?|p-valor|\bp\b)/g;

const linkClassName =
  "rounded-[2px] font-medium text-petrol underline decoration-dotted decoration-petrol/40 underline-offset-[3px] transition hover:decoration-petrol focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol";

function glossaryId(term: string) {
  if (term.startsWith("HAC")) return "glossary-hac";
  if (term === "BPS" || term.startsWith("bps")) return "glossary-bps";
  if (/^(?:p-values?|p-valores?|p-valor|p)$/.test(term)) return "glossary-p";
  return null;
}

export function GlossaryText({ text }: { text: string }) {
  const parts = text.split(glossaryPattern);

  return parts.map((part, index) => {
    const id = glossaryId(part);
    if (!id) {
      return <Fragment key={index}>{part}</Fragment>;
    }

    return (
      <a className={linkClassName} href={`#${id}`} key={index}>
        {part}
      </a>
    );
  });
}
