# Reproducir la verificación del Release Candidate

El runner de este paquete recibe explícitamente el checkout que se prueba y el directorio de salida. Nunca usa la ubicación del script como autoridad implícita para el código, ni escribe en los seis paquetes anteriores. Shadow permanece OFF en el proceso de verificación; las pruebas que ejercitan su contrato usan overrides aislados y directorios temporales.

```sh
python3 docs/regime-engine-v2/release-candidate/run-verification.py \
  --root /ruta/al/checkout-exacto \
  --output-dir /ruta/al/directorio-de-auditoria \
  --profile candidate \
  --identity IDENTIDAD_DEL_CANDIDATO \
  --gates all
```

`candidate` ejecuta los trece archivos de tests existentes en el HEAD de entrada, el test del motor V2, los 78 casos de operaciones Maintainer, los 59 casos de Designer, los 36 casos de investigación Groweer offline, golden 464, histórico R2 1930, ataques Sweeper 110, reproducción de fixtures, informes y editorial. Los tests de HEAD se ejecutan contra los archivos que realmente contiene el checkout; sus conteos se registran, no se inventa equivalencia con cambios ajenos pendientes. Los tests Groweer no adoptan un challenger como metodología.

`candidate` es el único perfil ejecutable. `--profile worktree` se rechaza antes de crear salidas o leer inputs de verificación. El resultado histórico 592/592 documenta un workspace que contenía también tests ajenos de Budget, PFL y Trends; permanece en los informes de RC0. El candidato mantiene sus 487 casos canónicos y no importa esos archivos ajenos para conservar el conteo histórico.

Los diez entrypoints de verificación del antiguo workspace también están retirados: `sweeper/run-verification.py`; `groweer/run-canonical-verification.py`, `groweer/close-verification.py`, `groweer/seal-manifest.py`; `maintainer/run-verification.py`, `maintainer/close-verification.py`; `designer/run-verification.py`, `designer/seal-review.py`, `designer/browser-qa.mjs`, `designer/accessibility-qa.mjs` (todos bajo `docs/regime-engine-v2/`). Devuelven `exit 2` con instrucciones de migración, sin leer logs, modificar sellos o emitir PASS. Sus cuerpos originales siguen disponibles en el commit inmutable RC0 `f5fc7ecfd9e1f323d0ad3a43eccec1dbc500be1c`. Los informes históricos se conservan; para verificar el candidato actual se utiliza el comando anterior. Los dos scripts browser dependían de un Playwright externo mediante un path local; se retiran sin añadir esa dependencia al producto. Las capturas visuales previas permanecen como evidencia histórica y no se presentan como una nueva ejecución de QA browser.

`--gates all` añade typecheck, lint, build y typecheck tras build. `static` añade solo typecheck y lint; `none` ejecuta la aceptación y los tests sin generar build. Los resultados mantienen el estado NOT_RUN cuando no se ha pedido un build. Para una aceptación completa se utiliza `all`.

Lint utiliza exclusivamente `parent-head-lint.json`, su hash en `parent-lint-baseline.json` y los blobs del parent `636cb73fb0fe4d2b28ad96cb7185f8c07d8f895b` recuperados del historial Git del checkout. Las rutas absolutas del informe antiguo se interpretan como procedencia para obtener rutas relativas; nunca se accede al antiguo checkout. El comparador mantiene regla, mensaje, fragmento de código y multiplicidad, incluidos los dos desplazamientos de línea ya aceptados. Un hash o tree incorrecto falla la verificación.

`--baseline-lint`, `--baseline-root` y `--resume-failed` se rechazan. Cada ejecución utiliza un directorio de auditoría nuevo y ejecuta el plan vigente completo; no se reactivan comandos serializados en informes de un workspace anterior. El checkout necesita el historial Git versionado usado por el comparador y los tests de informes. Debe instalar sus dependencias desde su propio `package.json`/`package-lock.json` con `npm ci`; no debe enlazar el `node_modules` del worktree del usuario.

La prueba de producción local se ejecuta con el build exacto activo en un puerto loopback:

```sh
python3 docs/regime-engine-v2/release-candidate/verify-production-http.py \
  --origin http://127.0.0.1:3107 \
  --output-dir /ruta/al/directorio-de-auditoria
```

Comprueba ocho combinaciones ES/EN de las rutas internas (404) y ambos Dashboard públicos (200, etiquetas V1 presentes, sin superficies ni fixtures V2). El checker no inicia servidores, no despliega y no activa shadow. El proceso temporal de producción debe cerrarse al terminar la comprobación.

Los scripts esperan el entorno Next 16.3.1 ya aceptado; no instalan ni actualizan dependencias. La identidad del árbol/commit y la preparación del checkout se registran por separado. Un candidato con una reparación sin commit se identifica como RC0 más su delta exacto; no se presenta como una nueva reproducción del RC0 intacto. Los manifests anteriores siguen siendo evidencia histórica del workspace de aquella etapa. El runner contrasta los archivos críticos presentes con sus hashes aceptados y demuestra que las pruebas no reescriben los artefactos históricos presentes en el checkout.

El build puede hacer consultas de los adaptadores V1 al prerenderizar páginas. Sus respuestas no son una captura V2 ni autorizan shadow. Si se necesita un contador de red, la instrumentación de auditoría debe declararlo y conservar sus límites; no se infiere un total a partir de mensajes del adaptador.

La verificación post-commit debe usar el commit exacto en un checkout temporal y guardar la salida fuera del árbol commiteado. Esto permite comprobar el resultado sin añadir un segundo commit ni alterar los documentos ya congelados.
