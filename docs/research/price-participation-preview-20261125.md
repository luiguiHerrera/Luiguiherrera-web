# Precio y participación — preview 25 noviembre 2026

Alcance: nueva sección Precio y participación, en ES/EN. Sigue la misma presentación de Riesgo y Flujos de capital: título lateral, cuatro métricas en recuadros y detalle inferior. Es la primera sección de métricas después de la guía, antes de Riesgo y Flujos de capital; Entorno financiero conserva su posición destacada. Solo las rutas de preview la incorporan y sustituyen el anterior bloque de participación; las rutas publicadas conservan su comportamiento. Las rutas de preview devuelven 404 si VERCEL_ENV=production y no se indexan.

## Datos y cálculo

Los precios se leen del mecanismo publicado y verificado que ya alimenta Análisis Cuantitativo, sin modificar ese módulo. Una sola selección de captura y una sola autoridad para SPY, RSP y los once ETF sectoriales. Se utilizan exclusivamente cierres diarios ajustados de drawdownHistory y la fecha daily de lastCompletedObservation. No se usan marcas intradía ni precios compactados a dos decimales. Los datos mantienen su precisión antes de la presentación.

RAMO/RASI se reutilizan del mismo snapshot de amplitud del dashboard, con fuente DeanFI y metodología existente. No se reinician EMA, calentamiento ni suma. La ventana solo cambia el histórico visible. DeanFI utiliza la composición actual del S&P 500; no son los índices NYMO/NYSI de la NYSE.

Ventanas de 5, 20 y 60 intervalos, con N+1 observaciones distintas del calendario SPY. Rentabilidad = 100 × (final/inicial − 1). RSP−SPY es la diferencia de rentabilidades, en puntos porcentuales. Misma fecha inicial y final para ambos precios y los once sectores. El corte es la última fecha compartida por SPY/RSP/amplitud; las diferencias de fechas disponibles se explican de forma discreta. Los sectores ausentes no retrasan el corte: quedan fuera del denominador y se indican como no disponibles. No hay interpolación ni sustitución por cero.

## Actualización

Reutiliza el productor alojado de precios y el de amplitud ya existentes. Lectura de una captura inmutable con la verificación existente; caché de lectura de una hora. No requiere ordenador local ni nuevos proveedores de pago. La caché conserva su respuesta previa si una revalidación falla; Next no expone el resultado de la revalidación en segundo plano a esa respuesta, por lo que no se promete un aviso de fallo de precios en tiempo real. Siempre se conserva y muestra la fecha efectiva. el lector de publicaciones puede utilizar la última captura incluida y válida cuando el origen alojado no responde, conservando sus fechas efectivas.

## Comprobación inicial de precios

Captura de precios incluida: 20261124T193613737Z-20cce8ff-eb29-4000-82b5-f777a76d4ecd. Última sesión cerrada: 23 noviembre 2026. La fuente pública de amplitud consultada corresponde al commit 2aff937cfb1489281af9866dc42ec3e34ae41b12 y termina también el 23 noviembre: RAMO −48.384571909091356 y RASI +26.397909891092304. Su actualización del día siguiente está pendiente y se avisa de forma discreta. El corte común se verifica de nuevo en el preview alojado.

Para corte 23 noviembre, las comparaciones de 5/20/60 sesiones son 16 noviembre / 26 octubre / 28 agosto, respectivamente. Para 20 sesiones: SPY 765.369995 → 722.289978; RSP 217.289993 → 212.820007. Rentabilidades −5.628652 % y −2.057152 %; diferencia +3.571500 pp. Cinco sectores positivos de once con ambos extremos válidos.

## Verificación

El modelo cuenta con pruebas de los extremos exactos, fechas duplicadas, valores ausentes, signos, precisión original, comparaciones, ranking, denominador, ausencia de fuentes, exportación y conservación de RAMO/RASI. La fuente se verifica por separado con pruebas sin credenciales ni red. Revisión visual y de interacción sobre preview alojado antes de entregar.

Sin modificación de OFR, AC, índices propios ni automatizaciones de producción. Sin merge ni publicación de esta tarjeta en producción.

## Segunda revisión visual — 25 noviembre

El selector y las fechas de comparación pasan al interior del detalle. Las rentabilidades y barras sectoriales negativas usan rojo tenue, conservando los signos. Se restaura la selección de un sector, su cierre ajustado con unidad USD, rentabilidades de 5/20/60 sesiones, posición en el ranking y gráfico de cierres. El movimiento sectorial compara la ventana seleccionada con la ventana anterior adyacente de igual número de intervalos; se indican sus fechas y la variación de rentabilidad en puntos porcentuales. Si no hay datos comparables, se muestra como no disponible.

Los gráficos recuperan líneas horizontales de mínimo y máximo observados. En RAMO/RASI, el relleno verde claro por encima de cero y rojo claro por debajo describe únicamente el signo del dato. No representa nuevos umbrales, riesgo ni señales operativas. Los valores ausentes siguen separando los tramos dibujados.

## Ajuste de disposición del movimiento sectorial

El movimiento se limita al ETF seleccionado y se integra a la derecha de su gráfico de precios; en móvil se apila debajo. Conserva ambos periodos, retornos, diferencia en puntos porcentuales y puestos de la cohorte comparable. Cambiar de ETF actualiza conjuntamente el gráfico y este detalle. Se retira la tabla global de movimientos del contenido visible; el modelo y los datos se conservan.

## Publicación aprobada — 25 noviembre 2026

El usuario aprueba publicar la última revisión (bfbd2cc). Las rutas /dashboard y /en/dashboard incorporan el mismo getter y componente revisados en preview, con lectura paralela de OFR y precios. Precio y participación reemplaza el bloque anterior de participación y queda primero entre las secciones, después de la guía. La presentación aprobada, los cálculos, fuentes y automatizaciones no cambian. Las rutas temporales de preview siguen excluidas de producción.

## Preview de posición del selector — posterior a publicación

Se agrupa el selector en una cabecera interna del desplegable: título, alcance y fechas a la izquierda; sesiones a la derecha. En móvil, el control se distribuye bajo el título dentro de la misma cabecera. Conserva estado global, cálculos, datos y cierre nativo. Esta revisión visual se entrega únicamente en preview; producción permanece en 9236fc6 hasta nueva aprobación.
