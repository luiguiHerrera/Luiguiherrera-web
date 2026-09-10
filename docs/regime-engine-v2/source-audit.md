# Evidencia de partida

## Git y alcance

- `CURRENT_HEAD=636cb73fb0fe4d2b28ad96cb7185f8c07d8f895b`.
- `CURRENT_TREE=9f84c28f1b40c86cf574d5c8fb6f8022b9c091d9` (árbol del commit; el working tree tiene cambios adicionales).
- `CURRENT_BRANCH=codex/primer-informe-septiembre-2026`.
- Baseline de referencia: `9fd1b9205e40a0e68e90e780892726353175c0ae`.
- Ancestro común: `49d9f10c08b9a4b86f63a5673075ae041a96fc45`.

El baseline **no es ancestro del HEAD**. No se puede describir el estado actual simplemente como «cambios posteriores al baseline». `git diff baseline HEAD` muestra también componentes presentes en la otra línea y ausentes aquí, por ejemplo `lib/dashboard/market-breadth.ts`. No se restauran, borran ni fusionan como parte de este prototipo. El mandato de trabajar desde HEAD sigue siendo suficiente para continuar la especificación local.

Se registraron hashes de los 515 archivos presentes al iniciar el trabajo (versionados y no ignorados), incluidos los cambios ajenos de tendencias, presupuesto, PFL y TOM decay. El manifiesto inicial completo se conserva temporalmente en `/tmp/regime-v2-initial-manifest.json`; el resumen verificable de preservación y los hashes de fuentes relevantes se entregan en esta carpeta. No se inspeccionan secretos ni se captura `.env`.

## Lo que realmente existe en este checkout

Los localizadores y hashes exactos están en `source-ledger.json`. Los símbolos siguientes son preferibles a números de línea susceptibles de moverse.

