# Gestión de deudas
## Revisión del motor financiero para aprobación

Punto de recuperación de producción: `6e59ff3f18fac2431361f8442783dc07033ed6c2` (Vercel `dpl_JkUBZteKGDPxKLMSinRBGHDUFLKN`). Las cinco fuentes de Deudas son idénticas a las del commit auditado `78976843f3e73c6185e874909abf08386b9ebcc5`. El candidato conserva las rutas y el sistema visual. Los únicos ajustes de interfaz sirven para declarar entradas, mostrar resultados verificables y exponer supuestos. El espacio de trabajo existente quedó fuera del candidato.

## Causas

El motor anterior confundía el importe modelado con el desembolso real, llevaba comisiones fuera del presupuesto y acumulaba resultados sin un registro mensual de contrapartidas. La salida anticipada confundía estancamiento temporal con imposibilidad. El plan y la interfaz mezclaban saldo inicial con capital amortizado, viabilidad con posibilidad de liquidación, coste declarado con tasa de devengo y datos ausentes con cero. Los controles de pago competían por un máximo implícito y las comparaciones descartaban el signo de algunas diferencias.

## Matriz de hallazgos

| ID | Estado en el candidato | Solución y comprobación |
|---|---|---|
| H01 | Corregido | Presupuesto único para capital, intereses, seguros y comisiones. El mínimo identifica los costes incluidos. El caso de 1.000 y 10 al mes liquida en 12 meses con 1.120 desembolsados. |
| H02 | Corregido | Continúa hasta saldo cero, 600 meses o límite numérico. Se aplica el abono del mes 13 y el caso de dos deudas termina en el 245. |
| H03 | Corregido | Etiquetas separadas para principal, pagos, costes devengados y pagados, reducción y saldo. Coste total y plazo solo cuando hay liquidación. |
| H04 | Corregido | Calendario mensual por deuda y conjunto, con prioridades reales, obligaciones, brechas y fondos no utilizados. Los agregados se derivan del calendario. |
| H05 | Corregido | Lectura literal con validación regional. Los ejemplos problemáticos se rechazan o interpretan sin alterar su valor. |
| H06 | Corregido | Vacío, cero, error y concepto no aplicable se distinguen. Un ingreso omitido permite amortizar matemáticamente con los demás datos, con viabilidad desconocida. |
| H07 | Corregido | Selector común de las 12 monedas de Presupuesto. JPY usa importes enteros. La moneda elegida identifica todo el escenario. |
| H08 | Corregido | Unidades menores enteras, tipo periódico de precisión controlada, redondeo mensual, último pago exacto y límites explícitos. |
| H09 | Corregido | Los gastos ordinarios excluyen los pagos de deuda del simulador. El caso auditado pasa de un margen aparente de −100 a +200 cuando se declaran 1.100 de gastos sin deuda. |
| H10 | Corregido | En el caso auditado, un fondo de 3.000 dividido entre 1.000 de gastos y 500 de mínimos cubre dos meses. Con base incompleta se indica que faltan datos. |
| H11 | Corregido | Cada escenario evalúa por separado flujo mensual, cobertura de mínimos y liquidación. Es posible explorar alternativas deficitarias. |
| H12 | Corregido | Un selector elige entre sustituir el presupuesto o sumar un incremento. El cambio de modalidad limpia el valor anterior y el escenario muestra el presupuesto aplicado. |
| H13 | Corregido, convención para revisión | Avalancha clásica por tasa periódica y bola de nieve por saldo. Ambas pasan por el mismo motor, con mínimos primero y desempate por orden de entrada. |
| H14 | Corregido | Cada escenario identifica la base. Las diferencias mantienen el signo e indican aumento, reducción, empate o imposibilidad de comparar. |
| H15 | Corregido | Se muestran ambos métodos aunque los totales empaten. La prioridad inicial, la prioridad aplicada y la liquidación por deuda se exponen por separado. |
| H16 | Corregido, convención para revisión | Abonos al final del mes. Trazabilidad individual de importe programado, aplicado, sobrante, fuera de horizonte y por simular. |
| H17 | Corregido, convención para revisión | Tasa nominal, efectiva de interés o desconocida. La TAE/APR no se utiliza como tasa de devengo sin desglose contractual. |
| H18 | Corregido, TIR pendiente de aprobación | Proxy anualizado claramente descriptivo. Se presentan costes evitables, liquidez, inversión incierta y límites. La TIR incremental se estudia abajo y queda fuera de la implementación. |

