# Validación de reparación acotada — Primer informe de septiembre de 2026

STATE=REPAIRED_AND_VALIDATED

BASE_COMMIT=636cb73fb0fe4d2b28ad96cb7185f8c07d8f895b

BRANCH=codex/primer-informe-septiembre-2026-review-repair

WORKTREE=/tmp/september-2026-review-repair

VALIDATION_DATE=2026-09-06

El commit que incorpora este documento contiene únicamente la reparación editorial, el test de autoridad histórica, el ledger y la regeneración de las tres exportaciones de septiembre y sus hashes. No hay push, despliegue ni promoción. Se utilizó un worktree creado desde el commit base; no se modificaron los cambios concurrentes del directorio principal.

## 1. Build con las dependencias exactas

FINDING_1_EXACT_BUILD=PASS

NODE_VERSION=v26.5.0

PACKAGE_MANAGER=npm 11.17.0

NEXT_DECLARED_VERSION=16.3.1

NEXT_LOCKED_VERSION=16.3.1

NEXT_EFFECTIVE_VERSION=16.3.1

LOCKFILE_VERSION=3

LOCKFILE_SHA256=2f00b7744899cf2f7c19d412bcb3580f6d69f8da8796afd2a2280da153f5f78c

INSTALL_MODE=npm ci; instalación limpia del lockfile, sin reutilizar node_modules del directorio principal

INSTALL_COMMAND=npm ci --cache /tmp/september-2026-repair-npm-cache --no-audit --no-fund

INSTALL_EXIT_STATUS=0

BUILD_COMMAND=NEXT_TELEMETRY_DISABLED=1 npm run build

BUILD_EXIT_STATUS=0

BUILD_LOG=/tmp/september-2026-exact-build.log

BUILD_ID=lJI7voLLIC1iUIwDF_6W6

Identidad confirmada por `require('next/package.json').version`, el encabezado del build y `.next/diagnostics/framework.json`: `{"name":"Next.js","version":"16.3.1"}`. Compilación Turbopack, comprobación TypeScript, generación de las 55 páginas y optimización final completadas. `package.json` y `package-lock.json` son idénticos al commit base. No se copiaron archivos de entorno privados ni se cambiaron versiones para superar el build.

El build ejecutó los proveedores públicos del Dashboard sin modificar sus adapters. Cboe descartó el fin de semana sin contratos y recuperó las nueve liquidaciones mensuales del 04/09. La cobertura parcial de Bitbo se conservó como la informa el proveedor. El resultado del build no certifica que todas las fuentes live tengan igual fecha; la prueba de aislamiento descrita debajo cubre la independencia del informe congelado.

## 2. Autoridad histórica de movimientos implícitos

FINDING_2_HISTORICAL_IMPLIED_MOVES=PASS

FUTU_AUTHORITY=Segundo informe de agosto congelado: 7,04 %, aproximadamente ±7,42 USD; observación original Unusual Whales del 16/08/2026.

NVDA_AUTHORITY=Segundo informe de agosto congelado: 6,18 %, aproximadamente ±13,94 USD; observación original Unusual Whales del 16/08/2026.

CROSS_REPORT_VALUE_TEST=PASS

Septiembre enlaza `public/reports/segundo-informe-agosto-2026.html` como autoridad histórica. El test compara porcentajes y fechas con `stockpicking.earnings.upcoming` del objeto canónico de agosto, fija los hashes de HTML y Markdown publicados y comprueba sus importes aproximados. No consulta opciones live ni fabrica evidencia histórica.

| Reacción conservada | Cierre previo regular | Cierre posterior regular | Resultado redondeado |
| --- | --- | --- | --- |
| NVDA | 26/08/2026: 209,66 USD | 27/08/2026: 227,98 USD | +8,74 % |
| FUTU | 19/08/2026: 109,42 USD | 20/08/2026: 112,73 USD | +3,03 % |

La fórmula comprobada es `(cierre posterior / cierre previo − 1) × 100`, sin after-hours. Se conservaron exactamente todos los campos de los resultados salvo la etiqueta y el enlace de procedencia de los movimientos implícitos.

## 3. Procedencia institucional

FINDING_3_SOURCE_TRACEABILITY=PASS

INSTITUTIONAL_SOURCE_LEDGER=docs/reports/primer-informe-septiembre-2026-source-ledger.md

LEDGER_RECORDS=40

UNSUPPORTED_CLAIMS_REMOVED_OR_REDUCED=4

El ledger recorre las siete secciones, la cabecera y los ocho activos. Cada registro contiene los diez campos requeridos y su fundamento en el material aportado por el editor. Distingue datos reportados, visión institucional e inferencias propias. Las tres rutas se identifican públicamente como escenarios del editor. Los grupos de fuentes separan material institucional, fuentes oficiales/públicas y datos propios/Dashboard.

Las cuatro afirmaciones distintas retiradas o reducidas son: giro de CTAs; enfriamiento ya observado de inflación/empleo; flujos recientes débiles de China; valoración atractiva china presentada como diagnóstico. Las repeticiones de la última se cuentan una vez. Soporte editorial no significa verificación independiente de las notas privadas; esta limitación queda explícita en el texto público y el ledger.

