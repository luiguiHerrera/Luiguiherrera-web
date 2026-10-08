**REGIME ENGINE V2 — GROWEER · paquete de retorno a Control Tower.**

**Aviso de migración de verificación.** `run-canonical-verification.py`, `close-verification.py`, `seal-manifest.py` son entradas históricas de workspace retiradas: imprimen `RETIRED_WORKSPACE_VERIFIER` y terminan con código 2, sin verificar ni acceder a evidencia. Utilice la [guía de verificación portable del candidato](../release-candidate/verification-guide.md). Las instrucciones de verificación de etapa y sus resultados que siguen son registro histórico conservado en RC0 `f5fc7ecfd9e1f323d0ad3a43eccec1dbc500be1c`; no se recalculan.

Recomendación: **C03 KEEP; NO GROWTH REQUIRED FOR MVP**. H1 queda CHALLENGER_ONLY; P1, DIAGNOSTIC_ONLY; sin nueva familia cross-asset/PFL. BTC y GLD se conservan como contexto. El candidato canónico es exactamente el Sweeper aceptado. Maintainer está preparado como siguiente gate, pero no autorizado ni ejecutado. No hubo cambios de UI pública, commit, push, deployment ni cutover.

Leer primero [recommendation.md](recommendation.md), luego [verification.json](verification.json). Todo resultado histórico es investigación posterior sobre R2 ya inspeccionado; no hay OOS ni prueba point-in-time.

| Evidencia | Archivo |
| --- | --- |
| HEAD, tree, worktree original y 891 hashes antes de modificar | [input-manifest.json](input-manifest.json) |
| Definiciones registradas antes de calcular resultados | [analysis-protocol.json](analysis-protocol.json) |
| Reconstrucción pública y hashes/features contra P8/Sweeper | [analysis-input-audit.json](analysis-input-audit.json), [analysis-input.json.gz](analysis-input.json.gz) |
| Baseline por año/F3, duraciones/censura/matrices/pilares | [baseline-characterization.json](baseline-characterization.json) |
| Las 481 transiciones y sus 16 condiciones atómicas | [transition-forensics.json](transition-forensics.json) |
| Los 18 episodios STRESS y contexto observado | [stress-forensics.json](stress-forensics.json) |
| B0–B5 y límite de la evidencia V1 | [benchmarks.json](benchmarks.json), [v1-benchmark-inventory.json](v1-benchmark-inventory.json) |
| FULL, 11 omisiones mecánicas y 11 motores reducidos | [ablation.json](ablation.json) |
| Contribución estructural y límites de valor incremental | [redundancy-analysis.json](redundancy-analysis.json) |
| 26 perturbaciones sin selección | [threshold-sensitivity.json](threshold-sensitivity.json) |
| H1 y P1 aislados, demoras y sesiones contradictorias | [hysteresis-challenger.json](hysteresis-challenger.json), [persistence-challenger.json](persistence-challenger.json) |
| Fuentes/cobertura/dependencias/licencias cross-asset | [cross-asset-audit.json](cross-asset-audit.json) |
| Componentes PFL y diagnóstico de once sectores | [pfl-compatibility.json](pfl-compatibility.json) |
| BTC/GLD y casos prácticos de calidad | [satellite-review.json](satellite-review.json), [data-quality-audit.json](data-quality-audit.json) |
| Concordance/uncertainty y tabla cruzada | [dimension-value.json](dimension-value.json) |
| Coste, mínimo justificable y 44 identidades de investigación | [complexity-matrix.json](complexity-matrix.json), [challenger-catalog.json](challenger-catalog.json) |
| Diseño prospectivo sin activación | [prospective-validation-design.json](prospective-validation-design.json) |
| Hallazgos Groweer corregidos y límites abiertos | [growth-findings.json](growth-findings.json) |
| Tests/conformance/build/lint/preservación final | [verification.json](verification.json), [canonical-verification.json](canonical-verification.json) |
| Manifest final de archivos añadidos y hashes | [files-changed.json](files-changed.json) |

Las proporciones usan pares adyacentes elegibles de sesiones SPY observadas. Los huecos rompen continuidad; las duraciones señalan extremos censurados. `BASELINE_FLIP_FLOP` del bloque final es A–B–A con duración de B≤2 para reconciliar P8; también se reporta≤1/3/5. El orden de etiquetas no constituye una escala ordinal. Los benchmarks B1–B3 conservan sus métricas nativas y usan un namespace común explícito solo para el contraste; no se compara CALM_VOL literalmente con RISK_ON_BROAD.

La evidencia V1 no permite turnover/persistencia comparables: cuatro snapshots, tres fechas comunes, cero pares con fuente/corte iguales. El PASS de benchmarks certifica el trabajo y la declaración de esta limitación, no una falsa comparación completa. Lo mismo aplica al PASS de dimensiones: acredita información descriptiva distinta, sin afirmar beneficio predictivo ni validación de usuarios.

Reproducción desde la raíz del repositorio, con Node 26 y Python 3/numpy ya disponibles. Los scripts siguientes escriben exclusivamente en Groweer; no usar los runners originales que sobrescriben evidencia P8/Builder/Sweeper.

```sh
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON docs/regime-engine-v2/groweer/replay-analysis-input.mjs
python3 -B docs/regime-engine-v2/groweer/forensic_analysis.py
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON docs/regime-engine-v2/groweer/native-audit.mjs
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON docs/regime-engine-v2/groweer/experiment-vectors.mjs
python3 -B docs/regime-engine-v2/groweer/analyze-experiments.py
python3 -B docs/regime-engine-v2/groweer/temporal-challengers.py
python3 -B docs/regime-engine-v2/groweer/audit-cross-asset-pfl.py
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON docs/regime-engine-v2/groweer/audit-pfl-components.mjs
python3 -B docs/regime-engine-v2/groweer/finalize-analysis.py
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test docs/regime-engine-v2/groweer/challengers.test.mjs
python3 -B docs/regime-engine-v2/groweer/run-canonical-verification.py
```

`analyze-experiments.py` genera resultados sin veredicto final; `finalize-analysis.py` aplica una interpretación posterior explícita sin editar el protocolo registrado. Las aclaraciones descriptivas de shocks de un día se identifican como posteriores, no preregistradas. Las salidas completas de experimentos se conservan comprimidas para comprobar cualquier fila. Las fuentes oficiales y comprobaciones reproducibles de cross-asset/PFL figuran en [cross-asset-pfl-notes.md](cross-asset-pfl-notes.md).

Typecheck, build y lint se registran además en `verification.json`. El build local puede regenerar `next-env.d.ts`: se restauraron sus bytes exactos de entrada y se repitió typecheck. La discrepancia instalada/declarada de Next y 18 warnings de lint son anteriores a Groweer; se preservaron y no se ejecutó mantenimiento de dependencias. Un nuevo build exige volver a verificar esa restauración y regenerar el manifest final.

`files-changed.json` excluye su propio hash por autorreferencia y contiene los hashes de todos los demás archivos entregados, incluido `handoff-status.txt`. Su SHA-256 externo se imprime al cerrar el manifest; nunca sustituye a los 891 hashes del candidato original.
