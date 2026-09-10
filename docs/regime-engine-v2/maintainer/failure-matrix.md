**Todo fallo V2 deja intacto el resultado V1.** Los tests comprueban identidad del objeto público, sus hashes y sus valores; el error original de V1 se propaga cuando V1 falla.

| Caso ejercitado | V1 | V2 / evidencia interna | Superficie pública |
| --- | --- | --- | --- |
| Fuente V2 malformada | Igual | `V2_TYPED_INPUT_FAILURE`, output null | Igual |
| Yahoo sin adjclose nativo | Igual | INCOMPLETE; no usa close | Igual |
| Calendario desconocido/proxy/futuro | Igual | INCOMPLETE / UNKNOWN_CALENDAR | Igual |
| Falta primer contrato VX esperado | Igual | INCOMPLETE; no promueve el siguiente vencimiento | Igual |
| Core stale | Igual | INCOMPLETE / STALE_OR_WRONG_SESSION | Igual |
| BTC no disponible | Igual | Satélite missing, cero votos; core preservado | Igual |
| GLD no disponible | Igual | Satélite missing, cero votos; core preservado | Igual |
| Fallo tipado interno | Igual | Error tipado registrado | Igual |
| Excepción inesperada V2 | Igual | Error de cálculo/source registrado | Igual |
| Source bundle no configurado | Igual | INCOMPLETE / UNKNOWN_CALENDAR; replay UNKNOWN | Igual |
| V1 falla | Error original | `V1_FAILURE`; no oculta el fallo | Comportamiento original |
| Filesystem inválido/no escribible | Igual | Diagnostic de infraestructura; snapshot no garantizado | Igual |
| Observer de logging lanza error | Igual | Fallo del observer contenido | Igual |
| Source read detenido | Igual después del deadline operativo | SHADOW_IO_TIMEOUT; tareas pendientes acotadas | Mismos valores V1 |
| Más de ocho sidecars activos | Igual | SHADOW_BUSY | Igual |
| Shadow OFF | Ejecución V1 directa | No carga/evalúa/persiste V2 | Igual |

`dashboard-shadow.test.ts` ejercita las primeras fallas, rollback, persistencia de bytes, V1_FAILURE y deadline. `source-input.test.ts` añade contratos de fuente, DST, early close, festivos, origen R2, revisión futura de calendario, warm-up y replay completo sintético. `snapshot.test.ts` prueba hashes, versiones, censura, repetición de sesión, atomicidad y aislamiento de directorios. El límite de concurrencia está explícito en código; no se presenta como prueba de tolerancia distribuida.

`public-preservation.test.ts` reconstruye los bytes exactos de ambos agregadores anteriores, comprueba su SHA contra el manifest de entrada y compara la salida completa frente a ON/OFF con fallbacks reales y fetches controlados. La suite de informes conserva snapshots históricos; la verificación de hashes mantiene app/components, rutas, textos, metadata y calculador V1 sin cambios. ES y EN siguen usando los mismos agregadores sin efectos por locale.

No se modifica freshness para conseguir mayor disponibilidad. Fecha esperada: `v2.diagnostics.calendarStatus[family].target`; fecha observada y estado: `v2.sourceStatus[source].observationDate/status`. VIX usa calendario vix, VX usa vx, BTC usa btc, GLD usa gld y los tickers equity usan equity.
