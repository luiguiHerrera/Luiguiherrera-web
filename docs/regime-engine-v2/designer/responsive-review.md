# Revisión responsive ES / EN

**Resultado:** desktop ES, desktop EN, móvil ES y móvil EN pasan la revisión de la superficie V2. Se inspeccionaron las capturas reales de los seis estados principales a 1440 px y 390 px; los casos de estrés de composición a 320 px y con todos los detalles desplegados se verificaron mediante el navegador en [accessibility-qa.json](accessibility-qa.json).

## Cobertura

| Estado principal | Desktop ES | Desktop EN | Móvil ES | Móvil EN | Comportamiento observado |
|---|---|---|---|---|---|
| Amplio | PASS | PASS | PASS | PASS | Dos grupos de razones: soportes y vigilancia. No queda una columna vacía de frenos. |
| Selectivo con datos parciales | PASS | PASS | PASS | PASS | Tres grupos en desktop, una secuencia vertical en móvil. La participación insuficientemente amplia conserva su enlace. |
| Transición con fuerzas contrapuestas | PASS | PASS | PASS | PASS | Razones y condiciones largas ajustan a varias líneas. Ninguna medida profunda antecede al régimen. |
| Defensivo | PASS | PASS | PASS | PASS | Dos grupos reales, sin soportes artificiales. El texto de vigilancia largo se ajusta sin cambiar significado. |
| Stress | PASS | PASS | PASS | PASS | Título y activador explícitos. Los rótulos favorable/adversa distinguen contexto del activador. |
| Incompleto por calendario | PASS | PASS | PASS | PASS | El título puede ocupar dos líneas y la lista técnica sustituye las columnas económicas. No se añade un régimen de respaldo. |

Los 24 casos principales devuelven HTTP 200, un único h1, el idioma solicitado, detalles cerrados inicialmente y cero desbordamiento horizontal del documento o de los elementos auditados. El informe automatizado registra cada estado y captura individualmente; no se deduce el móvil reduciendo una imagen desktop.

## Composición móvil

El orden es régimen, interpretación, concordancia, razones, calidad cuando tiene incidencias, acciones y corte. Las columnas desktop se convierten en bloques verticales con separación visible. Títulos ES/EN, enlaces y fechas ajustan dentro de 390 px. LECTURA INCOMPLETA / INCOMPLETE READING usa dos líneas sin recorte.

En selectivo, transición y stress, el grupo de vigilancia y las acciones pueden quedar por debajo del primer viewport de 844 px, especialmente con el aviso interno de fixtures encima. Se accede con desplazamiento vertical normal. Esto no es una vista de todos los contenidos de una sola pantalla, y la revisión no promete comprensión completa sin desplazamiento. No se requiere scroll horizontal para entender el estado ni se obliga a entrar en tablas antes de leer las razones.

La captura final conserva la superficie completa. Las capturas iniciales acotadas al viewport podían terminar a mitad del bloque inferior por la configuración del capturador; esa imagen parcial no era un recorte del componente en runtime. Las pruebas DOM y la recaptura completa permiten distinguir el artefacto de QA de un fallo de layout. Se volvieron a inspeccionar directamente las seis capturas móviles finales de selectivo, transición y stress en ES/EN: vigilancia, incidencias de datos, acciones y despliegues quedan dentro de la superficie completa, sin superposición ni texto perdido.

## Casos límite y detalle progresivo

El caso largo está marcado como prueba de composición. Extiende evidencia, nombre de fuente y nota metodológica sin cambiar el output del motor. El texto visible ajusta a varias líneas; el contenido inferior sigue disponible mediante desplazamiento y los controles de detalle. La auditoría de 320 px abre todos los detalles para comprobar también fuentes y metodología largas, en lugar de limitarse al resumen cerrado.

Los casos de un soporte, cero frenos y varios frenos conservan su cantidad real de elementos. Los satélites ausentes no se sustituyen por cero. Calidad parcial permanece explícita en el resumen, y la insuficiente se representa con una lectura técnica propia. Las capturas de evidencia muestran valores y fuentes después de sus pilares; los enlaces se distribuyen en varias líneas y cada fuente mantiene su control de expansión.

En una captura inicial de evidencia, el encabezado fijo compartido apareció dentro de la imagen por el punto de scroll elegido automáticamente por el capturador. Se conserva en `screenshots/initial/mobile-en-evidence-before-framing.png`. La captura final usa scroll inicial y un recorte de página completa: la nueva imagen se inspeccionó y ya no superpone el header a las medidas. No se modificó el header ni el CSS del producto. La navegación a medida y fuente se comprueba también con teclado y foco real.

## Idiomas, accesibilidad y comparación V1

La estructura y las traducciones ES/EN coinciden. El inglés no depende de abreviaturas para caber. El estado se reconoce por título y explicación; color y líneas solo refuerzan la jerarquía. El informe específico registra 28 casos expandidos, contraste mínimo 5,678:1, orden de encabezados, nombres accesibles, destinos de enlaces, apertura por teclado y reduced motion. Se inspeccionaron también las seis capturas grayscale de selectivo, stress e incompleto en ES/EN: los estados, sus razones, la calidad parcial y las acciones conservan significado sin color. No se afirma certificación por tecnología asistiva ni prueba con lectores humanos.

Las capturas V1 y preview OFF muestran el mismo hero existente, sus cuatro KPIs y los controles públicos conservados. En V2 se usa una columna móvil para las razones y se adelanta el régimen respecto al gran título genérico de V1. Esta comparación no demuestra una mejora de velocidad medida: describe la reducción de pasos visuales y evita atribuir cambios a módulos no incluidos en el candidato.

Capturas para revisión rápida: [selectivo ES móvil](screenshots/mobile-es-selective-partial.png), [selectivo EN móvil](screenshots/mobile-en-selective-partial.png), [transición ES móvil](screenshots/mobile-es-transition-conflict.png), [stress EN móvil](screenshots/mobile-en-stress-absolute.png), [incompleto EN móvil](screenshots/mobile-en-incomplete-unknown-calendar.png), [texto largo ES](screenshots/mobile-es-long-copy.png), [V1 ES móvil](screenshots/mobile-es-v1-current.png), [preview OFF ES móvil](screenshots/mobile-es-preview-off.png).

**Límites de la evidencia:** Chromium local; fixture de diseño; no dispositivo físico, red móvil, Safari/Firefox o estudio humano cronometrado. El alcance de QA de 320 px corresponde a detalles expandidos y copy largo; la matriz visual principal está capturada a 390 px. No se activó V2 públicamente.
