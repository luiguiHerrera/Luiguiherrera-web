# Publicación aprobada · Segundo Informe de septiembre de 2026

Decisión del Founder: PUBLICAR, 21/09/2026.

Base del dominio público: 4ee6adb006f360fea13837db5f7d45815f297b55 (despliegue dpl_FwDTx8HZPNdPZDEiFKGxAVjxfcZ6).

El commit d237806 incorpora el informe en vercel-deployment, pero esa rama genera Preview. Este despliegue aplica únicamente ese commit sobre la versión activa del dominio, sin promover los demás cambios pendientes de la rama.
URL: https://www.luiguiherrera.com/informes/segundo-informe-septiembre-2026

El Segundo Informe queda como única edición actual. El Primero pasa a archivado en el registro; sus contenidos, correcciones posteriores y descargas de producción se conservan.

La comparación estructural del modelo aprobado contra el modelo público confirma igualdad de título, subtítulo, todas las secciones editoriales y cuantitativas y todos los eventos. Solo cambian estado y metadatos de publicación, enlaces de descarga y una preferencia explícita que conserva el salto de página aprobado antes del capítulo de activos.

Validación antes del despliegue:

- 22/22 pruebas de ambos informes.
- Snapshot y reconciliación reproducidos offline sin modificar datos congelados.
- reports:validate: 6 informes, 23 artefactos.
- reports:check: 24 archivos deterministas.
- Validación editorial y SEO aprobadas (77 rutas indexables).
- ESLint de archivos afectados aprobado.
- Compilación de producción Next.js con webpack y TypeScript aprobada.
- PDF: 21 páginas revisadas visualmente, sin páginas vacías ni texto fuera de límites.
- Página compilada revisada en escritorio y móvil de 390 px; sin desbordamiento de página; acordeón de S&P y enlaces de descarga correctos.
- Descargas previas, snapshots, Statistical Levels y Regime V2 idénticos al baseline.

La verificación offline se adapta al punto de entrada aislado ya existente en producción (`createReportStatisticalEngine`). No se modifica ni ejecuta el generador de Statistical Levels.

## Huellas de las nuevas descargas

- `segundo-informe-septiembre-2026-calendar.ics`: `131d121f758c04dce31e20bb470f84a1bb9aea81abdf68813e6b2205843f29a2`
- `segundo-informe-septiembre-2026.html`: `520823a268b7417eeeab333fd23d7292446b40196452b5093e5886db17fc0451`
- `segundo-informe-septiembre-2026.md`: `455090c92db7ffc15d8ae8790e86681e0979ce692ffefe2cb6318482ad2c7b1e`
- `segundo-informe-septiembre-2026.pdf`: `b635afc5e576452b56f029da2f58f33c27525ea93a3da5eaf575647fd3b32999`
