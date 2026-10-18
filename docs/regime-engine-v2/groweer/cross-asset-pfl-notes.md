G15–G17 concluyen `CROSS_ASSET_CORE=NONE` y `PFL_CORE=NONE`. Hay prioridades de investigación, pero ninguna ampliación dispone de evidencia suficiente para recomendar su incorporación al C03 canónico.

Los nueve ETFs examinados conservan 500 cierres diarios por activo, hasta el 14 de agosto de 2026. Las series semanales y mensuales guardadas tienen mayor alcance; los contadores de miles de periodos del proveedor son resúmenes y no reconstruyen las observaciones diarias ausentes. Faltan las 15 sesiones finales de C03. HYG, LQD, IEF y SHY también tienen huecos internos frente al calendario observado de SPY. La herramienta antigua permite sustituir `adjclose` por `close`; sus snapshots redondeados no acreditan el contrato de precios ni la disponibilidad temporal de V2. No se ha modificado esa herramienta independiente.

El análisis descriptivo con fechas coincidentes encuentra una correlación diaria de HYG con SPY de 0,8175 en 496 pares. Los otros coeficientes están en el JSON. Esto muestra dependencia observada; coeficientes bajos tampoco demuestran que una extensión mejore el régimen. No se ha usado rentabilidad futura ni se han seleccionado umbrales.

HYG/LQD representan precios de carteras de bonos con exposiciones distintas; su cociente no es un spread de crédito. TLT/IEF representan precios de fondos, no rendimientos Treasury. UUP mantiene futuros DX y no es una cotización DXY. USO incorpora futuros, roll y collateral y no puede sustituir al WTI spot. Las definiciones y fuentes primarias están asociadas a cada candidato en el JSON.

Crédito OAS merece investigación posterior, pero la [serie oficial FRED de ICE](https://fred.stlouisfed.org/series/BAMLH0A0HYM2) anuncia desde abril de 2026 solo tres años de observaciones y condiciones de ICE para distribución. La metodología de [Treasury](https://home.treasury.gov/policy-issues/financing-the-government/interest-rate-statistics/treasury-yield-curve-methodology) ofrece otro punto de partida; la hora de observación de sus cotizaciones no acredita por sí sola disponibilidad. No se descargaron series nuevas.

PFL incluye 3.804 filas sintéticas para cuatro activos en 951 fechas. No son historia real de mercado. El experimento aislado reutiliza sus funciones originales sobre los once ETFs sectoriales P8, equiponderados explícitamente y con ventanas de 60–252 retornos. Resultan elegibles las 1.930 sesiones R2, sin exclusiones; 117 tienen muestra inferior a 252 retornos. Se preservan el corte temporal y las constantes PFL.

El número de clusters cambia 96 veces en 1.929 pares de sesiones. En 92 de esos cambios C permanece igual; en otros 88 pares cambia C y no el número de clusters. La topología y la ventana larga aportan detalle descriptivo dentro de la misma familia de precios. No constituyen una nueva fuente independiente ni prueban superioridad. La concentración de capital de esta cartera equiponderada permanece constante. Los escenarios hipotéticos PFL tampoco son observaciones económicas. No se ha importado `fragilityScore` ni conectado PFL al runtime de V2.

Reproducción desde la raíz del repositorio:

```sh
python3 docs/regime-engine-v2/groweer/audit-cross-asset-pfl.py
```

El script lee únicamente archivos locales preservados, verifica los hashes de 12 capturas P8 y regenera los dos JSON de auditoría. El histórico conserva la clase R2; no se presenta como un nuevo holdout ni como evidencia point-in-time OOS.
