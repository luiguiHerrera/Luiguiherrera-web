# Gestión de deudas · Cierre funcional H19–H22

Las cifras de amortización proceden del mismo calendario mensual en unidades monetarias menores. Se conserva el orden de pagos de avalancha y bola de nieve, el límite de 600 meses y la trazabilidad de cada abono.

## Comparación con la versión pública

| Hallazgo | Lectura anterior | Lectura del candidato |
| --- | --- | --- |
| H19 · Capacidad y cobertura | El flujo compatible podía leerse como un plan suficiente | En el caso de 4.000 € de ingreso, 1.000 € de gastos y 50 € de presupuesto ordinario, el hogar tiene capacidad para los mínimos modelados. El presupuesto deja 250 € pendientes inicialmente. La liquidación matemática sigue en el mes 20 y el calendario registra 19 cierres con mínimos pendientes. |
| H20 · Reserva y efectivo | El margen principal reflejaba la reserva de todo el presupuesto | Con 2.000 € de ingreso, 1.000 € de gastos y 1.500 € de presupuesto, la reserva deja −500 €. Una deuda de 10 € liquidada en el primer mes deja 1.490 € de presupuesto sin usar y +990 € de margen tras el pago ordinario. |
| H21 · Información parcial | El estado agregado podía ocultar un déficit conocido o sugerir una protección indeterminada | El déficit de −500 € permanece visible con mínimos desconocidos. La cobertura del fondo queda indeterminada cuando falta el saldo. |
| H22 · Liquidación condicionada | La cifra de plazo podía leerse como ejecutable aun con insuficiencias en el calendario | La liquidación queda identificada como hipotética. Se muestran los cierres afectados y el importe pendiente. Un abono extraordinario de 950 € en el primer mes del caso H19 cubre los 250 € pendientes y deja el saldo en cero ese mes, condicionado al abono. |

El margen reservado resta el presupuesto declarado del flujo tras los gastos ordinarios. El margen efectivo ordinario resta únicamente el desembolso ordinario del mes indicado. Los abonos extraordinarios aparecen por separado. Si el calendario está incompleto, la lectura de cobertura queda acotada a la parte calculada. La suma de faltantes al cierre recoge las incidencias de cada mes y no representa un saldo pendiente ni un importe acumulado exigible.

Las comparaciones mantienen las diferencias con signo de coste y plazo. Se limita su interpretación cuando varían los faltantes por deuda y mes, o cuando la cobertura no puede verificarse durante todo el recorrido. La simulación no evalúa el cumplimiento jurídico ni contempla demora, penalizaciones o vencimiento anticipado.

## Evidencia automatizada

- 20 pruebas aprobadas, incluidas las 12 existentes y ocho nuevas pruebas para H19–H22.
- Comparación exacta con el código publicado del resumen de cada plan, todos sus movimientos, sus abonos y sus referencias de deuda. Coinciden 2.800 configuraciones, 5.600 calendarios y 615.887 periodos.
- Referencia independiente en Python Decimal. Coinciden 24 pares de caso y método y todos los meses calculados en esos casos.

## Integración y recuperación

| Referencia verificada | Estado previo al candidato |
| --- | --- |
| Rama predeterminada de GitHub | `vercel-deployment`, en `78976843f3e73c6185e874909abf08386b9ebcc5` |
| Despliegue público y punto de recuperación | `dpl_7kcwRyoWiMNYJcR3Y5ARPpmwdDeu`, en `bbc7406e26844a0514d77e11129e4c3681429226` |
| Origen Git del despliegue público | `codex/debt-engine-review-20261128` |
| Presupuesto aprobado, incluido en el despliegue público | `6e59ff3f18fac2431361f8442783dc07033ed6c2` |
| Contenido servido por el dominio público | Páginas ES y EN con el motor de deuda nuevo verificadas por HTTP |
| Diferencia entre rama predeterminada y despliegue | Cinco commits añadidos y cero divergentes |

El candidato parte del commit publicado y añade exclusivamente las correcciones de Gestión de deudas y sus pruebas. Conserva el historial aprobado de Presupuesto, Diagnóstico y las demás secciones. Tras la aprobación expresa, se reconfirmarán la rama configurada para producción y los SHA del dominio, de la rama predeterminada y del candidato. Si la ascendencia se mantiene, se podrá adelantar la rama predeterminada al candidato sin forzar el historial. Se conservará el despliegue público de esta tabla como punto de recuperación. El cambio de la rama de producción y la publicación requieren aprobación.
