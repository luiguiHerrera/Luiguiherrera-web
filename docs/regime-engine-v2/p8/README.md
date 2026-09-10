# REGIME ENGINE V2 — P8 · entrega para Control Tower

**BUILDER_READY=YES. El contrato puede implementarse fielmente. Builder no se ha ejecutado y producción continúa bloqueada.**

La arquitectura `EVIDENCE_STATE_ENGINE`, los cinco regímenes y el estado técnico `INCOMPLETE` permanecen intactos. P8 vincula las nueve familias de parámetros, define precio y disponibilidad por fuente/feature y añade evidencia desde series crudas. No modifica V1, UI, informes ni despliegue.

Esta es la entrega vigente. Los archivos P1–P7 del directorio superior conservan su valor como evidencia del contrato simbólico y del gate anterior. Sus parámetros `UNBOUND` y resultados `NOT_VALIDATED` describen aquella etapa; para implementar se usa exclusivamente el manifiesto P8, sin defaults implícitos.

## Contratos vinculantes

| Entregable | Archivo |
|---|---|
| Precio/serie: once campos requeridos para cada una de las 59 features | [price-series-contract.json](price-series-contract.json) |
| Disponibilidad: fuentes, features, cinco fechas/instantes, certeza y replay | [temporal-availability-contract.json](temporal-availability-contract.json) |
| Sesiones, calendarios, publicación desconocida y stale | [freshness-policy.json](freshness-policy.json) |
| Nueve grupos resueltos y trece umbrales numéricos | [parameter-manifest.json](parameter-manifest.json) |
| Registry integrado, sin activar runtime | [feature-registry-qualified.json](feature-registry-qualified.json) |
| Roles, linaje y justificación de cada decisión core | [feature-minimization.json](feature-minimization.json) |
| Resultado del gate y comprobación del paquete | [gate-result.json](gate-result.json), [package-check-results.json](package-check-results.json) |

Las fórmulas, grupos y prioridades siguen en [specification.md](../specification.md), [dependency-map.json](../dependency-map.json) y [decision-table.json](../decision-table.json). Su tabla conserva el SHA-256 `0dae14cb724e1772231ab0158e3112ca4ebb1d5350ba45044b592b8d051bbe51`.

## Convenciones verificadas en el pipeline

