# Revisión de estados V2

Revisión local de la superficie candidata y de sus capturas ES/EN, en desktop de 1440 px y móvil de 390 px. Los seis estados principales se revisaron visualmente, además de V1, evidencia desplegada, metodología y casos de texto largo. Los resultados automatizados y sus límites se conservan en [visual-regression.json](visual-regression.json), [accessibility-qa.json](accessibility-qa.json) y [copy-contract.json](copy-contract.json).

El veredicto se refiere a composición, semántica y acceso a evidencia. No hubo estudio con personas ni medición de comprensión cronometrada. Los escenarios completos son fixtures sintéticos evaluados por el motor; no representan el mercado actual.

## Resultado por estado

| Estado | Primera lectura y evidencia visible | Condición a vigilar | Veredicto |
|---|---|---|---|
| RISK-ON AMPLIO | El título nombra el estado y la frase principal explica participación amplia, liderazgo favorable, volatilidad benigna y fragilidad baja. Tres soportes y ninguna columna de frenos inventada. | Si participación o liderazgo dejan de ser favorables. | PASS |
| RISK-ON SELECTIVO | La diferencia frente a amplio es estructural: liderazgo favorable con participación insuficientemente amplia. Tres soportes y un freno real. Concordancia media; calidad parcial visible y enlazada a los faltantes. | Si la participación pasa a favorable manteniéndose los restantes pilares. | PASS |
| TRANSICIÓN | La primera frase expone participación adversa frente a volatilidad benigna. Las dos columnas concretan pocos sectores positivos y liderazgo mixto frente a VIX/curva benignos y fragilidad baja. Concordancia baja refuerza la contradicción sin representar probabilidad. | Cambios en la combinación de participación/liderazgo y volatilidad/fragilidad. Se señalan condiciones, sin predecir rentabilidades. | PASS |
| DEFENSIVO | El bloque de participación y liderazgo adverso y la volatilidad en vigilancia/adversa se expresan como estado del mercado. Tres frenos; ningún soporte añadido para llenar espacio. Concordancia alta no se presenta como una lectura favorable. | Cambios en los estados de los bloques que activan la regla defensiva. | PASS |
| STRESS | El título es inequívoco, con acento cromático moderado. La frase explica la precedencia de volatilidad y el activador visible es el nivel del VIX. La evidencia favorable permanece visible con su nombre propio; no se presenta como el activador de STRESS. | Si la volatilidad conserva las condiciones de STRESS. La rama conjunta de salto rápido y curva invertida queda cubierta por los fixtures y pruebas de presentación. | PASS tras reparación de etiquetas |
| LECTURA INCOMPLETA | Se declara estado técnico sin régimen adjudicado. Desaparecen concordancia, soportes y frenos de mercado del resumen. Aparecen calendario no verificado y sesiones incompatibles, con acceso al estado de datos. No hay régimen aproximado ni señal STRESS producida por el fallo. | Completar la evidencia pendiente antes de adjudicar. | PASS |

Capturas representativas: [amplio](screenshots/desktop-es-broad-complete.png), [selectivo](screenshots/desktop-es-selective-partial.png), [transición](screenshots/desktop-es-transition-conflict.png), [defensivo](screenshots/desktop-es-defensive-complete.png), [stress](screenshots/desktop-en-stress-absolute.png), [incompleto](screenshots/desktop-es-incomplete-unknown-calendar.png). Cada una tiene su equivalente ES/EN y desktop/móvil en la misma carpeta.

## Jerarquía y lectura breve

El régimen domina la composición. La interpretación aparece inmediatamente debajo, seguida de concordancia como única dimensión secundaria destacada. Las razones usan frases y enlaces concretos; no requieren leer C03. Calidad parcial es una incidencia visible, no una medalla adicional. Incertidumbre, calidad completa, medidas, fuentes y reglas se reservan para los despliegues correspondientes.

La longitud registrada del resumen completo, incluyendo controles y fecha, ronda 60–118 palabras según estado e idioma. Como cálculo de sensibilidad, no como velocidad observada: a 240 palabras/minuto equivaldría a 15–30 segundos de lectura lineal; a 180 equivaldría a 20–39 segundos. El límite superior pertenece a TRANSICIÓN con dos condiciones de vigilancia y datos parciales. El título, la frase principal y los encabezados permiten escanear las cinco preguntas sin recorrer metodología.

