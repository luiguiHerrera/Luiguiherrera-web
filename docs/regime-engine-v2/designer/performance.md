# Rendimiento de la superficie V2

Veredicto: **PASS**, con alcance de render de servidor local. El candidato añade aproximadamente medio milisegundo de render caliente en el caso Selectivo medido. No se establece un SLA ni se presenta esta medición como latencia de navegador o de producción.

## Comparación reproducible

Se usa React 19.0.0 y Node v26.5.0, el componente V1 extraído literalmente y el componente V2 completo, con sus detalles presentes en el HTML. La referencia V1 procede del agregador y scorer reales, con reloj fijo y proveedores HTTP 404 controlados; los casos V2 son fixtures de diseño. No son dos lecturas del mismo mercado ni datos live comparables.

| Selectivo | V1 mediana SSR | V2 mediana SSR | Diferencia | Presentación V2 separada | HTML V1 / V2 |
| --- | ---: | ---: | ---: | ---: | ---: |
| ES | 0.057 ms | 0.610 ms | +0.553 ms | 0.114 ms | 4,828 / 30,900 B |
| EN | 0.155 ms | 0.657 ms | +0.502 ms | 0.124 ms | 4,778 / 30,344 B |

La mayor mediana V2 entre los 24 casos fue 0.693 ms; el mayor percentil 95 fue 1.179 ms. La presentación determinística se mide por separado; no hay evaluación del engine ni fetches en el intervalo de render.

Protocolo: 30 calentamientos V1 y 20 V2; 250 renders V1 y 120 V2 por caso/idioma. Se conservan cinco pares de procesos fríos en [performance.json](performance.json). Sus duraciones de proceso incluyen Node y el adaptador TypeScript de pruebas; `firstRenderMs` aísla la llamada de render. El HTML utiliza nombres de clases CSS determinísticos de prueba y excluye los envelopes RSC de Next y hashes CSS productivos. Layout, paint y comportamiento de navegador se verifican aparte.

## Hallazgo y reparación de memoria

`D-RENDER-ICU-001` queda **CLOSED**. Crear un `Intl.DateTimeFormat` por cada campo temporal repetía asignaciones nativas de ICU. La primera medición alcanzó 2,416,476,160 B de RSS al finalizar el harness, con solo 24,367,728 B de heap utilizado. Se conservan [métricas anteriores](performance-before-formatter-reuse.json) y [fuente anterior](RegimeV2Surface.before-formatter-reuse.tsx.txt).

La reparación reutiliza exactamente dos formatters, ES/EN. No cambia el texto ni su formato: la regresión compara el HTML completo de la versión anterior y reparada para los 12 fixtures en ambos idiomas.

Después de la reparación, el RSS final es 294,109,184 B (87.8% menor que la primera ejecución). El proceso tras importar módulos estaba en 182,599,680 B. Durante los últimos 1.000 renders, con GC antes y después, el cambio fue +688,128 B de RSS y +50,016 B de heap. Es una observación finita de estabilidad; no prueba ausencia absoluta de fugas y los allocators pueden retener memoria.

## Límite servidor / cliente

El componente V2 y la transformación del output siguen en servidor. El único cliente propio es `RegimeV2Disclosure`: 1,811 B de código fuente, dedicados a abrir ancestros `<details>` y mover el foco al navegar a evidencia. Esa cifra no es el tamaño de un bundle. Recibe `children` ya producidos por servidor y `className`; no recibe el input del motor, el fixture completo ni el view model como prop.

El view model Selectivo serializado para medir tamaño ocuparía 56,618 B; el máximo observado es 318,592 B en un caso incompleto con incidencias repetidas por linaje. Permanece en servidor. El HTML renderizado, los envelopes RSC reales y los assets de navegador son magnitudes distintas. No se instala ninguna dependencia ni se convierte el Dashboard completo en client component.

## Reproducción

```sh
node --expose-gc --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/regime-v2-design-render.mjs
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test lib/dashboard/regime-v2-render.test.mjs
```

[performance.json](performance.json) conserva muestras, bytes, memoria y hashes de los componentes, CSS y capa de presentación. La medición exige que esos hashes permanezcan iguales durante la ejecución. [render-tests.log](render-tests.log) conserva las ocho pruebas de preservación, enlaces y equivalencia de SSR.
