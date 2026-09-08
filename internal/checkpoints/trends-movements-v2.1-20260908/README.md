La investigación de movimientos v2.1 queda **DEFERRED_DATA_COVERAGE_LIMIT**. La decisión de producto es **NO_MOVEMENT_FEATURE**. El resolver y el modelo de evidencia superaron las condiciones del piloto fijo; la cobertura verificable a escala sigue siendo insuficiente. Este cierre no equivale a un fallo técnico.

**DO_NOT_RESUME_MASS_ISSUER_EVENT_RESEARCH**: no reiniciar descargas masivas de emisores sin una nueva evaluación de fuentes/acceso y autorización explícita posterior. Los scripts archivados de adquisición, expansión y firma de revisiones son historia preservada, no instrucciones para ejecutarlos.

Este checkpoint es interno, propuesto y no versionado todavía. La custodia local A/B está cerrada como **DURABLE_LOCAL_VERIFIED**, con **PRIMARY_REVALIDATION_CAPABLE=YES**, en [el archivo de evidencia](/Users/quantlab/Developer/web/Luiguiherrera-evidence/trends-movements-v2.1-20260908/README.md). Sus blobs y dependencias primarias se verificaron con los worktrees originales tratados como inaccesibles. Las ocho excepciones C necesarias están justificadas en el manifiesto. Los originales temporales siguen intactos; no se movieron ni borraron. El paquete compacto conserva los números y la viabilidad de Wave 2C; la evidencia voluminosa permanece fuera de Git. Esta es una copia local, sin afirmar un backup remoto.

El recorrido y su conclusión quedan resumidos así:

| Etapa | Qué se intentó y qué se estableció |
|---|---|
| v2.1 / Wave 1A | Congelar 8.137 comparaciones; separar reglas deterministas y decisiones de evidencia; compartir dependencias por gestor, trimestre y título mediante un DAG. La falta de evidencia permanece indeterminada. |
| Wave 1B | Identidad de título por listas oficiales SEC, prueba emisor-CIK, inventarios y detección de candidatos de eventos. Un CUSIP válido o cero coincidencias no demuestra ausencia de eventos. |
| Waves 1C–1D | Cerrar el piloto fijo de 501 comparaciones, 66 paquetes y 19 gestores. Resultado: 487 resueltas y 14 bloqueadas verificadas; 64 paquetes CLEAR, 2 BLOCK y 0 UNKNOWN. Cero falsos positivos observados en controles manuales seleccionados; no es una garantía estadística ni certificación humana independiente. |
| Wave 2A | Aplicar el modelo al target congelado de 4.162 pares BOTH_PRESENT. Se obtuvieron 517 resueltos: 30 adicionales al piloto. Las descargas medidas fueron 5.089.019.968 bytes (~5,09 GB decimales); no son bytes actuales en disco ni coste en horas. |
| Wave 2B | Examinar fuentes operativas/históricas DTCC y FINRA. La fuente necesaria por CUSIP no quedó accesible con el acceso autorizado. Las consultas públicas FINRA por fechas no aportaron el vínculo CUSIP necesario. Se corrigió el requisito imposible de 20 gestores a la población real 19/19. |
| Wave 2C | Evaluar suficiencia por título: 16 de 3.055 claves elegibles, ninguna de las 8 filas públicas y solo Chevron vinculado a una tendencia. Las cinco reglas simuladas producen 16/16/15/0/0 candidatos; ninguna fue seleccionada. |

La publicación se rechazó por escasa utilidad actual, población sin resolver no aleatoria, cobertura negativa de eventos no escalable y mantenimiento trimestral material. La opción A, detalle individual, es **FACTUALLY_FEASIBLE_BUT_NOT_WORTH_IMPLEMENTING_NOW**. B es **NOT_FEASIBLE_0_OF_8**. C es **NOT_RECOMMENDED_SELECTION_BIAS**. El mantenimiento estimado era 10–13 tareas por título más controles compartidos: 183 unidades condicionales con los mismos conjuntos de gestores; no son horas, documentos ni costes monetarios.

