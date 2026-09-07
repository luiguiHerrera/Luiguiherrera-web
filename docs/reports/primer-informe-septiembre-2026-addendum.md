# Addendum: semana cerrada el 04/09/2026

STATE = PASS. Subbloque H3 dentro de «Lecturas de mercado al cierre», con «A. Lo que impulsó» y «B. Lo que frenó». Se mantienen siete secciones principales.

BRANCH = `codex/primer-informe-septiembre-2026`.
BASE_COMMIT del addendum = `84e8b3ee92dff4c41b4342ae5d1759603ed85c6b`.
REPORT_ROUTE = `/informes/primer-informe-septiembre-2026`.
REPORT_SNAPSHOT_DATE = `2026-09-04`; captura complementaria = `2026-09-06`.

## Verificación editorial

La autoridad del texto es la evidencia congelada, no los porcentajes del borrador. Salud avanzó un 0,17 % y quedó cuarta de once; Energía, Tecnología y Utilities fueron los tres líderes. Financieros quedó plano: no se atribuye una caída inexistente a los tipos. Consumo Discrecional fue el mayor rezago. META y NVDA lideraron las siete megacaps verificadas; META pertenece a Comunicación y no se presenta como componente de XLK. La mención a IA identifica exposición temática, sin afirmar que explica causalmente todos los retornos.

USO subió un 9,45 % frente al 2,20 % de XLE: se identifica como vehículo ligado a futuros, sin confundir su retorno con petróleo spot ni con acciones energéticas. IWM mantiene ventaja YTD sobre QQQ y SPY, pero no lideró a ambos esa semana.

VIX: Cboe confirmó 14,53 el 04/09, frente a 14,43 el 28/08 (+0,10 puntos). Yahoo coincide. La observación original de FRED, 14,32 al 03/09, y el régimen calculado con ella permanecen intactos y explícitamente fechados. No se mezcla el dato nuevo del addendum con el score histórico.

La racha del S&P 500 usa ^GSPC, índice de precio y cierre regular contra cierre regular: **27 sesiones**, del 30/07 al 04/09. Última caída diaria de al menos el 1 %: 29/07, **-1,516129 %**. Las fechas de la ventana coinciden con las sesiones de SPY. Una caída de exactamente el 1 % rompe la racha. No se cuentan variaciones intradía.

No se publican afirmaciones de máximos, liderazgo del verano o duración de un régimen. La calma se describe sin convertirla en pronóstico de corrección, subida inevitable de volatilidad o recomendación de compra.

## Ventanas y procedencia

- Semana: precio ajustado del cierre del 04/09 dividido por el del viernes 28/08, menos uno. Cinco intervalos diarios; no se omite el lunes.
- YTD: precio ajustado del 04/09 dividido por el del 31/12/2025, menos uno.
- Los precios ajustados, dividendos y ajustes disponibles quedan fijados a la versión capturada. La consulta posterior del proveedor podría mostrar revisiones; el informe no las incorpora.
- Las series existentes de SPY, QQQ, IWM, RSP, NVDA y los once ETF sectoriales se reutilizan de `prices-evidence.json.gz`, sin sustituirlas. Los rankings y retornos sectoriales coinciden con la captura automática del proyecto.
- Se añaden las seis megacaps restantes, USO, ^GSPC y ^VIX desde Yahoo Finance Chart, con final exclusivo `2026-09-05T00:00:00Z` y filtrado adicional de filas hasta el 04/09. Las nueve series, URLs exactas y SHA-256 de respuesta están en `weekly-review-evidence.json.gz`.
- Cboe: [CSV oficial de cierres del VIX](https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv). La evidencia guarda filas hasta el corte, URL, fecha de consulta y SHA-256 de la respuesta.

La amplitud original del Dashboard llamada «1W» procede de `daily.returns["4P"]`: compara cierres del 31/08 al 04/09. Sus valores se conservan, pero la presentación de septiembre identifica esa ventana con fecha y explicación. No se compara esa amplitud directamente con los retornos de viernes a viernes del addendum. No se cambian defaults ni cálculos del Dashboard.

## Retornos auditados

Porcentajes calculados sin redondear; esta tabla muestra cuatro decimales. Los valores exactos y sus tres cierres de referencia están en la evidencia comprimida.

| Instrumento | Semana % | YTD % |
|---|---:|---:|
| SPY | +0.1092 | +13.5446 |
| QQQ | +0.3531 | +17.3117 |
| IWM | +0.0879 | +20.7514 |
| RSP | -0.7658 | +15.2586 |
| XLE | +2.2017 | +45.2551 |
| XLK | +0.8563 | +30.3997 |
| XLU | +0.8191 | +2.2680 |
| XLV | +0.1694 | +11.7016 |
| XLF | +0.0000 | +6.9988 |
| XLC | -0.8496 | -4.2814 |
| XLP | -1.0181 | +10.2552 |
| XLI | -1.0557 | +13.5862 |
| XLRE | -1.2365 | +10.5646 |
| XLB | -1.3915 | +16.5825 |
| XLY | -1.9623 | -3.3831 |
| META | +6.7039 | -6.3961 |
| NVDA | +5.8883 | +23.6681 |
| TSLA | +1.5283 | -21.2666 |
| AAPL | +0.0845 | +18.0170 |
| GOOGL | -2.2829 | +8.3445 |
| MSFT | -2.6931 | +3.9804 |
| AMZN | -2.9726 | +11.9964 |
| USO | +9.4526 | +105.2632 |

