'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

// Mount on first access, then retain local filters when the disclosure closes.
export function StatisticalDisclosure({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  const [visited, setVisited] = useState(false);
  const element = useRef<HTMLDetailsElement>(null);
  // A native disclosure can open before hydration attaches the toggle handler.
  useEffect(() => { if (element.current?.open) setVisited(true); }, []);
  return <details ref={element} id={id} className="sl-disclosure" onToggle={event => { if (event.currentTarget.open) setVisited(true); }}>
    <summary><span>{title}{note ? <small>{note}</small> : null}</span><span aria-hidden="true" className="sl-disclosure-mark">+</span></summary>
    {visited ? <div className="sl-disclosure-body">{children}</div> : null}
  </details>;
}
