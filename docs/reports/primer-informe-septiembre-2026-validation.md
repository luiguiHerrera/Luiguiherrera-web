# Entrega y validación: primer informe de septiembre de 2026

Validación complementaria: [addendum semanal del 04/09](primer-informe-septiembre-2026-addendum.md). Añade el subbloque editorial y actualiza el PDF a 22 páginas; las cifras de esta entrega inicial se conservan como registro.

STATE = PASS — implementado, comprobado y preparado para revisión; sin despliegue.

BRANCH = `codex/primer-informe-septiembre-2026`

BASE_COMMIT = `c6854e988ea33356320d364e7b306f348cb8980e`

REPORT_ROUTE = `/informes/primer-informe-septiembre-2026`

REPORT_SNAPSHOT_DATE = `2026-09-04`; corte editorial = `2026-09-06`.

DASHBOARD_LIVE = PASS. Conserva `getDashboardData()` y su revalidación existente (ruta 6 horas, adapters con sus propias cachés). No importa el snapshot del informe.

SNAPSHOT_ISOLATION_CANARY = PASS. El verdadero orquestador del Dashboard recibe fixtures del 08/09 y devuelve GLD/VIX nuevos. La ruta del informe, su fecha, el VIX histórico y su modelo de exportación conservan la captura del 04/09. Se utiliza una fecha posterior simulada, no una observación real futura.

## Estadísticas

| Activo | STATISTICAL_LEVELS | Precio USD al 04/09 | Periodos semanales | MIDTERM_SEASONALITY | N mensual | N semanas 1–5 |
|---|---|---:|---:|---|---:|---|
| SPY | PASS | 770.19 | 1753 | PASS | 8 | 8, 8, 8, 8, 3 |
| GLD | PASS | 406.77 | 1137 | PASS | 5 | 5, 5, 5, 5, 2 |
| FXI | PASS | 35.88 | 1143 | PASS | 5 | 5, 5, 5, 5, 2 |
| EWJ | PASS | 98.28 | 1589 | PASS | 7 | 7, 7, 7, 7, 2 |
| BTCUSD | PASS | 79671.97 | 624 | PASS | 2 | 2, 2, 2, 2, 1 |
| ETHUSD | PASS | 2456.08 | 460 | PASS | 2 | 2, 2, 2, 2, 1 |

DXY: no aplicable; no existe soporte homogéneo para el índice. La limitación se explica en ambos paneles y no se reemplaza con UUP.

Los seis activos muestran apertura, precio congelado, WSLE/WALE/WAHE/WSHE, distancias, rango y número de periodos. La configuración es Septiembre / Midterm / All, hasta diez ciclos completos; cada semana publica retorno, win rate y N real. Los valores reproducen las filas históricas y rechazan la incorporación de un precio posterior extremo. Se mantienen los dos avisos metodológicos requeridos.

## TESTS

| Comprobación | Resultado |
|---|---|
| Canary + snapshot + seis activos + contenido + históricos + contratos VX | 20 PASS, 0 FAIL |
| `npm run reports:generate` | PASS; cinco ediciones, cuatro formatos para septiembre |
| `npm run reports:validate` | PASS; cinco informes, 19 artefactos, contenido y enlaces sincronizados |
| `npm run reports:check` | PASS; 20 archivos deterministas, manifest incluido |
| `npm run validate:editorial` | PASS |
| `npm run validate:seo` | PASS; 43 rutas indexables, 18 pares de idioma |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS; cero errores, 18 avisos preexistentes |
| ESLint de archivos nuevos/finalizados | PASS; cero avisos |
| `npm run build` | PASS; 55 páginas generadas, ruta de septiembre incluida |
| Exportaciones históricas contra BASE_COMMIT | PASS; bytes idénticos en PDF/HTML/MD/ICS de todas las ediciones previas |
| Navegador sobre servidor de producción | PASS; escritorio y móvil sin errores ni desbordamiento |
| Teclado y descargas | PASS; Enter abre el acordeón, tablas enfocables y cuatro descargas HTTP 200/MIME correcto |
| PDF | PASS; 21 páginas renderizadas y revisadas, cero caracteres fuera de página |

El comando completo de pruebas, los loaders y la procedencia de los datos constan en [arquitectura y conservación](primer-informe-septiembre-2026-architecture.md). Los resultados de navegador y PDF se conservan en [qa.json](primer-informe-septiembre-2026-qa.json).

## EXPORTS

PDF / HTML / Markdown: PASS. Generados desde el mismo modelo y las entradas congeladas. La regeneración determinista conserva las cifras; no llama a latest.

ICS: PASS. Doce eventos posteriores al corte, con fuentes oficiales. Las horas confirmadas llevan UTC; BOJ, festivo y expiración se conservan como eventos de día completo cuando no hay una hora única.

DESKTOP_VALIDATION = PASS, 1440 × 1000. Siete títulos H2 en el orden requerido, siete grupos de niveles (seis activos y DXY explicado), archivo con cinco ediciones accesibles.

