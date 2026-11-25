# Riesgo · Preview de revisión · 25/11/2026

Base: `9bfce71c07c291265c03bb032d87e1131feef3ab`, la versión más reciente de Entorno financiero y Precio y participación. Sin merge ni publicación en producción.

Se conservan las tres columnas de resumen y todos sus estilos. ES95, VaR95 y absorption ratio se incorporan al contexto desplegable actual. EWMA/GARCH conservan sus fórmulas y su fuente Alpha Vantage compacta de cierres sin ajustar. El fallback de EWMA deja de presentarse como GARCH, también en cachés antiguas. La curva actual corresponde a futuros mensuales VX de Cboe, distinta de los índices de volatilidad por horizontes.

## Datos y metodología

| Medida | Universo y unidad | Ventana y método |
|---|---|---|
| ES95 histórico | SPY; larga sin apalancamiento, USD; % pérdida a una sesión | 1.261 cierres ajustados, 1.260 retornos simples; media de las 63 pérdidas mayores |
| VaR95 histórico | SPY; misma exposición y unidad | Misma distribución; nearest rank, posición 1.197 desde uno |
| Absorption ratio | XLB, XLC, XLE, XLF, XLI, XLK, XLP, XLRE, XLU, XLV, XLY; % varianza explicada | 500 retornos comunes; covarianza exponencial centrada, semivida 250; 2 componentes fijos |

Proveedor: Yahoo Finance, reutilizado por AC. El nuevo lector exige `adjclose`, USD y frecuencia diaria. Nunca sustituye el cierre ajustado por el cierre normal. [Ajustes de la fuente](https://help.yahoo.com/kb/SLN28256.html). La lectura conserva 1.261 cierres de SPY y 501 de cada sector, con hashes de las 12 respuestas. Calendario NYSE independiente 2020–2028, incluido el cierre extraordinario del 09/01/2025. Fechas duplicadas, sesiones faltantes o universo incompleto bloquean el candidato completo.

Caché persistente Next/Vercel existente; actualización diaria y cron preparado a las 23:15 UTC. Los crons se activan únicamente cuando se publique una versión aprobada en producción. Un fallo conserva los últimos históricos válidos, sus hashes y sus fechas. La reserva archivada y verificada tiene corte 20/11/2026: ES95 2,5457508239%, VaR95 1,6850859231%, AR 62,6390554973%. Retornos SPY: 15/11/2021–20/11/2026; AR: 22/11/2024–20/11/2026. El preview muestra el corte de la actualización efectiva; si Yahoo falla, identifica la lectura conservada del 20/11.

No se crean bandas universales de AR, puntuaciones combinadas, importes de cartera ni anualización de ES/VaR. No se añaden históricos dibujados de AR.

## Verificación

41 pruebas específicas de riesgo aprobadas: cola verificable a mano, empates, nearest rank, ES ≥ VaR, signos, ventanas/fechas, huecos, duplicados, ausencia de datos futuros, AR sin varianza, permutación de ETF, GARCH sin fallback, traducciones y caché real de App Router con fallo y recuperación. Comparación independiente del AR con NumPy en cinco matrices: diferencia máxima 3,3 × 10⁻¹⁶.

Regresión vigente del sitio: 483 aprobadas, 4 omitidas, 0 fallos. TypeScript y ESLint de los archivos modificados correctos. Compilación Next 16.4.6 con Webpack correcta. Se han añadido las nuevas pruebas al flujo CI del sitio.

El glob indiscriminado de pruebas antiguas reproduce 19 fallos ajenos al cambio en la base intacta; corresponden a harness y expectativas retiradas. Se conserva el conjunto vigente de CI. El entorno local restringido no permite abrir un servidor y su compilador Turbopack se bloquea; la revisión funcional se realiza sobre el preview alojado.

Rutas de revisión: `/dashboard/preview-riesgo` y `/en/dashboard/risk-preview`. Las rutas quedan excluidas de producción y de indexación.
