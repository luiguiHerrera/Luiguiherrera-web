# Análisis Cuantitativo · periodo compartido · 26/11/2026

Preview sobre `2150cd97615e2870ccfc26273ee4e4060380229c`, sucesor de la publicación de riesgo. No se publican cambios en producción.

- El periodo superior controla precio/media móvil, historial de periodos y patrones históricos. Se conserva la composición y el estilo existentes.
- YTD se añade como periodo de presentación desde el 1 de enero del año del dato observado. No modifica el esquema, hashes, fuentes ni automatización de los snapshots publicados.
- Las ventanas existentes mantienen sus cantidades de observaciones: 252/52/12 por año diario/semanal/mensual. Sus métricas y estadísticas publicadas permanecen intactas.
- El gráfico usa el historial completo de cierres ajustados y recorta después de formar la media móvil. Los valores ya publicados de la media se conservan donde existen. Full ya no queda limitado a la serie compacta.
- La tabla y sus proporciones/extremos se calculan sobre los periodos seleccionados antes de aplicar los filtros de filas. Se conserva el retorno del primer periodo, con su cierre previo fuera de ventana.
- Patrones pierde el selector independiente de ventana. 1Y/YTD incorpora muestras de retornos entre cierres ajustados completados; conserva calendario, fases presidenciales, mediana, win rate y N.
- YTD conserva los mínimos estadísticos existentes: 252/104/36 periodos para diario/semanal/mensual; no se sustituye por 5Y cuando falta muestra. La correlación YTD no disponible se identifica como tal.

Validación: 622 pruebas aprobadas, 4 omitidas y 0 fallos en el conjunto vigente; TypeScript, ESLint de cambios y compilación Next/Webpack correctos. Incluye pruebas de fórmulas contra el generador, continuidad de MA, límites de fechas, ventanas vacías al cambiar de año, ausencia de información futura, sincronización de props ES/EN y navegación/retroceso sin nuevas peticiones del mismo activo.

Revisión independiente: sin bloqueos; comprobadas las 18 combinaciones de frecuencia y periodo en SPY. Sin navegador interactivo disponible en esta sesión: queda pendiente la revisión visual de escritorio/móvil por el usuario en el preview alojado.
