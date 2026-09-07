# Primer informe de septiembre de 2026: arquitectura y conservación

Inspección inicial realizada antes de implementar sobre `c6854e988ea33356320d364e7b306f348cb8980e` (`vercel-deployment`). La nota inicial de inspección se amplía aquí con las decisiones finales. Había cambios ajenos en presupuesto, TOM decay y dependencias; se conservan fuera del commit del informe.

## Infraestructura encontrada

| Responsabilidad | Archivo / comportamiento existente |
|---|---|
| Registro editorial | `lib/reports/market-reports.ts`; ediciones cronológicas y una edición `actual` |
| Página editorial | `app/(es)/informes/[slug]/page.tsx`; `getMarketReportBySlug`, `getHistoricalAutomaticReadings(report.id)` y `MarketReportContent` |
| Segundo informe de agosto | Registro en `market-reports.ts`; snapshot `secondAugust2026AutomaticReadings`, corte `2026-08-14` |
| Aislamiento histórico | `lib/reports/historical-automatic-readings.ts`; los módulos ausentes permanecen `null`, sin completar con datos nuevos |
| Presentación histórica | `AutomaticMarketReadings` selecciona `HistoricalAutomaticMarketReadings`; calendario, acordeones, stockpicking y lista de control compartidos |
| Dashboard | `app/(es)/dashboard/page.tsx` llama a `getDashboardData()`; adapters separados y revalidación de ruta de seis horas y cachés propias de los adapters, sin parámetro histórico |
| Niveles y estacionalidad | `scripts/build-statistical-levels.mjs`; archivo generado del 15/08, cálculos de niveles semanales y celdas All/Midterm |
| Exportaciones | `report-export-model.ts` → `scripts/reports.mts` → HTML/Markdown/ICS y `render-report-pdf.py` (ReportLab) |
| Archivo publicado | El generador copia las exportaciones de ediciones archivadas, sin regenerarlas |
| Validación | `reports:validate`, `reports:check`, `validate:editorial`, `validate:seo`, TypeScript, ESLint y pruebas `node:test` |

## Implementación

Se añadió `first-september-2026.ts`, con corte editorial `2026-09-06`, corte automático `2026-09-04` y periodo prospectivo desde el 07/09 hasta la siguiente edición. La página conserva los siete apartados canónicos. El archivo de informes deriva los meses del registro para mantener accesibles julio, agosto y septiembre.

Los loaders existentes no ofrecen un `asOf` uniforme. Por eso la nueva edición consume exclusivamente JSON persistido en `lib/reports/snapshots/primer-informe-septiembre-2026/`. El snapshot automático se congela recursivamente en memoria. La ruta editorial y el modelo de exportación no importan loaders vivos. No se cambian defaults, adapters, cachés ni variables globales del Dashboard.

El generador estadístico ahora exporta sus funciones puras y ejecuta la captura global únicamente cuando se invoca como programa. `report-statistical-snapshot.mjs` reutiliza esas funciones sobre filas previamente filtradas al corte. La aplicación nunca importa este programa de captura. `capture-september-prices.mjs` es una herramienta de investigación de una sola ejecución: exige un directorio nuevo y rechaza sobrescribirlo. No forma parte de la regeneración editorial.

Los paneles cuantitativos producen un modelo único de tablas, rango y notas para web, HTML, Markdown y PDF. El precio ajustado y los niveles semanales usan la captura histórica. La semana al corte se excluye de la estimación de extensiones, siguiendo el pipeline existente.

La estacionalidad filtra primero septiembre y años Midterm completos anteriores a 2026; después toma hasta los diez años comparables más recientes. No recorta los últimos diez años calendario. El septiembre de 2026 está incompleto y no cuenta. El N de cada semana puede diferir del N mensual. BTC y ETH conservan únicamente 2018 y 2022; el septiembre inicial parcial de BTC en 2014 no se completa.

## Evidencia y fechas

`integrity.json` fija SHA-256 de los cinco archivos de entrada. No contiene claves ni credenciales.

| Archivo | Contenido |
|---|---|
| `automatic.json` | Fotografía exacta mostrada: régimen, score, confianza, sectores, amplitud, radar, VIX, VX, GLD y flujos BTC |
| `dashboard-evidence.json` | Respuestas de los adapters y cálculos propios usados en la captura, incluidas series VIX y métricas sectoriales |
| `prices-evidence.json.gz` | Filas diarias parseadas, URL y hash de la respuesta original de Yahoo; seis activos, referencias de amplitud y cierres NVDA/FUTU |
| `statistical.json` | Niveles, años y observaciones semanales, estadísticas y pares de cierres regulares para resultados |
| `btc-source.json` | Tabla pública Farside: 25 sesiones, columnas, fecha y método de extracción |

La captura se hizo el 06/09/2026. Yahoo se solicitó con límite exclusivo `2026-09-05T00:00:00Z`; todas las series se recortaron antes de calcular. Los seis precios corresponden exactamente al 04/09. Cripto usa cierre diario UTC y su semana lunes-domingo sigue incompleta al viernes.

Rotación y radar proceden de los adapters existentes de Alpha Vantage; los sectores tienen fecha 04/09. La amplitud relativa se calcula sobre los precios ajustados capturados y la media larga usa 200 sesiones. Los nueve contratos VX son liquidaciones del 04/09 de Cboe. GLD usa participaciones de State Street como proxy, no flujos monetarios oficiales.

El acceso FRED autenticado no proporcionó una lectura válida. Se utilizó el fallback público del mismo adapter, que entregó VIX 14,32 del **03/09/2026**. La fecha se muestra en web y exportaciones: no se presenta como cierre spot del día 4 ni se rellena con valores demo.

