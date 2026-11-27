# Acta de validación del diagnóstico

Fecha: 27 de noviembre de 2026. Candidato de preview; producción sin cambios.

## Versiones y alcance

- Producción de referencia: `55818571fe5f4c719a310d087dc5855fb26c17f2`.
- Los ocho archivos originales del diagnóstico son idénticos a los del commit auditado `c3532d95de137672f6508bb4c740943be65c8acb`.
- Recorridos de navegador sobre `cd1802b93c5d53a5abe1b301be7606aaafc267bb` y `e73267d0714b0ce7770b4d50580afe9f64ffa738`. El motor y cuestionario son iguales entre ambos. El segundo incorpora descarga de texto y sincronización de modalidad en la URL.
- El cierre posterior cambia solo textos de interpretación, formato del texto descargado y documentación; no cambia puntuaciones, restricciones, preguntas ni rutas. La señal roja se llama «Prioridad de revisión», para no confundir una limitación del capital con desorden de toda la situación financiera.
- Archivos intervenidos: `lib/diagnostic`, los tres componentes del diagnóstico y esta documentación. Sin dependencias nuevas, cambios globales, otras herramientas, automatizaciones ni datos históricos.

## Pruebas automatizadas

**62 aprobadas, 0 fallidas**, con Node test runner. ESLint del ámbito del diagnóstico y `git diff --check` sin errores.

```sh
node --import ./scripts/trends-test-register.mjs --test lib/diagnostic/scoring.test.ts lib/diagnostic/presentation.test.tsx
npx eslint lib/diagnostic components/diagnostic
```

Incluyen los 15 perfiles sustantivos en rápida y completa, más cuestionarios incompletos e inválidos. También:

- Sensibilidad financiera y de liquidez manteniendo las otras respuestas constantes.
- Independencia entre tolerancia declarada, capacidad, conocimientos, experiencia y preparación.
- Relaciones hipotéticas inferior, equivalente y superior.
- Brechas de apalancamiento, opciones, cortos y cripto que permanecen al añadir productos simples.
- Exclusión de «ningún producto», preguntas adaptativas, eliminación de respuestas inactivas y progreso.
- Validación de cada pregunta activa; tipos, opciones desconocidas, duplicados y entradas vacías.
- 192 combinaciones adicionales con semilla **por modalidad**, determinismo y paridad numérica ES/EN.
- Resumen impreso, texto descargable, rutas localizadas, parámetros de URL y ausencia de APIs de transmisión/almacenamiento en el diagnóstico.

