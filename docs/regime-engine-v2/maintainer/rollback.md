**Desactivar shadow: establecer `V2_SHADOW=OFF` o retirar la variable del proceso.** El valor por defecto es OFF y únicamente el literal ON lo habilita. Reiniciar el proceso que cargue configuración según el procedimiento normal de su entorno; Maintainer no ha modificado configuración desplegada.

Con OFF, `withDashboardShadow` devuelve directamente `loadV1()`: no lee bundle, evalúa C03, publica snapshots ni abre la captura contextual. El tap batch también queda desactivado. No cambia cálculos, score, confidence, respuestas ni fallbacks V1.

No borrar `captures/`, `bundles/`, `snapshots/` ni `latest.txt` para hacer rollback. Son evidencia privada y permanecen disponibles para replay. No recalcular snapshots anteriores ni etiquetar R2 como R0.

Verificación local:

```sh
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test lib/regime-engine-v2/operations/dashboard-shadow.test.ts
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import ./scripts/trends-test-register.mjs --test lib/regime-engine-v2/operations/public-preservation.test.ts
```

El primer test demuestra que OFF no invoca loader/evaluador/storage. El segundo compara el objeto completo de los agregadores antes/después y contabiliza los mismos fetches de V1. No se requiere borrar código ni deshacer los repairs Sweeper.

El entorno Next fue reconciliado mediante npm ci a la versión ya declarada/bloqueada 16.3.1. Esto es independiente del flag shadow; no se cambió package.json ni lockfile. La instalación anterior se conservó temporalmente fuera del repositorio, pero el procedimiento reproducible es restaurar el lockfile vigente, no alterar declaraciones para adoptar una instalación stale.