## Decisiones metodológicas para revisión

| Decisión | Convención candidata | Justificación y límite |
|---|---|---|
| Entrada monetaria | Una moneda. Grupos y separador decimal de ES o EN. Precisión de la moneda. Límite de entrada de 9.007.199.254.740.991 unidades menores por importe. | Evita reinterpretaciones, pérdida de precisión y conversiones implícitas. Los importes que no caben en la precisión de la moneda elegida se marcan para corregir. |
| Tasa | Hasta cuatro decimales del porcentaje anual, máximo 1.000 %. Nominal anual en tanto por uno dividido entre 12. Efectiva anual en tanto por uno convertida con la raíz duodécima de 1 + tasa, menos 1. | Nominal conserva una fracción exacta. Para efectiva se calcula una raíz en una cuadrícula de 24 decimales con potencias enteras. El interés mensual se redondea a la unidad menor, con media unidad hacia arriba. El límite interno por saldo de (10^{18}) unidades menores mantiene el error de conversión por devengo acotado a menos de (5 × 10^{-7}) unidades menores. |
| Periodicidad y costes | Un periodo mensual, tipo estable. Comisión fija si hay saldo positivo al inicio. Se devenga sobre principal e intereses impagados, con las comisiones impagadas en un saldo separado sin devengo propio. | Permite reconciliar la amortización negativa. La capitalización del interés impagado, la falta de interés sobre comisiones impagadas y el cese de comisiones al liquidar son supuestos, sujetos al contrato. |
| Flujo del hogar | Gastos ordinarios excluyen toda deuda registrada. El presupuesto de deuda incluye todos los pagos ordinarios. Fondo dividido entre gastos ordinarios y mínimos con costes. | Evita doble conteo. Un fondo desconocido no se trata como 0. Si falta la base, no se muestra cobertura. Si se conocen los mínimos pero se desconoce la tasa, se usan compromisos declarados para la lectura del flujo. |
| Mínimos | Fijos en moneda, con opción de incluir o añadir comisión. Se limitan a la obligación restante del mes. Primero se cubren los mínimos y, si el presupuesto es inferior, se prorratea por exigible con restos mayores. | Conserva el presupuesto incluso con déficit. Los mínimos usados para resumir el flujo son los del primer periodo o los declarados cuando no puede calcularse el devengo. No simula políticas de morosidad ni mínimos contractuales variables. |
| Orden de pago | Primero se devengan los costes del mes. Se paga el presupuesto ordinario, luego los abonos por orden de entrada de cada mes. Cada pago se aplica a comisiones, intereses y principal. | El pago final se limita al importe exigible. El excedente pasa a la siguiente deuda. Los abonos se consideran condicionales a su disponibilidad. |
| Estrategias | Avalancha por mayor tasa periódica comparable. Bola de nieve por menor saldo pendiente tras los mínimos. Los empates se resuelven por orden de entrada. Prioridad al inicio para explicar el plan y otra efectiva para cada excedente. | No se atribuye optimalidad a ninguna estrategia cuando hay comisiones, restricciones o saldos distintos. |
| Horizonte y umbrales | Hasta 600 meses. Si crece cualquier saldo se contabiliza el mes, aunque otro saldo se reduzca. Umbrales de presión anteriores de 30 %, 40 %, 50 % y 60 %. | El crecimiento temporal no prueba imposibilidad. Los límites y las alertas son técnicos o educativos, según corresponda. |
| Proxy anualizado | 12 × (interés del primer mes y costes recurrentes del primer mes respecto al saldo inicial), usando los intereses antes de redondear. | Es un índice descriptivo. Excluye costes iniciales, impuestos, futuros costes contingentes y penalizaciones, y puede diferir de la TAE. |

