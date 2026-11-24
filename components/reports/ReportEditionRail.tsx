"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { ReportEditorialSection } from "@/lib/reports/report-editorial-sections";
import styles from "./report-premium.module.css";

const assets = ["SPY", "GLD", "FXI", "EWJ", "BTC", "ETH"];

export function ReportEditionRail({ sections, monthLabel, locale = "es", editionLabel }: { sections: Pick<ReportEditorialSection, "id" | "eyebrow">[]; monthLabel: string; locale?: "es" | "en"; editionLabel?: string }) {
  const isEnglish = locale === "en";
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const entry = entries.find(item => item.isIntersecting);
      if (entry) setActive(entry.target.id);
    }, { rootMargin: "-15% 0px -65% 0px", threshold: 0 });
    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [sections]);

  const navigate = (id: string) => {
    const panel = document.getElementById(id);
    if (panel instanceof HTMLDetailsElement) panel.open = true;
    setActive(id);
  };
  const navigation = <ul className={styles.railLinks}>{sections.map((section, index) => <li key={section.id}>
    <a href={`#${section.id}`} onClick={() => navigate(section.id)} aria-current={active === section.id ? "location" : undefined}>
      <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{section.eyebrow}
    </a>
    {section.id === "lectura-seguimiento" ? <ul className={styles.railAssets}>{assets.map(ticker => <li key={ticker}><a href={`#${ticker.toLowerCase()}`} onClick={() => navigate(ticker.toLowerCase())}>{ticker}</a></li>)}</ul> : null}
  </li>)}</ul>;

  return <aside className={styles.rail} aria-label={isEnglish ? "Report navigation" : "Navegación del informe"}>
    <div className={styles.railBrand}><Image src="/brand/luigui-herrera/v1/luigui-herrera-monograma-lh-transparent-lossless.webp" alt="" width={680} height={824} sizes="44px" className={styles.railLogo} /><p>Luigui Herrera</p></div>
    <div className={styles.railEdition}><p>{isEnglish ? "Market report" : "Informe de mercado"}</p><strong>{monthLabel}</strong><span>{editionLabel ?? (isEnglish ? "Second edition" : "Segunda edición")}</span></div>
    <nav className={styles.desktopRail} aria-label={isEnglish ? "Edition contents" : "Índice de la edición"}>{navigation}</nav>
    <details className={styles.mobileRail}><summary>{isEnglish ? "Browse this report" : "Recorrer esta edición"} <span aria-hidden="true">＋</span></summary><nav aria-label={isEnglish ? "Edition contents" : "Índice de la edición"}>{navigation}</nav></details>
  </aside>;
}
