"use client";

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './price-participation.module.css';

/** Shared dashboard help: click/touch, keyboard focus and Escape. */
export function DashboardMetricHelp({label,text,locale='es'}:{label:string;text:string;locale?:'es'|'en'}) {
  const id=useId();
  const [open,setOpen]=useState(false);
  const button=useRef<HTMLButtonElement>(null);
  const tooltip=useRef<HTMLSpanElement>(null);
  const [position,setPosition]=useState<{left:number;top:number}|null>(null);
  useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{
      if(!button.current || !tooltip.current)return;
      const anchor=button.current.getBoundingClientRect(), box=tooltip.current.getBoundingClientRect();
      const left=Math.max(12,Math.min(anchor.left-4,window.innerWidth-box.width-12));
      const below=anchor.bottom+8;
      const top=below+box.height<=window.innerHeight-12 ? below : Math.max(12,anchor.top-box.height-8);
      setPosition({left,top});
    };
    place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
    return ()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
  },[open,text]);
  return <span className={styles.metricHelp}>
    <button ref={button} type="button" aria-label={`${locale==='en'?'Help':'Ayuda'}: ${label}`} aria-expanded={open} aria-controls={open?id:undefined} aria-describedby={open?id:undefined}
      onClick={()=>setOpen(value=>!value)} onBlur={()=>setOpen(false)} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();setOpen(false);}}}>
      <span aria-hidden="true">i</span>
    </button>
    {open ? createPortal(<span ref={tooltip} id={id} role="tooltip" className={styles.metricTooltip} style={{position:'fixed',left:position?.left??0,top:position?.top??0,width:'min(320px, calc(100vw - 24px))',visibility:position?'visible':'hidden'}}>{text}</span>,document.body) : null}
  </span>;
}
