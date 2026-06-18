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
  const activeAsset = catalog.find((asset) => selected.includes(asset.ticker));

  return (
    <section className="border border-line bg-panel p-3.5 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Activo foco</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">
            {activeAsset ? `${activeAsset.ticker} · ${activeAsset.name}` : selected[0] ?? "Sin activo seleccionado"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">La página carga solo los niveles y estacionalidad del activo seleccionado.</p>
        </div>
        <span className="border border-line bg-panelSoft px-3 py-2 text-sm font-semibold text-muted">
          {catalog.length} activos disponibles
        </span>
      </div>

      <details className="mt-4 border-t border-line pt-4">
        <summary className="w-fit cursor-pointer border border-ink bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink">
          Cambiar activo
        </summary>
        <label className="mt-4 block w-full md:w-96">
          <span className="sr-only">Buscar activo</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar ticker o nombre"
            className="w-full border border-line bg-panelSoft px-4 py-3 text-sm text-ink outline-none transition focus:border-petrol"
          />
        </label>

        <div className="mt-5 grid gap-4 md:gap-5">
          {categoryOrder.map((category) => {
            const assets = filtered.filter((asset) => asset.category === category);
            if (!assets.length) return null;
            return (
              <div key={category}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{category}</p>
                <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto pr-1 md:max-h-none md:gap-2 md:overflow-visible md:pr-0">
                  {assets.map((asset) => {
                    const active = selected.includes(asset.ticker);
                    return (
                      <button
                        key={asset.ticker}
                        type="button"
                        onClick={() => selectAsset(asset.ticker)}
                        title={asset.name}
                        className={`border px-2.5 py-1.5 text-xs font-semibold transition md:px-3 md:py-2 md:text-sm ${active ? "border-petrol bg-[#eef3f2] text-petrol" : "border-line bg-panelSoft text-muted hover:border-ink hover:text-ink"}`}
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
      </details>
    </section>
  );
}
