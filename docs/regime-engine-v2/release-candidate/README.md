# Regime Engine V2 — Release Candidate

La reparación de portabilidad autorizada tras RC0 está documentada en [RC Portability Repair](../rc-portability-repair/README.md). RC0 permanece inmutable; el delta de verificación aún no constituye un nuevo commit ni autoriza shadow. Las instrucciones ejecutables vigentes están en [la guía de verificación](verification-guide.md).

Esta entrega congela el candidato aceptado por Control Tower: **Evidence State Engine, parámetros C03, motor y diseño aceptados**. El commit identificado por la verificación posterior es la identidad canónica del Release Candidate. Los manifests anteriores conservan su función de evidencia histórica; sus estados «no commit» y sus rutas de ejecución describen aquellas etapas.

La autoridad pública continúa siendo **V1** en `/dashboard` y `/en/dashboard`. `V2_SHADOW=OFF` permanece como default y no se activa shadow. Las previews V2 son exclusivas de desarrollo y están protegidas antes de importar fixtures. Un build de producción debe responder 404 a ambas rutas internas incluso con `preview=v2`.

## Cadena aceptada

| Etapa | Resultado | Entrega y alcance |
| --- | --- | --- |
| Prototyper P8 | PASS | [P8](../p8/README.md): contratos de series, disponibilidad, replay y frescura; parámetros vinculados y golden desde datos crudos. |
| Builder | PASS | [Builder](../builder/README.md): implementación del motor, conformance y preservación de V1. |
| Sweeper | PASS | [Sweeper](../sweeper/README.md): reparaciones aceptadas y ataques adversariales; oráculos conservados. |
| Groweer | PASS | [Groweer](../groweer/README.md): diagnóstico histórico y challengers separados del motor canónico. |
| Maintainer | PASS | [Maintainer](../maintainer/README.md): integración paralela, aislamiento de fallos, captura prospectiva, snapshots versionados y rollback OFF. |
| Designer | PASS | [Designer](../designer/README.md): seis estados, concordancia secundaria, evidencia y metodología progresivas, ES/EN y móvil. |

Los criterios completos y la selección de archivos están en `release-manifest.json` e `intentional-diff-inventory.json`. La auditoría de fuentes y dependencias está en `source-audit.json`; la selección de evidencia histórica, duplicados y archivos locales está en `evidence-audit.json`. Se preservan los bytes de los seis paquetes históricos incluidos, sin reescribirlos para ocultar limitaciones.

## Límites y bloqueadores vigentes

```text
LIVE_COMPLETE_V2_CAPTURE=NO
OFFICIAL_CALENDAR_CONFIGURED=NO
SHADOW_ACTIVE=NO
HISTORICAL_REPLAY_CLASS=R2
POINT_IN_TIME_OOS_CLAIM=NO
H1_CHALLENGER_ONLY=YES
PERSISTENCE_DIAGNOSTIC_ONLY=YES
NO_CROSS_ASSET_CORE=YES
NO_PFL_CORE=YES
PUBLIC_CUTOVER_READY=NO
```

Las cinco capturas reales de Maintainer terminan INCOMPLETE/UNKNOWN. La evidencia completa de la preview es sintética y se identifica como DESIGN_TEST; no representa «V2 hoy». Los testigos completos R0 sintéticos acreditan reproducibilidad del mecanismo, sin demostrar una captura real completa. BTC y GLD permanecen contextuales con cero votos. Los estudios históricos y las exploraciones de H1, persistencia, cross-asset y PFL no se incorporan como nuevas reglas.

V2 no muestra score, confianza porcentual ni probabilidades sin calibrar. Su dimensión secundaria prominente es concordancia. La taxonomía conserva RISK_ON_BROAD, RISK_ON_SELECTIVE, TRANSITION, DEFENSIVE y STRESS; INCOMPLETE sigue siendo un estado técnico sin régimen aproximado. Designer no se rediseña durante este freeze.

## Verificación y reproducibilidad

La verificación vuelve a ejecutar golden 464/464, histórico R2 1930/1930 y ataques 110/110, además de V1/V2, informes, editorial, TypeScript, lint y build. Se distingue la prueba del worktree aceptado de la prueba del candidato aislado: el worktree contiene también trabajo legítimo de Trends, presupuesto y PFL que queda fuera de este commit. Las pruebas ajenas no se importan al Release Candidate para reproducir un conteo histórico.

