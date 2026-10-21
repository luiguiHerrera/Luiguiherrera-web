# Segundo informe de octubre de 2026 — candidato nativo

La publicación principal es `/informes/segundo-informe-octubre-2026`, generada por la ruta dinámica existente, `marketReports` y `MarketReportContent`. Utiliza siete secciones nativas, cuatro tablas, siete análisis desplegables y navegación interna. No se usa el HTML de impresión como página principal, ni iframe, object, embed o inyección del HTML aprobado.

El Founder conserva la autoridad exclusiva de Production. Este documento registra comprobaciones; no autoriza merge, despliegue Production, promoción ni cambios de dominios. El informe depende de su propio Control Tower; Statistical Levels es un proyecto paralelo que se preserva.

## Procedencia y originales

- PR único: https://github.com/luiguiHerrera/Luiguiherrera-web/pull/1, mantenido en draft y con base `codex/sl-p5-authorized-release-20261019`.
- HEAD de preparación: `ebb7308d6a9766589bdf4064b84ac07fdf7773f2`.
- Parent de Production: `b1df2f5f1d375e923efc429b6a503c4125a6d522`.
- Production reconsultada: `dpl_FRxYeCpiJohL9UZmKfRTEpF6tT5U`, READY, CLI; los dominios siguen asignados a ella.
- Patch recibido: 82.876 bytes, SHA-256 `bd79b79ca30ed920b11a90ef90eba84bfa747dd6707c110f2dd6bf225dd030b9`.

| Original | Bytes | SHA-256 |
| --- | ---: | --- |
| approved.md | 30840 | 378efba156f633aa54bef5f4a8fafebab0635072d446e2cbc6db0ba21b0d4ab4 |
| approved.html | 38401 | 2036ad78f5102745a9b203299e933d7675494545a33034c9a08edf87999a48e0 |
| approved.pdf | 65850 | 0ca850a7d7986fb7e501e970376d63eb86dcfb7271ac343f57aa5e8fb4171052 |

El PDF original ya está importado y copiado byte por byte a la descarga pública. Conserva sus nueve páginas y las notas de borrador del 19/10; la página nativa explica esa diferencia. No se ha regenerado. MD y HTML aprobados permanecen intactos.

Mercado: 16/10/2026. Corte editorial: 19/10/2026. Publicación propuesta: 21/10/2026. Si se publica después, cambiar exclusivamente los metadatos de publicación y sus expectativas, y recalificar ese nuevo SHA. No actualizar análisis o cotizaciones tácitamente.

## Calificación local del candidato

Checkout detached aislado, historial completo y dependencias del lockfile instaladas con `npm ci`; Python temporal con reportlab, pdfplumber y pypdf. Runtime local: Node 26.5.0; CI configura Node 22 y Vercel Node 24.x.

- `reports:generate`, `reports:validate` y `reports:check`: PASS, ocho informes y 31 artefactos, manifiesto y llms sincronizados.
- Los 27 exports históricos HTML/MD/PDF/ICS conservan exactamente sus hashes. Solo cambia mecánicamente el hash del modelo de primer octubre en el manifiesto por su estado archivado.
- Comparación ordenada con el MD aprobado: 107 bloques y 104 celdas de cuatro tablas iguales. Única sustitución web: «Este borrador no incorpora» → «Esta edición no incorpora».
- Lint: cero errores, 17 avisos heredados. Editorial, SEO (79 rutas), TypeScript y `npm run build`: PASS. El build se completó fuera del sandbox tras detener un intento sin progreso en compilación; no requirió cambios de código o dependencias.
- Suite focalizada solicitada: 26/26 PASS, incluidas tres pruebas nuevas del validador.
- Suite amplia con el comando solicitado: candidato 62/66; parent limpio 55/59. Los cuatro fallos coinciden: dos usos de `mock.module` sin el flag experimental, una importación TSX no admitida por `--experimental-strip-types` y una expectativa histórica de provenance.
- Ejecución adicional con el mismo loader TSX 4.23.13 en ambos árboles: candidato 68/72; parent 61/65. Los cuatro fallos coinciden: los dos `mock.module`, una expectativa histórica de hash en septiembre y la expectativa de provenance. Ninguna prueba se elimina o modifica para ocultarlos. **No hay PASS global de la suite amplia.**

Las únicas correcciones adicionales al patch están en el validador de reports y sus pruebas: retirar etiquetas inline sin introducir espacios antes de puntuación; reconstruir palabras divididas por guiones Unicode y barras al final de línea; añadir extracción PDF por flujo de texto para celdas con kerning. Se exige la frase completa y ordenada en una sola extracción. Pruebas negativas rechazan letras, palabras, métricas y bandas ausentes, así como fragmentos repartidos entre extractores. La identidad del PDF continúa siendo obligatoria.

## Cierre alojado y autorización

El registro final de SHA/tree, CI, Preview READY del mismo commit, rutas HTTP y revisión visual de 1440×1000 y 390×844 se entrega en el PR #1 y en el acta de esta comisión. Un build local o el antiguo Preview de staging no acreditan ese cierre. Las comprobaciones incluyen `/informes`, segundo octubre, primer octubre y segundo septiembre; navegación anterior/siguiente, apertura/cierre, fuentes y descargas. Se preservan las protecciones de Vercel.

Proyecto autenticado: `prj_kT4Z9GpDUghMK5Xfd9E3SzV2PvE6`; team `team_TgzErUW5yorClhKhZYjLz3yT`. Configuración observada: Next.js, raíz del repositorio, Node 24.x, instalación `npm install`, build `next build`, rama Git Production configurada `main`. Esa rama configurada no sustituye la autoridad del deployment CLI observado.

La propuesta de Production debe identificar el SHA final exacto, preparar un checkout limpio de él y crear un deployment con el entorno Production **sin asignar dominios** (`vercel deploy --prod --skip-domain`, con proyecto/team verificados). Tras READY, hay que verificar de nuevo la página, originales, históricos y comportamiento público pertinente en ese build de Production; solo entonces promover ese deployment si el Founder autorizó expresamente ese procedimiento. El Preview no demuestra el resultado de construir con variables Production. No se ejecuta ninguna de esas acciones en esta comisión.

Sin cambios en implementación, datos, contratos o generación de Statistical Levels; sin cambios de workflows, dependencias, AWS, Lambda, secretos, G5/G6 ni scripts de release SL. No se fusionan ramas ni se hace force push.
