"use client";

import { useId, useState } from 'react';
import styles from './price-participation.module.css';

/** Shared dashboard help: click/touch, keyboard focus and Escape. */
export function DashboardMetricHelp({label,text,locale='es'}:{label:string;text:string;locale?:'es'|'en'}) {
  const id=useId();
  const [open,setOpen]=useState(false);
  return <span className={styles.metricHelp}>
    <button type="button" aria-label={`${locale==='en'?'Help':'Ayuda'}: ${label}`} aria-expanded={open} aria-controls={id} aria-describedby={open?id:undefined}
      onClick={()=>setOpen(value=>!value)} onBlur={()=>setOpen(false)} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();setOpen(false);}}}>
      <span aria-hidden="true">i</span>
    </button>
    <span id={id} role="tooltip" hidden={!open} className={styles.metricTooltip}>{text}</span>
  </span>;
}
