# REGIME ENGINE V2 — Builder · candidato para Control Tower

Builder implementa `EVIDENCE_STATE_ENGINE` en TypeScript, con **C03 fijo**, y queda preparado para shadow. No se ha ejecutado Sweeper, Groweer, Maintainer, Designer ni cutover. La autoridad pública continúa siendo V1 y ninguna ruta o componente público importa V2.

Esta entrega corresponde a Builder. P8 conserva todos sus bytes y sigue siendo la autoridad metodológica; sus referencias a «Builder no ejecutado» describen la etapa anterior. Los resultados vigentes de esta implementación están en [delivery.json](delivery.json) y [verification.json](verification.json).

## Implementación

| Archivo nuevo | Función y motivo |
|---|---|
| `lib/regime-engine-v2/types.ts` | Envelope tipado: observaciones, fuentes, calendarios, clases de replay y estados separados. |
| `lib/regime-engine-v2/contract.ts` | Proyección estática de C03, tabla y registry P8; hashes comprobados contra originales. No carga documentos ni Python en producción. |
| `lib/regime-engine-v2/math.ts` | Retornos/correlaciones y tolerancia técnica, serialización canónica, hashes y salidas inmutables. |
| `lib/regime-engine-v2/temporal.ts` | Fechas, disponibilidad, ventanas, duplicados y calendario versionado. Sin fallback por días laborables. |
| `lib/regime-engine-v2/normalize.ts` | Adaptación de Yahoo adjclose, Cboe VIX CLOSE, CFE Settle/catálogo mensual y unidades BTC/GLD. |
| `lib/regime-engine-v2/core.ts` | Transformaciones y adjudicación con la precedencia congelada, dos unidades de concordancia e incertidumbre por regímenes plausibles. |
| `lib/regime-engine-v2/features.ts` | Las 59 entradas de evidencia con roles, padres, valores/unidades y razones de ausencia. Los siete research y cinco presentation quedan aparcados/excluidos. |
| `lib/regime-engine-v2/engine.ts` | Entrada pública `evaluateRegime`, exclusivamente C03. Frescura, calidad, fuentes y diagnóstico; sin fetch ni reloj del proceso. |
| `lib/regime-engine-v2/capture.ts` | Captura prospectiva compartible, deduplicación por consulta y almacenamiento inmutable con hashes. |
| `lib/regime-engine-v2/shadow.ts` | Cálculo independiente de V1, fallo/desactivación de V2 y eventos de transición/duración, sin modificar la decisión. |
| `lib/regime-engine-v2/engine.test.ts` | Pruebas Builder del motor, parsers, tiempo, missing, calendario, satélites, captura y shadow. |
| `scripts/regime-v2-conformance.mts` | Conformance offline contra P8 y sus 1.930 sesiones; escribe evidencia solo en Builder. |
| `scripts/regime-v2-shadow.mts` | CLI interna que recibe un envelope, conserva un V1 opcional y exporta V2 junto con observabilidad. No instala scheduler. |

El [manifiesto de archivos](files-changed.json) enumera además cada evidencia de Builder, su hash y propósito. Todos son añadidos: no se adapta ni modifica una función V1.

## API e integración paralela

`evaluateRegime(input: EngineInput)` devuelve `engineVersion`, `versions`, `asOf`, `observationDate`, `regime`, `systemState`, `pillarStates`, `evidence`, `concordance`, `uncertainty`, `plausibleRegimes`, `dataQuality`, `sourceStatus`, `replayClass` y `diagnostics`.

`systemState=INCOMPLETE` implica `regime=null`. No se introduce un sexto régimen económico. La calidad usa COMPLETE/PARTIAL/INSUFFICIENT y describe inputs. Concordancia e incertidumbre son cualitativas y separadas. No existe score, porcentaje de confianza ni probabilidad V2. Los IDs legacy del registry permanecen como evidencia EXCLUDED con valor nulo; sus composites nunca se evalúan.

