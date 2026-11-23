# Publicación y actualización de McClellan

Decisión del usuario: publicación de los indicadores agregados y automatización, confirmada después de discutir las restricciones y la incertidumbre sobre su alcance. No se ha acreditado una nueva licencia del proveedor original ni se afirma que cualquier responsabilidad corresponda exclusivamente a DeanFI.

## Decisión de fuente

Se mantiene DeanFI para los conteos agregados de amplitud y se calculan aquí RAMO/RASI. Su [README](https://github.com/DeanFinancials/deanfi-data#%EF%B8%8F-disclaimers) declara uso personal y comercial gratuito, a la vez que remite a condiciones de sus proveedores. La [ayuda de Yahoo](https://uk.help.yahoo.com/kb/SLN2310.html) restringe redistribuir su información; no hemos acreditado que esa indicación resuelva por sí sola el tratamiento de nuestros indicadores agregados. La conclusión anterior de bloqueo absoluto era demasiado tajante. Esta decisión operativa no constituye una certificación de licencias ni una conclusión jurídica de ausencia de riesgo.

El sitio no sirve archivos de precios individuales de Yahoo ni el archivo original de DeanFI. Solo muestra conteos de amplitud y resultados del cálculo propio. No se añade un endpoint público de descarga de la fuente, cotizaciones o historial OHLCV. La atribución a DeanFI y el enlace a McClellan permanecen visibles.

Alternativas verificadas, sin sustituir el proveedor:

| Fuente | Resultado |
| --- | --- |
| [MarketParquet](https://marketparquet.com/license) | Autoriza publicar agregados derivados no reversibles al comprar el archivo. La [muestra gratuita](https://marketparquet.com/guides/free-historical-stock-data) no concede esa licencia comercial y solo cubre aproximadamente un año. No satisface cero costes. |
| [Twelve Data](https://twelvedata.com/terms) | El nivel gratuito no permite uso comercial; la exhibición externa requiere derechos adicionales. No resuelve el objetivo gratuitamente. |
| [Johnbrick123/sp500-data](https://github.com/Johnbrick123/sp500-data) | Histórico amplio, pero incluye Yahoo, Tiingo y CRSP. Cambiar a otro repositorio no demuestra resolver la cadena de permisos. |

## Operación

- Mismo cálculo de ratio, EMA 10%/5%, semillas cero, K=0 y 250 observaciones de calentamiento. Ninguna modificación de las fórmulas.
- Se fija cada descarga a un commit inmutable del archivo de amplitud y se calcula el identificador Git del contenido. Las respuestas están acotadas en tiempo y tamaño; sin seguir redirecciones.
- Se verifica el esquema, universo, fechas, calendario, conteos, continuidad, sumas y cierre antes de aceptar un nuevo resultado. El calendario NYSE se amplía a 2027–2028 según [ICE/NYSE](https://ir.theice.com/press/news-details/2025/NYSE-Group-Announces-2026-2027-and-2028-Holiday-and-Early-Closings-Calendar/).
- Se reutiliza la caché persistente Next/Vercel con revalidación horaria. Los fallos de actualización conservan su último valor válido. Un arranque sin dato válido muestra indisponibilidad, nunca ceros inventados.
- Se comprueba la frescura al consumir la copia guardada. Un corte atrasado se identifica y no genera observaciones metodológicas nuevas.
- Una tarea nativa de Vercel consulta diariamente a las 17:00 UTC, también sin visitas. Hobby puede ejecutarla dentro de esa hora; no se promete precisión al minuto. La ejecución usa una credencial propia del proyecto y no cambia la protección de los despliegues.
- La tarea valida la fuente antes de marcar la caché como vencida, solicita la actualización en segundo plano y marca `/dashboard` para regeneración. El refresco no cambia los caches ni los cálculos de otros módulos.
- La hora elegida permite que la fuente haya regenerado el histórico durante la sesión siguiente. Se conserva el margen conservador de una hora sobre el cierre **también en la hora de generación del proveedor**. Si la fuente solo publicó intradía o antes de ese margen, el último día queda excluido hasta una regeneración posterior. No se garantiza el cierre del mismo día ni se presenta un intradía como definitivo.
- No se contratan proveedores, base de datos ni almacenamiento adicionales. Se usa el proyecto Hobby existente; no se activa una ampliación de plan ni facturación por extras. Cron y ejecución consumen las cuotas existentes del plan.
- Los indicadores no se añaden al score de riesgo ni se denominan NYMO/NYSI oficiales de NYSE. La regla de observación es estructural, prioriza un episodio y no utiliza +500 como umbral validado del S&P 500.

## Publicación aislada

La base es el commit que sirve producción `f0e43ebc5124907c1139a10a89d0d19a3ca354f1`, árbol `32748f33ac2281b7d11f422515afa60aa71cdf9c`. El candidato incorpora únicamente el módulo McClellan, su cargador/cálculo, pruebas y tarea diaria. No se publica el conjunto de cambios locales acumulados ni se alteran Statistical Levels, informes o flujos de capital.

La vista española recibe el módulo aprobado. Se conserva la ruta local de revisión solo en desarrollo. La publicación no incorpora textos españoles al dashboard inglés.

## Validación

29 pruebas de fórmula, calendario, inicialización, condiciones de interpretación, fuente versionada, límites, errores, caducidad y autenticación de la tarea. Comprobación adicional de TypeScript y ESLint. En la copia real contrastada, se obtienen 251 sesiones maduras hasta el 20/11/2026, RAMO −95,3 y RASI +74,8, coincidentes con el preview aprobado.

Estado de despliegue: pendiente de verificación alojada. Se registrará el resultado observado tras la publicación; este documento no acredita por sí solo que ya esté activo.