`20_SECOND_READ=PASS` es un veredicto heurístico de diseño para el objetivo aproximado de 20–30 segundos, sustentado en jerarquía, selección y longitud. No prueba que una persona sin experiencia vaya a comprender todos los estados en veinte segundos. El usuario debe desplazarse verticalmente en móvil para completar los bloques inferiores; ese desplazamiento tampoco fue cronometrado.

## Comparación explícita V1 actual / V2 candidato

| Criterio | V1 actual conservado | V2 candidato |
|---|---|---|
| Acceso al estado | El gran título genérico del Dashboard y su introducción preceden al estado. El régimen llega dentro de un grupo de cuatro KPIs. | El estado es el primer gran título de la superficie analítica, seguido de la explicación del caso. |
| Ruido visual | Régimen, sesgo, score y confianza comparten una fila; aparecen pesos del compuesto y más etiquetas. | Un régimen y concordancia; razones seleccionadas y ningún indicador continuo de fuerza. |
| Densidad útil | El resumen identifica el compuesto y sus dimensiones. Para saber por qué, hay que ampliar contexto o seguir otros módulos. | La superficie inicial ofrece soportes, frenos y condiciones, con vacío auténtico cuando no hay elementos. |
| Precisión aparente | Se conservan score 48/100 y confianza 50% del fixture V1 capturado, como parte de su comportamiento existente y rollback. No se reevalúa aquí su metodología. | No hay score, porcentajes de confianza, probabilidad no calibrada ni equivalentes gráficos. |
| Evidencia | Se mantiene el acceso existente a contexto y módulos. | Cada afirmación enlaza a su medida; los enlaces de fuente conservan sesión, corte, versión y procedencia. |
| Móvil | La introducción ocupa gran parte de la captura antes del estado y los KPIs se apilan en dos columnas. | Estado e interpretación aparecen antes de las razones, que se leen en una sola columna sin tabla previa. |

La comparación es de diseño y acceso a información; no es una prueba A/B ni compara exactitud de los dos motores. Las imágenes usan el recorte de sus respectivas superficies, de modo que la posición en píxeles no debe interpretarse como una medida de tiempo o de desplazamiento de la página pública completa. V1 sigue siendo la autoridad pública.

## Evidencia, metodología y límites

Las capturas de evidencia expandida muestran primero concordancia, incertidumbre y calidad con sus definiciones, después los pilares y sus medidas. El bloque BTC/GLD está separado y declara cero votos. Las medidas de participación se remontan a los once ETF sectoriales; no se sustituyen por proxies de índices.

La metodología identifica Regime Engine V2, Evidence State Engine y C03. Explica R2, ausencia de OOS point-in-time y falta de una captura real completa. Los detalles técnicos no compiten con el resumen. Los estados técnicos no se colorean ni se nombran como señales de mercado. El texto y la estructura conservan significado sin depender del verde o rojo.

## Hallazgo visual corregido

`D-COPY-STRESS-002` — LOW. Bajo STRESS, el inglés «WHAT SUPPORTS IT» podía leerse como aquello que activa STRESS, aunque listaba evidencia favorable; el activador real del VIX aparecía bajo «WHAT HOLDS IT BACK». Se preservó la evidencia original en [desktop](screenshots/initial/desktop-en-stress-before-labels.png) y [móvil](screenshots/initial/mobile-en-stress-before-labels.png).

La reparación cambia únicamente esas etiquetas cuando el estado es STRESS: «Evidencia favorable / Evidencia adversa» y «Favorable evidence / Adverse evidence». No cambia afirmaciones, selección, regla R01, datos ni autoridad pública. Las pruebas verifican ambas ramas STRESS y ambos idiomas. Las capturas finales desktop/móvil ES/EN y las simulaciones grayscale se inspeccionaron de nuevo: las etiquetas nuevas están presentes y el activador del VIX se distingue del contexto favorable. La evidencia y los hashes del problema original y de la reparación quedan en el contrato de copy.

**Veredicto:** candidato visual aceptable para Control Tower. `FALSE_PRECISION=NONE`, `PROGRESSIVE_DISCLOSURE=PASS`, `INCOMPLETE_STATE=PASS`. Ningún veredicto autoriza publicación o cutover.
