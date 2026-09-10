# Integración futura y rollback visual

Este documento prepara una sustitución posterior del bloque superior V1 por el candidato V2. **No activa la sustitución.** Control Tower solo ha autorizado Designer: no hay commit, push, deployment ni cutover. El Dashboard público conserva V1 y `V2_SHADOW` sigue apagado por defecto.

## Candidato preparado

La vista actual V1 se conserva en un componente reutilizable, `components/dashboard/DashboardRegimeV1.tsx`. La extracción conserva el JSX y el copy originales; la regresión debe demostrar la reconstrucción exacta del archivo de entrada y equivalencia del render público. El candidato V2 consume outputs del motor mediante una capa de presentación determinista. No requiere modificar C03 ni la autoridad de datos para poder revisar la composición.

Las rutas internas de revisión son `/internal/regime-v2` y `/en/internal/regime-v2`. Sirven V1 por defecto; el selector `preview=v2` muestra el candidato con fixtures identificados como evidencia de diseño. Ambas rutas exigen `NODE_ENV=development` y devuelven 404 en producción antes de importar los fixtures. No existen enlaces de navegación pública ni una API que publique estos datos de prueba. Este guard protege una revisión local: no se debe eliminar como atajo para publicar fixtures.

## Condiciones para una autorización posterior

Control Tower debe autorizar expresamente el cutover y el deployment. La aceptación del candidato visual no concede esas autorizaciones. La decisión posterior debe identificar la fuente operativa V2 y su estado de evidencia, la política de exposición y la versión exacta de esta entrega.

Hoy `LIVE_COMPLETE_V2_CAPTURE=NO`: las cinco capturas reales Maintainer producen INCOMPLETE/UNKNOWN y no existe una captura real R0 completa. Los estados completos de Designer son fixtures deterministas, no una lectura de mercado actual. Una futura integración puede representar honestamente una lectura incompleta, pero no debe sustituirla por un fixture, un régimen aproximado ni una predicción. El histórico permanece R2; su presentación nunca debe afirmar validación point-in-time OOS.

Antes de cambiar la autoridad pública, verificar con la fuente operativa elegida la cadena output → presentación → evidencia → metodología, el corte temporal y la legibilidad de PARTIAL/INSUFFICIENT. La presentación ya dispone de los seis estados y de enlaces internos de evidencia/metodología; no necesita reconstruir el componente para consumir un output operativo válido.

## Cambio acotado propuesto, sin ejecutar

1. En una entrega autorizada, conectar un output V2 operativo al componente ya revisado, a través de la misma capa determinista. El bundle de fixtures queda reservado a desarrollo.
2. Sustituir únicamente el bloque superior de régimen del Dashboard y su entrada de metodología por la alternativa V2. Mantener navegación, header, footer, informes y módulos de amplitud, sectores, VIX, curva VX, fragilidad y flujos.
3. Mantener disponible el componente V1 y la carga V1 para rollback. Ningún score o confidence histórico V1 se elimina como parte de Designer.
4. Repetir controles ES/EN, desktop/mobile, accesibilidad, rendimiento y regresión con preview apagada, y después con la fuente operativa real. Conservar evidencia del resultado y del estado de datos; no elevar R2 a R0.
5. Desplegar únicamente mediante el flujo que Control Tower autorice en esa entrega. Designer no introduce ahora una flag de autoridad pública ni cambia entornos de producción.

`V2_SHADOW` controla captura y ejecución paralela; no constituye autorización de publicación. Su valor OFF permanece válido para mantener el Dashboard V1. La revisión local utiliza la condición de desarrollo y el selector de preview, sin reutilizar el flag operativo para fingir datos públicos.

## Rollback visual

Durante Designer, abandonar la ruta interna devuelve al Dashboard V1. En la ruta interna, quitar `preview=v2` muestra el bloque V1. En producción, las rutas de revisión no están disponibles.

Tras un eventual cutover autorizado, el rollback consiste en seleccionar de nuevo `DashboardRegimeV1` en el mismo punto de composición superior y conservar la fuente V1 como autoridad. Su implementación y dependencias quedan preservadas por esta entrega. No exige recalcular histórico, cambiar C03, borrar snapshots ni desinstalar el motor. La elección concreta del mecanismo de despliegue o reversión corresponde a esa futura autorización, y no se ejecuta aquí.

El rollback se considera verificable cuando la UI V1 recuperada coincide con la referencia aceptada y los módulos inferiores, rutas y metodología V1 siguen funcionando. El candidato y sus fixtures pueden permanecer disponibles exclusivamente para QA local con el guard de desarrollo intacto.
