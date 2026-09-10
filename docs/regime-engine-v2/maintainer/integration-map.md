**V1 sigue siendo la única autoridad pública.** Maintainer añade una envoltura operativa a los agregadores existentes, sin editar sus cálculos ni sus valores de retorno.

```text
getDashboardData / getHomeDashboardPreviewData
  └─ withDashboardShadow(loadV1)
      ├─ OFF: loadV1 directamente
      └─ ON:
          ├─ loadV1, cálculo original y mismo objeto público
          │   └─ tap de bytes de respuestas CFE existentes
          ├─ asOf del corte observado al finalizar V1
          ├─ bundle privado → VALIDATE → NORMALIZE → C03 sin cambios
          ├─ snapshot interno versionado + checkpoint diagnóstico
          └─ devuelve solamente V1; sus errores originales se propagan

build-statistical-levels.mjs
  └─ fetch Yahoo existente → tap opcional de bytes exactos
      └─ parser y fallback V1 originales
```

Los cinco archivos previos de integración modificados son `.env.example`, los dos agregadores Dashboard/home, el adaptador CFE y el batch de statistical levels. Un sexto archivo, `normalize.ts`, reutiliza el mismo `Intl.DateTimeFormat` por llamada Yahoo en lugar de crearlo por fila; conserva opciones, zona, `formatToParts` y todos los valores. Su diferencia se verifica por inversión mecánica contra el SHA aceptado. Los otros once archivos del motor y todos los artefactos P8/Builder/Sweeper/Groweer mantienen sus hashes. Los cambios preexistentes del usuario en otras áreas se conservan.

**Datos compatibles.** V1 emplea Alpha Vantage `close` para sectores y FRED para VIX; V2 no reutiliza esos valores como Yahoo `adjclose` o Cboe VIX. El tap CFE conserva el CSV diario que V1 ya obtiene. Este CSV agregado es evidencia de adquisición; el loader V2 actual requiere catálogo y ficheros mensuales CFE y no disfraza el agregado como ese contrato. Yahoo se captura cuando el batch existente realmente utiliza ese proveedor; Stooq no se etiqueta como Yahoo.

No se instalan nuevos fetchers de proveedores, tareas programadas ni fuentes. Un operador prepara un bundle explícito con capturas compatibles y calendarios revisados. `regime-v2-prepare-bundle.mts` ensambla referencias de capturas existentes y valida antes de publicar un fichero privado; no descarga, crea calendarios ni habilita flags. Faltas de cobertura permanecen visibles.

**Versiones y corte.** Cada snapshot incluye engine, C03, hash del parameter manifest, feature contract, tabla de decisión, contratos price/temporal/freshness, versiones de fuentes/calendarios y schema de snapshot. El nombre histórico `regime-v2/1.0.0-builder` se conserva; `captureMetadata.canonicalImplementation` añade el hash del inventario de los 12 archivos aceptados para identificar la implementación reparada por Sweeper, junto con el SHA explícito del normalizador optimizado en Maintainer. V1 lleva versión con SHA del cálculo legacy y hash de su resultado completo. Score/confidence se guardan únicamente en el namespace V1.

Un mismo `asOf` representa cuándo el sistema cerró ese intento de observación. No demuestra que los proveedores V1 y V2 tengan igual fecha efectiva: V1 conserva su propia disponibilidad; V2 aplica calendarios y freshness independientes. `NON_EQUIVALENT_TAXONOMY` impide usar V1 como verdad o fabricar un mapping exacto.

**Aislamiento y coste.** El núcleo sigue puro. La infraestructura tiene un máximo de ocho sidecars activos y ocho publicaciones pendientes. Un deadline operativo de 2.000 ms para espera de I/O evita que un source read detenido retenga indefinidamente la respuesta V1. No es un SLA de mercado ni una ampliación de freshness. El cálculo síncrono tiene límites explícitos de bytes/filas; el deadline no puede interrumpir JavaScript síncrono. Los fallos se registran sin cambiar V1. Si el almacenamiento está roto o el deadline vence, el evento de consola es la evidencia disponible; no se afirma que exista un snapshot persistido.

La cache retiene un solo vintage validado/normalizado y un resultado preparado para un corte. La lectura recalcula el hash de bytes; el vintage usa hash de bundle, versión de engine, C03 y contratos, y la resolución por corte incluye `asOf` exacto. Cambiar el corte vuelve a resolver calendario, ensamblaje VX y adjudicación sin repetir el parsing del mismo histórico. Cambiar bytes/versiones invalida el vintage. No hay TTL de validez, promoción de stale ni cache compartida con V1. El checkpoint utiliza un único snapshot anterior, sin escanear directorios. La persistencia por corte tiene un coste explícito: unos 190 KB escritos en el fixture completo; la política de retención/volumen corresponde al almacenamiento operativo, sin borrar historia automáticamente.

**Límites de operación actual.** OFF permanece como configuración por defecto. La prueba local ON capturó cinco respuestas CFE y un snapshot INCOMPLETE/UNKNOWN. No se configuró calendario oficial real ni un bundle core prospectivo completo. Los tests sintéticos demuestran un recorrido completo R0 y la degradación correcta; no son evidencia real de mercado R0. Operability PASS significa que la integración, configuración y fallos se comportan conforme al contrato. No significa disponibilidad garantizada de datos ni despliegue habilitado.

H1 queda fuera de todos los imports operativos; persistencia es observacional. No hay cross-asset/PFL en core, cambios de rutas, endpoints nuevos, flags públicos, UI, textos ES/EN ni migraciones de snapshots históricos. Shadow no es autoridad de producción; R2 no es PIT OOS.

El benchmark completo previo al repair encontró 560 ms por nuevo corte y hasta 1,219 GB de RSS observada: coste material por crear miles de formatters y normalizar el mismo vintage otra vez. Tras el repair mide 51,867 ms por nuevo corte (−90,74%), primer cálculo cold 167,464 ms frente a 640,545 ms y RSS máximo muestreado de 324,21 MB (−73,41%). Los nueve JSON parses por corte restante incluyen serialización/checkpoint y nuevo ensamblaje; no vuelven a parsear los quince proveedores del vintage. La medición final y sus límites quedan en `performance-pipeline.json`; el repair es operativo, sin cambiar C03, series, oracles ni elegibilidad temporal.