`precommit-verification.json` registra el conjunto exacto probado antes del commit y `design-regression.json` contrasta los hashes de implementación, fixtures y evidencia visual con Designer. `run-verification.py` acepta `--root` y `--output-dir` para ejecutar las comprobaciones en una copia aislada sin reescribir evidencia histórica. El perfil candidate utiliza las pruebas presentes en el árbol candidato. El antiguo perfil worktree y los entrypoints del workspace histórico están retirados con error explícito; sus resultados anteriores conservan su valor documental en RC0. `verify-production-http.py` repite las ocho rutas de preview 404 y los dos Dashboard V1 200 contra un servidor loopback explícito.

Las versiones declarada, bloqueada e instalada de Next permanecen 16.3.1. No se actualizan dependencias y no se añade una dependencia runtime. El candidato utiliza los archivos package de HEAD: los cambios locales de esos archivos pertenecen a Trends/presupuesto y se conservan fuera del commit.

La evidencia visual y de accesibilidad conserva su alcance: Chromium local, desktop/móvil y ES/EN. La lectura aproximada de 20–30 segundos es una revisión heurística de diseño, no un estudio humano cronometrado ni una certificación integral de accesibilidad. La equivalencia por hashes y las pruebas de render permiten reutilizar capturas aceptadas sin regenerar imágenes idénticas.

## Rendimiento

El benchmark Maintainer fue local y controlado, con respuestas HTTP 404 simuladas y un baseline extremadamente pequeño. Sus medianas fueron 0,379 ms para V1 y 51,867 ms con shadow, una diferencia de 51,488 ms. No mide la latencia real completa de proveedores y no existe SLA establecido. Un porcentaje relativo grande sobre ese baseline no constituye un juicio de rendimiento productivo.

Designer midió alrededor de 0,5 ms adicionales de SSR local para el caso selectivo: ES 0,057 → 0,610 ms; EN 0,155 → 0,657 ms. La reparación de formateadores reduce la memoria observada en su harness, con igualdad exacta del HTML. Estas mediciones tampoco son latencia de navegador ni SLA. Las condiciones y limitaciones completas permanecen en [Maintainer](../maintainer/README.md) y [Designer](../designer/performance.md).

## Inventario y política de evidencia

El inventario completo del diff distingue código, tests, configuración, documentación, evidencia, capturas QA, temporales, caches, capturas runtime, contenido sensible y archivos ajenos. El staging usa una lista explícita. Los logs temporales, duplicados de ejecución, caches, build output, node_modules, secretos y cambios ajenos quedan fuera del commit, sin borrarlos del worktree.

Se conservan los contratos y fixtures congelados autorizados de P8, sus fuentes públicas históricas para reconstrucción R2, los oráculos canónicos y las pruebas de reparaciones. Esos fixtures no son un archivo de observaciones operativas live. Las capturas operativas privadas deben continuar fuera del repositorio y de raíces públicas, según el contrato Maintainer.

Las rutas locales de los informes históricos son procedencia intencional de revisión o ejemplos de operación. No son configuración productiva ni credenciales. Algunos manifests históricos referencian logs, duplicados o archivos locales que no se seleccionan para Git; la auditoría de evidencia identifica esas exclusiones y sus contrapartes canónicas. No se afirma que ejecutar los selladores de etapas anteriores sobre un checkout selectivo reproduzca todo el worktree histórico.

Las entradas brutas del inventario y los logs de esta ejecución permanecen locales. `local/` se reserva para las comprobaciones post-commit y su identidad exacta, que no pueden estar contenidas en el mismo commit que identifican. El manifiesto versionado conserva el procedimiento, los hashes críticos y la evidencia previa; la entrega a Control Tower incluye RELEASE_COMMIT, RELEASE_TREE y PARENT_COMMIT después de verificar ese commit exacto. No se crea un segundo commit para incorporar la atestación posterior.

## Rollback y siguiente gate

V1 queda implementado y conserva su fuente, score y confidence históricos. El rollback operativo mantiene `V2_SHADOW=OFF`; el rollback visual usa `DashboardRegimeV1`. No exige cambiar C03, borrar archivos de evidencia o instalar otra dependencia. La preview V2 puede revisarse localmente según el [plan Designer](../designer/cutover-plan.md), sin cambiar la autoridad pública.

La autorización de este freeze permite exactamente un commit y su verificación posterior. **No permite push, deployment, cutover ni activación de shadow.** El siguiente gate de Control Tower deberá resolver calendario oficial, completitud real de fuentes, captura prospectiva real, clasificación de replay y observación V1/V2 en shadow. La activación no se considera lista mientras esos bloqueadores sigan abiertos.
