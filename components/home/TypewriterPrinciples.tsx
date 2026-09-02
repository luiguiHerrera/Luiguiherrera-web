"use client";

import { useEffect, useState } from "react";

const defaultPhrases = [
  "Decide con datos y menos ruido.",
  "Entiende el contexto.",
  "Gestiona el riesgo.",
];

export function TypewriterPrinciples({
  eyebrow = "Proceso antes que impulso",
  phrases = defaultPhrases,
}: {
  eyebrow?: string;
  phrases?: string[];
}) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visibleChars, setVisibleChars] = useState(() => phrases[0]?.length ?? 0);
  const [deleting, setDeleting] = useState(false);

  const currentPhrase = phrases[phraseIndex] ?? "";

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    const typingSpeed = deleting ? 32 : 54;
    const pauseAtEnd = 1200;
    const pauseAtStart = 220;

    const timeout = window.setTimeout(
      () => {
        if (!deleting && visibleChars < currentPhrase.length) {
          setVisibleChars((value) => value + 1);
          return;
        }

        if (!deleting && visibleChars === currentPhrase.length) {
          setDeleting(true);
          return;
        }

        if (deleting && visibleChars > 0) {
          setVisibleChars((value) => value - 1);
          return;
        }

        if (deleting && visibleChars === 0) {
          setDeleting(false);
          setPhraseIndex((value) => (value + 1) % phrases.length);
        }
      },
      !deleting && visibleChars === currentPhrase.length
        ? pauseAtEnd
        : deleting && visibleChars === 0
          ? pauseAtStart
          : typingSpeed,
    );

    return () => window.clearTimeout(timeout);
  }, [currentPhrase, deleting, phrases.length, visibleChars]);

  return (
    <div className="mt-7 max-w-xl border-l border-petrol/55 pl-4" data-home-typewriter>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">
        {eyebrow}
      </p>
      <p className="mt-3 min-h-[3.5rem] text-base leading-7 text-muted sm:min-h-[2rem] md:text-lg" data-home-typewriter-text>
        <span>{currentPhrase.slice(0, visibleChars)}</span>
        <span aria-hidden="true" className="ml-1 inline-block h-5 w-px translate-y-1 animate-pulse bg-petrol motion-reduce:animate-none" />
      </p>
    </div>
  );
}
