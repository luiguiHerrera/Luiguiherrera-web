**REGIME ENGINE V2 — MAINTAINER. C03 permanece intacto y V1 conserva la autoridad pública.**

**Aviso de migración de verificación.** `run-verification.py`, `close-verification.py` son entradas históricas de workspace retiradas: imprimen `RETIRED_WORKSPACE_VERIFIER` y terminan con código 2, sin verificar ni acceder a evidencia. Utilice la [guía de verificación portable del candidato](../release-candidate/verification-guide.md). Las instrucciones de verificación de etapa y sus resultados que siguen son registro histórico conservado en RC0 `f5fc7ecfd9e1f323d0ad3a43eccec1dbc500be1c`; no se recalculan. Las herramientas de observación, preparación de bundles y replay de Maintainer siguen disponibles bajo sus requisitos de autorización existentes.

La integración privada está implementada en Dashboard/home y tiene rollback OFF por defecto, aislamiento de errores, captura de llamadas existentes, entrada versionada, snapshots reproducibles y observabilidad diagnóstica. No hay cutover, Designer, commit, push ni deployment.

Al iniciar se verificaron independientemente los 891 archivos Sweeper y los 59 archivos Groweer. Maintainer modifica cinco archivos previos de integración/configuración y reutiliza un formatter de fechas idéntico por llamada en el normalizador Yahoo para corregir un coste de memoria/CPU medido. Conserva los otros 944 archivos, incluidos los once archivos restantes del motor, todo P8/Builder/Sweeper/Groweer, el cálculo V1 y todas las superficies públicas. Una inversión mecánica del hoist debe recuperar el SHA original del normalizador; la equivalencia se verifica sobre los once históricos Yahoo completos y casos de zona/DST. `SWEEPER_HASH_MATCH=PASS` describe la comprobación de entrada; `files-changed.json` declara por separado las modificaciones operativas autorizadas.

| Evidencia | Artefacto |
| --- | --- |
| Branch, HEAD, tree, worktree y 950 hashes iniciales | [input-manifest.json](input-manifest.json) |
| Arquitectura, integración, versiones, cache y límites | [integration-map.md](integration-map.md) |
| Schema y observabilidad incremental | [snapshot-contract.json](snapshot-contract.json) |
| Boundary de fuentes y calendario | [source-boundary-audit.json](source-boundary-audit.json), [calendar-audit.json](calendar-audit.json) |
| Captura prospectiva y garantía temporal real | [prospective-capture.md](prospective-capture.md), [prospective-smoke.json](prospective-smoke.json) |
| Fallos y aislamiento de V1 | [failure-matrix.md](failure-matrix.md) |
| Rollback y operación | [rollback.md](rollback.md), [runbook.md](runbook.md) |
| Tiempos absolutos/relativos, memoria, fetch/parse/I/O | [performance.json](performance.json), [performance-pipeline.json](performance-pipeline.json) |
| Next reconciliado sin modificar manifests | [dependency-audit.json](dependency-audit.json) |
| Hallazgos y reparaciones sin impacto metodológico | [findings.json](findings.json) |
| Verificación completa y manifest final | [verification.json](verification.json), [canonical-verification.json](canonical-verification.json), [files-changed.json](files-changed.json) |

La prueba real local capturó cinco respuestas CFE y obtuvo un snapshot INCOMPLETE/UNKNOWN reproducible. No se configuró una fuente oficial de calendario ni un bundle real completo. Los tests completos de R0 usan datos sintéticos claramente identificados. Los PASS operativos certifican infraestructura, contratos y degradación probados; no afirman una fuente siempre disponible ni un historial prospectivo válido acumulado.

Los gates técnicos permiten abrir Designer con autorización nueva de Control Tower. Esto no habilita Designer en esta entrega, no activa el flag en un deployment y no autoriza cutover. Los eventos 100/100/60 son objetivos de evidencia; sus contadores no promueven V2 y no equivalen a garantía estadística. R2 permanece R2, no PIT OOS.

El candidato conserva H1 offline, persistencia solo diagnóstica, cross-asset/PFL fuera de core y BTC/GLD contextuales con cero votos. No se introduce score, porcentaje de confianza ni probabilidad V2.

Reproducir la verificación canónica con `python3 -B docs/regime-engine-v2/maintainer/run-verification.py`; después typecheck, lint y build según el runbook. `performance-pipeline.mjs` mide el cálculo V1 real con proveedores controlados sin datos y el recorrido completo de fuentes raw V2, incluidos cortes distintos. `performance.mjs` aísla el overhead con un callback V1 fijo. Ambos reportan números absolutos/relativos, memoria y límites; ninguno mide latencia de proveedores reales ni establece un SLA. La medición anterior al repair permanece en `performance-pipeline-before.json`.

Resultado final: 533/533 pruebas, 464/464 golden, 1.930/1.930 sesiones históricas y 110/110 ataques. Build/typecheck pasan con Next 16.3.1; lint conserva 18 avisos previos y añade cero.

En el benchmark completo con V1 bajo respuestas 404 controladas, la mediana warm pasa de 0,379 ms a 51,867 ms con shadow (+51,488 ms). El repair reduce el coste por corte de V2 un 90,74% frente a la primera implementación; el máximo RSS muestreado baja de 1,219 GB a 324,21 MB. El coste residual de validar hashes, evaluar y persistir se documenta; esta medición no es latencia productiva ni un SLA.
