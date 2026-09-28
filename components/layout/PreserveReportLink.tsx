"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';

/** Keep the published second report open, including site navigation and language links. */
export function PreserveReportLink(props: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const preserve = pathname === '/informes/segundo-informe-septiembre-2026';
  return <Link {...props} {...(preserve ? {target:'_blank', rel:'noopener noreferrer'} : {})} />;
}
