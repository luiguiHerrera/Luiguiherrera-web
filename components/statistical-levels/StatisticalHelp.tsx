"use client";

import { useId, useState } from 'react';

export function StatisticalHelp({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return <span className="sl-help" data-open={open}>
    <button type="button" aria-label={label} aria-describedby={id} aria-expanded={open}
      onClick={() => setOpen(value => !value)} onBlur={() => setOpen(false)}
      onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); event.currentTarget.blur(); } }}>
      <span aria-hidden="true">i</span>
    </button>
    <span id={id} role="tooltip" className="sl-tooltip">{children}</span>
  </span>;
}
