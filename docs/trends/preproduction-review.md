# Tendencias v2: cierre de datos y revisión adversarial

Base de esta fase: `636cb73fb0fe4d2b28ad96cb7185f8c07d8f895b`. La fase visual previa partió de `84e8b3ee92dff4c41b4342ae5d1759603ed85c6b`. Sin commit, push, deploy ni cambios en estilos globales. Los cambios ajenos de presupuesto, investigación y dependencias se conservan.

## Diagnóstico editorial antes de editar

La lista original real del repositorio tenía 13 IDs, incluyendo Robótica separada de Automatización y Bitcoin/criptoinfraestructura. Espacio y Materiales críticos se añadieron porque estaban en la especificación del usuario y faltaban en el código. Se mantienen **15**; no se fuerza una cuota de 13.

| Tendencia | Decisión | Ámbito que evita consolidación artificial |
|---|---|---|
| Inteligencia artificial | KEEP | Modelos, datos y aplicaciones |
| Automatización | KEEP | Procesos, integración y retorno operativo |
| Energía e infraestructura | KEEP | Electricidad, redes y almacenamiento |
| Salud y longevidad | KEEP | Demografía, cuidados y tratamientos |
| Ciberseguridad | KEEP | Protección digital |
| Defensa y seguridad | KEEP | Capacidades y contratación de defensa |
| Digitalización financiera | KEEP | Pagos, crédito y servicios financieros |
| Consumo del futuro | KEEP | Alcance premium/aspiracional original, delimitado en detalle |
| Agua y alimentos | KEEP | Productividad y resiliencia hídrica/alimentaria |
| Espacio | KEEP | Lanzamiento, satélites y servicios orbitales |
| Materiales críticos | KEEP | Extracción, refino, reciclaje y concentración de suministro |
| Educación y trabajo del futuro | KEEP | Formación y organización del trabajo |
| Ciudades e infraestructura | KEEP | Transporte, urbanización y renovación de activos |
| Robótica | KEEP | Máquinas físicas y aplicaciones |
| Bitcoin y criptoinfraestructura | KEEP | Liquidación, custodia e infraestructura de activos digitales |