El consumidor prepara inputs con los normalizadores y calendarios explícitos. Puede llamar `runShadow(loadV1, loadV2)` o pasar `null` para desactivar V2. El objeto V1 se devuelve intacto incluso si V2 falla de forma síncrona o asíncrona. Esta API y la CLI son independientes del pipeline público; **no se ha añadido una segunda descarga al Dashboard ni un cálculo V2 a sus rutas**. La coordinación de fetches se hace por el integrador mediante el callback existente y una única `captureScope` por lote.

`observeTransition` registra cambios de régimen, pilares y calidad, razones, unidades de dependencia y duración en sesiones adyacentes. Interrupciones, cambios de versión o comienzo desconocido conservan censura. Con solo dos snapshots iguales se informa el mínimo observable y la censura; no se inventa una duración anterior. Ninguno de esos campos alimenta el régimen ni introduce hysteresis.

## Precio, tiempo y calendario

Yahoo utiliza exclusivamente `indicators.adjclose[0].adjclose`; `quote.close` no se lee como sustituto. Moneda/bases incompatibles y precios null/undefined/NaN/Infinity/negativos/booleanos dan indisponibilidad. El snapshot completo de captura conserva los bytes y eventos corporativos originales; la normalización identifica su hash.

VIX utiliza `DATE,CLOSE` de Cboe. VX utiliza `Trade Date,Settle`, junto con el catálogo mensual y la identidad/expiración del contrato. Los slots se seleccionan antes de leer el settlement; VX1 ausente no se convierte en VX2. No se empalman historiales FRED/Cboe ni se usan Close, SOQ o continuos ajustados como sustitutos.

BTC conserva USD millones, celdas no publicadas y cero. Un total puede derivarse solo con todas las columnas esperadas observadas. GLD conserva shares, NAV y AUM: la presión es `delta_shares × NAV[t]`. Veinte filas no habilitan las dos features de veinte sesiones; 21 filas reales sí pueden hacerlo. No se admiten escalares de presentación como ventana. Una incidencia de unidad conocida hace indisponible la diferencia afectada.

La API conserva observationDate, sourcePublishedAt, availableAt, capturedAt, certainty y replay class. Una fecha económica nunca demuestra disponibilidad. El corte se compara explícitamente, incluyendo precisión submilisegundo, y los futuros registros no alteran una lectura previa. Los normalizadores con fecha diaria sin cierre exacto conservan el límite de fin de día UTC previsto en P8; pueden producir indisponibilidad temporal hasta ese límite, sin inventar una hora de publicación.

Un calendario R0/R1 necesita identidad, versión, zona, cobertura completa declarada, fuente, hash y evidencia temporal admisible. Los cierres y festivos se reciben como sesiones explícitas; no se generan con una regla lunes–viernes. Si no puede resolverse la sesión cerrada esperada, la familia queda `UNKNOWN_CALENDAR`. La política es cero sesiones de arrastre y nunca retrocede a la última fecha común disponible para ocultar stale. Las fuentes mantienen calendarios distintos y deben ser compatibles con la sesión core.

**Este candidato no incluye un calendario oficial descargado/sincronizado automáticamente.** Su entrada versionada es una dependencia explícita de la integración; si falta, el comportamiento productivo es indisponible, tal como exige P8. El calendario SPY de conformance lleva `R2_OBSERVED_PROXY` y el motor rechaza usarlo como calendario oficial en R0/R1.

`captureScope().capture(...)` envuelve el fetch existente, registra inicio/final real, source identity/version, hash, bytes y disponibilidad conservadora desde la captura. `persistCapture` usa escritura exclusiva y `readCapture` verifica integridad. Capturas nuevas pueden sostener R0 desde su límite conocido; una importación declarada R2 permanece R2. No se reetiqueta el histórico y no se altera una captura anterior por un refresh.

## Conformance y pruebas

