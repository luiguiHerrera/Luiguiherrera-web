"use client";
import { useState } from "react";
import Link from "next/link";
import { researchCopy } from "@/lib/trends/research/copy";
import type { Locale } from "@/lib/trends/research/types";
import type { TrendCategory } from "@/lib/trends/catalog";
import s from "./research.module.css";

export type ResearchCard = { id: string; href: string; name: string; short: string; category: TrendCategory; image: string };
export function ResearchCatalog({ cards, locale }: { cards: ResearchCard[]; locale: Locale }) {
  const [category, setCategory] = useState<TrendCategory | "all">("all");
  const c = researchCopy[locale], visible = cards.filter(t => category === "all" || t.category === category);
  return <><div className={s.filters} role="group" aria-label={c.catalogue}>{(Object.keys(c.categories) as (TrendCategory | "all")[]).map(key => <button key={key} type="button" aria-pressed={category === key} onClick={() => setCategory(key)}>{c.categories[key]}</button>)}</div><p className={s.count} role="status" aria-live="polite">{visible.length} / {cards.length} {c.count}</p><div className={s.catalogGrid}>{visible.map(card => <article className={s.catalogCard} key={card.id}><Link href={card.href} prefetch={false} aria-label={`${c.read}: ${card.name}`}><div className={s.cardImage} style={{backgroundImage:`url(${card.image})`}} aria-hidden="true"/><div className={s.cardBody}><p className={s.cardCategory}>{c.categories[card.category]}</p><h3>{card.name}</h3><p className={s.cardSummary}>{card.short}</p><span className={s.cardRead}>{c.read}</span></div></Link></article>)}</div></>;
}
