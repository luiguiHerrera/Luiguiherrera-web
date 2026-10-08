> **Actualización P8:** este documento conserva las reglas y gates de P1–P7. Los nueve grupos antes UNBOUND quedan vinculados por [el manifiesto P8](p8/parameter-manifest.json), con [contratos de precio, tiempo y evidencia](p8/README.md). Builder está habilitado para implementación fiel, pero no se ejecuta en esta sesión; producción sigue bloqueada.

# Contrato de aceptación y continuidad

Este documento define las pruebas que faltan; no comunica PASS de etapas no ejecutadas.

## Gate P→Builder

Builder puede empezar únicamente cuando exista un nuevo manifiesto que cumpla **todo**:

1. Cada parámetro bloqueante de `parameters.json` tiene valor, unidad, dominio, justificación, autor/fecha de la decisión, dataset y hash de evidencia de validación. No se permite «usar lo de V1» sin comparación. Los valores y la regla de selección se fijan antes de evaluar el holdout.
2. `PRICE_BASIS` identifica un panel consistente por universo y fuente, sus ajustes, moneda, revisiones y eventos corporativos. Ningún campo llamado `adjustedClose` se acepta como prueba automática. Las diferencias materiales se devuelven con evidencia, sin cambiar arquitectura ni V1 silenciosamente.
3. `SOURCE_AVAILABILITY` y `FRESHNESS_POLICY` definen un envelope implementable con ejemplos reales por fuente. El contrato distingue publicación, primera captura, fecha del dato y decisión. Se puede optar por disponibilidad conservadora desde la primera captura; el histórico anterior seguirá sin ser un replay point-in-time acreditado. No es obligatorio demostrar superioridad de producción para empezar Builder, pero sí fijar una metodología implementable y verificable.
4. Hay testigos desde **un panel único de retornos por escenario** que producen cada Participation, Leadership, A, B y C declarados y los cinco regímenes. Las correlaciones se calculan de ese mismo panel, con ventanas completas y matrices realizables. Se prueban límites exactos y valores a ambos lados de cada umbral.
5. El prototipo numérico se evalúa fuera de producción, sin hacer fetch desde rutas públicas. Se conservan datos, comandos, outputs y diferencias frente al contrato simbólico. Una modificación metodológica requiere nueva revisión/versionado; no un patch silencioso del manifiesto.
6. El resumen de P queda actualizado a `BUILDER_READY=YES` con un vínculo inequívoco al manifiesto aprobado. Ausencia de parámetros o evidencia mantiene `NO` aunque pasen los tests conceptuales.

## Protocolo de validación de parámetros

Separar primero por **tiempo**, no por filas aleatorias: periodo de desarrollo, validación temporal y holdout intocable. Fechas, cobertura por fuente, versión del universo, número de variantes probadas y criterio de selección se registran antes de ejecutar comparaciones. Si hay investigación retrospectiva con datos revisados, rotularla como tal y nunca contabilizarla como no-lookahead.

Construir el ledger de disponibilidad antes de calcular features. Para cada decisión guardar filas admitidas/rechazadas, máximos de observación y disponibilidad, razones de exclusión, precios ajustados utilizados y hashes. Incluir fuentes faltantes, ventanas incompletas, cambios de contrato, un salto de precio por evento corporativo, crisis, recuperación y periodos tranquilos que existan en la muestra homogénea. No rellenar XLC antes de 2018 ni BTC ETF flows antes de 2024. No declarar cobertura de 2008 para el core actual de once ETFs.

Los umbrales se eligen para definiciones interpretables y estabilidad de clasificación, no para maximizar rentabilidad futura. El informe debe mostrar distribuciones de inputs, ocupación de estados, filas cercanas a límites, sensibilidad conjunta a parámetros, frecuencia de transiciones y divergencias relevantes. Un resultado aislado del 04/09 no es una muestra de calibración. Una prueba abstracta no acredita realizabilidad de matrices ni información incremental.

La evaluación de superioridad necesita criterios de utilidad registrados antes del holdout: capacidad de expresar participación/liderazgo diferentes, contradicciones y estrés, honestidad ante fallos, estabilidad y coste de mantenimiento. Cualquier métrica económica ex post se documenta como diagnóstico con su horizonte y ventana de publicación; no se utiliza para transformar el estado en recomendación ni para ajustar retrospectivamente el umbral después de ver el holdout. Si no hay evidencia suficiente, el resultado es NOT_VALIDATED, nunca un PASS por defecto.

## Builder — criterios verificables