MOBILE_VALIDATION = PASS, 390 × 844. Ancho del documento igual al viewport; sin elementos desbordados. Portada, acordeones, niveles, calendario y stockpicking revisados.

EDITORIAL_VALIDATION = PASS:

- Identidad, título y subtítulo solicitados; fechas diferenciadas y periodo prospectivo visible.
- Seis párrafos de contexto y frase de arranque exacta; sin resumen ejecutivo ni tesis adicional.
- Texto visible exacto: “Estado del mercado al cierre del 4 de septiembre de 2026”.
- Siete secciones canónicas y ocho activos en el orden solicitado.
- Los seis activos principales usan las cinco subsecciones requeridas; sin vigilancia repetida dentro del activo.
- Estacionalidad histórica condicional; sin completar 2026 ni inventar años de cripto.
- NVDA/FUTU: cierre regular contra cierre regular y comparación con el implícito congelado de agosto.
- Software es un tema de estudio con filtros, sin convertir un ranking institucional en una selección.
- Calendario contrastado con BLS, Fed, Census, BEA, BOJ, Cboe y NBS; sin probabilidades antiguas.
- Tres rutas sin probabilidades arbitrarias y cierre obligatorio; lista de control de catorce factores.
- Fuentes separadas en A/B/C, notas privadas parafraseadas y los tres párrafos legales requeridos.
- Julio y agosto permanecen accesibles; septiembre pasa a Actual y agosto a Archivado.

## KNOWN_LIMITATIONS

VIX spot: última observación pública capturada del 03/09 (14,32), explícitamente fechada; el resto de módulos indicados corresponde al 04/09. DXY y rendimientos 10Y/30Y no tienen un módulo homogéneo añadido. BTC/ETH tienen N=2; la quinta semana tiene N=1. La historia ajustada queda fijada a la versión del proveedor capturada.

Las notas institucionales privadas se basan en los extractos facilitados por el editor; no se verificó el texto íntegro. Las compañías de software no constituyen una selección y requieren valoración individual antes de cualquier recomendación.

El build detectó incidencias preexistentes de fuentes vivas: la clave FRED configurada es inválida, Alpha Vantage devuelve límites ocasionales y Bitbo tiene cobertura reciente incompleta. Estos adapters no se modifican. La captura del informe utilizó FRED público y Farside con procedencia documentada. Dashboard vivo significa que conserva su flujo de actualización; no que todas sus fuentes externas respondan siempre con cobertura completa.

FINAL_DECISION = PASS para entrega y revisión. No se ha hecho push, deploy ni promoción a producción. El commit final se identifica en la respuesta de entrega; los cambios ajenos de presupuesto, investigación y dependencias permanecen fuera de ese commit.

## FILES_CHANGED

35 archivos del informe:

- `app/(es)/informes/page.tsx`
- `components/reports/HistoricalAutomaticMarketReadings.tsx`
- `components/reports/MarketReportContent.tsx`
- `components/reports/ReportQuantitativePanels.tsx`
- `components/reports/ReportSection.tsx`
- `components/reports/StockpickingEarnings.tsx`
- `docs/reports/primer-informe-septiembre-2026-architecture.md`
- `docs/reports/primer-informe-septiembre-2026-qa.json`
- `docs/reports/primer-informe-septiembre-2026-validation.md`
- `lib/reports/first-september-2026.test.mts`
- `lib/reports/first-september-2026.ts`
- `lib/reports/historical-automatic-readings.ts`
- `lib/reports/market-reports.ts`
- `lib/reports/report-export-model.ts`
- `lib/reports/report-statistical-panels.ts`
- `lib/reports/snapshots/primer-informe-septiembre-2026/automatic.json`
- `lib/reports/snapshots/primer-informe-septiembre-2026/btc-source.json`
- `lib/reports/snapshots/primer-informe-septiembre-2026/dashboard-evidence.json`
- `lib/reports/snapshots/primer-informe-septiembre-2026/integrity.json`
- `lib/reports/snapshots/primer-informe-septiembre-2026/prices-evidence.json.gz`
- `lib/reports/snapshots/primer-informe-septiembre-2026/statistical.json`
- `next.config.ts`
- `public/llms.txt`
- `public/reports/manifest.json`
- `public/reports/primer-informe-septiembre-2026-calendar.ics`
- `public/reports/primer-informe-septiembre-2026.html`
- `public/reports/primer-informe-septiembre-2026.md`
- `public/reports/primer-informe-septiembre-2026.pdf`
- `scripts/build-statistical-levels.mjs`
- `scripts/capture-september-prices.mjs`
- `scripts/render-report-pdf.py`
- `scripts/report-node-register.mjs`
- `scripts/report-statistical-snapshot.mjs`
- `scripts/reports.mts`
- `scripts/validate-editorial.mts`