| ID | Código / evidencia | Hallazgo y consecuencia para V2 |
|---|---|---|
| S01 | `lib/dashboard/get-dashboard-data.ts`, `getDashboardData` | Ya solicita sectores, VIX, curva VX, BTC y GLD. Reutilizar estos accesos; no crear otro orquestador de fetch por métrica. El régimen V1 recibe solo sectores, VIX y BTC. |
| S02 | `lib/dashboard/regime-scoring.ts`, `CURRENT_WEIGHTS`, `labelFromScore` | 45/40/15. Techos de componentes 83, 78 y 74: `83*.45 + 78*.4 + 74*.15 = 79.65`, redondeado 80. La categoría `>80` no es alcanzable. No corregir V1 retroactivamente. |
| S03 | `lib/dashboard/adapters/sector-etfs.ts`, `buildSectorSnapshot`, `buildMetrics` | Once ETFs, retornos de 5/21/63 sesiones. Liderazgo = medias por grupo a 21 sesiones; dispersión = máximo menos mínimo, no desviación estándar. La separación actual de liderazgo es 1 punto porcentual. |
| S04 | Mismo adapter, `fetchSectorHistory`, `parseAlphaVantagePrices` | `TIME_SERIES_DAILY`, `outputsize=compact`, mínimo 64 filas. Declara `close` aunque el parser da preferencia a `5. adjusted close` si aparece. Los `dailyReturns` y `detailSeries` pierden fechas. `lastUpdated` agregado toma el máximo, no garantiza que todos los sectores estén sincronizados. |
| S05 | Mismo adapter, `fallbackSectorResult` | Produce sectores sintéticos con `dataStatus=demo`. Los valores no nulos no son evidencia de mercado. Su quantRisk incluye score 0/«Baja» con métricas ausentes; V2 debe rechazarlo antes de calcular. |
| S06 | `lib/dashboard/math.ts`, `averageCorrelation`; `risk-models.ts` | Correlaciones, EWMA, GARCH, dispersión y fragilidad comparten retornos. La correlación usa arrays por posición, permite menos observaciones que la ventana y omite pares degenerados. V2 necesita intersección de fechas y cobertura de pares, no copiar estos agregados sin validación. |
| S07 | `risk-models.ts`, `buildQuantRiskData`; `math.ts` | EWMA λ=.94, mínimo 21 retornos. GARCH usa α=.06 y β=.9 fijos, mínimo 63; no hay estimación de parámetros pese a `modelStatus=estimated`. Su fallback puede devolver exactamente EWMA. Nunca dos confirmaciones independientes. `null` puede etiquetarse `stress`; `fragilityScore` suma componentes redundantes. Excluir etiquetas y score del core V2. |
| S08 | `lib/market/breadth-proxies.ts` | RSP/SPY, IWM/SPY, sectores positivos y MA larga están declarados como plan, sin cálculo vivo en este fichero. No confundir inventario con integración. |
| S09 | `lib/statistical-levels/generated/manifest.json` y `assets/*.json` | Snapshot generado 15/08, cierres 14/08, 500 puntos diarios compactos por activo inspeccionado. Hay RSP, IWM, SPY y once sectores con MA200; no son observaciones frescas al 08/09. Sus `status=ok` no prueban freshness. |
| S10 | `scripts/build-statistical-levels.mjs`, `parseCsv`, `normalizeRow`, `compactSeries` | Mezcla de proveedores Stooq/Yahoo según captura; `adjustedClose` puede ser un alias de `close` cuando no existe ajustado. El nombre del campo no acredita ajuste ni vintage. Series compactas redondeadas y resúmenes de ventanas no sustituyen precios crudos para validación. |
| S11 | `lib/dashboard/adapters/vix.ts`, `getVixData`, `percentileFor` | FRED VIXCLS. Percentil expansivo desde el inicio recuperado, incluye la observación actual, mínimo 252. Devuelve solo 60 puntos pese a calcular sobre más historia. Cambios públicos 1/5/21 son puntos VIX; momentum interno es porcentaje. El fallback incluye VIX 17.8 y fechas `demo-*`. |
| S12 | Mismo adapter, `fetchFredWithApiKey` | No solicita vintage con `realtime_start`/`realtime_end`. Filtrar por fecha de observación después de descargar no demuestra qué revisión estaba disponible en el pasado. |
| S13 | `lib/dashboard/adapters/vix-term-structure.ts` | Settlements oficiales de contratos mensuales VX, hasta nueve; excluye expirados y semanales. Guarda símbolos y vencimientos. No persiste serie de curvas ni `available_at`; fecha de settlement se convierte en texto. Caché 6 horas, búsqueda de 12 días desde reloj actual. No es un loader histórico. |
| S14 | Mismo adapter, `classifySlope` | Pendiente en porcentaje `(VX2/VX1 - 1)*100`. Bandas actuales ±2 y ±5 son heurísticas del módulo. Curvatura y ajuste por distancia real entre vencimientos no existen como feature activa. No usar spot como si fuera VX1. |
| S15 | `lib/dashboard/adapters/btc-etf-flows.ts`, `parsePublicFlowRows` | Bitbo y después Farside. Se convierten celdas faltantes de fondos a 0; el total ausente puede reconstruirse de una suma parcial. `calculatedTotal` no distingue todos los casos de sustitución. `flatOrMissing` ya colapsó información. La capa V2 necesita nulos originales y cobertura por fondo; el agregado legado no permite recuperarlos. |
| S16 | Mismo adapter, `buildBtcDataFromRows` | Rollings 5/10/20, racha y breadth derivan de las mismas filas. Solo conserva 30 días de totales. Cumulativo = suma de filas descargadas, no necesariamente desde inicio. Frescura actual: cuatro días calendario. El fallback sintético es `fallback`, no `demo`. Ambos deben excluirse en V2. |
| S17 | `lib/dashboard/adapters/gld-flow-pressure.ts` | Cambios de participaciones a 1/5/20 sesiones; USD implícitos = cambio de participaciones × NAV actual, no flujo oficial. Requiere 21 filas, verifica NAV×shares/AUM y devuelve solo 20. No se puede reproducir la variación de 20 sesiones a partir del objeto devuelto. Frescura actual: cinco días calendario. |
| S18 | `lib/portfolio-fragility/engine.ts` | HHI depende de pesos de una cartera; clustering, covarianza y stress dependen de holdings, retornos y escenarios. No hay prueba de equivalencia a fragilidad del mercado. El demo es sintético. PFL queda `PARK`, sin importar sus scores, escenarios ni pesos del usuario al régimen global. |
| S19 | `lib/reports/snapshots/primer-informe-septiembre-2026/` | `integrity.json`: corte 04/09, captura 06/09. V1 congelado = Risk-on selectivo, 74, 88. Sectores: 99 retornos sin fechas por ETF; VIX: 60 puntos hasta 03/09; curva: nueve contratos del 04/09; GLD: 20 puntos. Excelente fixture de preservación, insuficiente para acreditar vintages en cada sesión pasada. |
| S20 | `prices-evidence.json.gz` del mismo informe | Precios diarios Yahoo persistidos, URL y hash por serie. SPY desde 1993, RSP 2003, IWM 2000, XLC desde 19/06/2018; todos hasta 04/09/2026. Historia ajustada capturada en septiembre: reconstrucción retrospectiva posible, replay estricto anterior no demostrado. Universo fijo de once sectores no puede retroextenderse a 2008. |
| S21 | `historical-automatic-readings.ts`, exportadores y tests del informe | Los nombres V1 reales son `regime.label/score/confidence` en históricos y `current/regimeScore/confidence` en vivo. Los aliases `regime_v1/score_v1/confidence_v1` se añadirán en un envelope nuevo, sin renombrar ni reescribir históricos. |

## Comprobación externa de contratos de fuente

Consultados el 08/09/2026; estas referencias verifican formatos y semántica, **no calibran V2**.

- FRED distingue lo observado de lo conocido en una fecha; el periodo real-time por defecto es hoy. `realtime_start` y `realtime_end` permiten consultas de vintages diarios. La disponibilidad intradía y la cobertura concreta de VIXCLS todavía deben verificarse. [FRED: Real-Time Periods](https://fred.stlouisfed.org/docs/api/fred/realtime_period.html).
- `TIME_SERIES_DAILY` devuelve precios diarios sin ajustar; `compact` contiene los últimos 100 puntos. Una MA200 no cabe en esa respuesta. No se presupone un cambio de plan o proveedor. [Alpha Vantage: Daily](https://www.alphavantage.co/documentation/#daily).
- Cboe publica históricos de VIX. La existencia de un archivo histórico no demuestra un archivo de revisiones ni la hora de disponibilidad de cada settlement usado por este checkout. [Cboe: VIX Historical Data](https://www.cboe.com/tradable-products/vix/vix-historical-data).

## Consecuencia metodológica

La alternativa implementable consiste en conservar los inputs crudos y sus fechas **antes** de transformarlos para presentación. Esto es una extensión de la capa de datos prevista por B1, no una autorización para rehacer V1. La elección de precios ajustados, ventanas alternativas o política temporal debe aparecer en el manifiesto validado. Un replay con datos capturados hoy y recortados al pasado se etiqueta `RETROSPECTIVE_RECONSTRUCTION`; no obtiene `POINT_IN_TIME=PASS`.