### TIR incremental en estudio

Para comparar un abono con un plan de referencia, se alinean ambos calendarios en el mismo eje temporal y se calcula el flujo diferencial `pago_referencia − pago_alternativa`. Una TIR mensual resolvería `Σ Δflujo[t] / (1+r)^t = 0`, incluyendo un posible pago en `t=0`. Una tasa comparable anual sería `(1+r)^12 − 1`. Se requerirían costes evitables reales, penalizaciones, momento de los pagos, horizonte común y liquidación de ambos planes. Con varios cambios de signo puede haber varias soluciones o ninguna. La utilidad del indicador también depende del coste de oportunidad y de la liquidez. Se mantiene la referencia descriptiva y esta funcionalidad queda fuera del candidato.

Referencias externas para distinguir tasa y costes: [Banco de España, cálculo de la TAE de un préstamo](https://clientebancario.bde.es/pcb/es/menu-horizontal/podemosayudarte/simuladores/calculo_tae_prestamo_personal.html) y [CFPB, diferencia entre tipo de interés y APR](https://www.consumerfinance.gov/ask-cfpb/what-is-the-difference-between-a-loan-interest-rate-and-the-apr-en-733/).

## Casos antes y después

| Caso | Producción anterior, ejecutada | Candidato |
|---|---|---|
| 1.000 de saldo, comisión 10, presupuesto 100 | 10 meses. Desembolso estimado 1.100, incompatible con ese presupuesto mensual. | 12 meses. Pagos 1.120, comisión 120 y pago final de 20. |
| 1.000 al 12 % nominal, pago 10 y abono 1.000 en mes 13 | Se detiene al mes 12. Abono sin aplicar. | 13 meses, se aplica el abono y el desembolso total es 1.130. |
| Dos deudas de 8.800 al 26 % y 14.700 al 28 %, presupuesto 525 | Sin liquidación por parada anticipada. | 245 meses bajo capitalización mensual. El coste de 104.994,41 muestra el impacto de la duración y las obligaciones declaradas. |
| 1.000 al 12 % nominal, pago 5 | Se detiene en el 12. Presenta principal inicial como pagado y 1.123,41 como total financiero estimado. | Al mes 12 se registran 60 en pagos, 123,41 en interés devengado y 1.063,41 de saldo. Sigue hasta 600 meses, sin mostrar coste de liquidación. |
| Caso de comisiones y aumento de 800 a 850, avalancha | 28 a 26 meses, coste de 6.176,15 a 6.286,75. El incremento de 110,60 aparecía como cero. | 38 a 35 meses, coste de 9.284,23 a 8.446,35. Diferencias del candidato: −3 meses y −837,88. El cambio de convención y la estrategia clásica alteran el resultado. La prueba de regresión verifica ambos signos. |

## Pruebas reproducibles

```sh
node --experimental-strip-types --test lib/debt/*.test.ts
```

La referencia independiente ejecuta Python `decimal` con 70 dígitos y verifica 24 pares de caso y método, comparando cada periodo, los pagos, los costes, el saldo y las liquidaciones. Se añaden comprobaciones analíticas para préstamos sin interés, cuotas constantes y la tasa mensual equivalente. La semilla `0x5acc2026` genera 2.800 configuraciones (1.800 con comisiones, 1.000 sin comisiones), 5.600 calendarios y 615.887 meses reconciliados. Las pruebas cubren los límites, la determinación de resultados y que los cargos cesen tras liquidar. Las cifras generativas pertenecen a este candidato, no reproducen la muestra original de la auditoría.

## Límites abiertos

El calendario no simula tasas promocionales o variables, penalizaciones, vencimientos especiales, prelación contractual diferente, nuevas disposiciones ni estados jurídicos de mora. El importe o la fecha de un abono futuro son datos condicionales. Las comisiones que sobrevivan a la cancelación deben tratarse aparte. La TIR queda excluida hasta aprobación metodológica. La simulación es educativa.
