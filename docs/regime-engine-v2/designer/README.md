# REGIME ENGINE V2 — Designer

**Aviso de migración de verificación.** `run-verification.py`, `seal-review.py`, `browser-qa.mjs`, `accessibility-qa.mjs` son entradas históricas de workspace retiradas: imprimen `RETIRED_WORKSPACE_VERIFIER` y terminan con código 2, sin verificar ni acceder a evidencia. Utilice la [guía de verificación portable del candidato](../release-candidate/verification-guide.md). Las instrucciones de verificación de etapa y sus resultados que siguen son registro histórico conservado en RC0 `f5fc7ecfd9e1f323d0ad3a43eccec1dbc500be1c`; no se recalculan. Los 24 casos visuales y 28 recorridos de accesibilidad conservan sus resultados históricos, sin nueva ejecución de QA de navegador. La verificación canónica actual ejecuta 59 pruebas Designer y comprueba los fixtures comprometidos; no reproduce esas comprobaciones de navegador.

**V2_VISUAL_CANDIDATE=ACCEPT.** Entrega local para Control Tower. El motor Evidence State Engine y C03 permanecen intactos. La UI pública sigue usando V1, shadow sigue OFF y no se ha realizado commit, push, deployment ni cutover.

## Revisar el candidato

Desde la raíz del repositorio:

```sh
npm run dev -- --hostname 127.0.0.1 --port 3106
```

Abrir [preview ES](http://127.0.0.1:3106/internal/regime-v2?preview=v2&fixture=selective-partial) o [preview EN](http://127.0.0.1:3106/en/internal/regime-v2?preview=v2&fixture=selective-partial). El selector «Escenario de revisión» permite recorrer los doce fixtures. `edge=long` activa texto largo de composición. El banner identifica siempre una preview interna y datos de prueba.

Quitar `preview=v2` muestra V1. Los Dashboard públicos `/dashboard` y `/en/dashboard` siguen siendo V1 incluso en desarrollo. Ambas rutas de preview devuelven 404 en el build de producción antes de importar fixtures. [production-preview-guard.json](production-preview-guard.json) registra ocho respuestas 404 y dos Dashboard públicos 200 con V1, sin marcadores V2 ni fixtures.

No hay una captura real V2 completa. Los estados completos mostrados son fixtures deterministas, no «V2 hoy». Las cinco capturas reales de Maintainer continúan INCOMPLETE/UNKNOWN. El histórico validado es reconstrucción R2, no point-in-time OOS.

## Evidencia para Control Tower

- [Veredicto y comprobaciones consolidadas](verification.json), [manifiesto de cambios](files-changed.json) e [input congelado](input-manifest.json).
- [Razonamiento de diseño](design-rationale.md), [contrato de copy](copy-contract.json) y [matriz de fixtures](fixture-matrix.json).
- [Revisión de seis estados y comparación V1/V2](state-review.md), [responsive ES/EN](responsive-review.md) y [accesibilidad](accessibility-review.md).
- [24 vistas principales](visual-regression.json), [28 casos expandidos de accesibilidad](accessibility-qa.json) y [prueba exacta de preservación V1](v1-render-proof.json).
- [Rendimiento](performance.md), [métricas originales y finales](performance.json), [hallazgos cerrados](findings.json) y [plan futuro de cutover/rollback](cutover-plan.md).

Capturas de acceso rápido: [selectivo desktop ES](screenshots/desktop-es-selective-partial.png), [selectivo móvil EN](screenshots/mobile-en-selective-partial.png), [transición móvil ES](screenshots/mobile-es-transition-conflict.png), [STRESS móvil EN](screenshots/mobile-en-stress-absolute.png), [lectura incompleta](screenshots/mobile-es-incomplete-unknown-calendar.png), [evidencia](screenshots/mobile-en-evidence-open.png), [metodología](screenshots/desktop-es-methodology-open.png), [V1 actual](screenshots/desktop-es-v1-current.png). Las imágenes de QA permanecen dentro de este paquete, fuera de `/public`.

## Resultado y alcance

Se verifican golden 464/464, histórico R2 1930/1930, ataques 110/110 y 592/592 pruebas de repositorio contabilizadas aparte de golden/histórico. Informes y editorial también pasan. Typecheck y build pasan; lint tiene cero errores y cero warnings nuevos frente a los 18 de Maintainer. `canonical-verification.json` y `finalroot-checks.json` contienen comandos, conteos y evidencia.

Los seis estados, concordancia, incertidumbre, calidad de datos, disclosure progresivo, enlaces y rollback pasan la revisión de diseño. No se muestra score V2, confianza porcentual ni probabilidad sin calibrar. La lectura de 20–30 segundos se acepta como heurística de jerarquía y longitud; **no se ha realizado un estudio humano cronometrado**. La auditoría de accesibilidad es local en Chromium, sin afirmar certificación integral ni pruebas con dispositivos físicos o lectores de pantalla.

El render Selectivo V2 medido añade alrededor de 0,5 ms de mediana SSR respecto al bloque V1. La reparación de formateadores reduce el RSS observado de 2,42 GB a 294 MB. Son mediciones locales acotadas, no un SLA ni latencia productiva. Las pruebas de equivalencia conservan exactamente el HTML antes/después de esa reparación.

## Reproducción de las comprobaciones

```sh
python3 docs/regime-engine-v2/designer/run-verification.py
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/regime-v2-design-fixtures.mts --check
npx tsc --noEmit
npm run lint
npm run build
```

Con el servidor de desarrollo local activo, `node docs/regime-engine-v2/designer/browser-qa.mjs` y `node docs/regime-engine-v2/designer/accessibility-qa.mjs` reproducen las capturas y recorridos con Playwright ya incluido en el entorno de trabajo. Admiten `DESIGNER_PLAYWRIGHT_PATH` para señalar otra instalación existente y `DESIGNER_QA_ORIGIN` para otro puerto loopback. No instalan dependencias. Los scripts de render se describen en `performance.md`.

La única edición a un archivo preexistente de Designer es extraer el bloque superior de `app/(es)/dashboard/page.tsx` a `DashboardRegimeV1`. Se preservan literalmente el comportamiento V1 y el resto de la página. Todos los demás inputs aceptados, incluidos los 21 archivos de engine/operaciones y los paquetes de etapas anteriores, deben coincidir con sus hashes de entrada. Los nuevos archivos y sus hashes están en `files-changed.json`.

**RELEASE_CANDIDATE=YES** significa candidato de diseño entregado para revisión. No autoriza publicación. Designer termina aquí y devuelve el resultado a Control Tower.
