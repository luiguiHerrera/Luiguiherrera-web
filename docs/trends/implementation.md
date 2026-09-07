# Tendencias: implementación y operación

Base auditada: `84e8b3ee92dff4c41b4342ae5d1759603ed85c6b`.
Revisión editorial: 2026-09-06. Trabajo local, sin commit, push ni deploy.

## Auditoría previa

- Rutas originales: `app/(es)/tendencias/page.tsx` y `app/en/trends/page.tsx`.
- `components/trends/TrendsExplorer.tsx` era un único componente cliente, con mapa, panel de detalle y varias explicaciones repetidas. `ReadingCard` añadía otra explicación del producto.
- `lib/trends/trends-content.ts` contenía 13 tesis bilingües y vehículos observables, sin clasificación homogénea de fase/evidencia. La lista real incluía cripto y robótica separada; no incluía Espacio ni Materiales críticos.
- Se revisaron Inicio, Inversionista/`EditorialPathPage`, Mercado (redirect a Dashboard), módulos de Dashboard, Empezar/`StartPathPage` e Investigación/`ResearchIndex`.
- Autoridad visual: `app/globals.css`, `tailwind.config.ts`, `docs/visual-design-system.md`, `docs/frontend-design-direction.md`, `InstitutionalHero` y componentes anteriores. H1/H2 usan la familia Inter/system sans heredada, peso 600; **no existe una familia serif global**. No se incorporaron fuentes.
- Paleta preservada: institutional/petrol `#0B3436`, ink `#111716`, paper `#F7F4ED`, soft `#EFEAE1`, line `#D8D2C8`, muted `#69706D`, brass `#9A7A44`. Superficies blancas y tokens existentes. No hay colores nuevos ni CSS global modificado.
- Radios 4 px para controles, 6 px para superficies; ancho `max-w-7xl`; padding 16/20 px; breakpoints existentes (sm 640, md 768, lg 1024, xl 1280). H1 conserva peso, tracking y proporciones editoriales; hero plano para cumplir el brief. Reutilización de `EmptyState`, `JsonLd`, helpers SEO, fechas y analytics.
- i18n: contenido por locale y registro central `language-pairs.ts`. SEO centralizado en `site.ts`; sitemap lo consume. `LanguageSwitcher` conserva traducción y parámetros.
- Datos previos: referencias 13F manuales en Dashboard; no eran un dataset apto para contabilizar holdings. Se siguió el patrón scripts → evidencia/snapshot generado → loader de servidor. No se cambió el radar del Dashboard.
- Tests previos: runner nativo Node, validadores editorial/SEO, ESLint, TypeScript y build Next. Se amplió el whitelist SEO para las rutas nuevas.
- Riesgos tratados: pérdida de vehículos/enlaces, confusión trimestre/fecha de consulta, doble conteo de amendments, salidas por ausencia o cambio de CIK, deriva ES/EN e hidratación.

## Arquitectura y alcance

Cinco bloques: hero, selección editorial actual, radar, capital divulgado y un único CTA de profundización. Hero, lecturas, contexto, metadata y detalles se renderizan en servidor; filtros, tabla y captura de eventos son las únicas islas cliente. En el candidato v2 la tabla publica solo Coincidencias; las pestañas adicionales dependen de la autorización explícita del motor para v2.1. No se añadieron SDK, dependencias ni bibliotecas visuales.

Se preservan las 13 tesis originales y sus vehículos; Espacio y Materiales críticos elevan el radar a 15. Automatización se centra en procesos/integración; Robótica en máquinas y aplicaciones físicas. El alcance original premium/aspiracional se explicita dentro de Consumo del futuro. `catalog.ts` aporta IDs, slugs bilingües, categoría y estados comunes. `evidence.ts` relaciona cada ficha con una fuente revisada y sus límites.

Las 15 fichas tienen rutas ES/EN, además de metodología ES/EN: 34 rutas en total con los dos índices. No se pierden enlaces hacia Niveles. No hay fichas alternativas de IA repetidas al final.

Los estados editoriales se definen en metodología; no son scores ni medidas de rentabilidad. Fuentes principales: Stanford HAI, IEA, OMS, IFR, ENISA, SIPRI, Banco Mundial, UNESCO, ESA, BIS y resultados publicados de LVMH (este último se identifica como evidencia corporativa parcial).

## SEC EDGAR y operación vigente

La fase posterior de cierre de datos sustituye la muestra inicial de tres entidades. El registro vigente tiene 44 unidades esperadas, 43 filings utilizables, dos avisos sin recuento separado y una enmienda bloqueada. Los porcentajes usan gestores divulgados elegibles; la cobertura usa filings esperados.

Véase [Cierre de datos y revisión adversarial](preproduction-review.md) para identidad y resolución de Pershing/ValueAct, piloto de diez, criterios del universo, muestras SEC, movimientos, limitaciones y comandos reproducibles. El alcance vigente y los resultados del candidato de posiciones están en [Production Candidate v2](production-candidate-v2.md) y `production-candidate-v2-validation.json`. `preproduction-validation.json` conserva la auditoría anterior, cuyo bloqueo correspondía al alcance con movimientos. `validation.json` conserva la fase visual inicial.

El adaptador de servidor `public-capital.ts` agrega posiciones utilizables con `positions.ts`, sin consultar el trimestre anterior ni los resultados del comparison engine. `public-contract.ts` define la lista explícita de campos y valida el payload. Solo `movement_publication === "READY"` agrega las vistas de v2.1. `CapitalDisclosureTable` recibe únicamente las vistas proyectadas; no recibe el snapshot ni identificadores de gestores, registros de revisión o conteos internos. Los detalles usan la misma proyección filtrada por tendencia. El validador HTTP comprueba también HTML y el stream RSC de las 34 rutas.

Comandos vigentes:

```sh
npm run build:trends-13f
npm run check:trends-13f
python3 scripts/verify-capital-evidence.py
python3 scripts/test-capital-xml.py
node --experimental-test-module-mocks --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --import ./scripts/trends-test-register.mjs --test $(rg --files lib | rg '\.test\.(ts|mts|tsx)$')
npm run validate:seo
npm run validate:editorial
npm run lint
npx tsc --noEmit --incremental false
npm run build
git diff --check
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types scripts/validate-trends-http.mts
```

No se añadieron SDK, dependencias ni tareas recurrentes. Header, footer, tipografía, rutas y tokens globales mantienen el sistema existente. Se conservan los cambios ajenos del worktree.