La primera fuente BTC tenía cobertura incompleta. Se sustituyó durante la preparación por la tabla pública de Farside procesada con el adapter existente: 31/08 +216,7; 01/09 −236,5; 02/09 +101,1; 03/09 +730,8; 04/09 +174,6 millones USD. Total cinco sesiones: +986,7; racha: tres entradas. El HTTP directo de Farside devolvió 403; se utilizó el lector web de su tabla pública. El archivo conserva filas parseadas y documenta ese método; no afirma contener el HTML original. El régimen se recalculó con esas fuentes: score 74, confianza 88, Risk-on selectivo.

## Verificación editorial y fuentes

Las referencias privadas de BofA, Nomura, JPM, Morgan Stanley y Goldman se citan con institución, título y fecha a partir del material suministrado por el editor. No se accedió al texto íntegro ni se reprodujeron screenshots. No se trasladaron cifras sensibles, probabilidades o triggers antiguos como mediciones actuales.

| Hecho / evento | Fuente oficial consultada el 06/09/2026 |
|---|---|
| Labor Day, 07/09; sin sesión regular de opciones | [Cboe Hours & Holidays](https://www.cboe.com/about/hours/us-options) |
| China CPI/PPI, 09/09 09:30 UTC+8; actividad/ventas, 15/09 10:00 UTC+8 | [NBS, avisos vigentes](https://www.stats.gov.cn/szst/), contrastados con su [calendario anual](https://www.stats.gov.cn/english/PressRelease/ReleaseCalendar/202512/t20251226_1962154.html) |
| PPI 10/09 08:30 ET; CPI 11/09 08:30 ET | [BLS septiembre](https://www.bls.gov/schedule/2026/09_sched.htm) |
| Ventas minoristas 16/09 08:30 ET | [Census](https://www.census.gov/retail/release_schedule.html) |
| FOMC 16/09 14:00 ET, conferencia 14:30; producción industrial 18/09 09:15 | [Federal Reserve septiembre](https://www.federalreserve.gov/newsevents/2026-september.htm) |
| BOJ 17–18/09; sin hora de decisión publicada | [BOJ calendario](https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm) |
| BOJ mantuvo alrededor de 1,0 % el 31/07 | [BOJ comunicado](https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260731a.pdf) |
| Expiración 18/09; horario según contrato | [Cboe 2026](https://cdn.cboe.com/resources/options/Cboe2026OPTIONSCalendar.pdf) |
| PCE 30/09 08:30 ET | [BEA](https://www.bea.gov/news/schedule/full) |
| NVIDIA Q2 FY27: 26/08, ingresos 96.200 M USD, +106 % interanual | [NVIDIA Newsroom](https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-second-quarter-fiscal-2027) |
| Futu Q2 2026: 20/08, conferencia 07:30 ET | [Futu IR](https://futuholdings.gcs-web.com/news-releases/news-release-details/futu-announces-second-quarter-2026-unaudited-financial-results/) |

NVDA: cierres regulares 26/08 209,66 → 27/08 227,98 USD, +8,74 %, frente al implícito previo 6,18 %. FUTU: 19/08 109,42 → 20/08 112,73 USD, +3,03 %, frente al 7,04 %. Los implícitos son los del informe de agosto consultados el 16/08; no se sustituyen por cotizaciones de opciones inmediatamente previas al anuncio. Las siete compañías de software son un universo de estudio, sin selección propia ni recomendación.

## Regeneración y canary

Para regenerar únicamente desde las entradas persistidas:

```sh
npm run reports:generate
npm run reports:validate
npm run reports:check
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import ./scripts/report-node-register.mjs --experimental-test-module-mocks --test lib/reports/first-september-2026.test.mts lib/dashboard/adapters/vix-term-structure.test.ts
```

El canary ejecuta el verdadero `getDashboardData()` con adapters de prueba. Primero entrega el 04/09; después entrega GLD y VIX del 08/09 con valores distintos. Comprueba que el loader devuelve el dato nuevo, que el informe conserva fecha y VIX históricos y que su modelo de exportación no cambia. Además comprueba las llamadas de las rutas, rechazo de mutaciones, hashes, reproducción de cada activo, exclusión de un precio futuro extremo, fechas y horas del calendario y los bytes de **todas** las exportaciones previas contra el commit base.

No ejecutar la captura de investigación al regenerar exportaciones. No reemplazar los JSON de esta edición con revisiones del proveedor. Una edición posterior requiere otro snapshot y otra ruta. `reports:check` verifica bytes deterministas de las exportaciones y manifest. La comprobación del Dashboard posterior al corte usa fixtures porque la fecha real de esta entrega aún es 06/09; no se afirma haber observado una sesión real del 08/09.

## Límites declarados

- VIX spot conserva el 03/09, última observación pública obtenida por el adapter al capturar.
- DXY no tiene serie homogénea soportada; UUP no se presenta como DXY. No se añade un módulo nuevo de Treasury 10Y/30Y.
- Las muestras cripto son pequeñas: N=2. No hay extrapolación ni promesa de repetición.
- La historia ajustada representa la versión capturada del proveedor; queda persistida para impedir revisiones futuras del informe.
- Las notas institucionales privadas se usan desde los extractos del editor; las valoraciones individuales de software siguen pendientes antes de cualquier selección.
- Los horarios no publicados de BOJ/opciones permanecen pendientes y sus eventos ICS son de día completo. Los demás eventos llevan hora UTC explícita.
- No se despliega ni se promueve a producción.
