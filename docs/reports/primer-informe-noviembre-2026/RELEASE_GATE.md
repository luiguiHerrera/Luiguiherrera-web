# Primer informe de noviembre de 2026 — candidato local

Ruta nativa: `/informes/primer-informe-noviembre-2026`. Base canónica: `665e062cb70fbcf3fd67317560bc33e1b9dc83fa`. Rama de preparación: `codex/primer-informe-noviembre-2026`.

El candidato editorial local prepara una publicación excepcional. **CI global continúa BLOCKED** por EXACT_DELTA y por el hash protegido de next.config.ts; esta vía editorial no equivale a admisión SL ni modifica sus contratos. La preparación local no autoriza creación de deployments ni promoción. No se ha enviado ninguna rama, creado ningún deployment, promovido Production ni asignado dominios. P7-B permanece en pausa; no se ejecutó A2.2.

## Fuente y corrección autorizada

El archivo `primer-informe-noviembre-2026-revisado-por-autor.md` se conserva byte por byte, con SHA256 `285004f51d28c28d8189501efd45b6bf73b7a4b919e2ea305efaa6f309562884`. No se usaron borradores anteriores.

`editorial-delta.json`, SHA256 `5d6336de5eff868ec26731d9f0264c566c454a36fb8eb27bc2b33629dff294bc`, registra la autorización expresa del Founder del 03/11 y exactamente tres sustituciones: párrafo Treasury, fila Treasury y referencia/metodología de esa serie. La fuente primaria es U.S. Treasury, Daily Treasury Par Yield Curve Rates, vencimiento constante a diez años: 16/10 5,09%; 30/10 4,94%; diferencia −15 pb. El 4,98% corresponde al 29/10. No cambia ningún otro dato ni conclusión independiente de ese error.

El generador valida ambos hashes y la cantidad exacta de sustituciones. La única conversión matemática de presentación es `R=\left(\frac{P_{30/10}}{P_{16/10}}-1\right)\times100` → `R = (P(30/10) / P(16/10) − 1) × 100`. Se conservan todos los párrafos, listas, encabezados y celdas, en su orden. Los delimitadores Markdown se convierten en estructura nativa.

Mercado: **30/10/2026**. Editorial: **01/11/2026**. Corrección: **03/11/2026**. `publication.json` sella la fecha propuesta **03/11/2026** para que el artefacto de publicación pueda revisarse antes del despliegue. No declara una publicación ya realizada: sólo será efectiva si el Founder autoriza y se ejecuta la publicación ese día (Europe/Madrid). Si cambia el día antes de promover, se requiere un nuevo sucesor y artefacto recualificado. El sucesor del candidato `cae380c21055f81247f21955067e47cec350c0df` cambia únicamente metadatos de publicación, derivados y expectativas correspondientes; conserva la fuente, la corrección autorizada y ambos cortes.

## Integración y preservación

La ruta dinámica, registro de informes, archivo mensual y navegación anterior/siguiente existentes integran noviembre. Se mantienen la presentación en dos columnas, navegación interna, siete desplegables de activos, fuentes desplegables, calendario mensual y tablas con desplazamiento propio en móvil. El cuerpo se renderiza con componentes React; no se inserta un HTML externo.

Nueve informes; ocho tablas en noviembre; 35 descargas totales. Los **31 HTML/Markdown/PDF/ICS de los ocho informes anteriores permanecen byte-idénticos** a la base. `preservation.json` registra sus hashes y tamaños. El manifiesto histórico sólo cambia el hash de modelo de segundo octubre por su estado archivado. Su contenido, metadatos editoriales y descargas no cambian; su navegación añade noviembre.

El validador conserva el ICS histórico de segundo octubre mediante hash exacto; no lo reescribe para corregir sus convenciones antiguas. Noviembre usa DTEND exclusivo, CRLF, plegado UTF-8 a 75 octetos y 25 UID únicos. Las fechas sin hora son eventos de día completo. Las fechas sin evidencia primaria se identifican como editoriales no confirmadas. No se confunden horas de conferencia de resultados con horas de publicación.

HUMA conserva 11/11 estimado, como constaba al corte. El anuncio del emisor del 02/11 fijó 10/11; esa observación posterior se registra en la auditoría y no sustituye silenciosamente la fuente. NU/CRT siguen sin confirmación primaria. La fecha de minutas de la Fed se deriva de la regla de tres semanas y no se etiqueta como confirmación explícita. LFMD conserva ±21,97%, observado el 29/10; el texto autoral dice «principalmente» cotizaciones al 30/10.

