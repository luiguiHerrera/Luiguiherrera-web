# Política de fuentes y replay acotado · Segundo Informe

Base de producción: `5297846a7c856ef0adecb2d6ee8b38594ebd3b47`. La release modifica únicamente la política de enlaces, la trazabilidad y la presentación autorizada del régimen. Conserva todos los snapshots, cálculos estadísticos, contenidos sustantivos, ICS y descargables archivados. Los tests comparan el contenido con el baseline editorial y los archivos congelados por SHA-256.

## Régimen y autoridad

`bounded-replay.json` ejecuta el código V1 exacto archivado del commit `4ee6adb006f360fea13837db5f7d45815f297b55` (deployment activo al corte del 18/09; creado el 08/09). Las 6.049 combinaciones cubren un conjunto conservador de todas las ramas de scoring BTC, incluso algunas que el adaptador no produciría. Sectores y VIX permanecen fijos en las observaciones reconciliadas. La categoría es siempre **Risk-on selectivo**, sesgo favorable, score redondeado 70–77.

La reproducción numérica de sectores y VIX no prueba qué caché histórica admitió el deployment. Este límite consta expresamente en la metodología. No se publica score/confianza puntual ni se modifica el diagnóstico archivado `exactV1At18Reproduced=false`. Farside mantiene su autoridad independiente sobre los flujos del informe.

## Política y límites de formato

- Web: enlaces del informe y navegación global en esta ruta usan `_blank` y `noopener noreferrer`. Incluye los 18 destinos de la watchlist y los fragmentos internos; no hay excepciones de navegación en la misma pestaña.
- Los controles `details` y calendario siguen siendo interacciones locales accesibles por teclado.
- HTML: todos los enlaces tienen la misma política y destinos absolutos.
- Markdown: enlaces Markdown con nombres y citas legibles. El visor decide nueva pestaña; CommonMark no define `target`.
- PDF: todos los destinos públicos del apéndice y los 18 de la watchlist tienen anotaciones URI. El visor decide pestaña/ventana. No se afirma que un PDF pueda imponer la política HTML.
- Material A: sin enlaces inventados. Se explica su origen editorial/privado.
- Modelo editorial: exactamente A, B, C. Un B con B1–B26 y el suplemento BOJ original. C5 identifica específicamente el replay; C2 permite inspeccionar la autoridad congelada y las series Yahoo por activo.
- Alianza: la URL institucional es el destino de seguimiento, sin atribuirle cifras o una pieza privada. No hay una nota pública fechada admitida que permita un enlace más específico.

## Verificaciones

`rendered-link-audit.json` contiene auditoría automatizada del SSR real, HTML, Markdown y anotaciones PDF, y lista los dominios externos con las fuentes que los utilizan. Las páginas metodológicas añaden `finance.yahoo.com` (series históricas) y `github.com` (código/evidencia congelados).

`http-link-checks.json` y `methodology-link-checks.json` conservan los resultados HTTP sin ocultar errores de transporte o bloqueos. `link-verification.json` añade la resolución por consulta web/navegador: las fuentes bloqueadas existen y muestran la pieza/serie correspondiente. Un resultado 403/429 de un robot no se recodifica como HTTP 200. La URL inicialmente ensayada de Banrep devolvía 404; fue sustituida por su serie oficial Suameca y verificada HTTP 200.

Pruebas: 29/29; TypeScript sin errores; lint sin errores (17 avisos preexistentes); build local webpack correcto. `reports:validate`: 6 informes / 23 artefactos; `reports:check`: 24 archivos reproducibles.

QA manual local sobre build de producción: desktop 1280×900 y móvil 390×844 sin overflow horizontal; VIX izquierda y BTC/GLD apilados a derecha en desktop, orden vertical VIX/BTC/GLD en móvil; calendario únicamente 21–30. Enter abre metodología, selecciona PCE y activa el destino interno DXY → USD/COP; este abre una segunda pestaña con el `details` desplegado. Un clic en Fed abre su comunicado en otra pestaña. La original mantiene URL y estado. 183 enlaces de página completa con target/rel correctos; 18/18 destinos de watchlist. Consola sin errores. HTML móvil: 146 enlaces seguros, un grupo B, sin overflow. Markdown revisado en texto y validado contra todo el contenido. PDF: 22 páginas revisadas visualmente, sin páginas vacías ni cortes de tablas/solapamientos; 210 anotaciones URI.

```text
REGIME_CLASSIFICATION_INVARIANT=PASS
REGIME_SCORE_RANGE=70–77
REGIME_POINT_SCORE_PUBLISHED=NO
VIX_LAYOUT=PASS
BTC_GLD_STACK=PASS
CALENDAR_REMAINING=PASS
WATCHLIST_LINKS=18/18
WATCHLIST_TARGET_BLANK=18/18
WATCHLIST_REL_SAFE=18/18
ALL_REPORT_LINKS_OPEN_NEW_TAB=PASS
EXTERNAL_LINKS_TARGET_BLANK=PASS
EXTERNAL_LINKS_REL_NOOPENER=PASS
MENTIONED_PUBLIC_SOURCES_LINKED_INLINE=PASS
MENTIONED_SOURCES_PRESENT_IN_FOOTER=PASS
MENTIONED_SOURCES_WITH_FOOTER_ENTRY=PASS
BROKEN_LINKS=0
PUBLIC_SOURCE_GROUPS=1
CONTENT_DRIFT=NONE
QUANT_DRIFT=NONE
```

`CONTENT_DRIFT=NONE` excluye exclusivamente los cambios autorizados del régimen, referencias/metodología y presentación de enlaces. `QUANT_DRIFT=NONE` verifica que no se cambia ningún dato congelado; el rango del régimen es una vista nueva y reproducible, no una sustitución del snapshot.

## Reproducción

Con dependencias PDF disponibles, definir `REPORTS_PYTHON` si el Python por defecto no incluye reportlab/pypdf/pdfplumber.

```sh
node scripts/second-september-bounded-replay.mjs
node --experimental-strip-types scripts/second-september-methodology.mts
npm run reports:generate
npm run reports:validate
npm run reports:check
node --experimental-strip-types scripts/second-september-source-audit.mts
node --import ./scripts/trends-test-register.mjs --experimental-test-module-mocks --experimental-strip-types --test lib/reports/first-september-2026.test.mts lib/reports/second-september-2026.test.mts lib/reports/september-corrective-release.test.mts lib/reports/second-september-source-policy.test.mts
```