| ID | Prueba | Aceptación |
|---|---|---|
| B01 | Versionado | Envelope nuevo con versiones de engine, features, rules, parameters, sources, freshness, universe y snapshot; hash canónico de todos los inputs. No `score_v2`. |
| B02 | Reutilización | Una sola captura por fuente/consulta; conservar crudos antes de transformaciones de presentación. No añadir fetchers por cada feature. Ningún cambio de salida V1. |
| B03 | Cobertura y fechas | Once ETFs y ventanas de sesiones completas; sesiones ausentes no se alinean por índice. Eliminar un ETF/fecha o un par degenerado da UNAVAILABLE en el pilar afectado. |
| B04 | Missing | Probar null, undefined, array vacío, NaN, Infinity, fecha inválida, demo y fallback. Ninguno se vuelve 0, 50, neutral, BENIGN o LOW. Un cero realmente observado sigue siendo válido. |
| B05 | Reachability | Todos los estados de subpilares, pilares y los cinco regímenes alcanzables desde raws coherentes. Misma tabla que el manifiesto aprobado. Pruebas de límites y prioridades. |
| B06 | Satellites | Repetir cada configuración core con BTC/GLD extremos positivos, extremos negativos, contradictorios, ausentes y stale. Régimen, pilares, regla core, concordancia e incertidumbre idénticos. Solo cambian evidencia satellite y su calidad. |
| B07 | Dependencias | Duplicar una métrica, ventana, vendor o derivación no cambia concordancia. EWMA/GARCH fallback no añade unidad; A y C comparten unidad equity. |
| B08 | Temporal | Observación pasada publicada después del corte es excluida. Último vintage futuro en caché, future rows y cambios de reloj no alteran un replay anterior. Revisión posterior no cambia el snapshot original. Probar instantes justo antes, iguales y posteriores a `available_at`. |
| B09 | Missing crítico / stress | Core incompleto → `regime_v2=null`, estado técnico INCOMPLETE. Evidencia de stress puede seguir visible, sin forzar adjudicación. Con core completo y B STRESS prevalece R01 inmediatamente. |
| B10 | Dimensiones | Datos COMPLETE pueden dar concordancia LOW e incertidumbre HIGH. Datos PARTIAL por satellite pueden mantener el mismo régimen y dimensiones core. Concordancia no evaluable es null, no LOW. |
| B11 | Determinismo | Mismo input/version/corte produce salida canónica idéntica aunque cambie orden de entrada, reloj del proceso o idioma. Empates y duplicados conflictivos tienen resolución explícita. |
| B12 | Históricos V1 | Hashes intactos de originales; pruebas existentes de informes, exportadores y VIX pasan. Aliases V1 solo en el envelope paralelo. No recalcular originales con nuevos datos. |
| B13 | Replay y comparación | CLI offline toma snapshots/versiones explícitos; exporta V1 state/score/confidence y V2 state/pillars/concordance/uncertainty/data quality, input hashes y reasons. Ausencia V1 se conserva; reconstrucción no se etiqueta como publicación original. |
| B14 | Integración shadow | V1 sigue público. La captura V2 no puede impedir que se sirvan informes o Dashboard V1 si falla. Divergencias quedan registradas con fecha, fuentes y regla, sin asumir que V2 es correcto. |

Las pruebas temporales deben ejercer el **motor real** y su acceso a caché/observaciones. La comprobación documental de esta entrega no las sustituye.

## Gates posteriores

- **Sweeper**: revisar dependencia transitiva y grupos, score oculto, conversiones missing, time travel, duplicación de caché, rutas de fallback, contradicciones y aislamiento V1. Cualquier hallazgo conceptual se devuelve con evidencia; no se repara cambiando umbrales para que pase una prueba.
- **Groweer**: ablation del motor completo menos participación, volatilidad y fragilidad; reportar explícitamente si la retirada crítica deja incompleta la lectura. Un challenger con mínimos relajados debe estar versionado por separado: no interpretar «todo queda incompleto» como prueba de información incremental. Comparar también challengers reducidos definidos de antemano, manteniendo el mismo conjunto de fechas elegibles para cada comparación.
- Benchmarks: V1 con su versión; VIX-only; VIX+breadth; voto simple **por grupo de dependencia**, nunca por métrica; régimen de ayer, que queda ausente si ayer no era clasificable. Benchmarks y V2 usan el mismo corte y ledger temporal. Guardar definiciones de cada challenger antes del holdout. V1 score/confidence son columnas históricas, no targets de optimización.
- Extensiones de crédito/rates/dólar/commodities: pasar las seis condiciones del growth gate. Los ETFs estáticos locales solo acreditan que existe un archivo; no acreditan yield, spread de crédito, DXY, actualidad ni vintage. Hysteresis sigue PARK hasta evidencia; shocks válidos no esperan confirmaciones de días elegidas arbitrariamente.
- **Maintainer**: fallos de fuente, stale, parcial, malformed y timeout; hashes y versiones; logs sin credenciales; caché con disponibilidad original; medir latencia y tamaño antes/después con la misma carga, separar fetch y evaluación. Rollback desactiva UI V2 y recupera UI V1 sin migración destructiva. Verificar ES/EN, rutas, informes, históricos y exportaciones.
- **Designer**: únicamente tras estabilizar el motor. Etiqueta de régimen, impulso, freno y vigilancia; evidencia y metodología accesibles. Sin score equivalente, estrellas, medidor ni porcentaje de confianza. Pruebas desktop/mobile ES/EN, teclado, lectores de pantalla, texto largo, missing y todos los estados. No se declara un tiempo de lectura de 20 segundos sin la comprobación correspondiente.

## Release

Todos los roles y gates del handoff deben pasar, incluidos histórico estricto, comparación paralela, ablation/benchmarks, no-lookahead, no-doble-conteo, degradación y rollback. Antes de cutover: V1 público, V2 shadow, divergencias investigadas. La aceptación explícita del usuario se solicita sobre un candidato concreto ya validado; esta entrega no solicita ni presupone esa aceptación.

## Comprobaciones de esta entrega

Solo se añaden documentos, registros JSON y una prueba conceptual sin imports de la aplicación. Se ejecutan el checker y pruebas existentes de compatibilidad por su relevancia para el handoff. Typecheck, lint global, build, SEO, QA visual y publicación corresponden a cambios de producción posteriores y no se marcan PASS aquí. Los resultados reales y cualquier fallo preexistente se registran en `validation.json` y `preservation.json`.