Vercel compiló el candidato `e73267d…` con estado READY y `target: null` (preview). GitHub CI [46078460025](https://github.com/luiguiHerrera/Luiguiherrera-web/actions/runs/46078460025) finalizó en success. Un `tsc` aislado local encontró dependencias ajenas que faltan en ese entorno; no se modificaron. La compilación desplegada y CI utilizaron las dependencias del repositorio de producción.

## Comparación antes/después

Respuestas ficticias reproducibles de `scoring.fixtures.ts`; **no** son las 205 respuestas originales, que no se recibieron. P/A/I significa Producir/Administrar/Invertir.

| Caso, modalidad rápida | Antes | Candidato |
|---|---|---|
| Experto con estructura frágil | P/A/I 19/47/45; rojo, Orden; AC | 19/47/45; rojo, Orden; **Deudas**. Capacidad de pérdida 25 → 12 por el impacto económico declarado. |
| Necesidad casi segura del capital en 12 meses | 88/78/83; verde, Expansión; AC | 88/78/85; **rojo, Preparación; Presupuesto**. Restricción del capital que prevalece sobre el índice educativo. |
| Ingresos inciertos | Verde, Expansión; AC | **Amarillo, Preparación; Presupuesto**. No se presume automáticamente ausencia de patrimonio. |
| Sin excedente | Verde, Expansión; AC | **Rojo, Orden; Presupuesto**. |
| Sin fondo separado | Amarillo, Expansión; AC | **Rojo, Orden; Presupuesto**. |
| Gran capacidad, caída declarada de 5% | Declarado «Crecimiento dinámico» | **Preservación**, con el 5% visible; capacidad y escenarios se muestran aparte. |
| FOMO | Verde, Expansión; repetir diagnóstico | **Amarillo, Preparación; Simulador**. |
| Experto sólido | 89/86/83; verde; AC | 89/86/85; verde; AC. |
| Entrada vacía | El motor devolvía una lectura con valores base | **Rechazo de validación; sin resultado**. |

La comparación numérica de las 30 ejecuciones principales está en [regression-20261127.json](regression-20261127.json). No se interpreta una subida de Invertir tras retirar tolerancia de su fórmula como una mejora real del usuario: cambia la definición del índice.

H06 se reprodujo además con una combinación rápida de baja tolerancia y conceptos incorrectos: el código anterior devolvió declarado «Crecimiento moderado» y bajo presión «Crecimiento dinámico», pero escribió «queda por debajo». El candidato devuelve declarado «Preservación» y respuestas hipotéticas «Crecimiento dinámico», explicando correctamente **superior**. Las respuestas y salidas están en [h06-regression-20261127.json](h06-regression-20261127.json). Las tres direcciones están cubiertas por regresión.

## Recorridos completos en navegador

Todas las respuestas se introdujeron mediante los controles visibles. No se inyectaron resultados ni estado React. **Cinco recorridos terminados, 208 preguntas contestadas**:

| Recorrido | Preguntas | Evidencia del resultado |
|---|---:|---|
| Rápida ES, experto frágil | 28 | Rojo; `/deudas`; restricciones de deuda, excedente, ingresos, fondo e impacto de pérdida. |
| Rápida EN, mismas respuestas | 28 | Rojo; `/en/debt`; mismos 18 índices y restricciones. |
| Completa ES, nueve productos, capital próximo y error de margen | 62 | Rojo; `/presupuesto`; `near_cash_need` y `product_leverage` visibles. |
| Completa EN, mismas respuestas | 62 | Rojo; `/en/budget`; mismos 18 índices, restricciones y comprobaciones por producto. |
| Rápida ES, opción «ningún producto» | 28 | Finaliza normalmente, complejidad 0, sin adaptativas. Conserva las prioridades financieras del caso. |

En los recorridos completos se observaron: ingresos 92, excedente 92, deuda 94, objetivos 92, capacidad 83, liquidez 76, horizonte 69, tolerancia declarada 25, paciencia 81, FOMO 22, euforia 18, conceptos 82, experiencia 80, expectativas 81, consistencia 81, complejidad 95, sobreconfianza 48 y calibración 67, idénticos en ES/EN. El resumen completo descargado contiene P/A/I **88/83/78**, señal roja y etapa Preparación.

No se observaron errores ni advertencias de consola en los recorridos rápidos/completos inspeccionados.

## Navegación, adaptativas y sesión

- Sin responder la primera pregunta, Continuar está deshabilitado y no aparece un resultado.
- Retroceder conserva la respuesta seleccionada; «Revisar mis respuestas» vuelve al cuestionario sin borrarlas.
- Seleccionar margen añade adaptativas; seleccionar «ninguno» desmarca los productos y reduce el total. En completa, pasar de nueve productos a ninguno cambia **62 → 51**. Volver a margen cambia **51 → 53** y el progreso baja a **96%**: sus dos respuestas antiguas ya no se conservan.
- Volver al inicio y empezar otra modalidad elimina las respuestas y actualiza únicamente `mode`. Se comprobó completa → rápida y rápida → completa. Recargar vuelve a la primera pregunta sin selección y bloquea Continuar.
- `?mode=invalid&result=true&restart=test` muestra la pantalla de inicio, sin pregunta ni resultado. Arrays y otros valores inválidos de modo también están cubiertos por pruebas de página.
- El enlace de Deudas se abre en otra pestaña. Se comprobó su destino y que el resultado original sigue disponible.
- Cambiar ES/EN conserva la modalidad de la URL; inicia una sesión nueva, como la navegación entre páginas existente. No se persisten ni transportan respuestas.

## Responsive y enlaces

Resultado completo ES: **1676, 1355, 1024, 768, 390 y 320 px**. Resultado completo EN: **1676, 1024, 768, 390 y 320 px**. Preguntas rápidas ES y EN: **1024, 768, 390 y 320 px**. En las 19 comprobaciones `scrollWidth` coincide con `clientWidth`; se inspeccionaron visualmente preguntas y resultados móviles. Los controles y paneles se apilan; se restauró el viewport normal.

Los doce destinos educativos devuelven HTTP 200 en el preview; se comprobaron también sus encabezados:

| Finalidad | ES | EN |
|---|---|---|
| Deuda | `/deudas` | `/en/debt` |
| Presupuesto, liquidez y fondo | `/presupuesto` | `/en/budget` |
| Simulador | `/proteccion` | `/en/protection` |
| Alertas y conceptos | `/protege-tu-dinero` | `/en/protect-your-money` |
| Análisis cuantitativo | `/analisiscuantitativo` | `/en/quantitative-analysis` |
| Recursos | `/recursos` | `/en/resources` |

## Resumen, privacidad y límites de la comprobación

«Descargar resumen (.txt)» descargó efectivamente un archivo UTF-8 de **4050 bytes** en el recorrido completo EN. Se leyó el archivo: contiene el 5% declarado, relación hipotética superior, todos los productos, la brecha de margen, la restricción de capital, P/A/I y `/en/budget`. El resultado permaneció en la página. El cierre editorial posterior corrige el nombre de la señal roja, evita «conocimiento validado» y limpia líneas sin respuesta específica; la cobertura automatizada del exportador sigue pasando en ES/EN.

«Imprimir / guardar PDF» llama a `window.print()` y conserva el informe imprimible con todas las restricciones y productos, comprobado por renderizado y prueba del manejador. **La inspección visual del PDF nativo no se completó**: el diálogo de impresión bloqueó la pestaña del navegador integrado; se cerró solo esa pestaña temporal. No se presenta esa parte como validada visualmente.

Se inspeccionaron el diagnóstico, sus entradas, layouts ES/EN y envoltorio de página. Las respuestas viven en memoria React. El diagnóstico no usa fetch, XHR, beacon, cookies, almacenamiento local/de sesión ni IndexedDB; no se añadieron servicios o analítica de respuestas. El Blob del resumen se crea localmente y su URL temporal se revoca.

Se comparó el inventario de recursos observados antes/después de los recorridos rápido ES y completos ES/EN. Las nuevas peticiones observadas fueron hojas de estilo, chunks y prefetch RSC del mismo dominio (Metodología, Legal y enlaces del menú). Los únicos parámetros observados fueron `_rsc` y `mode`; no se observaron respuestas, importes ni un endpoint de envío del diagnóstico. **Este inventario no captura cuerpos HTTP ni equivale a una auditoría exhaustiva de tráfico de todo el navegador**. La afirmación de procesamiento local se apoya además en el código, el descarte al recargar y la ausencia de clientes de transmisión/almacenamiento en este ámbito.

No se añaden cuentas, historial ni almacenamiento persistente. El archivo que la persona descarga voluntariamente permanece bajo su control. La herramienta sigue siendo educativa: no acredita idoneidad o conveniencia MiFID II, no recomienda una cartera ni autoriza productos. Estas pruebas demuestran coherencia de reglas en los casos comprobados, no validez psicométrica o capacidad predictiva.

## Decisiones que requieren revisión del propietario

La aprobación pendiente corresponde a la separación de perfiles, retirada del 14% de tolerancia en Invertir y renormalización proporcional, complejidad máxima, comprobaciones específicas y severidades cualitativas no compensatorias. Se documentan su fundamento, límites y valores heredados en [review-20261127.md](review-20261127.md). No se han incorporado nuevos cortes numéricos ni se ha publicado este candidato en producción.
