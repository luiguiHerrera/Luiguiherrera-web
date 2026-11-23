# Actualización automática de Flujos — 23/11/2026

Autorización: «haz esa parte, no podemos dejar pendientes», después de publicar el diseño y aclarar que el corte estaba congelado.

## Operación

- Vercel Cron diario `0 7 * * *` (franja 07:00–07:59 UTC; 08:00–08:59 Madrid en invierno, 09:00–09:59 en verano, según la precisión del plan Hobby), ruta `/api/cron/capital-flows`, autenticada mediante el `CRON_SECRET` ya existente. La tarea de McClellan a las 17:00 UTC se conserva intacta.
- Next Data Cache existente, mediante `unstable_cache`, una entrada por activo; revalidación adicional de una hora cuando hay visitas. No requiere el Mac, nuevos servicios, bases de datos, claves de proveedor ni dependencias.
- Solo entran en caché descargas completas y validadas, al menos 400 flujos cerrados y 252 ventanas de comparación por temporalidad. Un candidato antiguo no sustituye al anterior: debe llegar a la última sesión cerrada con el margen conservador de una hora. Un fallo de refresco conserva la entrada anterior mediante stale-while-revalidate. En un arranque sin caché válida se sirve el corte de respaldo fechado y se identifica como «Último corte conservado».
- Cada activo se valida por separado: una caída del proveedor de BTC no impide refrescar oro o SPY. El cron informa resultados parciales con HTTP 503, sin fabricar ceros.
- Se recalcula todo el histórico disponible tras cada descarga, incluyendo revisiones de NAV, participaciones o flujos publicados. Se conservan los controles de calendario, cierres, huecos, duplicados, anomalías y splits del motor existente. No se añade un histórico de filas antiguas a un universo distinto.
- `/api/dashboard/capital-flows/status` ofrece fecha efectiva, estado, momento de la descarga, huella SHA-256, universo, cobertura y métricas del mismo dato servido por el dashboard. No expone libros, participaciones, NAV, claves ni contribuciones individuales.

## Universo y fuentes

| Tarjeta | Universo fijo | Descarga |
| --- | --- | --- |
| S&P 500 | SPY | State Street, `https://www.ssga.com/library-content/products/fund-data/etfs/us/navhist-us-en-spy.xlsx` |
| Oro | GLD | State Street, `https://www.ssga.com/library-content/products/fund-data/etfs/us/navhist-us-en-gld.xlsx` |
| BTC | ETF spot estadounidenses publicados por Farside | `https://farside.co.uk/bitcoin-etf-flow-all-data/` |

Farside responde HTTP 403 a la página HTML desde Vercel. Su propio documento anuncia mediante `link[rel="alternate"][type="application/json"]` la representación REST pública `https://farside.co.uk/wp-json/wp/v2/pages/1321`: contiene la misma tabla completa en `content.rendered`. Se usa este canal público, comprobando ID 1321 y enlace canónico del archivo, sin eludir retos, utilizar cookies privadas ni suplantar un navegador. El lector y los cálculos de las filas no cambian.

**Cambio explícito:** el S&P 500 automático utiliza SPY en toda su historia, no el agregado previo SPY + IVV. BlackRock prohíbe copiar/monitorizar automáticamente su sitio sin permiso; no se incorpora ese descargador. IVV queda excluido, al igual que VOO. No se oculta ni se empalma el cambio de universo: consta en el contexto de la tarjeta y se recalculan importes, medias y observaciones.

Se mantienen las fórmulas aprobadas: suma de flujos diarios para SPY y BTC; en oro, titulares y promedios con cambio de participaciones de cada ventana × NAV final, gráfico/detalle con importes diarios. Ningún cálculo del score de régimen ni adaptador operativo existente cambia.

## Uso y límites

Se consultan las descargas públicas nominales de State Street y la tabla pública de Farside, con identificación del sitio solicitante, límites de tamaño y tiempo y sin sesiones privadas, elusión de controles ni copias de sus libros en el contenido público. Se publican cálculos derivados/agregados con atribución. No se presenta esto como una licencia general de redistribución: los términos de State Street restringen copias y transferencias, y Farside conserva sus derechos. La disponibilidad pública no equivale por sí sola a una licencia abierta. Se mantiene el alcance de publicación de derivados autorizado por el usuario; no se afirma una conclusión jurídica que las fuentes no acreditan.

Referencias consultadas el 23/11/2026: `https://www.ssga.com/us/en/footer/terms-and-conditions`, `https://www.blackrock.com/corporate/compliance/terms-and-conditions`, tabla y aviso de Farside. No se han solicitado permisos por mensajes ni contratado servicios. Coste incremental previsto: 0 €, dentro de las cuotas del alojamiento existente.

La fecha visible es la del dato, no la de la petición. El calendario compartido soporta 2024–2028 y falla explícitamente fuera de ese intervalo. «Actualización automática» significa que se comprueba y recalcula sin intervención local; no garantiza que el proveedor publique a una hora exacta.
