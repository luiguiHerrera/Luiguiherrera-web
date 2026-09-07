Integración final del Primer informe de septiembre sobre la producción certificada.

Base y padre requerido: `a933afcd287ffea28ed0e5ff163b390deefa2487`. Fuente de integración: `b3022fb6dbd13093184a36dfdbdc36e2d2fa5da8`. Autoridad semántica: `a0a109fac223784a1df1ce4822938d821e18ff97`. El HEAD remoto de `vercel-deployment` se comprueba antes de integrar y antes de crear el candidato. Esta campaña no incluye push, deployment ni cambios en Producción.

El merge-base es `80e5cc26d29d68d71ff55022f6897bd3e08640bf`. Producción cambió 72 archivos y el informe 46, sin intersección. Se aplican exclusivamente los 46 archivos del delta aprobado del informe desde ese ancestro. Los documentos anteriores de integración conservan sus resultados históricos sobre 80e5cc2; este documento describe la integración posterior sobre a933afc.

Los 538 archivos existentes de Producción fuera de ese delta conservan sus bytes, incluidos todos los cambios de Tendencias y del polish estadístico. Permanecen idénticos los generadores, adapters, UI live, baseline, configuración, provenance, 81 snapshots estadísticos, ledger de 87 capacidades, Dashboard, navegación, SEO vigente, package.json y package-lock.json. La adición a next.config.ts se limita a los headers aprobados de los cuatro exports de septiembre.

El informe conserva su frontera histórica del 04/09: modelo completo, copy, cifras, addendum semanal, calendario, fuentes y disclaimer. Los cinco objetos de informe, sus modelos de exportación y sus snapshots resueltos coinciden profundamente con a0a109f y b3022fb. La redacción selectiva de rotación está presente y la frase anterior no aparece en el modelo resuelto ni en sus exports. La evidencia raw aprobada permanece intacta.

| Activo | Apertura | Cierre | WSLE | WALE | WAHE | WSHE | N semanal | N Midterm |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| SPY | 767.33 | 770.19 | 739.65 | 754.47 | 779.39 | 791.07 | 1753 | 8 |
| GLD | 407.76 | 406.77 | 393.99 | 401.23 | 414.36 | 420.57 | 1137 | 5 |
| FXI | 35.66 | 35.88 | 33.70 | 34.73 | 36.53 | 37.44 | 1143 | 5 |
| EWJ | 96.45 | 98.28 | 92.71 | 94.63 | 98.19 | 99.99 | 1589 | 7 |
| BTCUSD | 77673.70 | 79671.97 | 65002.71 | 72360.62 | 83173.75 | 89180.80 | 624 | 2 |
| ETHUSD | 2417.90 | 2456.08 | 1865.12 | 2178.87 | 2628.01 | 2851.25 | 460 | 2 |

Las pruebas del informe verifican los seis objetos completos contra las series congeladas, incluidas distancias, observaciones, win rates, medias y N real; excluyen observaciones futuras y el sábado/domingo UTC posterior al corte. Los valores actuales de BTC/ETH en el módulo live conservan la autoridad de producción del 06/09. No se impone el corte histórico al sistema live.

El canary existente avanza valores y fechas de sectores, VIX, VX, BTC ETF flows y GLD mediante los adapters de prueba del loader real de Dashboard. La nueva prueba `september-current-production-isolation.test.mts` complementa esa cobertura: el loader estadístico real y el motor actual admiten valores sintéticos posteriores, mientras la serialización del modelo completo del informe permanece idéntica. Los inputs sintéticos existen únicamente en memoria; no se modifican datos, fórmulas, baseline ni provenance.

La validación previa al commit pasa con 38 archivos de pruebas Node, 337 tests, cero fallos y cero omitidos; se añaden las siete pruebas Python del parser XML de Tendencias: 344 pruebas en 39 archivos. También pasan el control 13F vigente, lint (cero errores, 17 warnings preexistentes), los validadores editorial/SEO, el build y reports:generate/validate/check. Dos ejecuciones del generador canónico, en directorios externos, reproducen los 81 archivos y la provenance de producción sin acceso a proveedores.

El archivo contiene cinco informes: septiembre como único Actual y los cuatro informes de julio/agosto como Archivados, todos accesibles. Los 19 exports y el manifest coinciden byte a byte con las dos fuentes aprobadas; llms permanece sincronizado. El PDF conserva 22 páginas. La inspección visual de su página 2 confirma legibilidad y wording; sus bytes coinciden con el PDF previamente aprobado.

La QA local del build de producción pasa con 107 respuestas HTTP correctas, incluidas las cinco rutas históricas, los cuatro exports de septiembre y los 81 snapshots live de 40 activos. CUA verifica 19 observaciones en escritorio 1440×1000 y móvil responsive 390×844: informe, acordeón SPY, tablas, calendario, archivo, Niveles ES/EN, Tendencias, filtro/detalle, Dashboard y HTML exportado. Overflow, imágenes rotas y errores observados de consola: cero. Se conserva la aceptación física previa de Niveles; no se repite ni se simula tacto real.

Después de crear el único commit, la identidad exacta y la repetición de npm ci, pipeline, build y suite desde otro worktree limpio se registran fuera del árbol en `/private/tmp/september-2026-final-on-a933-evidence/`. Ese registro externo evita incluir un SHA autorreferente en este documento. Los resultados finales y cualquier incidencia posterior deben leerse en `result.json` y `final-validation.json` de ese directorio.

DEPENDENCY_SECURITY_BACKLOG=OPEN

CI_INHERITED_AUDIT_FINDING=NONBLOCKING_PREEXISTING_DEBT

HOSTED_WORKFLOW_PROVISIONING=REQUIRED_BEFORE_2026-09-08T08:30:00Z

No se ejecuta ni modifica el hosted workflow. La deuda de dependencias y la cobertura parcial preexistente de capital divulgado se conservan; no se conceden excepciones ni se reparan dentro de esta campaña. La validación de integración no constituye autorización de publicación.
