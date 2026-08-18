import { Fragment } from "react";
import { GlossaryText } from "@/components/research/tom-decay/GlossaryLink";
import type { TomReferenceId } from "@/lib/research/tom-decay/content-types";

const citationPattern = /\[\[(reference-[a-z0-9-]+)\|([^\]]+)\]\]/g;
const citationIds = new Set<TomReferenceId>([
  "reference-ariel-1987",
  "reference-lakonishok-smidt-1988",
  "reference-mcconnell-xu-2008",
  "reference-newey-west-1987",
]);

const citationClassName =
  "rounded-[2px] font-medium text-petrol underline decoration-petrol/45 underline-offset-[3px] transition hover:decoration-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol";

export function ResearchText({ text }: { text: string }) {
  const parts = text.split(citationPattern);

  return parts.map((part, index) => {
    if (index % 3 === 1) {
      const id = part as TomReferenceId;
      const label = parts[index + 1];

      if (citationIds.has(id)) {
        return (
          <a className={citationClassName} href={`#${id}`} key={`${id}-${index}`}>
            {label}
          </a>
        );
      }
    }

    if (index % 3 === 2) return null;
    return (
      <Fragment key={index}>
        <GlossaryText text={part} />
      </Fragment>
    );
  });
}
