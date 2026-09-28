"use client";

import NextLink from 'next/link';
import { Children, createContext, isValidElement, cloneElement, useContext, type ComponentProps, type ReactNode } from 'react';
import { sourceSegments, type ReportSourceLink } from '@/lib/reports/report-source-links';
const SourcePolicy = createContext<{newTab?: boolean; sources: ReportSourceLink[]}>({sources:[]});
export function ReportSourcePolicy({newTab,sources=[],children}:{newTab?:boolean;sources?:ReportSourceLink[];children:ReactNode}) {
  return <SourcePolicy.Provider value={{newTab,sources}}>{children}</SourcePolicy.Provider>;
}
export function ReportLink(props:ComponentProps<typeof NextLink>) {
  const {newTab}=useContext(SourcePolicy);
  return <NextLink {...props} {...(newTab ? {target:'_blank',rel:'noopener noreferrer',download:undefined}: {})} />;
}
export function ReportAnchor(props:ComponentProps<'a'>) {
  const {newTab}=useContext(SourcePolicy);
  return <a {...props} {...(newTab ? {target:'_blank',rel:'noopener noreferrer',download:undefined}: {})} />;
}
export function ReportText({children}:{children:ReactNode}) {
  const {sources}=useContext(SourcePolicy);
  function render(nodes:ReactNode):ReactNode {
    return Children.map(nodes,node=>{
      if(typeof node==='string') return sourceSegments(node,sources).map((s,i)=>s.href ? <ReportAnchor key={i} href={s.href} data-source-id={s.sourceId} className="underline decoration-petrol/30 underline-offset-4 hover:text-petrol">{s.text}</ReportAnchor>:s.text);
      if(isValidElement<{children?:ReactNode}>(node) && typeof node.type==='string' && !['a','svg','time'].includes(node.type)) return cloneElement(node,undefined,render(node.props.children));
      return node;
    });
  }
  return <>{render(children)}</>;
}
export function ReportParagraph({children,...props}:ComponentProps<'p'>) {return <p {...props}><ReportText>{children}</ReportText></p>;}
