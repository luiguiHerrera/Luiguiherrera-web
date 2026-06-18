"use client";

import type { AssetCatalogItem, AssetCategory } from "@/lib/statistical-levels/types";

type AssetSelectorProps = {
  catalog: AssetCatalogItem[];
  query: string;
  selected: string[];
  setQuery: (value: string) => void;
  selectAsset: (ticker: string) => void;
};

const categoryOrder: AssetCategory[] = ["Índices / ETFs", "Bonos", "Oro y materias primas", "Sectores", "Cripto", "Internacional"];

export function AssetSelector({ catalog, query, selected, setQuery, selectAsset }: AssetSelectorProps) {
  const normalized = query.trim().toLowerCase();
  const filtered = catalog.filter((asset) => `${asset.ticker} ${asset.name} ${asset.category}`.toLowerCase().includes(normalized));

  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Selector</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">Activos del universo curado</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Elige un activo para cargar solo sus niveles y estacionalidad desde servidor.</p>
        </div>
        <label className="w-full md:w-80">
          <span className="sr-only">Buscar activo</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar ticker o nombre"
            className="w-full border border-line bg-panelSoft px-4 py-3 text-sm text-ink outline-none transition focus:border-petrol"
          />
        </label>
      </div>

      <div className="mt-6 grid gap-5">
        {categoryOrder.map((category) => {
          const assets = filtered.filter((asset) => asset.category === category);
          if (!assets.length) return null;
          return (
            <div key={category}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{category}</p>
              <div className="flex flex-wrap gap-2">
                {assets.map((asset) => {
                  const active = selected.includes(asset.ticker);
                  return (
                    <button
                      key={asset.ticker}
                      type="button"
                      onClick={() => selectAsset(asset.ticker)}
                      title={asset.name}
                      className={`border px-3 py-2 text-sm font-semibold transition ${active ? "border-petrol bg-[#eef3f2] text-petrol" : "border-line bg-panelSoft text-muted hover:border-ink hover:text-ink"}`}
                    >
                      {asset.ticker}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
