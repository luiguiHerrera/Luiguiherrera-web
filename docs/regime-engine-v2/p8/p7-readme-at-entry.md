# REGIME ENGINE V2 — entrega de Prototyper

Fecha de inspección: 2026-09-08. Contrato: `regime-v2-prototype/1.0.0`.

**La arquitectura y el contrato simbólico quedan congelados. Builder todavía no puede empezar.** Faltan la selección validada de parámetros, el contrato de precios y la evidencia de disponibilidad temporal. No se ha implementado un motor de producción ni modificado la web.

```text
STATE=REGIME_ENGINE_V2_PROTOTYPE_FROZEN
ARCHITECTURE=EVIDENCE_STATE_ENGINE
VISIBLE_SCORE=NONE
VISIBLE_CONFIDENCE_PERCENT=NONE
FEATURE_REGISTRY=COMPLETE
DEPENDENCY_MAP=COMPLETE
PILLAR_SPEC=COMPLETE
REGIME_TABLE=COMPLETE
UNCERTAINTY_SPEC=COMPLETE
REACHABILITY=PASS
REACHABILITY_SCOPE=CONCEPTUAL_STATE_TABLE
RAW_INPUT_REACHABILITY=NOT_VALIDATED
UNRESOLVED_PARAMETERS=[PRICE_BASIS,PARTICIPATION_BANDS,LEADERSHIP_GAP,VOLATILITY_BANDS,VOLATILITY_MOMENTUM,CURVE_BANDS,CORRELATION_BANDS,FRESHNESS_POLICY,SOURCE_AVAILABILITY]
BUILDER_READY=NO
PRODUCTION_CUTOVER=NO
```

`FROZEN` fija definiciones, dependencias, reglas simbólicas y criterios de aceptación; **no significa parámetros calibrados ni validación empírica**. `REACHABILITY=PASS` corresponde a P6: cada régimen tiene testigos conceptuales en la tabla. El gate de Builder exige además parámetros vinculados a evidencia y testigos desde datos crudos coherentes.

## Entregables

| Tarea | Artefacto |
|---|---|
| P1 — inventario exacto | [feature-registry.json](feature-registry.json), con los trece campos pedidos y trazabilidad adicional |
| P2 — dependencias | [dependency-map.json](dependency-map.json) y [specification.md](specification.md#familias-y-dependencias) |
| P3 — pilares | [specification.md](specification.md#pilares), [parameters.json](parameters.json) |
| P4 — adjudicación | [decision-table.json](decision-table.json), orden de precedencia y tabla completa comprobable |
| P5 — dimensiones | [specification.md](specification.md#concordancia-incertidumbre-y-calidad) |
| P6 — alcanzabilidad | [prototype-check.mjs](prototype-check.mjs), [validation.json](validation.json) |
| P7 — aceptación | [acceptance-contract.md](acceptance-contract.md) |
| Evidencia local y externa | [source-audit.md](source-audit.md), [source-ledger.json](source-ledger.json) |
| Estado inicial y preservación | [run-context.json](run-context.json), [preservation.json](preservation.json) |

## Hallazgos que impiden declarar Builder listo

1. **No hay umbrales V2 validados.** Los umbrales de los módulos V1 son precedentes descriptivos, no una calibración del nuevo régimen. Los parámetros obligatorios permanecen `null`; no hay defaults ocultos.
2. **Fecha de observación y fecha de disponibilidad son distintas.** El snapshot del 04/09 se capturó el 06/09. Las series permiten reconstrucciones con la versión capturada, pero no acreditan por sí solas un replay point-in-time anterior a la captura.
3. **La convención de precios necesita resolución expresa con evidencia.** El Dashboard usa `TIME_SERIES_DAILY` y etiqueta `close`; otros cálculos usan series ajustadas. No se mezclan ni se cambia V1. La elección del dataset V2, sus ajustes y el tratamiento de eventos corporativos quedan pendientes.
4. **Los objetos actuales de presentación no son una capa temporal suficiente.** Se pierden fechas de retornos sectoriales, el historial completo usado para el percentil VIX y una observación de la ventana GLD de veinte sesiones. Builder necesitará conservar datos crudos y metadatos antes de esa reducción, reutilizando la captura existente.

## Continuación exacta

Resolver el protocolo de [acceptance-contract.md](acceptance-contract.md#gate-pbuilder), adjuntar un manifiesto de parámetros con evidencia de validación y volver a ejecutar la prueba desde entradas crudas. Después puede entregarse `BUILDER_READY=YES` sin cambiar arquitectura. Si resolver la convención de precios exige una modificación metodológica material, devolver la propuesta con evidencia antes de ejecutar esa parte, como exige el handoff.

No se ejecutan Builder, Sweeper, Groweer, Maintainer ni Designer mientras este gate permanezca cerrado. Sus comprobaciones figuran como pendientes; no se presenta una prueba del prototipo como validación de producción. V1 público, snapshots e informes conservan su código y sus bytes.

## Reproducir la comprobación del prototipo

Desde la raíz del repositorio:

```sh
node docs/regime-engine-v2/prototype-check.mjs
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import ./scripts/report-node-register.mjs --experimental-test-module-mocks --test lib/reports/first-september-2026.test.mts lib/reports/weekly-review.test.mts lib/dashboard/adapters/vix-term-structure.test.ts
```

El primer comando no hace fetch, no importa la aplicación y no escribe artefactos. Solo comprueba el contrato documental ejecutable. `--write` actualiza explícitamente `validation.json`. No se añade ninguna dependencia ni script al `package.json` existente.
