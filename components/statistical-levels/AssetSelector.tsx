"use client";

import type { AssetCatalogItem, AssetCategory } from "@/lib/statistical-levels/types";
import { displayStatName, displayStatTicker } from "@/lib/statistical-levels/display";

type AssetSelectorProps = {
  catalog: AssetCatalogItem[];
  locale?: "es" | "en";
  query: string;
  selected: string[];
  setQuery: (value: string) => void;
  selectAsset: (ticker: string) => void;
};

const categoryOrder: AssetCategory[] = ["Índices / ETFs", "Bonos", "Oro y materias primas", "Sectores", "Temáticos", "Cripto", "Internacional"];
const categoryLabels: Record<"es" | "en", Record<AssetCategory, string>> = {
  es: {
    "Índices / ETFs": "Índices / ETFs",
    Bonos: "Bonos",
    "Oro y materias primas": "Oro y materias primas",
    Sectores: "Sectores",
    "Temáticos": "Temáticos",
    Cripto: "Cripto",
    Internacional: "Internacional",
  },
  en: {
    "Índices / ETFs": "Indices / ETFs",
    Bonos: "Bonds",
    "Oro y materias primas": "Gold & commodities",
    Sectores: "Sectors",
    "Temáticos": "Thematic",
    Cripto: "Crypto",
    Internacional: "International",
  },
};

export function AssetSelector({ catalog, locale = "es", query, selected, setQuery, selectAsset }: AssetSelectorProps) {
  const normalized = query.trim().toLowerCase();
  const filtered = catalog.filter((asset) =>
    `${asset.ticker} ${asset.name} ${asset.category} ${displayStatTicker(asset.ticker)} ${displayStatName(asset.ticker, asset.name)}`
      .toLowerCase()
      .includes(normalized),
  );
  const activeAsset = catalog.find((asset) => selected.includes(asset.ticker));
  const copy = locale === "en"
    ? {
        focusAsset: "Focus asset",
        loadNote: "The page loads only the levels and seasonality for the selected asset.",
        available: "available assets",
        changeAsset: "Change asset",
        searchAsset: "Search asset",
        placeholder: "Search ticker or name",
      }
    : {
        focusAsset: "Activo foco",
        loadNote: "La página carga solo los niveles y estacionalidad del activo seleccionado.",
        available: "activos disponibles",
        changeAsset: "Cambiar activo",
        searchAsset: "Buscar activo",
        placeholder: "Buscar ticker o nombre",
      };

  return (
    <div className="sl-asset-control">
      <p className="sl-control-label">{locale === "en" ? "Asset" : "Activo"}</p>
      <details id="sl-asset-picker">
        <summary><strong>{activeAsset ? displayStatTicker(activeAsset.ticker) : "n/d"}</strong><span>{activeAsset ? displayStatName(activeAsset.ticker, activeAsset.name) : "n/d"}</span><b aria-hidden="true">⌄</b></summary>
        <div className="sl-picker-body">
        <label className="block"><span className="sr-only">{copy.searchAsset}</span><input autoComplete="off" value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.placeholder} /></label>
        <p className="sl-caption">{catalog.length} {copy.available}</p>
        {filtered.length === 0 ? <p role="status">{locale === "en" ? "No matching assets." : "No hay activos que coincidan."}</p> : null}
        {categoryOrder.map(category => {
          const assets = filtered.filter(asset => asset.category === category);
          return assets.length ? <div className="sl-picker-group" key={category}><p>{categoryLabels[locale][category]}</p><div>{assets.map(asset => <button type="button" key={asset.ticker} aria-pressed={selected.includes(asset.ticker)} title={asset.name} onClick={event => { selectAsset(asset.ticker); event.currentTarget.closest('details')?.removeAttribute('open'); }}>{displayStatTicker(asset.ticker)}</button>)}</div></div> : null;
        })}
        </div>
      </details>
    </div>
  );
}
