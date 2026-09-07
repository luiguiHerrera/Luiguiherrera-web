# Tendencias · Production Candidate v2

**Alcance vigente: posiciones y coincidencias.** Candidato local sobre `636cb73fb0fe4d2b28ad96cb7185f8c07d8f895b`. Sin commit, push ni deploy.

`PRODUCTION_READINESS=PASS` para este alcance. `TRENDS_V2_1_MOVEMENTS=BLOCKED` es un criterio separado. La auditoría anterior permanece en `preproduction-review.md` y `preproduction-validation.json`; su conclusión correspondía al alcance que incluía movimientos.

## Qué recibe el visitante

Hero, lecturas actuales, radar de 15 tendencias, 15 fichas por idioma, metodología, universo versionado, cobertura, coincidencias de posiciones, vínculos editoriales, fuentes SEC y estados de disponibilidad.

El bloque se titula **Dónde coincide el capital divulgado** / **Where disclosed holdings overlap**. Expone el trimestre Q2 2026, la fecha de las posiciones y el retraso de los datos. La tabla contiene Empresa, Ticker, Gestores, % divulgados y Tendencias relacionadas. Las clases permanecen identificadas. En móvil se usa una lista con los mismos datos.

Coincidencias es un encabezado, sin un tab artificial. No se renderizan controles pendientes, rankings trimestrales, columnas de aumentos/reducciones, flechas ni conteos parciales. El CTA del hero y la explicación lateral describen presencia y coincidencia. La cobertura se concentra en un panel secundario; `43 / 44` aparece una sola vez en el índice.

## Datos y denominadores

- LHI Superinvestor Universe v1: 44 grupos esperados; 43 con tablas utilizables.
- Cobertura: 43/44 = 97,7%. Denominador de coincidencias: 43.
- Posiciones al 30 de junio de 2026; consulta SEC conservada: `2026-09-06T20:11:49.338122+00:00`.
- 2.716 valores largos de tipo SH con presencia actual, excluidas opciones y principal. Los conjuntos de gestores, porcentajes y fuentes coinciden con la reconstrucción previa para todos estos valores. Las ocho primeras filas mantienen su orden.
- Alphabet: GOOGL tiene 28 gestores; GOOG, 20. La unión por emisor es 32, nunca 48. La tabla pública mantiene las dos clases separadas.
- First Eagle sigue siendo miembro esperado. La enmienda Q2 adicional presenta solapamiento ambiguo: no aporta posiciones ni entra en el denominador divulgado. Su estado es no disponible, no cartera vacía; no se publica ningún movimiento suyo.
- Los avisos 13F-NT de Pershing y ValueAct no cuentan como carteras independientes. Se conserva el reporte receptor acreditado y se cuenta el grupo una sola vez.

Las filas mostradas son GOOGL 28/43; TSM y V 25/43; AMZN, META y MSFT 24/43; GOOG 20/43; COF 18/43. Son frecuencias de presencia divulgada, no medidas de convicción, peso de cartera ni recomendaciones.

## Frontera de publicación

`positions.ts` calcula las coincidencias directamente desde `current`, la membresía esperada y las correspondencias verificadas. Su tipo de entrada no contiene el trimestre anterior ni movimientos. Pruebas con acceso prohibido a `previous`, `movements`, `companies` e `issuers` demuestran que la salida pública de v2 no depende de esas estructuras.

`public-capital.ts` es un módulo exclusivo de servidor. Proyecta cada campo de forma explícita y entrega a `CapitalDisclosureTable` una lista de vistas publicadas. Las fichas utilizan el mismo adaptador, filtrado por tendencia. Ninguna fila interna se propaga con un spread al cliente.

`public-contract.ts` impone una lista de campos por nivel y comprueba los campos numéricos, incluso dentro de objetos anidados:

| Nivel | Campos permitidos en v2 |
| --- | --- |
| Contexto | quarter_end, as_of, quality, freshness, refresh_failed, universe_name, universe_version, universe_size, coverage, views |
| Cobertura | disclosed_filers, percent |
| Vista | id, rows |
| Posición | security_id, issuer, issuer_id, ticker_verified, security_class, manager_count, eligible_disclosed_managers, percent_disclosed, theme_links, filing_source |

Se rechazan `movement`, `movement_count`, `increase_count`, `decrease_count`, `new_count`, `exit_count`, `disagreement_count`, `movement_rank` y sus alias internos. Tampoco llegan identificadores de gestores, cantidades comparadas, valor de mercado, registros de revisión ni fuentes del trimestre anterior.