Dispersión de las siete megacaps: **9,676552 puntos porcentuales** entre META y AMZN.

## Conservación y pruebas

`weekly-review.json` guarda el texto final. Se incorpora al snapshot histórico con congelación recursiva; no importa el verificador ni consulta fuentes en el render. HTML, Markdown y PDF reciben ese mismo contenido del modelo de exportación. `integrity.json` añade los hashes de los dos archivos complementarios y conserva los cinco hashes originales.

TESTS = 25 PASS, 0 FAIL: canary del Dashboard real con proveedores simulados al 08/09, integridad, estadística y estacionalidad de seis activos, conservación de históricos, futuros VX y cinco pruebas del addendum. Estas últimas reproducen cada retorno semanal/YTD, contrastan texto/rankings/VIX, prueban la racha y el límite exacto del 1 %, rechazan fechas base ausentes, excluyen observaciones posteriores y comprueban congelación profunda.

```sh
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import ./scripts/report-node-register.mjs --experimental-test-module-mocks --test lib/reports/first-september-2026.test.mts lib/reports/weekly-review.test.mts lib/dashboard/adapters/vix-term-structure.test.ts
```

DASHBOARD_LIVE = PASS. No cambia ninguna ruta ni adapter del Dashboard.
SNAPSHOT_ISOLATION_CANARY = PASS. El modelo completo, incluido el addendum, permanece idéntico cuando el proveedor simulado avanza al 08/09.

EXPORTS = PDF / HTML / MD actualizados; ICS idéntico. `reports:generate`, `reports:validate` y `reports:check`: PASS. Contenido, fechas y enlaces coinciden. Todas las exportaciones de julio y agosto conservan sus bytes originales.

DESKTOP_VALIDATION = PASS (1440 × 1000).
MOBILE_VALIDATION = PASS (390 × 844).
Subbloque H3 bajo la sección 2, grupos A/B, siete H2; sin errores de página ni desbordamiento horizontal. El método se abre con Enter y las tres descargas devuelven HTTP 200 y MIME correcto.

PDF = PASS: 22 páginas renderizadas con Poppler y PDFium, subbloque completo en la página 3, calendario comienza en la 17 con su título; cero caracteres fuera de página. Se revisó la composición completa y el detalle de las páginas afectadas.

EDITORIAL_VALIDATION = PASS. `validate:editorial`, `validate:seo` y ESLint de los archivos del addendum pasan.
BUILD = PASS con TypeScript, 55 páginas. Validado en una copia aislada de `84e8b3e` más los cambios de este addendum, con Next 16.2.7 instalado y `next build --webpack`.

KNOWN_LIMITATIONS: la comprobación inicial de TypeScript en el workspace compartido encontró una edición simultánea incompleta en `lib/trends/trends-content.ts`; no se modificó ese trabajo. El build aislado permite atribuir la validación a este cambio. Las fuentes vivas pueden fallar sin red durante el build; el informe usa exclusivamente archivos congelados. La evidencia ajustada conserva la versión histórica capturada. Las limitaciones estadísticas de la entrega original siguen aplicando.

FINAL_DECISION = PASS para revisión; sin push ni despliegue. Los cambios de presupuesto, investigación, tendencias y dependencias quedan fuera del commit del addendum.

La evidencia resumida de navegador y PDF está en [addendum-qa.json](primer-informe-septiembre-2026-addendum-qa.json). La validación de niveles y estacionalidad, con N por activo, permanece en [la entrega original](primer-informe-septiembre-2026-validation.md).

## FILES_CHANGED

16 archivos del addendum:

- `components/reports/HistoricalAutomaticMarketReadings.tsx`
- `lib/reports/historical-automatic-readings.ts`
- `lib/reports/snapshots/primer-informe-septiembre-2026/integrity.json`
- `lib/reports/snapshots/primer-informe-septiembre-2026/weekly-review.json`
- `lib/reports/snapshots/primer-informe-septiembre-2026/weekly-review-evidence.json.gz`
- `lib/reports/weekly-review.test.mts`
- `scripts/report-weekly-review.mjs`
- `scripts/reports.mts`
- `scripts/render-report-pdf.py`
- `public/reports/manifest.json`
- `public/reports/primer-informe-septiembre-2026.html`
- `public/reports/primer-informe-septiembre-2026.md`
- `public/reports/primer-informe-septiembre-2026.pdf`
- `docs/reports/primer-informe-septiembre-2026-addendum.md`
- `docs/reports/primer-informe-septiembre-2026-addendum-qa.json`
- `docs/reports/primer-informe-septiembre-2026-validation.md`
