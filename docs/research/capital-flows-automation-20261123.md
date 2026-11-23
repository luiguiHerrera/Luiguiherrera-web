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
| BTC | ETF spot estadounidenses publicados por TFTC | `https://www.tftc.io/bitcoin-etf-flows/data.json` |

BTC utiliza íntegramente la serie de **The Commoner Bitcoin ETF Tracker by TFTC**, no una mezcla con la copia previa de Farside. La página y la API REST de Farside responden HTTP 403 desde Vercel; no se elude ese bloqueo. TFTC ofrece JSON sin claves y una licencia expresa CC BY 4.0 para gráficos, citas y republicación, con atribución y enlace. Referencias: `https://www.tftc.io/bitcoin-etf-flows/methodology` y el campo `license` del propio archivo. La tarjeta conserva la atribución solicitada, enlace a CC BY 4.0 e indicación de que ventanas, medias y observaciones son cálculos propios.

TFTC usa SoSoValue para datos recientes y conserva un histórico de Farside; suma los fondos que informa en `netFlowUsd`. El agregado alternativo `vendorNetFlowUsd` no se sustituye silenciosamente. Se valida identidad, USD, licencia, fecha efectiva, orden, unicidad, cierre y coherencia entre total y desglose dentro de 0,01 USD por precisión numérica. Una fila con cero y sin informes se trata como ausente, no como un cero observado. Se conserva la cobertura variable del proveedor, incluido DEFI cuando aparece en su serie.

El archivo observado contiene 735 fechas desde el 11/01/2024 hasta el 20/11/2026; 16 filas sin negociación se excluyen y quedan 719 sesiones. Los titulares de BTC de este proveedor son −669,16205912 / −1.789,73566128 / −4.339,48911068 millones USD (1/5/20). Las pequeñas diferencias frente al corte anterior se deben a la fuente y su definición; toda la serie, promedios e interpretación se recalculan con TFTC. Las cifras pueden revisarse; TFTC refresca aproximadamente las últimas 300 sesiones y los informes por fondo de 30 días. No se presentan sus cifras como oficiales de cada gestora.

**Cambio explícito:** el S&P 500 automático utiliza SPY en toda su historia, no el agregado previo SPY + IVV. BlackRock prohíbe copiar/monitorizar automáticamente su sitio sin permiso; no se incorpora ese descargador. IVV queda excluido, al igual que VOO. No se oculta ni se empalma el cambio de universo: consta en el contexto de la tarjeta y se recalculan importes, medias y observaciones.

Se mantienen las fórmulas aprobadas: suma de flujos diarios para SPY y BTC; en oro, titulares y promedios con cambio de participaciones de cada ventana × NAV final, gráfico/detalle con importes diarios. Ningún cálculo del score de régimen ni adaptador operativo existente cambia.

## Uso y límites

Se consultan las descargas públicas nominales de State Street y el JSON público de TFTC, con identificación del sitio solicitante, límites de tamaño y tiempo y sin sesiones privadas, elusión de controles ni copias de sus libros en el contenido público. Se publican cálculos derivados/agregados con atribución. No se presenta esto como una licencia general de redistribución: los términos de State Street restringen copias y transferencias, ; el dataset de TFTC autoriza CC BY 4.0 con atribución. La disponibilidad pública no equivale por sí sola a una licencia abierta. Se mantiene el alcance de publicación de derivados autorizado por el usuario; no se afirma una conclusión jurídica que las fuentes no acreditan.

Referencias consultadas el 23/11/2026: `https://www.ssga.com/us/en/footer/terms-and-conditions`, `https://www.blackrock.com/corporate/compliance/terms-and-conditions`, metodología y licencia del dataset de TFTC. No se han solicitado permisos por mensajes ni contratado servicios. Coste incremental previsto: 0 €, dentro de las cuotas del alojamiento existente.

La fecha visible es la del dato, no la de la petición. El calendario compartido soporta 2024–2028 y falla explícitamente fuera de ese intervalo. «Actualización automática» significa que se comprueba y recalcula sin intervención local; no garantiza que el proveedor publique a una hora exacta.