Los contadores autoritativos son 526 resueltos globales y 7.611 indeterminados dentro del corpus de 8.137; 517 de los 526 pertenecen al target BOTH_PRESENT y los otros 9 son calificaciones previas. El censo de títulos tiene 69 CLEAR, 2 BLOCK y 2.984 UNKNOWN: 2.064 paquetes UNKNOWN más 920 títulos sin paquete de Wave 2A. Hay 12 títulos con vínculo editorial CUSIP, 11 CLEAR y 1 candidato. Las 32 referencias editoriales de ETF/fondos sin vínculo CUSIP y 2 referencias spot están inventariadas separadamente; no se creó identidad por ticker.

Dos comparaciones GOOG ya revisadas fueron excluidas del corpus original y permanecen en el snapshot. Wave 2C las usó exclusivamente para reconciliar la tabla pública: 528 pares resueltos analíticos = 526 del corpus + 2 referencias previas. **528 no sustituye al contador global 526**. La antigua evidencia de Class C y sus comparaciones no constituyen un paquete Wave 2A completo; GOOG permanece UNKNOWN en el censo de paquetes. No se hereda esa evidencia a GOOGL ni a otra clase.

Se reabrirá la evaluación si ocurre **al menos una** de estas condiciones:

1. `AUTHORIZED_DTCC_HISTORICAL_ACCESS=YES`.
2. `AUTHORIZED_FINRA_CUSIP_HISTORY_FOR_RELEVANT_SUBSET=YES`.
3. `PUBLIC_TOP8_ELIGIBLE_COUNT>=4`.
4. `TREND_LINKED_ELIGIBLE_COUNT>=8`.
5. Un trimestre futuro aporta otro modelo de fuente autoritativa que demuestre cobertura negativa escalable de acciones corporativas.

Son motivos para reexaminar la decisión, no permisos automáticos de publicación. A y B requieren acceso realmente autorizado; una página comercial, un login visible o datos por ticker no lo demuestran. No se creó monitor ni adquisición para buscar estos cambios. Cualquier reapertura necesita comprobar clases, ventanas, elegibilidad histórica, eventos, enmiendas/cancelaciones, conflictos y las condiciones de cada gestor. Un CLEAR Q2 nunca se reutiliza como CLEAR del trimestre siguiente.

Tendencias v3 permanece intacta: `PUBLIC_DATA_CHANGED=NO`, `PUBLIC_SNAPSHOT_CHANGED=NO`, `MOVEMENT_PUBLICATION=REVIEW_PENDING`, `MOVEMENT_UI_PRESENT=NO` y `MOVEMENT_FIELDS_PUBLIC=NONE`. No hay pestañas, avisos, placeholders, rankings globales ni inferencias de transacciones. Sin commit, push o deploy.

Para orientarse sin abrir miles de archivos:

- `STATE.json`: cifras, decisión, acceso, bloqueos y condiciones de reapertura en formato estructurado.
- `MODELS.md`: once especificaciones y límites de autoridad.
- `CANDIDATES.json`: los 16 títulos históricos, CUSIP/clase, cantidades comparativas y hashes de evidencia.
- `REPRODUCE.md` y `verify_checkpoint.py`: verificación autónoma y replay sin red.
- `CODE_RETENTION.json`: código a conservar, diferir y experimentos de formato prescindibles.
- `STORAGE_AUDIT.json` y `retained-manifest.jsonl.gz`: categorías A–D, tamaños lógicos, duplicados, hashes y procedencia. No son instrucciones de borrado.
- `reconstruction-core.tar.gz`: copias exactas de código, decisiones y entradas/salidas mínimas; sus miembros mantienen rutas originales.
- `VALIDATION.json` y `FILES.json`: comprobaciones del cierre y lista exacta de archivos propuestos.

Custodia: `trends-movements-v2.1-20260908-custody-1`; SHA-256 del manifiesto: `576d25b51f9784d7225ce2d5694a3bd3a06039272c1a70df775abfad03b7f94e`. La orden de verificación y la ruta están también en STATE.json. El siguiente paso es revisar los 14 archivos propuestos para un versionado separado; no hay autorización de commit ni de eliminar evidencia.
