"use client";

import { useState } from "react";
import type { TomDecayContent } from "@/lib/research/tom-decay/content";

type HashEntry = {
  file: string;
  sha256: string;
};

type VerificationKitProps = {
  content: TomDecayContent;
  hashGroups: { label: string; entries: HashEntry[] }[];
  sourceHash: { label: string; value: string } | null;
  toolVersion: string;
};

function CopyButton({ copiedLabel, label, value }: { copiedLabel: string; label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      className="inline-flex min-h-8 shrink-0 items-center rounded-[3px] border border-line bg-white px-2.5 py-1 text-[11px] font-semibold text-petrol transition hover:border-petrol/45"
      onClick={handleCopy}
      type="button"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}

export function VerificationKit({ content, hashGroups, sourceHash, toolVersion }: VerificationKitProps) {
  const copy = content.verification;

  return (
    <div className="min-w-0">
      <p className="max-w-3xl text-sm leading-7 text-muted">{copy.body}</p>

      <ul className="mt-7 grid gap-3 md:grid-cols-2">
        {copy.items.map((item) => (
          <li className="flex min-w-0 flex-col border border-line bg-white/80 p-5" key={item.id}>
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 font-mono text-sm font-semibold text-petrol [overflow-wrap:anywhere]">
                {item.name}
              </p>
              {item.version ? (
                <span className="shrink-0 border border-line px-2 py-0.5 font-mono text-[10px] text-muted">
                  v{item.version}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{item.purpose}</p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                {copy.typeLabel}: {item.fileType}
              </span>
              <a
                className="inline-flex min-h-10 items-center rounded-[4px] border border-petrol bg-petrol px-4 py-2 text-xs font-semibold text-white transition hover:bg-panel hover:text-petrol"
                download
                href={item.href}
              >
                {copy.downloadLabel}
              </a>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 border-l-2 border-brass/60 bg-white/60 px-5 py-4 text-sm font-medium leading-7 text-ink">
        {copy.traceability}
      </p>

      <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="min-w-0 border border-line bg-panelSoft/70 p-5">
          <h3 className="text-sm font-semibold text-ink">{copy.environmentTitle}</h3>
          <ul className="mt-4 grid gap-2 text-xs leading-6 text-muted">
            {copy.environment.map((item) => (
              <li className="flex gap-3" key={item}>
                <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-line" />
                <span className="font-mono [overflow-wrap:anywhere]">{item}</span>
              </li>
            ))}
            <li className="flex gap-3">
              <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-line" />
              <span className="font-mono">qtomdecay {toolVersion}</span>
            </li>
          </ul>
        </div>

        <details className="min-w-0 border border-line bg-white/70 p-5">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink transition hover:text-petrol">
            <span>{copy.hashesTitle}</span>
            <span aria-hidden="true" className="details-open-label text-xs text-muted">
              +
            </span>
            <span aria-hidden="true" className="details-close-label text-xs text-muted">
              −
            </span>
          </summary>
          <p className="mt-3 text-xs leading-6 text-muted">{copy.hashesHint}</p>

          {sourceHash ? (
            <div className="mt-4 border border-line bg-panelSoft/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                {sourceHash.label}
              </p>
              <div className="mt-2 flex items-start gap-3">
                <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-5 text-ink">
                  {sourceHash.value}
                </code>
                <CopyButton copiedLabel={copy.copiedLabel} label={copy.copyLabel} value={sourceHash.value} />
              </div>
            </div>
          ) : null}

          {hashGroups.map((group) => (
            <div className="mt-5" key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{group.label}</p>
              <ul className="mt-2 grid gap-2">
                {group.entries.map((entry) => (
                  <li className="grid gap-1 border-b border-line/70 pb-2 last:border-b-0" key={entry.file}>
                    <span className="font-mono text-[11px] text-petrol [overflow-wrap:anywhere]">{entry.file}</span>
                    <div className="flex items-start gap-3">
                      <code className="min-w-0 flex-1 break-all font-mono text-[10.5px] leading-5 text-muted">
                        {entry.sha256}
                      </code>
                      <CopyButton copiedLabel={copy.copiedLabel} label={copy.copyLabel} value={entry.sha256} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </details>
      </div>
    </div>
  );
}
