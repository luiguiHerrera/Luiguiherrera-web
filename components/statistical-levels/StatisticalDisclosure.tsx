'use client';
import { useState, type ReactNode } from 'react';

// Mount on first access, then retain local filters when the disclosure closes.
export function StatisticalDisclosure({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  const [visited, setVisited] = useState(false);
  return <details id={id} className="sl-disclosure" onToggle={event => { if (event.currentTarget.open) setVisited(true); }}>
    <summary><span>{title}{note ? <small>{note}</small> : null}</span><span aria-hidden="true" className="sl-disclosure-mark">+</span></summary>
    {visited ? <div className="sl-disclosure-body">{children}</div> : null}
  </details>;
}
