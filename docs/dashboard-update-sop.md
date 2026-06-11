# Market Regime Dashboard Update SOP

Este documento define como mantener el Market Regime Dashboard de forma manual, prudente y trazable mientras no existan adapters de datos automatizados.

## Modulos del dashboard

### FedWatch

Resume probabilidades implicitas de tasa a partir de futuros Fed Funds. Su funcion es dar contexto sobre expectativas de politica monetaria, costo del dinero y apetito por riesgo.

Fuente conceptual: CME FedWatch.

### Rotacion sectorial

Usa ETFs sectoriales como proxies para observar liderazgo y rezago relativo entre sectores. Debe mostrar performance semanal, performance mensual, sectores lideres, sectores rezagados y una lectura defensiva, ciclica, growth, value o mixta.

Fuente conceptual: ETFs sectoriales como proxies, por ejemplo XLK, XLF, XLV, XLE, XLY, XLP, XLI, XLB, XLU, XLRE y XLC.

### VIX Term Structure

Observa VIX spot, futuros cercanos, contango o backwardation, diferencial M2-M1 y estado de volatilidad. Sirve para leer tension o normalidad relativa en la demanda de cobertura.

Fuente conceptual: CBOE / VIX.

### BTC ETF Flows

Resume flujos netos hacia o desde ETFs spot de Bitcoin. Debe mostrar flujo diario neto, flujo semanal neto, flujo de 20 dias, racha de entradas o salidas y principales contribuyentes.

Fuente conceptual: Farside BTC ETF flows.

### Radar de senales cruzadas

Cruza short interest reportado con presencia institucional reportada en 13F o fuentes equivalentes. El cruce debe presentarse como tension narrativa para estudiar, no como idea accionable.

Fuente conceptual: short interest / 13F.

### Regimen compuesto

Resume la lectura cualitativa del dashboard. Debe mostrar regimen actual, sesgo, confianza, ultima actualizacion, estado de datos, senales a favor del riesgo y senales de cautela.

Fuente conceptual: lectura compuesta de los modulos anteriores.

## Campos que deben actualizarse manualmente

En cada actualizacion revisar estos campos:

- `lastUpdated`: fecha o etiqueta de actualizacion. Debe dejar claro si es demo, manual o automatizado.
- `updateFrequency`: frecuencia esperada de mantenimiento o automatizacion.
- `dataStatus`: estado del dato: `demo`, `manual`, `live_pending` o `automated`.
- `observedData`: datos observados que se muestran en tarjetas o tablas.
- `interpretation`: explicacion de que mira el modulo, por que importa y como leerlo.
- `whatItDoesNotMean`: aclaracion explicita de lo que el dato no permite concluir.
- `reliabilityNote`: nota sobre limitaciones, retrasos, cobertura, metodologia o naturaleza demo/manual.

## Estados de datos

- `demo`: datos de ejemplo para mostrar formato, estructura o logica de lectura. No deben presentarse como actuales.
- `manual`: datos ingresados o revisados manualmente. Deben incluir fecha de actualizacion y fuente conceptual.
- `live_pending`: modulo preparado para automatizacion futura, pero aun sin conexion real a datos vivos.
- `automated`: datos obtenidos server-side desde una fuente publica o proveedor configurado, con cache, timestamp visible y fallback prudente.

## Reglas de tono

- No incluir recomendaciones personalizadas.
- No usar lenguaje de comprar o vender como instruccion.
- No usar "oportunidades".
- No presentar lecturas como prediccion.
- No decir "tiempo real" salvo que exista una fuente automatizada real con timestamp.
- Usar lenguaje de contexto, lectura, senales publicas, observacion y punto de partida.
- Recordar que los datos pueden tener retrasos, aproximaciones o limitaciones.
- Mantener disclaimers visibles cuando el modulo pueda confundirse con una senal accionable.

## Fuentes conceptuales

- CME FedWatch para expectativas de tasas.
- ETFs sectoriales como proxies para rotacion sectorial.
- CBOE / VIX para volatilidad y estructura temporal.
- Farside BTC ETF flows para flujos de ETFs spot de Bitcoin.
- Short interest / 13F para el radar de senales cruzadas.

## Frecuencia sugerida

- Tasas: semanal o cuando haya cambio relevante de expectativas.
- Sectores: semanal.
- VIX: semanal, o diario si se automatiza.
- BTC ETF flows: semanal.
- Short interest: quincenal.
- 13F: trimestral con retraso.

## Criterios para automatizar despues

Antes de conectar cualquier fuente real:

- Revisar permisos, terminos de uso y licencias de cada fuente.
- Preferir APIs oficiales o proveedores con permisos claros.
- Evitar scraping fragil o dependiente de HTML cambiante.
- Cachear datos para reducir dependencia de llamadas externas y mejorar estabilidad.
- Mostrar timestamp visible de ultima actualizacion.
- Mantener disclaimers y notas de confiabilidad.
- Conservar `dataStatus` y cambiarlo solo cuando la automatizacion sea real.
- No guardar respuestas del usuario ni introducir persistencia sin una decision explicita de producto.