No hay cambios en código, datos, contratos, workflows, dependencias o infraestructura de Statistical Levels. next.config.ts conserva el delta de cuatro cabeceras de noviembre ya revisado: 77/78 source-inputs coinciden, sin repinar el hash protegido restante. En el sucesor de fecha, september-corrective-release.test.mts sólo cambia los dos hashes de noviembre (llms y manifiesto) añadidos por cae380c; los hashes y verificadores históricos, autoridades Git y controles negativos permanecen intactos. La adaptación de `september-corrective-release.test.mts` sólo registra el sucesor editorial explícito: mantiene las autoridades Git anteriores, los hashes históricos, los 31 archivos actuales y todos los controles negativos; añade negativos para cada archivo compartido autorizado. No redirige el lector del árbol actual a una fixture.

## Validación y límites

- Generación y verificación determinista de modelo; validación y regeneración de descargas; editorial, SEO, TypeScript, lint y build de Next.js.
- Suite focalizada de publicación y preservación: **100/100 PASS**; sin pruebas omitidas. La selección de informes usada por CI también se ejecuta separadamente: **87/87 PASS**. Esto no equivale a una calificación completa del workflow alojado.
- Suite ampliada: **155/157**, con dos fallos reproducidos en la base canónica. `september-narrow-editorial-update` conserva un hash de una edición anterior; `september-production-integration` exige bytes del generador SL de septiembre. La ejecución dirigida de ambos archivos sobre la base arroja 9/11, con los mismos dos fallos. No hay PASS global de la suite ampliada; no se modifica SL ni se ocultan esas pruebas.
- QA de 1440×1000 y 390×844: siete secciones, ocho tablas, acordeones con teclado, anclas, calendario, archivo de nueve informes y navegación de octubre a noviembre. Sin overflow global, errores de consola ni imágenes rotas. Las ocho tablas tienen scroll propio en móvil.
- Las 35 descargas se comprueban por HTTP y SHA256; HTML/PDF conservan cabecera canonical, Markdown/ICS `noindex`. El sitemap incluye la nueva ruta.
- PDF: 17 páginas, sin páginas vacías; inspección visual de todas las páginas, tablas con encabezados repetidos y títulos unidos al texto siguiente. HTML, Markdown, PDF y web contienen todos los fragmentos y celdas del modelo.
- 51 enlaces del contenido: 47 respondieron al GET directo, tres limitaron acceso automatizado y uno agotó el tiempo. Los cuatro se resolvieron además con el lector web y contenido sustantivo del editor. Se conservan los resultados originales de transporte en `link-audit.json`.

La auditoría externa distingue datos confirmados, cálculos reproducidos y referencias institucionales que no se pudieron verificar íntegramente. No se presenta como verificación independiente de todos los documentos privados citados. Véanse `source-audit.json` y `external-verification.json`.

## Bloqueo de CI alojado

El workflow `.github/workflows/ci.yml`, paso «Verify canonical source bundle, sums, release pins, freeze and policy hashes», llama incondicionalmente a `reconciled_report_hashes(Git(root), HEAD)`. Aunque una rama nueva o PR omite la admisión inicial reservada a `vercel-deployment`, esta llamada posterior ejecuta `bootstrap()` de `scripts/statistical-levels-ci/admission.py` y exige que cada sucesor tenga exactamente el conjunto de cambios de datos de SL.

La revisión independiente reprodujo `ValueError: EXACT_DELTA` en la base `665e062cb70fbcf3fd67317560bc33e1b9dc83fa` y en el commit de implementación `2df272ac46495aa3adb525fb4028d23e588cda65`, mediante lectura local, sin invocar servicios ni alterar contratos. `hosted-ci-gate-check.json` conserva las trazas. El commit documental posterior no cambia código ni resuelve esta incompatibilidad.

El segundo gate compara los 78 source-inputs protegidos: la base coincide en todos, mientras noviembre difiere únicamente en next.config.ts por las cuatro cabeceras editoriales. Ese mismatch no es un fallo presente en la base. Se mantienen ambos bloqueos nativos y los dos tests heredados de la suite ampliada; nunca se declara CI global PASS. La autoridad excepcional solicitada sólo puede cubrir el artefacto editorial exacto, sin convertirse en evidencia parent-CI para un sucesor SL. La matriz de aceptación y revisión independiente del expediente distinguen estas excepciones, los PASS locales y las verificaciones pendientes del futuro artefacto alojado.