El JSON de las vistas que recibe la tabla ocupa 2.911 bytes (sin el transporte de React ni el locale); el contexto público completo, 3.207 bytes. El snapshot interno descomprimido ocupa 41.813.431 bytes y permanece en servidor. El HTML y stream RSC de las 34 rutas pasan el detector de campos prohibidos. Los bundles cliente tampoco contienen las firmas comprobadas de evidencia SEC interna.

El enlace SEC de cada valor abre un filing actual que acredita su presencia; la evidencia interna conserva todas las fuentes y gestores necesarios para reconstruir el recuento. La metodología explica este alcance del enlace.

## Motor reservado para v2.1

La única autorización es `movement_publication === "READY"`. Cualquier otro valor, incluido uno desconocido, produce únicamente la vista de coincidencias. La disponibilidad de registros revisados no habilita una función pública.

Se conservan sin cambios el motor, reviews, controles de corporate actions, amendments, registro de evidencia, snapshot y pruebas anteriores. Permanecen los dos casos REVIEWED y las 8.137 comparaciones INDETERMINATE. No se revisaron comparaciones adicionales ni se reinterpretó First Eagle.

La arquitectura admite las seis vistas mediante la lista de publicación y conserva navegación accesible entre tabs para cuando exista READY. Una prueba sintética ejercita esa rama sin alterar datos reales. La vista de coincidencias nunca recibe conteos de movimientos, incluso en esa prueba.

La metodología pública explica las posiciones utilizables, el denominador, avisos, enmiendas y los controles adicionales que faltan para divulgar cambios. Las definiciones internas de estados solo se muestran con READY. La denominación regulatoria `NEW HOLDINGS` puede figurar en la nota de una enmienda del registro; no es un resultado clasificado como NEW.

## Contenido y presentación

15 KEEP, 0 MERGE, 0 REMOVE. IDs, rutas, fases, niveles de evidencia y fuentes editoriales permanecen idénticos. Automatización describe procesos e integración; Robótica, máquinas físicas y aplicaciones fuera de procesos industriales establecidos. Se acotó únicamente el resumen y la explicación de Ciudades e infraestructura en ES/EN a transporte, servicios urbanos, concesiones y obra civil, haciendo explícita su frontera con generación y red eléctrica.

Espacio mantiene lanzamiento, conectividad y observación terrestre con evidencia ESA y límites comerciales. Materiales críticos mantiene extracción, refino y reciclaje, concentración del suministro y límites de precios/oferta con evidencia IEA.

El radar conserva solo fase y evidencia como metadata. El panel del universo perdió la tarjeta prominente y los contadores secundarios. Se preservan tipografía, colores, anchos, radios y estilos globales del sitio.

## Validación

- 221 pruebas Node y 7 de XML: PASS. Incluyen unión por emisor, opciones, avisos, First Eagle, denominadores, independencia del motor, listas de campos, inyección anidada, HTML/RSC, gate y paridad ES/EN.
- Reproducción del snapshot y manifest desde evidencia conservada: PASS. Verificación XML independiente: 43 gestores, 3.055 filas de valores, cinco valores de muestra y dos movimientos revisados conservados.
- TypeScript, lint, build Next y `git diff --check`: PASS. Lint global: 0 errores, 18 advertencias preexistentes; el alcance Tendencias no añade advertencias.
- 34 rutas de producción local: 17 ES + 17 EN, canonical, hreflang, JSON-LD, H1 único, anclas y 404 para rutas inexistentes: PASS.
- 12 casos responsive de índices y 24 de ficha/metodología en los seis anchos 320, 375, 390, 768, 1280 y 1920: sin desbordamientos. Ocho filas visibles, cinco columnas desktop, lista móvil, ningún tab de movimientos y una sola cifra de cobertura.
- Filtros: 4 tecnología, 4 recursos, 1 salud, 2 seguridad, 2 finanzas y 2 consumo; Todas devuelve 15. Consola sin errores ni avisos en las comprobaciones realizadas.
- Inspección visual de capital desktop, capital móvil y radar tablet: jerarquía editorial y lectura correctas.

Los resultados estructurados, archivos y hashes de preservación están en `production-candidate-v2-validation.json`. Los comandos reproducibles están en `implementation.md`.

## Límites que conserva el candidato

El 13F es retrasado e incompleto; la selección no representa a todos los gestores y las carteras amplias tienen más oportunidades de coincidir. First Eagle mantiene cobertura parcial. Hay 13 correspondencias de ticker verificadas; las no resueltas no se inventan. La actualización SEC sigue siendo manual y conserva su fecha real. Los movimientos siguen fuera de producción hasta una revisión suficiente.

Estos límites están delimitados en producto y no bloquean el alcance de posiciones de v2. El siguiente paso es revisar y aprobar este candidato local para su eventual publicación, manteniendo v2.1 como trabajo independiente.
