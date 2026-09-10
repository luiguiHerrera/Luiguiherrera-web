# Candidato de diseño V2

El estado de mercado ocupa el primer nivel. Una frase explica la combinación que lo produce y un máximo de tres evidencias favorables, tres adversas y dos condiciones de vigilancia organiza la lectura. Concordancia es la única dimensión secundaria prominente; incertidumbre y calidad completa se explican al abrir la evidencia. PARTIAL conserva un aviso visible en la superficie rápida. INSUFFICIENT tiene una composición técnica propia, sin régimen aproximado ni señales de mercado de relleno.

La zona pública conserva V1. Designer extrae literalmente su bloque superior a `DashboardRegimeV1`, para compararlo y mantener rollback, e introduce una alternativa separada. La prueba `v1-render-proof.json` reconstruye exactamente el archivo de entrada y compara el HTML del bloque original y extraído en ambos idiomas. Todos los módulos inferiores del Dashboard, las rutas ES/EN, navegación, header, footer e informes conservan su código aceptado.

## Jerarquía y lectura

1. Régimen y explicación: diferencia estructural entre amplitud y selectividad, conflicto explícito en transición, evidencia adversa en defensivo y activador contractual en STRESS.
2. Evidencias seleccionadas y vigilancia, con enlaces reales a las medidas que las sostienen. Los grupos vacíos se omiten. En STRESS se rotulan «Evidencia favorable / Evidencia adversa» para evitar interpretar la evidencia favorable como causa de STRESS.
3. Evidencia cerrada inicialmente: concordancia, incertidumbre y calidad; tres pilares desplegables; medidas, sesiones y fuentes. BTC y GLD se agrupan como contexto adicional con cero votos.
4. Metodología cerrada inicialmente: Evidence State Engine, C03, reglas, ventanas, versiones, frescura y limitaciones. No lleva a metodología V1.

El estado se identifica por texto, no por color. Se mantienen las variables tipográficas y cromáticas del sitio: papel claro, tinta y acento institucional. STRESS tiene un acento óxido moderado; no utiliza rojo de alarma ni instrucciones de inversión. Risk-on amplio y selectivo comparten color: los distinguen el nombre y la participación descrita. No hay gauge, score, porcentajes de confianza, barras continuas ni probabilidades inventadas. Las cifras de medidas dentro de evidencia conservan sus unidades reales; un porcentaje de sectores o una variación de VIX no se presenta como probabilidad.

La lectura de 20–30 segundos se evalúa como revisión de jerarquía y presupuesto de palabras. `state-review.md` documenta los límites de esa evaluación: no se ha realizado un estudio cronometrado con personas. Los estados complejos en móvil requieren desplazamiento vertical para llegar a vigilancia y acciones; nunca desplazamiento horizontal. El banner de QA se excluye del presupuesto de lectura de producto.

## Límite de presentación

`buildRegimeV2View` transforma únicamente el output adjudicado por el motor. Los nombres españoles mantienen la taxonomía exacta. Claims, condiciones de vigilancia y explicaciones se seleccionan por estados y reason codes, con referencias a regla, pilar, features y fuentes. No ejecuta un segundo clasificador, no suaviza estados ni introduce persistencia como confianza. La incertidumbre describe la expansión de estados intermedios; sus estados plausibles no llevan porcentajes.

`RegimeV2Surface` renderiza en servidor. El único componente cliente V2 es el controlador pequeño de enlaces/disclosures: abre los ancestros necesarios, lleva el foco al destino y admite enlaces profundos. No recibe el output completo ni los inputs normalizados. No hay animaciones, cálculo de régimen en navegador, generador dinámico de copy, librerías nuevas ni bucles de render. Los formateadores de fecha ES/EN se reutilizan en un conjunto acotado; la reparación y su comparación de memoria quedan registradas en `performance.json`.

Los patrones existentes se reutilizan donde sirven: variables globales, tipografía, enlaces, bordes y disclosures nativos. El CSS nuevo está encapsulado en el componente, sin un tema paralelo ni cambios globales. No se adapta el antiguo componente de score para fingir un score V2 ausente.

## Revisión interna y datos

Las rutas `/internal/regime-v2` y `/en/internal/regime-v2` requieren desarrollo antes de importar la preview. V1 es la opción por defecto; `preview=v2` es un selector de revisión visual, separado de `V2_SHADOW`, cuyo propósito operativo y default OFF se conservan. No se crea una segunda flag de autoridad de producción.

Los doce fixtures se generan con el motor C03 sin overrides de output. Cubren seis estados, tres niveles de concordancia e incertidumbre, COMPLETE/PARTIAL/INSUFFICIENT y problemas de datos. La preview identifica explícitamente DESIGN_TEST y datos sintéticos; no los presenta como «V2 hoy». `edge=long` añade texto de prueba a una copia de presentación para revisar ajuste de línea; no reescribe la evidencia canónica.

No existe una captura real V2 completa. Las cinco capturas reales de Maintainer permanecen INCOMPLETE/UNKNOWN. La reconstrucción histórica es R2 y no constituye validación point-in-time OOS. Estas limitaciones viven en la metodología y en el paquete de revisión; la interfaz nunca inventa un estado live ni una recomendación.

El plan de integración futura y rollback está en `cutover-plan.md`. Su ejecución requiere una autorización posterior de Control Tower.