## Pruebas y exportaciones

TESTS=26 PASS, 0 FAIL, 0 SKIPPED; 25 existentes y 1 nuevo

Comando ejecutado después de la reparación del contenido y la incorporación del test:

```sh
NODE_DISABLE_COMPILE_CACHE=1 node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import ./scripts/report-node-register.mjs --experimental-test-module-mocks --test lib/reports/first-september-2026.test.mts lib/reports/weekly-review.test.mts lib/dashboard/adapters/vix-term-structure.test.ts
```

Incluye el canario crítico: el loader real del Dashboard, con proveedores simulados, avanza al 08/09 mientras el informe conserva el corte y los valores del 04/09. También comprueba inmutabilidad en memoria, evidencia guardada, niveles y Midterm de los seis activos soportados, retornos semanales/YTD, sectores, megacaps, racha del S&P 500 y nueve contratos VX. Se mantuvieron las advertencias experimentales de Node sobre mocks; no hubo fallos.

PYTHON_RUNTIME=/Users/quantlab/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3

```sh
REPORTS_PYTHON=/Users/quantlab/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 npm run reports:generate
REPORTS_PYTHON=/Users/quantlab/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 npm run reports:validate
REPORTS_PYTHON=/Users/quantlab/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 npm run reports:check
```

Los tres comandos terminaron con código 0. Validación: 5 informes, 19 artefactos y `llms.txt` sincronizado. Determinismo: 20 archivos sincronizados. El manifiesto modifica únicamente hashes/tamaños de PDF, HTML y Markdown de septiembre y su `sourceHash`.

| Exportación de septiembre | SHA-256 final | Resultado |
| --- | --- | --- |
| HTML | b38d56f3d745535a4e3d46d77ada1e77f13ee1363fd47af784d2cdcbb3ff687b | Regenerado; referencias históricas y atribuciones presentes |
| Markdown | 5dbe54f2722ef0cec7f474f88c0281a82704c1f5bdbfc728fd5fe70efc1bae10 | Regenerado; referencias históricas y atribuciones presentes |
| PDF | 72c209b3744652eca07d94aacfef8b48aa5f73c01b0ccc64810f88aa646a3af1 | Regenerado; 22 páginas revisadas visualmente |
| ICS | 113a55e1ca0572508ce6febab5a1b51c423713eee095ab1dc0a8efdd3464d299 | Idéntico byte a byte al commit base |

PDF renderizado con PDFium y revisado completo; no se observaron solapamientos, recortes ni problemas de paginación. La extracción con pdfplumber encontró cero glifos fuera de página. Se revisaron particularmente contexto, lecturas por activo, trazabilidad NVDA/FUTU y fuentes. La extracción textual solo se usó como comprobación adicional, no como sustituto de la revisión visual.

Web de producción local servida mediante `npm run start -- --hostname 127.0.0.1 --port 3018`, Next 16.3.1. Revisión en escritorio 1440×1000 y móvil 390×844: fuente de agosto, cierres regulares y atribuciones legibles; siete secciones principales. Comprobaciones adicionales a 320×844: ancho de documento igual al viewport, sin desbordamiento horizontal. Exportación HTML abierta y revisada a 1280 píxeles, también sin desbordamiento. Viewport restaurado al finalizar.

## Conservación frente a 636cb73

SNAPSHOT_2026_09_04=PASS

DASHBOARD_LIVE=PASS

Se compararon bytes del worktree contra los blobs del commit base y objetos resueltos del módulo anterior contra el reparado:

| Elemento protegido | Evidencia |
| --- | --- |
| Snapshot | Los 8 archivos del directorio `lib/reports/snapshots/primer-informe-septiembre-2026` son idénticos, incluidos niveles, estacionalidad y addendum semanal. |
| Dashboard | Los 30 archivos localizados bajo las rutas de Dashboard son idénticos; canario de actualización live aprobado. |
| Informes históricos | Los 15 artefactos publicados de las cuatro ediciones anteriores son idénticos; registro canónico `market-reports.ts` sin cambios. |
| Calendario | Los 12 objetos de evento son iguales mediante comparación profunda; ICS idéntico. |
| Paneles cuantitativos | Todos los paneles por activo son iguales mediante comparación profunda. |
| Cortes y presentación | 06/09 editorial, 04/09 automático; publicación, modificación y objeto de presentación conservados. Ningún componente, CSS, layout o generador modificado. |
| Dependencias | `package.json` y lockfile idénticos; dependencias instaladas en el worktree aislado. |
| Otros | `historical-automatic-readings.ts`, `report-statistical-panels.ts` y `public/llms.txt` idénticos. |

CALENDAR_OBJECT_SHA256=53cbc9cfe005bb850e22bd0efa0b24ca7fcaaa3a183c6f511527d90812734149

QUANTITATIVE_PANELS_SHA256=45000c2764b2c0bbdf258b1ab05c7c0198f38b97d5ec82c1800474ac5a9f9a3a

Estos dos hashes corresponden al JSON serializado del objeto de calendario y del array de paneles por activo, respectivamente, iguales antes y después de la reparación.

FINAL_DECISION=READY_FOR_FRESH_INDEPENDENT_REVIEW
