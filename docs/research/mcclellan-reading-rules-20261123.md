# Lectura metodológica McClellan del S&P 500

Fecha de revisión: 23/11/2026. Ámbito: preview local `/dashboard/preview-mcclellan`.

## Fuentes originales y alcance

| Fuente primaria | Qué documenta | Qué no trasladamos automáticamente |
| --- | --- | --- |
| [Calculating the McClellan Oscillator](https://www.mcoscillator.com/learning_center/kb/mcclellan_oscillator/Calculating_the_McClellan_Oscillator/) | Diferencia entre EMA con constantes 10% y 5%; los nombres 19/39 son equivalencias de suavizado, no ventanas que descartan datos antiguos. | No implica que basten 39 observaciones ni fija nuestra confirmación de dos cierres. |
| [Ratio Adjusted Summation Index](https://www.mcoscillator.com/learning_center/kb/market_data/ratio_adjusted_summation_index/) | Entrada `1000 × (A−D)/(A+D)`; los valores sin cambios no forman parte de ese denominador. | El ratio normaliza escala; no convierte el universo S&P 500 en NYSE ni corrige cambios históricos de composición. |
| [Summation Index and Zero](https://www.mcoscillator.com/learning_center/kb/market_data/summation_index_and_zero/) | Cero neutral para la versión ajustada; +1000 es la convención clásica sin ajustar. | No se añade +1000 al RASI propio. |
| [Oscillator Breaking Zero](https://www.mcoscillator.com/learning_center/kb/mcclellan_oscillator/oscillator_breaking_zero/) | Un cruce de cero debe interpretarse dentro de la estructura previa; un RAMO negativo tras fortaleza tiene matices diferentes. | No se equipara un cruce aislado a un cambio del precio. |
| [Summation Indices’ Messages](https://www.mcoscillator.com/learning_center/weekly_chart/summation_indices_messages/), 04/10/2013 | Discute recuperación desde debilidad, máximo del rebote y giro; +500 pertenece a una zona interpretativa, no a una frontera binaria. | No se codifican +300/+500/+700 como niveles válidos para este S&P 500. |
| [RASI Stalled at the +500 Level](https://www.mcoscillator.com/learning_center/weekly_chart/rasi_stalled_at_the_500_level/), 15/05/2026 | Ejemplo de la NYSE con caída previa, recuperación, máximo y giro posterior. Reitera que +499/+501 no separan automáticamente fracaso y éxito. | No se diagnostica fracaso por estar debajo de +500, ni se replica su conclusión sobre precios. |
| [Understanding Oscillators and Other Indicators](https://www.mcoscillator.com/download/docs/UnderstandingOscillators.pdf), páginas impresas 6 y 10–12 | Inicio en cero de las EMA de amplitud, maduración, riesgo de redondeo y calibración `SI = K − 9F + 19L`. | La sugerencia histórica de aproximación tras 35–40 sesiones no sustituye nuestro calentamiento conservador. |

Las reglas siguientes son decisiones operativas propias para seleccionar texto interpretativo. No son reglas oficiales, umbrales validados para el S&P 500 ni señales de inversión. No se calculan divergencias con precios: no se incorpora ninguna serie de precios.

## Reglas operativas implementadas

Se reciben exclusivamente las observaciones maduras del cálculo existente. Se analiza todo ese historial, independientemente de la ventana visible de 20/60/120 sesiones. Se exigen al menos 60 observaciones maduras disponibles antes de confirmar una lectura. Ninguna regla modifica RAMO/RASI.

| Prioridad | Condición objetiva | Lectura |
| --- | --- | --- |
| 1 | Al menos 3 RAMO negativos consecutivos antes de un mínimo con RASI negativo; rebote con al menos 3 RAMO positivos consecutivos; máximo local del RASI dentro de las 60 sesiones posteriores al mínimo; después, 2 RAMO negativos consecutivos. | El rebote de la amplitud ha girado a la baja. Se muestran mínimo y máximo con valores y fechas. |
| 2 | Cruce de signo del RASI y 2 cierres consecutivos del nuevo lado de cero. | El saldo acumulado ha pasado a positivo/negativo. |
| 3 | Cruce de signo del RAMO y 2 cierres consecutivos del nuevo lado de cero. | El impulso reciente ha pasado a positivo/negativo, matizado por el signo actual del RASI. |

Detalles de los rebotes:

- Un retroceso de un solo cierre no confirma un giro. Si después aparece un máximo superior, se actualiza el máximo del mismo rebote.
- El máximo puede identificarse como candidato al observarlo, pero el giro se confirma únicamente dos cierres después. No se retrodata la confirmación al máximo.
- Un nuevo mínimo inferior al origen invalida el candidato y permite reconstruir el contexto desde el nuevo mínimo. Una meseta usa la última fecha del máximo compartido.
- La recuperación debe partir de saldo negativo, pero no de un supuesto nivel de sobreventa NYSE. No se exige una amplitud mínima ni se afirma que cualquier subida desde negativo sea una recuperación suficiente del precio.
- No existe una condición `RASI < 500`, ni equivalente escalado. La terminología automática es «giro», nunca «rebote fallido» o «fracaso».

Selección y repetición:

1. Como máximo una lectura activa. Prioridad: giro estructural, cruce del RASI, cruce del RAMO. En empate, la confirmación más reciente.
2. Cada episodio tiene identidad estable basada en versión, clase y fechas de origen/máximo o cruce. No se crea otro evento cada día mientras la condición persiste.
3. Duración máxima: cinco cierres, contando el de confirmación. Expira antes si el signo que justifica el mensaje se contradice. Un rebote girado deja de estar activo si reaparece RAMO cero/positivo.
4. No hay notificaciones, sonido, toast, rol `alert`, persistencia de avisos, tareas ni envío externo. La lectura es un bloque editorial persistente durante el episodio, no una alarma que se repite.
5. La fecha del cierre utilizado se distingue de la fecha de confirmación. Explorar una sesión o cambiar la ventana del gráfico no altera ni reactiva el mensaje del último cierre.
6. Datos atrasados, corte distinto al último punto, historial insuficiente, fechas inválidas/duplicadas/desordenadas, valores no finitos o incumplimiento de `ΔRASI = RAMO` suprimen el bloque. Cierre/calendario/huecos y calentamiento se validan previamente por el cargador existente.

Estas duraciones, prioridades y caducidades son convenciones editoriales revisables, no estimaciones estadísticas de eficacia. Un resultado no es una previsión de precio ni un componente nuevo del régimen de riesgo.

## Guía compacta de signos

| RAMO | RASI | Interpretación propia |
| --- | --- | --- |
| + | + | Fortaleza acumulada mejorando |
| − | + | Deterioro reciente con saldo positivo |
| + | − | Recuperación inicial con saldo negativo |
| − | − | Debilidad reciente y acumulada |

Se comparan valores internos sin redondear. Cero exacto es neutral y no se fuerza a un cuadrante. La guía está plegada por defecto y destaca únicamente la fila del último cierre disponible, con su fecha. Describe amplitud: no mide entradas/salidas monetarias observadas ni da recomendaciones.

## Auditoría de cálculo e inicialización

No se cambian proveedor, archivo de entrada, calendario, exclusión intradía, semillas, factores EMA, suma, ni redondeos. El preview sigue restringido a `NODE_ENV=development`; la barrera de producción precede a la lectura del archivo privado. Datos reales y series permanecen fuera del checkout y de `public/`.

Revisión del snapshot privado ya utilizado, con corte de observación 23/11/2026 17:00 UTC:

| Comprobación | Resultado |
| --- | --- |
| Commit de fuente | `f06bce38de7e17ed985b21747b1f4abbb5e1fc01` |
| Blob de fuente | `a23fe5a1a4d9d3e0cc0d6e59923dbc91df44d775` |
| Filas originales / candidatas cerradas | 501 / 500 |
| Periodo calculado | 22/11/2024–20/11/2026 |
| Fila abierta excluida | 23/11/2026 |
| Sesiones ausentes | 0, según el calendario ya implementado |
| Semillas | EMA rápida = EMA lenta = suma = 0 antes de la primera sesión |
| Calentamiento | 250 observaciones; se ocultan las primeras 249 y se admite la número 250 |
| Primer punto visible / último | 21/11/2025 / 20/11/2026 |
| Observaciones maduras | 251 |
| Error absoluto máximo de `RASI − (19L − 9F)` | `1,74 × 10⁻¹¹` |
| Sensibilidad de semillas en primer punto visible | Diferencia RAMO `0,001357`; RASI `0,025778` |
| Sensibilidad de semillas en último punto | Diferencia RAMO `3,66 × 10⁻⁹`; RASI `6,95 × 10⁻⁸` |

La sensibilidad compara las semillas actuales con ambas EMA iniciadas en el primer RANA, asignando a la suma alternativa el valor inicial coherente `19L₀ − 9F₀`. Esto aísla el efecto de las semillas sin introducir un desplazamiento arbitrario del RASI. El calentamiento reduce ese efecto, no elimina revisiones de fuente ni garantiza independencia de la composición histórica.

En el episodio actual, la confirmación se produjo el 17/11/2026, después del máximo del 13/11. Su identidad se mantiene al evaluar los cierres del 17, 18, 19 y 20/11. El mínimo contextual es del 02/10. La breve caída del 06/11 no produjo giro confirmado y fue superada por un nuevo máximo. El nivel +500 no interviene en esa selección.

## Validación y reproducción

Pruebas unitarias de interpretación y cálculo:

```sh
node --test lib/dashboard/mcclellan-reading.test.mjs scripts/research/mcclellan-sp500.test.mjs
npx tsc --noEmit --incremental false
```

Se comprueban los cuatro signos, cero exacto, precisión, contexto previo, rebote aún creciente debajo de +500, confirmación posterior al máximo, recuperación de un retroceso aislado, prioridad única, identidad/caducidad, invalidación y supresión por datos insuficientes o inválidos. Las nueve pruebas existentes de cálculo siguen formando parte de esta comprobación.

Resultado: 23/23 pruebas PASS; TypeScript y ESLint de los archivos de implementación/prueba sin errores. La auditoría del snapshot verifica la inicialización y la calibración descritas arriba. El navegador muestra una sola lectura, conserva su identidad al cambiar ventanas y explorar sesiones, y abre/cierra la guía por teclado. La fila destacada al cierre es RAMO negativo / RASI positivo. La tabla conserva diez filas y el contexto sus cuatro secciones. Sin errores ni avisos de consola en esta revisión.

Revisión visual/funcional: guía plegable por ratón y teclado, criterio explicable, artículo original enlazado, fecha del cierre y confirmación diferenciadas, una sola lectura estable al cambiar 20/60/120 y explorar sesiones, tabla/contexto existentes conservados. Comprobación visual en el ancho habitual del navegador. No se realiza despliegue ni publicación.
