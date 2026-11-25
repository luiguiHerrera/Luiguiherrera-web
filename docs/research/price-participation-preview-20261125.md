# Precio y participación — preview 25 noviembre 2026

Alcance: nueva tarjeta después de Entorno financiero, en ES/EN. Solo las rutas de preview la incorporan y sustituyen el anterior bloque de participación; las rutas publicadas conservan su comportamiento. Las rutas de preview devuelven 404 si VERCEL_ENV=production y no se indexan.

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
