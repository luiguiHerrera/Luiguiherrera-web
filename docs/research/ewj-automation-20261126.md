# EWJ: actualización alojada de flujos

## Cambio

EWJ entra en el mismo proceso diario y la misma API de estado que SPY, GLD, BTC y ETH. Se mantiene su tarjeta, sus controles y su presentación ES/EN. El cron existente de Vercel (`/api/cron/capital-flows`, 07:00 UTC) valida cada proveedor por separado y solicita la renovación de la caché persistente. No requiere ordenador local, servicios adicionales ni claves nuevas.

## Fuente y convención

- Datos diarios calculados de ETFIQ: <https://etfiq.com/data/flows/funds/ewj.json>.
- Atribución: <https://etfiq.com/funds/ewj>.
- Método: <https://etfiq.com/methodology/flows>.
- Licencia: <https://etfiq.com/license/> (comprobada el 26 de noviembre de 2026).
- Universo fijo: EWJ, ETF de renta variable japonesa cotizado en Estados Unidos. Calendario de sesiones estadounidenses; no representa todos los flujos hacia Japón.
- Unidad: USD; la interfaz conserva millones de USD.
- Fórmula publicada por ETFIQ: cambio de participaciones entre dos recuentos multiplicado por el NAV del recuento anterior, fechado en el día del recuento posterior.

Se sustituye toda la anterior serie importada, que empleaba el NAV de la misma sesión. No se empalman métodos. Los importes de 1, 5 y 20 sesiones y sus promedios se recalculan sobre la nueva serie. El mes natural/móvil del proveedor puede tener 21 sesiones y no sustituye la ventana de 20 del dashboard. Los promedios usan exactamente 252 ventanas previas de igual duración, terminadas antes del inicio de la ventana actual.

La licencia del proveedor permite reutilizar sus cifras calculadas con atribución, fecha y enlace. No se incorporan ni redistribuyen sus campos de NAV, participaciones o patrimonio. Los titulares, medias e interpretaciones son cálculos del dashboard; no cuentan con aval del proveedor. No se automatiza la descarga restringida de BlackRock.

## Validación y conservación

Se exige la identidad de EWJ, esquema diario, atribución y licencia esperadas, fechas únicas ascendentes, cierres estadounidenses confirmados y NAV fechado en la sesión anterior. Se contrastan los totales publicados de 1D/1W con los flujos diarios dentro de la precisión de redondeo. Una observación explícita de cero es válida; un nulo, un hueco, una marca de split o heartbeat no revisada bloquean el nuevo candidato.

Se mantienen 400 sesiones completas para las comparaciones y los controles existentes. El historial conservado debe llevar el mismo identificador metodológico (`etfiq-previous-nav-v1`). La descarga está limitada en tiempo y tamaño y se identifica con el agente del dashboard. Se conserva su SHA-256 y fecha de adquisición.

Cada activo tiene una entrada de caché independiente. Un fallo conserva el último modelo válido con sus valores, fecha y huella originales. Un arranque sin caché usa el respaldo verificado de la misma fuente y convención. El estado de actualización compara el corte con la última sesión estadounidense cerrada; la fecha de descarga no sustituye la fecha de los datos.

## Corte verificado

Descarga real desde Vercel: 2026-11-26T14:55:48.287Z. Histórico de 400 sesiones, del 24 de abril de 2025 al 24 de noviembre de 2026. SHA-256 de los bytes originales: `6ddb4bab6ecc9cde832d7acec5196614c15c44f59879dbc8dfe8913904725c59`.

Conciliación independiente con `Decimal`: 1D = 0 USD; 5D = 1.899.396 USD; 20D = 839.645.458 USD. Sus medias de 252 ventanas previas son 24.963.995,666667; 121.545.329,146825; y 419.667.188,214286 USD, respectivamente. Se verificaron 400 fechas únicas y referencias terminadas antes del inicio de cada ventana actual.

El proveedor aún no entrega el 25 de noviembre. Ese retraso conserva el respaldo válido del 24, identificado como último corte conservado; no se presenta la fecha de consulta como fecha de datos actuales. El getter rechaza cortes anteriores a la última sesión cerrada para impedir que una regresión del proveedor reemplace el último modelo válido de la caché.

## Publicación

Este cambio se prepara en una rama y un preview. La automatización se activará en producción al aprobar y publicar el candidato; el preview no ejecuta los cron de producción.
