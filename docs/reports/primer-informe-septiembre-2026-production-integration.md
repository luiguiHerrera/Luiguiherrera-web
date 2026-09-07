# Integración del Primer informe de septiembre de 2026

Base de producción: `80e5cc26d29d68d71ff55022f6897bd3e08640bf`. Fuente semántica revisada: `a0a109fac223784a1df1ce4822938d821e18ff97`. No se hace push ni deploy. Este contenido requiere revisión independiente de integración.

## Frontera y preservación

Merge-base: `49d9f10c08b9a4b86f63a5673075ae041a96fc45`. Hay 40 commits exclusivos de producción y 7 exclusivos del candidato. `git log --left-right --cherry-mark` identifica tres pares equivalentes ajenos al informe (TOM, gitignore y nueve contratos VX): no se importan. La campaña son los cuatro commits desde `84e8b3e` hasta `a0a109f`, después de `c6854e9`.

El inventario de los 74 cruces históricos, los 40 commits y los 46 archivos de esta integración está en el [registro JSON](./primer-informe-septiembre-2026-production-integration.json). El worktree nace directamente de la base autorizada; el commit resultante tendrá esa base como padre. Los módulos de Dashboard, navegación, investigación, niveles y dependencias conservan los bytes de producción.

## Resolución semántica

Production builder, offline CLI, formulas, baseline policy/config/provenance and generated data are byte-identical to production. Report verification uses the existing isolated createEngine boundary with its own as-of clock and current-mark aggregation. buildKeyLevels excludes the current week; only historical pre-2026 Midterm observations enter report seasonality. No imports execute the CLI and no live aggregation context is changed.

El único cruce funcional incompatible de la campaña es el generador. Se evita sobrescribirlo. El cruce histórico de `scripts/validate-editorial.mts` admite el delta del informe sin conflicto: conserva las validaciones previas y cambia únicamente septiembre a Actual y agosto a Archivado. Los demás cruces históricos pertenecen a las campañas anteriores y quedan del lado de producción.

La prueba de rutas de informes valida los rótulos visibles «Mes anterior» y «Archivo histórico», en lugar del nombre de variable obsoleto previousMonthReports. Las pruebas de exports previos usan el ancestro de producción 80e5cc2. La integridad de los cinco inputs originales se verifica con hashes aprobados fijos, sin consultar el commit no ancestro 84e8b3e. Así, la suite no depende de que la rama semántica antigua exista en un clone limpio.

## Matriz histórica reproducida

Igualdad profunda de los seis objetos completos contra la evidencia aprobada, incluidas todas las distancias, N, observaciones, medias y tasas de acierto. No se recapturan datos.

| Activo | Apertura | Cierre 04/09 | WSLE | WALE | WAHE | WSHE | N semanal | N Midterm |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| SPY | 767.33 | 770.19 | 739.65 | 754.47 | 779.39 | 791.07 | 1753 | 8 |
| GLD | 407.76 | 406.77 | 393.99 | 401.23 | 414.36 | 420.57 | 1137 | 5 |
| FXI | 35.66 | 35.88 | 33.7 | 34.73 | 36.53 | 37.44 | 1143 | 5 |
| EWJ | 96.45 | 98.28 | 92.71 | 94.63 | 98.19 | 99.99 | 1589 | 7 |
| BTCUSD | 77673.7 | 79671.97 | 65002.71 | 72360.62 | 83173.75 | 89180.8 | 624 | 2 |
| ETHUSD | 2417.9 | 2456.08 | 1865.12 | 2178.87 | 2628.01 | 2851.25 | 460 | 2 |

Se verifica que extremos artificiales en la semana actual no alteran las bandas ni su N, aunque sí el precio al corte y sus distancias. Las observaciones de sábado y domingo UTC posteriores al 04/09 se excluyen en BTC/ETH. Midterm sigue siendo septiembre, All, hasta diez años comparables anteriores a 2026, con N real.

## Producción y aislamiento

Dos ejecuciones del CLI canónico con la autoridad raw de producción, escribiendo fuera del repositorio, producen los mismos 81 archivos y la misma procedencia que producción, sin requests de mercado. El flujo vigente es offline y utiliza el baseline configurado del 06/09; se conserva exactamente. BTC/ETH mantienen sus marcas del 06/09, mientras el informe usa el cierre UTC del 04/09. No se impone el corte del informe al módulo estadístico.

El canary del loader real de Dashboard usa adapters de prueba con fechas y valores posteriores (08/09). Avanzan sectores, VIX, VX, BTC y GLD; el modelo completo del informe permanece idéntico. Los loaders/rutas reales y los adapters de producción no cambian.

## Validación ejecutada

- Next declarado, bloqueado e instalado: 16.3.1, igual a producción. npm ci sin reutilizar node_modules: exit 0.
- Build local Next/Turbopack y TypeScript: PASS. Tras el commit se repite npm ci/build en un nuevo worktree limpio del SHA exacto, con evidencia externa que evita una identidad circular en este documento.
- Suite completa: 32 archivos, 277 tests, 277 PASS, 0 FAIL, 0 SKIPPED, 0 cancelados. Incluye baseline, defectos estadísticos, adapters, VIX/VX, canary y pruebas adversarias del informe.
- reports:generate, reports:validate, reports:check: PASS; cinco informes, 19 artefactos, manifest y llms sincronizados. Los cinco modelos y todos los artefactos/manifest son byte-idénticos a a0a109f.
- PDF: 22 páginas; redacción selectiva en la página 2, inspección visual correcta. La redacción antigua no aparece en modelos resueltos ni exportaciones de septiembre. La evidencia raw histórica permanece intacta.
- Lint: exit 0 (17 warnings existentes). Validadores editorial y SEO: exit 0.
- HTTP local: cinco rutas de informe, Dashboard, Niveles estadísticos, archivo, índice inglés, sitemap, robots y llms; exports con bytes exactos; 25 assets sin 404.
- CUA: escritorio 1440×1000 y móvil 390×844, sin overflow; acordeón SPY y tablas legibles, fuentes cargadas, sin errores de consola. Dashboard y Niveles estadísticos abren desde la navegación vigente.
- Archivo: septiembre único Actual; cuatro informes anteriores Archivados y accesibles.

## Hallazgos preexistentes y límites

Pre-existing production lockfile: npm audit --audit-level=high exits 1; browserslist has two high advisories (GHSA-c83g-rgw3-j3cx, GHSA-73wf-gq98-2v4g). Totals: 1 high, 2 moderate, 1 low, 0 critical. package.json and package-lock.json are unchanged. No dependency repair in this report-only integration. This is not a clean CI-security or production-promotion approval.

No sector provider credential in the isolated local build: production quality gate returns Incompleto/null score, not fabricated data. Cboe VX obtains 2026-09-07 in the build/serialized Dashboard data. Deterministic canary advances VIX/VX, sectors, BTC flows and GLD to 2026-09-08 while the entire report model stays identical.

La validación de integración no equivale a autorización de producción. No se actualizan dependencias, no se trasladan credenciales, no se modifica producción y no se incorporan datos posteriores al informe.

## Evidencia reproducible

Comandos, matrices, hashes y clasificación están en el JSON adjunto. Logs y resultados de ejecución exacta quedan en `/private/tmp/september-2026-integration-validation/`: discovery.json, tests.json, full-suite.log, statistical-equivalence.json, semantic-equivalence.json, reports-pipeline.json, build.json, http.json, visual.json y audit.json. La identidad del commit y el build limpio se registran en `final-execution.json` una vez creado el candidato, sin modificar de nuevo su árbol.