Hay intersecciones, especialmente Automatización/Robótica y Energía/Infraestructura. Se conservan porque preguntan por distintas partes de la cadena de valor. No se suman como categorías económicas excluyentes. Espacio tiene aplicaciones comerciales diferentes de Defensa; Materiales críticos sirve además a tecnología y fabricación. La justificación editorial sigue las fuentes revisadas de [ESA](https://www.esa.int/About_Us/Business_with_ESA/ESA_releases_2026_Space_Economy_Report) e [IEA](https://www.iea.org/reports/global-critical-minerals-outlook-2026). Ningún cambio de fase ni de evidencia en esta fase.

## Del universo de tres a un registro defendible

La muestra anterior: Berkshire (`1067983`), Bridgewater (`1350694`) y PSCM (`1336528`). La identidad y el historial justificaban un piloto; no la representatividad de agregados. El descargador previo no recuperaba documentos 13F-NT aunque los detectaba en submissions.

`universe-proposal.json` conserva la propuesta de candidatos. La selección utiliza identidad legal SEC, historial de ocho trimestres o continuidad documentada hacia una matriz, una unidad de recuento por grupo y variedad de concentración/estructura. Se excluyen libros de intermediación y no se intenta representar toda la industria ni clasificar habilidad. La membresía se decide antes de observar movimientos. El campo `manager_type` es una clasificación analítica de estructura, no un estilo de rentabilidad medido.

El registro definitivo es `lib/trends/capital/universe.json`, versión v1: **48 entidades legales**, **44 unidades de recuento/filers esperados**, **2 entidades de aviso**, **2 candidatos históricos excluidos**. Tiene los campos solicitados, criterios ES/EN, fuentes, fecha, grupo económico y relaciones explícitas.

- Greenlight, CIK `1079114`: último 13F localizado Q4 2023; fuera del universo. No se presupone sucesión hacia otra firma por nombre.
- Ruane Inc., CIK `728014`: último 13F Q1 2018; registro histórico excluido. Ruane, Cunniff & Goldfarb L.P., CIK `1720792`, es la entidad seleccionada con reportes actuales, identificada en su [portada Q2](https://www.sec.gov/Archives/edgar/data/1720792/000091957426005176/xslForm13F_X02/primary_doc.xml). No se enlazan sus series históricas automáticamente.
- First Eagle permanece como miembro esperado, temporalmente no disponible: su anomalía no se oculta reduciendo el universo.
- BAMCO es una sola unidad; no se añade otra entidad Baron. Las filiales de Berkshire son parte del reporte consolidado, no gestores adicionales.

La muestra piloto de diez unidades: Berkshire, Bridgewater, Pershing matriz, Baupost, Third Point, Duquesne, Lone Pine, Fundsmith, Dodge & Cox y Greenhaven. Incluye carteras concentradas/diversificadas, value/growth, hedge funds, family office, gestores institucionales y una transición de declarante. **PILOT_10=PASS** se registró antes de descargar el resto de holdings; incluye revisión de tres gestores/cinco valores. Evidencia de esa secuencia: `pilot-validation.json`.

## Pershing y ValueAct

El [aviso PSCM Q2](https://www.sec.gov/Archives/edgar/data/1336528/000117266126003777/0001172661-26-003777.txt) declara que los holdings pasan al reporte de su matriz pública, **Pershing Square Inc., CIK 2026053**. El [13F-HR receptor](https://www.sec.gov/Archives/edgar/data/2026053/000117266126003790/0001172661-26-003790.txt) incluye a PSCM por CIK en la lista de otros gestores y contiene 15 entradas de tabla.

La relación `INCLUDED_REPORT` conserva ambas fuentes; PSCM queda `NOTICE_ONLY` / `NOT_SEPARATELY_DISCLOSED`. Solo la matriz aporta posiciones al recuento. La exposición publicada es la del grupo declarante, no una reconstrucción sintética de una cartera individual de Ackman.

En Q1 la matriz presenta una combinación con una sola entrada y remite a PSCM, que tiene su propio HR. En Q2 el perímetro de la matriz incluye seis gestores. No se combinan automáticamente para obtener supuestas compras/salidas: los movimientos de Pershing quedan indeterminados por cambio de perímetro.

ValueAct Capital Management, CIK `1351069`, también remite mediante avisos a **ValueAct Holdings, L.P., CIK `1418814`**. El receptor incluye al avisante por CIK. Misma regla: una unidad; aviso separado y trazable.

## Denominadores y alcance de la tabla

Datos Q2 de la ejecución final: **43/44 filings utilizables (97,7%)**, dos avisos, ningún filing pendiente y un filing no utilizable. Las métricas de posiciones usan **43 gestores divulgados elegibles**, no 44 ni 48. El aviso no equivale a una cartera con cero posiciones.

La tabla es de **valor/clase**. CUSIP identifica la emisión, combinado con LONG/PUT/CALL y SH/PRN. Variantes textuales de la clase no dividen una misma emisión. GOOG y GOOGL conservan CUSIPs separados. El agregado interno por emisor utiliza un mapping explícito y la unión de IDs de gestores: nunca suma ambas clases. Las filas se pueden reconstruir mediante `manager_ids` y fuentes. Ni el valor de mercado ni los dólares influyen en el orden.

Una megacartera sigue teniendo más oportunidades de coincidencia por su amplitud; esta limitación se explica en metodología. El denominador identifica datos divulgados utilizables, no carteras completas ni ausencia de holdings confidenciales. Las opciones y el principal se conservan internamente; no entran en la tabla de exposición larga. Hay 13 mappings de emisor/clase/ticker contrastados con documentos SEC completos; cubren los ocho valores más compartidos. El resto sigue sin ticker resuelto. Los vínculos temáticos son interpretación editorial de actividad, nunca intención del gestor.

## Comparación Q1 → Q2 y dos movimientos reconstruidos

Cada fila conserva cantidades anterior/actual, delta bruto, ajuste, cantidad anterior normalizada, estado, confianza, razón y fuentes. Un registro de revisión fija accessions y cantidades exactas; exige comprobaciones de splits, reverse splits, fusiones, spin-offs, ticker, CUSIP, clase, amendments, confidencialidad, ausencia, relaciones y opciones. Una enmienda o cantidad distinta invalida esa revisión.

| Gestor / valor | Q1 acciones | Q2 acciones | Delta bruto | Factor | Anterior normalizada | Resultado |
|---|---:|---:|---:|---:|---:|---|
| Berkshire / GOOG clase C | 3.585.215 | 27.188.433 | +23.603.218 | 1 | 3.585.215 | INCREASED / REVIEWED |
| Bridgewater / GOOG clase C | 387.002 | 74.207 | −312.795 | 1 | 387.002 | REDUCED / REVIEWED |

Las portadas y filas de ambos gestores, el 10-Q Q1/Q2 de Alphabet y los 8-K intermedios se revisaron. El [8-K de junio](https://www.sec.gov/Archives/edgar/data/1652044/000119312526257724/d83560d8k.htm) y la [nota 11 del 10-Q Q2](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000071/goog-20260630.htm) documentan emisión pública y colocación privada. La colocación a un afiliado de Berkshire incluye 14.359.656 acciones clase C: es solo parte del delta trimestral. No se presenta todo el delta como esa operación ni se atribuye precio o motivación. La emisión no multiplica las acciones anteriores de un tenedor; los nuevos preferentes son instrumentos distintos.

**8.137 comparaciones permanecen INDETERMINATE**, incluidas ausencias sin prueba suficiente y cambios de perímetro. No se genera NEW/EXIT por diferencia de listas. `movement_publication=REVIEW_PENDING` impide publicar rankings o recuentos parciales de movimientos en la UI, incluso en la vista Más compartidas. Los dos casos revisados permanecen en el registro de auditoría interno.

## Enmienda real: First Eagle

La [enmienda Q1](https://www.sec.gov/Archives/edgar/data/1325447/000132544726000018/xslForm13F_X02/primary_doc.xml) es RESTATEMENT: reemplaza 602 entradas, no las añade. CUSIP `594972AS0`, tipo PRN: el original registraba 20.000.000.000 de principal y 16.590.000.000 USD de valor; la corrección registra 20.000.000 y 16.590.000 USD. No es una venta ni un split de acciones.

La [enmienda Q2](https://www.sec.gov/Archives/edgar/data/1325447/000132544726000033/0001325447-26-000033-index.htm) se declara NEW HOLDINGS, pero contiene 616 filas frente a 614 del original y solapa posiciones. No se reinterpretó como restatement ni se sumaron tablas. El estado es `unavailable / ambiguous_additive_amendment`, con disposición documentada `WITHHOLD_HOLDINGS` en config. Su denominador esperado se conserva y ningún movimiento se determina. Una anomalía nueva, distinta de esa disposición exacta, hace fallar la actualización.

## Revisión adversarial separada

Además de los tests, `verify-capital-evidence.py` reconstruye desde los XML guardados sin importar el parser ni el normalizador de producción. Reconcilia totales de portadas, cantidades de los 43 gestores utilizables, holders de las 3.055 filas, denominadores, porcentajes y la muestra manual. Se inspeccionaron también las fuentes de los casos anteriores; la recomputación no sustituye el juicio sobre perímetro o enmiendas.

Hallazgos corregidos:

1. El NT no se descargaba: ahora se analiza su portada y el reporte receptor.
2. Denominador mezclaba universo y disponibilidad: ahora se separan.
3. Descripciones libres de clase fragmentaban una emisión: identidad por CUSIP/instrumento.
4. El agregado por emisor podía sumar clases: ahora usa unión de gestores.
5. Revisiones no fijaban accessions/cantidades: ahora invalidan cambios posteriores.
6. Recuentos parcialmente revisados podían aparentar rankings completos: UI cerrada hasta revisión completa.
7. Una consulta fallida podía reemplazar evidencia antes de validar: ahora se prepara aparte, se valida y el manifiesto actúa como marcador de integridad.
8. Un CIK ausente en referencias aparecía como `0000000000`: ahora es null. El CIK del declarante se lee de sus credenciales XML, no del primer nodo CIK arbitrario.

Las pruebas adversariales cubren duplicación de CIK/grupo, referencias entre declarantes, clases y opciones, dos conversiones hacia una misma emisión, reviews obsoletas, ausencias no verificadas, cambios de perímetro, splits/reverse splits, amendments ambiguos y un fallo real del proceso en una copia desechable. No se añadieron datos de prueba al snapshot ni rutas de fixtures.

## Operación manual

```sh
npm run build:trends-13f       # Recupera SEC, valida, normaliza, compara y publica snapshot local
npm run check:trends-13f       # Reproduce snapshot y manifest sin red
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types scripts/build-capital-disclosures.mts
python3 scripts/verify-capital-evidence.py
```

La consulta completa utiliza la lista SEC de submissions e históricos cuando falta un trimestre; no adivina accessions. Limita solicitudes y detiene Archives ante 403/429. El proceso comprueba identidades, hashes, fechas, revisiones, mappings, anomalías y pérdida de gestores previamente validados. Cada fila mantiene procedencia. El comando no crea automatización.

Un fallo conserva bytes y fecha del último snapshot válido y escribe `refresh-status.json`. La UI señala la consulta fallida. Si snapshot, registro o manifiesto no concuerdan, el loader entrega un estado no disponible. El manifiesto se renombra al final; una interrupción entre archivos produce indisponibilidad, no una mezcla silenciosa. Las fuentes de eventos y tickers son revisiones explícitas: cambiar el trimestre requiere revisarlas, no heredar decisiones viejas.

Los artefactos se mantienen en `lib/trends/capital/generated`: evidencia SEC, documentos de emisores, documentos de eventos, snapshot, manifest y estado de consulta. No se envía el snapshot completo al navegador. La página conserva SSR editorial y las mismas islas cliente, rutas y estilos de la fase anterior.

## Estado de cierre

Los datos de coincidencias publicados son trazables y los estados parciales se explican. **La habilitación completa de movimientos para producción sigue bloqueada** por 8.137 comparaciones sin revisión suficiente y la enmienda Q2 de First Eagle. La disponibilidad de 43/44 filings no debe confundirse con esa revisión de movimientos.

Resultados finales de comandos, QA visual y archivos: `preproduction-validation.json`. No hay commit, push ni deploy.
