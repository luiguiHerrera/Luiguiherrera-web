**REGIME ENGINE V2 — entrega Sweeper a Control Tower**

**Aviso de migración de verificación.** `run-verification.py` son entradas históricas de workspace retiradas: imprimen `RETIRED_WORKSPACE_VERIFIER` y terminan con código 2, sin verificar ni acceder a evidencia. Utilice la [guía de verificación portable del candidato](../release-candidate/verification-guide.md). Las instrucciones de verificación de etapa y sus resultados que siguen son registro histórico conservado en RC0 `f5fc7ecfd9e1f323d0ad3a43eccec1dbc500be1c`; no se recalculan.

Sweeper completado. Se registraron 14 findings: 11 defectos de implementación reparados y 3 observaciones informativas. No quedan defectos contractuales abiertos ni findings CRITICAL/HIGH sin reparar. `GROWEER_READY=YES` expresa disponibilidad para esa revisión; Groweer no se ha ejecutado.

La entrada se congeló antes de inspeccionar la implementación: 24/24 archivos declarados, 23/23 SHA-256 comparables y hash propio del manifest capturado por Sweeper. Builder excluía expresamente su hash autorreferencial. Los 819 archivos anteriores se comprobaron uno por uno y siguen intactos. El archivo `builder-input.tar.gz` conserva los 24 archivos originales completos.

La primera pasada, anterior a las reparaciones, registró 12 findings en `read-only-audit.json` y guardó las respuestas de los ataques. Dos hallazgos adicionales de límites de entrada se reprodujeron contra los bytes originales archivados antes de repararlos; constan en `read-only-boundary-addendum.json`. La comprobación complementaria de R0 bajo un corte R1 conserva también su fallo original. `frozen-builder-replay.json` vuelve a ejecutar el harness final sobre una copia del Builder original y mantiene visible la diferencia respecto de `adversarial-results.json`.

Los cambios afectan a nueve archivos Builder y añaden `lib/regime-engine-v2/boundary.ts`. La tabla de decisión, los valores C03 y los 289 archivos P8 conservan su contrato congelado. Las modificaciones reparan validación, procedencia, disponibilidad por ancestro, identidad de contratos, mutación compartida, instrumentación de duración y el recorrido cuadrático de streak BTC. No introducen una nueva señal ni recalibran parámetros.

**Independencia y alcance de la evidencia**

Los expected de 464 golden proceden de `p8/raw-check-results.json`, anterior a Builder. Actual usa el núcleo numérico TypeScript; expected no usa sus helpers. Los seis candidatos congelados se prueban únicamente en ese núcleo; la API pública sigue fijada a C03. Hay 84 casos que además ejercitan el valor C03 por defecto.

La comparación histórica tiene alcance `RAW_TO_OUTPUT`: TypeScript parte de los payloads conservados Yahoo adjclose, Cboe CLOSE y CFE Settle; expected parte de las features históricas P8 congeladas y del clasificador Python P8 sin modificar. Los 108 registros del catálogo seleccionado se contrastaron con los registros exactos del catálogo fuente. No se ejecutó selección ni recalibración. Se revalidaron las cinco fechas testigo pedidas.

`SELF_CONFIRMING_TESTS=FOUND` identifica una prueba unitaria de conexión que compara los pilares públicos con su propia dependencia `evaluateCore`. Se conserva como prueba de conexión y se excluye de la evidencia metodológica independiente. No afecta a la independencia de los 464 golden ni de las 1930 filas históricas.

Los 1930 resultados siguen siendo **R2; POINT_IN_TIME_OOS=NO**. La rejilla SPY sigue marcada como proxy observado, con su limitación de cobertura conjunta. Los calendarios de ataques son sintéticos; no prueban que se haya capturado un calendario oficial en esas fechas. R0/R1 se verifican como contratos prospectivos, sin inventar historia contemporánea. Capture conserva bytes, identidad, hash y tiempos; no fabrica publicación ni promueve importaciones R2. La entrada normalizada sigue siendo una frontera de datos/procedencia declarada por el llamador, no un mecanismo de autenticación del proveedor.

**Verificación final**

| Comprobación | Resultado |
| --- | --- |
| Golden P8 | 464/464 |
| Historia fuente → output, R2 | 1930/1930 |
| Tests Node | 302/302: 48 V2 + 254 existentes |
| Tests Python existentes | 7/7 |
| Ataques Sweeper | 110/110, con 576 cruces raw |
| Tabla conceptual | 320/320; todas las reglas y estados de pilares alcanzados |
| Typecheck y build | PASS |
| Lint | 0 errores; los mismos 18 warnings; 0 nuevos |
| Editorial, reports:validate y reports:check | PASS |
| Preservación | 819/819 originales; 289/289 P8 |

La cuenta `TESTS=419/419` suma Node, Python y los 110 ataques; no vuelve a sumar golden, historia ni cada combinación interior. Los tiempos locales de la comprobación de streak se guardan en `contract-audit.json`; la reparación elimina el recorrido cuadrático específico, sin presentar un benchmark ni hacer tuning general.