Los ETF usan exclusivamente el array nativo Yahoo `indicators.adjclose[0].adjclose`, en USD, con la misma convención y un manifiesto explícito de vintages para el panel. Ese proveedor ya existe en la captura de precios del repositorio. El parser de estadísticas puede suplir `adjustedClose` con `close`; P8 **no acepta ese fallback**. Las 14 capturas Yahoo conservan ambos arrays y eventos corporativos. La diferencia máxima observada entre retornos de 21 sesiones sobre las dos bases alcanza 4,16 puntos porcentuales en XLE; no es una distinción cosmética. Las diferencias y ventanas exactas están en [historical-audit.json](historical-audit.json). Yahoo describe el ajuste por splits y distribuciones en su [documentación de adjusted close](https://help.yahoo.com/kb/SLN28256.html). Se trata de un proxy de retorno ajustado del proveedor, sin prometer el retorno exacto de un inversor.

VIX conserva el `CLOSE` oficial en puntos del índice de [Cboe VIX History](https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv). Esta historia oficial ya está presente en la evidencia de weekly review; el camino FRED del Dashboard se documenta como precedente, sin empalmar proveedores. La referencia `VIXCLS` del inventario identifica la semántica económica, mientras el contrato P8 identifica el campo efectivo.

VX usa `Settle`, con fecha e identidad mensual oficial. El archivo contiene un `Close` distinto, a menudo cero. El [archivo oficial CFE](https://www.cboe.com/markets/us/futures/market-statistics/historical-data/futures) permitió conservar 108 contratos mensuales. El catálogo determina los slots antes de inspeccionar sus valores: un VX1 ausente permanece ausente. No se aplica ajuste equity, back-adjustment continuo ni se sustituye por SOQ final.

BTC conserva USD millones y distingue cero de celda no publicada. Su evidencia disponible es la tabla Farside ya extraída en el informe, no HTML original. GLD conserva shares, NAV por share y AUM: `delta_shares × NAV[t]` es presión monetaria estimada, no flujo oficial. La fuente del adaptador es el [histórico State Street](https://www.ssga.com/library-content/products/fund-data/etfs/us/navhist-us-en-gld.xlsx). Los 20 registros GLD conservados no permiten verificar una diferencia de veinte sesiones, que requiere 21; esas dos features quedan no utilizables. La auditoría de coherencia de 21 filas también queda parcial, sin completar datos a partir del escalar de presentación.

## Garantías temporales y cobertura

`observation_date`, `source_published_at`, `available_at`, `captured_at` y `as_of` son conceptos distintos. Los nuevos metadatos acreditan el final de la captura del 08/09/2026 como límite conservador de disponibilidad de **esos bytes**. No acreditan la hora histórica de publicación ni el vintage que se conocía años antes. La fecha original 06/09 de las evidencias locales carece de hora/zona; se conserva esa precisión sin inventar un instante.

| Clase histórica | Features | Garantía |
|---|---:|---|
| R0 | 0 | Ningún replay pasado acreditado con vintage y disponibilidad contemporáneos |
| R1 | 0 | Ninguna reconstrucción con garantía demostrada de ausencia de información futura |
| R2 | 45 | Reconstrucción retrospectiva, con cobertura y ventanas por feature |
| UNKNOWN | 14 | 7 aparcadas, 5 excluidas de V2 y 2 ventanas GLD insuficientes |

Los conteos se refieren al histórico hasta el 04/09. Después de una captura probada, ese vintage podría ser elegible R0 para un corte posterior, si cumple el resto del contrato; eso no reclasifica sus fechas pasadas. Todas las decisiones numéricas de este estudio son **R2: no constituyen OOS point-in-time estricto**. FRED permite consultar vintages mediante sus [real-time periods](https://fred.stlouisfed.org/docs/api/fred/realtime_period.html), pero no se ha presentado un vintage que convierta estas capturas en R0/R1.

La frescura vinculada es estructural: cero sesiones de arrastre. En cada corte se resuelve la última sesión cerrada esperada y se exige la fecha correspondiente en todos los inputs core. Cada fuente conserva su calendario; el cierre equity no se trata como hora de publicación de VIX o VX. Calendario desconocido, publicación no demostrada o dato tardío producen indisponibilidad. Fines de semana y festivos no consumen sesiones. El [calendario NYSE](https://www.nyse.com/trade/hours-calendars) sustenta los casos de festivos, DST y cierre reducido probados. No se ajusta un TTL ni se inventa un SLA para evitar missing.

La rejilla de sesiones del estudio R2 procede de fechas observadas de SPY. Está identificada como proxy: no prueba conocimiento histórico del calendario oficial ni detecta una fecha omitida simultáneamente por todos esos datos. Un Builder debe suministrar un calendario versionado que cubra el corte o emitir `UNKNOWN_CALENDAR`. Esta es una condición de entrada resuelta, no un permiso para usar lunes–viernes como fallback de producción.

## Selección y evaluación congeladas

La [parrilla de seis candidatos](selection-protocol.json), ventanas, criterios y desempate quedaron congelados a las `2026-09-08T14:07:07.068660+00:00`, antes de calcular estados históricos. Hash: `1baf279a4399277fd55342adbc920f3f14bec11d190e06c62650f9745f9c3a2c`. Se conservan los sellos de entrenamiento y validación en cada ventana. C03 ganó en las tres usando únicamente TRAIN y el desempate lexicográfico registrado; ningún resultado de validación/test cambió la selección.

| Fold | Entrenamiento | Validación | Test | Sesiones completas T/V/Test | Selección |
|---|---|---|---|---:|---|
| F1 | 2019–2021 | 2022 | 2023 | 757 / 251 / 250 | C03 |
| F2 | 2019–2022 | 2023 | 2024 | 1008 / 250 / 252 | C03 |
| F3 | 2019–2023 | 2024 | 2025–04/09/2026 | 1258 / 252 / 420 | C03 |

Cada fase seleccionada pasa los criterios numéricos predefinidos. No son tres muestras independientes: las ventanas se solapan según el avance cronológico declarado. No se optimizaron retornos futuros, Sharpe, PnL, aciertos ni dirección. La suficiencia significa superar mínimos operativos congelados, no una afirmación de potencia estadística.

| Parámetro C03 | Valor |
|---|---|
| Participación débil / amplia | 3 / 8 sectores de 11 |
| Gap de liderazgo | ±1 punto porcentual de retorno de 21 sesiones |
| VIX vigilancia / adverso / stress | 20 / 25 / 35 puntos |
| Salto VIX 1 / 5 sesiones | 10% / 20% relativos |
| Curva plana / inversión adversa | pendiente ≤2% / ≤−5% |
| Correlación floor / high / deterioro | 0,40 / 0,65 / 0,10 |

Los seis grupos numéricos son `EMPIRICALLY_QUALIFIED` con alcance R2; PRICE_BASIS y SOURCE_AVAILABILITY son `SOURCE_DEFINED`, FRESHNESS_POLICY es `STRUCTURAL`. Los precedentes V1 siguen siendo únicamente semillas de candidatos.

En F3 test se observan 71 sesiones RISK_ON_BROAD, 144 RISK_ON_SELECTIVE, 140 TRANSITION, 52 DEFENSIVE y 13 STRESS. Rotación: 33,17%; flip-flop: 14,80%; mediana de duración: 2 sesiones; peor desacuerdo ante una perturbación registrada: 9,76%. Frente al entrenamiento, la rotación aumenta desde 22,75%. STRESS tiene duración mediana de una sesión. Son límites prácticos relevantes aunque el gate numérico pase.

Los diagnósticos posteriores muestran volatilidad realizada mediana de 8,86% / 8,75% / 10,40% / 10,65% / 28,06% para esos cinco regímenes. La cercanía entre amplio y selectivo es coherente con una distinción de participación, sin evidencia de una separación fuerte de volatilidad. Son descriptores endógenos y posteriores, no una validación independiente ni un objetivo de selección. Las ocupaciones anuales, persistencia, sensibilidad por umbral y comparaciones de los seis candidatos están en los archivos `F*-*.json` y [qualification-results.json](qualification-results.json).

La selección numérica se selló antes de ejecutar los witnesses crudos. La vinculación final fue condicional a ese gate: los seis candidatos pasan todos los invariantes crudos, por lo que el conjunto admisible y el ganador no cambian. Esta secuencia queda declarada en el manifiesto; no se presenta un gate crudo como ejecutado antes de que lo estuviera.

## Evidencia desde entradas crudas

[raw-check-results.json](raw-check-results.json) registra **464/464 casos**, con fixtures persistidos en [raw-fixtures.json.gz](raw-fixtures.json.gz): 252 límites, 36 casos de régimen/lectura incompleta, 120 de missing, 30 de satélites, 13 de dependencias/orden, 6 de prioridad conjunta, 6 temporales y un caso cero frente a missing. Añade comprobaciones directas de NaN, Infinity, precio negativo/booleano y ausencia de adjclose. Los 21 controles adicionales de [contract-check-results.json](contract-check-results.json) cubren calendarios y unidades nativas.

Los witnesses parten de precios diarios positivos fechados para los once ETF, seis niveles VIX y settlements con catálogo mensual. Participación y correlaciones se calculan sobre el mismo panel. Las innovaciones ortogonales construyen correlaciones PSD con ventanas anidadas reales de 21/63 retornos. Para cada candidato se alcanzan todos los estados de los subpilares y los cinco regímenes. `INCOMPLETE` conserva régimen nulo, no un sexto régimen económico. La correspondencia visible sigue siendo RISK_ON_AMPLIO / RISK_ON_SELECTIVO / TRANSICION / DEFENSIVO / STRESS / LECTURA_INCOMPLETA, sin renombrar los IDs internos congelados.

Los límites continuos usan ε=1e−7 y una tolerancia de representación absoluta de 1e−10 para igualdad matemática; esa tolerancia no constituye una banda económica nueva. El conteo de retornos positivos usa estrictamente `>0`. Tras corregir ese detalle, exigir el catálogo VX y extraer el acceso nativo a adjclose, se verificó igualdad exacta de las 1.930 filas de features y sus razones de missing con el cache original. No se recalibró ni se sobrescribió la evaluación sellada.

[historical-witnesses.json](historical-witnesses.json) conserva raw, transformaciones y salidas R2: DEFENSIVE 02/01/2019; TRANSITION 04/01/2019; RISK_ON_BROAD 30/01/2019; RISK_ON_SELECTIVE 25/02/2019; STRESS 25/02/2020. Son los primeros ejemplos encontrados en entrenamiento. No hay lectura incompleta histórica en estas 1.930 sesiones; su alcanzabilidad está probada por fixtures, sin inventar un caso histórico.

Las 59 features se reparten de forma exclusiva en 9 CORE_DECISION, 24 DIAGNOSTIC, 14 SATELLITE, 5 PRESENTATION_ONLY y 7 RESEARCH_ONLY. En un eje separado hay 4 RAW y 55 DERIVED. Hay 16 features necesarias en el grafo core, incluyendo siete padres de transformaciones. Solo `equity_price_complex` e `implied_volatility_complex` contribuyen a concordancia; A y C comparten la primera unidad. No se afirma independencia estadística.

La omisión descriptiva de cada condición directa modifica entre 7 y 425 regímenes sobre las 1.258 sesiones de entrenamiento. Eliminar el deterioro de correlación y conservar solo nivel modifica 22 regímenes y 75 lecturas de pilar. Estos resultados y cada justificación incremental están en [historical-audit.json](historical-audit.json) y el manifiesto de minimización. Acreditan uso de la condición en la muestra, no información independiente ni utilidad predictiva. No sustituyen el benchmark y ablation de producción pendientes.

## Preservación y límites del gate

Las 25 pruebas existentes de informes y curva VX pasan. El checker conceptual P1–P7 mantiene 16/16 comprobaciones y 320 configuraciones. Sus etiquetas del gate anterior permanecen deliberadamente en su ámbito histórico. [preservation.json](preservation.json) compara los bytes previos a P8 y HEAD; el chequeo vigente comprueba que solo cambió documentación de este proyecto.

Los scripts Python son una especificación ejecutable y un harness offline de investigación alojados en `docs/`; no están conectados al motor, a rutas web ni a `package.json`. No se ha ejecutado Builder, integrado shadow, construido UI ni desplegado. Build/lint global/QA visual no se atribuyen a esta entrega documental.

**No quedan blockers de implementabilidad para Builder.** Producción sigue condicionada al motor real y su revisión, replay con garantías adecuadas, comparaciones/benchmarks, shadow V1/V2, pruebas de caché/no-lookahead, degradación, mantenimiento, accesibilidad y aprobación de cutover sobre un candidato concreto. Ningún PASS de P8 sustituye esas etapas.

## Reproducción offline

Desde la raíz del checkout, con Python 3 y NumPy disponibles:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 docs/regime-engine-v2/p8/check_package.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/regime-engine-v2/p8/raw_checks.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/regime-engine-v2/p8/contract_checks.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/regime-engine-v2/p8/historical_audit.py
node docs/regime-engine-v2/prototype-check.mjs
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import ./scripts/report-node-register.mjs --experimental-test-module-mocks --test lib/reports/first-september-2026.test.mts lib/reports/weekly-review.test.mts lib/dashboard/adapters/vix-term-structure.test.ts
```

El verificador no descarga ni cambia artefactos salvo su resumen cuando se pide `--write`. Los scripts de witnesses reproducen sus artefactos deterministas. `qualify.py` rechaza sobrescribir selecciones o tests ya sellados; una reproducción completa exige una copia separada de `p8/` sin sus outputs de fase, conservando evidencia, protocolo y código. Esa ejecución nueva se identifica como reproducción, nunca como un holdout nuevo. `collect-evidence.py` documenta la adquisición original y verifica el cache antes de cualquier petición. `build_contracts.py` materializa contratos y sus marcas de revisión; no debe ejecutarse para una mera verificación de hashes.
