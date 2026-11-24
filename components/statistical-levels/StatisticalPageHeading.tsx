export function StatisticalPageHeading({ locale }: { locale: 'es' | 'en' }) {
  const en = locale === 'en';
  return <header className="sl-heading">
    <p className="sl-eyebrow">{en ? 'Quantitative analysis' : 'Análisis cuantitativo'}</p>
    <h1>{en ? 'Where is this asset relative to its own history?' : '¿Dónde está este activo frente a su propia historia?'}</h1>
    <p className="sl-heading-description">{en ? 'Explore the asset’s price, historical levels, risk and seasonality. Compare horizons and examine correlations with other assets.' : 'Explora el precio, los niveles históricos, el riesgo y la estacionalidad del activo. Compara horizontes y analiza sus correlaciones con otros activos.'}</p>
  </header>;
}