Next declarado 16.3.1 e instalado 16.2.7: diferencia preexistente, manifests y lock intactos. Disposición `DEFER_MAINTAINER`. El build se ejecutó localmente con la autorización necesaria para el puerto de Turbopack. Se restauró únicamente su efecto generado sobre `next-env.d.ts`, desde la copia de entrada verificada, y se repitió typecheck. Un error de estrechamiento de tipos durante la implementación de Sweeper fue corregido; se conservan los logs de aquel intento y los logs finales PASS.

La API shadow es capaz de calcular V2 junto a V1, y preserva el objeto V1 también cuando V2 falla. No está integrada en rutas, cachés, páginas, reports ni schedulers públicos. No hay import público nuevo, cutover, commit, push ni despliegue.

**Artefactos de revisión**

- [Findings con todos los campos requeridos](/Users/quantlab/Developer/web/Luiguiherrera-web/docs/regime-engine-v2/sweeper/findings.md).
- [Registro machine-readable de findings y reparaciones](/Users/quantlab/Developer/web/Luiguiherrera-web/docs/regime-engine-v2/sweeper/findings.json).
- [Manifest de entrada y hashes originales](/Users/quantlab/Developer/web/Luiguiherrera-web/docs/regime-engine-v2/sweeper/input-manifest.json).
- [Manifest de cambios finales](/Users/quantlab/Developer/web/Luiguiherrera-web/docs/regime-engine-v2/sweeper/files-changed.json).
- [Diff de implementación contra Builder archivado](/Users/quantlab/Developer/web/Luiguiherrera-web/docs/regime-engine-v2/sweeper/implementation.patch).
- [Comandos, resultados y límites de verificación](/Users/quantlab/Developer/web/Luiguiherrera-web/docs/regime-engine-v2/sweeper/verification.json).
- [Preservación independiente](/Users/quantlab/Developer/web/Luiguiherrera-web/docs/regime-engine-v2/sweeper/preservation.json).

Reproducción desde la raíz del repositorio:

```sh
python3 docs/regime-engine-v2/sweeper/run-verification.py
npm run build
npx tsc --noEmit --incremental false
```

El primer comando ejecuta comprobaciones offline y escribe solamente evidencia Sweeper. El build y typecheck son pasos separados; el build puede regenerar `next-env.d.ts`. La entrega actual conserva el original verificado, como acredita `build-side-effect.json`. No ejecutar los generadores P8 sobre el paquete congelado. `p8/check_package.py` contiene un gate de etapa anterior que exige ausencia de código de producción; tras Builder, se verifican sus invariantes de integridad pertinentes con `verify-contracts.mjs`, sin falsificar ese gate histórico.

**Estado requerido**

```text
STATE=REGIME_ENGINE_V2_SWEEP_COMPLETE
BUILDER_INPUT_FILES_EXPECTED=24
BUILDER_INPUT_FILES_OBSERVED=24
BUILDER_HASH_MATCH=PASS
UNDECLARED_INPUT_CHANGES=0
ARCHITECTURE=EVIDENCE_STATE_ENGINE
ARCHITECTURE_CHANGED=NO
PARAMETER_SET=C03
PARAMETERS_CHANGED=NO
ORACLE_INDEPENDENCE=PASS
SELF_CONFIRMING_TESTS=FOUND
P8_GOLDEN_CASES=464/464
HISTORICAL_R2_CONFORMANCE=1930/1930
HISTORICAL_CONFORMANCE_SCOPE=RAW_TO_OUTPUT
HIDDEN_SCORE=NONE
MISSING_NOT_NEUTRAL=PASS
ZERO_VS_MISSING=PASS
ADJCLOSE_CONTRACT=PASS
VIX_PROVIDER_PURITY=PASS
VX_CONTRACT=PASS
CALENDAR_CONTRACT=PASS
FRESHNESS_CONTRACT=PASS
TEMPORAL_CONTRACT=PASS
R2_NOT_UPGRADED=PASS
DEPENDENCY_CONTROL=PASS
DIAGNOSTIC_ISOLATION=PASS
SATELLITE_ISOLATION=PASS
RAW_INPUT_REACHABILITY=PASS
DECISION_PRECEDENCE=PASS
BOUNDARY_SEMANTICS=PASS
DETERMINISM=PASS
MUTATION_SAFETY=PASS
CONCORDANCE_SEMANTICS=PASS
UNCERTAINTY_SEMANTICS=PASS
DATA_QUALITY_SEMANTICS=PASS
V1_ISOLATION=PASS
PUBLIC_SURFACE_ISOLATION=PASS
PARALLEL_CAPABLE=PASS
PARALLEL_INTEGRATED=NO
NEXT_VERSION_MISMATCH=PREEXISTING
NEXT_VERSION_DISPOSITION=DEFER_MAINTAINER
FINDINGS_TOTAL=14
FINDINGS_CRITICAL=0
FINDINGS_HIGH=5
FINDINGS_MEDIUM=4
FINDINGS_LOW=2
FINDINGS_INFO=3
REPAIRS_PERFORMED=11
METHODOLOGY_CHANGED=NO
TESTS=419/419
TYPECHECK=PASS
BUILD=PASS
LINT_ERRORS=0
NEW_LINT_WARNINGS=0
PRODUCTION_CUTOVER=NO
PUBLIC_UI_CHANGED=NO
UNRESOLVED_SWEEPER_FINDINGS=[]
GROWEER_READY=YES
```
