# Reconciliación de producción y rama predeterminada — 24/11/2026

La integración conserva como primer padre la rama predeterminada `dfb000cc` y como segundo padre la publicación `dfad944f`. Se resuelven explícitamente los conflictos: captura completa de AC y procedencia de la predeterminada; interfaces, contenido editorial, rutas y lector de datos de producción. Se conservan también los modelos y controles nativos de la predeterminada.

Los 52 archivos de informes publicados y los 82 archivos de la captura de AC elegida conservan sus bytes. Los 12 archivos del motor de Fragilidad y el núcleo de cálculos, generador, actualizador y dependencias conservan sus bytes. El JSON contiguo registra sus hashes SHA-256.

Se integran cinco arreglos locales: metadatos de Fragilidad al cambiar entre ES/EN y enlaces a las rutas vigentes de AC en Presupuesto y Diagnóstico. No se incorporan los prototipos locales del Dashboard ni el preview de carga de AC.

## CI y operación

La validación de la web se ejecuta en todas las ramas, incluida `vercel-deployment`, con dependencias bloqueadas, auditoría, pruebas actuales, lint, validación editorial, SEO y build. Las pruebas de flujos, amplitud, scoring y presentación del Dashboard forman parte de esta cobertura.

El job histórico de cualificación nativa se conserva. Solo puede seleccionarlo el validador de linaje inmutable existente. Una revisión web que no pertenece a ese linaje recibe todas las comprobaciones web, pero no genera recibos ni evidencia de cualificación nativa. Los errores inesperados del validador fallan; la ausencia de linaje registrado no se transforma en un permiso de publicación. Las pruebas verifican también que un CI web verde no satisface los pasos obligatorios de publicación nativa.

El workflow de publicación nativa y sus permisos son los de la predeterminada, sin cambios. Su activación automática continúa sin configurar. El workflow diario de AC, su programación martes a sábado, OIDC, almacenamiento, validación, push atómico y recibos son idénticos a ambos padres. Esta operación diaria es independiente de la cualificación histórica y no se sustituye por un redeploy diario.

## Verificación local

380 pruebas web y 71 del productor correctas, más 22 pruebas Python de ámbito y límites de cualificación. Tres pruebas requieren el archivo bruto histórico y conservan su exclusión explícita. Auditoría: cero hallazgos high/critical, 57 casos de la atestación de seguridad correctos. Lint sin errores; validación editorial de 10 informes y SEO de 85 rutas/37 pares recíprocos correctas.

Una exploración adicional de todos los tests del Dashboard encontró expectativas de la extracción visual V1 anterior y cargadores aislados antiguos. Esas pruebas históricas no forman parte de la selección del Dashboard rediseñado. No se afirma que todos los tests históricos del repositorio pasen; tampoco se cambió la web para reproducir diseños antiguos.

La publicación se realizará desde el commit integrado, tras comprobar CI alojado y la compilación. La rama predeterminada se adelantará sin reescritura de historial y conservará su nombre para mantener las referencias del actualizador.