## Reproducción

Entorno utilizado: Node 26.5.0; lockfile sin cambios; Python con reportlab 4.4.9, pdfplumber 0.11.9 y pypdf 6.10.0. `REPORTS_PYTHON` puede señalar un Python que tenga esas versiones. Playwright se usa sólo como herramienta de QA externa, sin añadir dependencias al producto.

```sh
npm ci --ignore-scripts
node --experimental-strip-types scripts/build-first-november-report.mts --check
npm run reports:validate
npm run reports:check
npm run validate:editorial
npm run validate:seo
npx --no-install tsc --noEmit
npm run lint
node --import ./scripts/trends-test-register.mjs --experimental-test-module-mocks --experimental-strip-types --test lib/reports/first-november-2026.test.mts lib/reports/second-october-2026.test.mts lib/reports/second-october-presentation.test.mjs lib/reports/second-october-public-exports.test.mts lib/reports/september-corrective-release.test.mts scripts/report-validation.test.mts
node --import ./scripts/trends-test-register.mjs --experimental-test-module-mocks --experimental-strip-types --test lib/reports/first-september-2026.test.mts lib/reports/second-september-2026.test.mts lib/reports/september-corrective-release.test.mts lib/reports/second-september-source-policy.test.mts
npm run build
npm run start -- --hostname 127.0.0.1 --port 3186
```

Con el servidor activo: `REPORTS_PLAYWRIGHT_MODULE=/ruta/a/playwright node scripts/qa-first-november.mjs`. El script bloquea solicitudes de navegador fuera del origen local. El registro de resultados del SHA sellado se conserva en el expediente de calificación junto a los logs.

## Git y operación remota propuesta

La referencia local remota estaba atrasada. La consulta y fetch por HTTPS identificaron `origin/vercel-deployment = 2e32a28647837ad8b56eb7768c011ea237de1df5`, padre directo de la base canónica `665e062`. No hace falta reescribir historial ni un merge artificial: el candidato desciende de ambos.

La vía excepcional propuesta no hace push ni abre PR. La lectura actual del proyecto `prj_kT4Z9GpDUghMK5Xfd9E3SzV2PvE6`, equipo `team_TgzErUW5yorClhKhZYjLz3yT`, muestra Production desde `main`; el productor SL escribe `vercel-deployment` y genera Preview. No se desactiva ninguna automatización ni protección. Revalidar esta separación, los checks y los aliases antes de cualquier acto autorizado; futuros pushes a main o promociones manuales pueden reemplazar Production y requieren coordinación explícita.

Después de aprobar el SHA exacto del sucesor, proponer un único `vercel deploy` con proyecto/equipo explícitos, `--prod --skip-domain --archive=tgz`, desde una exportación Git sellada. Esto crea un artefacto de entorno Production sin asignar los dominios; todavía no está autorizado. Verificar build real Node 24.x, identidad, hashes, cabeceras, informe y runtime SL en la URL inmutable protegida. El build local aceptado usa Node 26.5.0 y no sustituye esa verificación remota.

La promoción requiere otra autorización expresa sobre el deployment ID y manifiesto verificados. La fecha sellada debe seguir coincidiendo con el día de publicación efectiva. Production y los aliases deben continuar en `dpl_B3j14aPiwEzWdm3B1zkLX1hGwhxX` antes de promover; ese deployment es el retorno observado READY y elegible. En Hobby sólo puede usarse el inmediatamente anterior para rollback: revalidar elegibilidad, retención y ausencia de promociones intermedias. No se ejecutó rollback; su ejecución desactiva autoasignación de dominios y no autoriza reactivarla silenciosamente.

El código, datos y contratos P6/P7-A se preservan contra la base canónica y su ancestro remoto. La fuente declarada por el deployment live (`0e70de397762c5f3d1f8838ac829f6eba50139ed`) no está disponible en Git local ni remoto; no se afirma identidad de ese source con el candidato. Las lecturas live confirman disponibilidad y los 31 exports históricos; la futura QA del artefacto debe contrastar contratos, snapshots y respuestas válidas/invalidas de SL, con los límites expresamente registrados. P7-B permanece en pausa y no se ejecuta A2.2.