El kernel TypeScript reproduce **464/464 vectores congelados**. Incluyen los seis candidatos que P8 dejó en sus fixtures; usar sus valores explícitos en el harness no es una nueva selección. Los 84 vectores aplicables a C03 se comprueban también con el valor fijo por defecto. La API productiva `evaluateRegime` no acepta override de parámetros.

La ruta completa de normalización TypeScript desde las capturas Yahoo/Cboe/CFE y el motor público C03 reproduce **1.930/1.930 sesiones**: features core aplicables, razones de missing, estados de pilares, régimen y dimensiones. La comparación numérica admite solo la tolerancia técnica absoluta de 1e−10; estados, nulls y razones se comparan exactamente. Los outputs históricos de clasificación se expanden con el código P8 congelado para testing, sin ejecutar selección, recalibración ni reescribir el oracle. Python no forma parte del runtime.

Se verifican los cinco witnesses históricos: DEFENSIVE 02/01/2019, TRANSITION 04/01/2019, RISK_ON_BROAD 30/01/2019, RISK_ON_SELECTIVE 25/02/2019 y STRESS 25/02/2020. El alcance es **R2 ONLY, no OOS point-in-time**. Ninguna prueba pretende resolver cobertura R0 anterior, utilidad predictiva o persistencia económica.

El ejemplo [shadow-example.json](shadow-example.json) conserva el V1 original y produce V2 para el 04/09/2026: RISK_ON_SELECTIVE, calidad PARTIAL y replay R2. La calidad parcial refleja las ventanas opcionales no aportadas por ese envelope de conformance. No se convierte este ejemplo en autoridad pública.

[verification.json](verification.json) contiene los comandos y resultados reales: suite completa Node, tests Python existentes, typecheck, lint, build y validaciones de informes/editorial. El primer build quedó bloqueado por el sandbox al abrir un puerto local de Turbopack; se repitió con permiso y pasó. Se conservan por separado los 18 avisos de lint preexistentes; no se corrigen asuntos ajenos a Builder ni se presentan como avisos nuevos.

## Reproducción

Desde la raíz del checkout:

```sh
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test lib/regime-engine-v2/engine.test.ts
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types scripts/regime-v2-conformance.mts
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types scripts/regime-v2-shadow.mts --input docs/regime-engine-v2/builder/shadow-input-r2.json --v1 lib/reports/snapshots/primer-informe-septiembre-2026/automatic.json
npx tsc --noEmit --incremental false
npm run lint
npm run build
npm run validate:editorial
npm run reports:validate
npm run reports:check
python3 scripts/test-capital-xml.py
```

El comando completo de todos los tests Node se conserva en `verification.json`. Conformance requiere Python/NumPy únicamente como oracle offline. La CLI de shadow acepta `--output` con creación exclusiva y `--previous` para encadenar eventos; no sobrescribe originales.

## Preservación y siguiente autorización

[baseline.json](baseline.json) registra branch, HEAD, tree, estado del worktree y hashes **antes** de implementar. [preservation.json](preservation.json) acredita que los 819 archivos previos, incluido P8 y todos los cambios legítimos preexistentes, siguen intactos. El commit histórico de auditoría no se ha usado para reset, checkout ni rollback. HEAD y tree del commit permanecen iguales porque el candidato se entrega como archivos nuevos sin commit; el manifiesto documenta los bytes reales de trabajo.

La lista de imports de aplicación no incorpora V2. No hay modificaciones de UI, rutas, informes, snapshots V1, exports, configuración pública ni dependencias. No se han realizado deploy, cutover ni llamadas a etapas posteriores.

El candidato queda para revisión independiente de Control Tower. `SWEEPER_READY=YES` expresa que Builder ha cumplido su gate; **Sweeper no se ejecuta en esta sesión**. La falta de evidencia PIT histórica, el turnover R2 de P8 y las duraciones cortas permanecen asuntos de las etapas autorizadas posteriormente, sin intentar corregir C03 aquí.
