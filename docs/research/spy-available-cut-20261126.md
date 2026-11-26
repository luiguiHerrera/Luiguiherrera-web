# SPY: publicar el último corte válido disponible

El archivo oficial de State Street descargado el 26/11 contiene 5.786 observaciones y llega al **24/11/2026**. SHA-256: `f9e4f104cb23ccf4726ad82da06429a5c9cdd545e9058d92159ec397d913641d`. Se usa la misma fuente y el mismo cálculo: cambio de participaciones multiplicado por el NAV de esa sesión.

La descarga válida se acepta aunque no alcance la última sesión estadounidense cerrada. Con último cierre esperado 25/11, el corte válido del 24 se publica con estado `delayed`. Los controles de identidad, calendario, sesiones completas, NAV, participaciones, splits, huecos y 252 ventanas de calibración se mantienen. El respaldo de SPY también se actualiza al 24; los respaldos de oro y BTC conservan sus valores.

Se conserva cada publicación derivada por su fecha efectiva en la caché regional existente de Vercel, utilizando el cliente oficial `@vercel/functions`. No se crean servicios ni credenciales. Las fechas distintas ocupan claves distintas: una descarga anterior no puede borrar la fecha posterior. Se vuelve a seleccionar la mayor fecha guardada al terminar, incluso si dos instancias completan las descargas fuera de orden. Los errores conservan fecha, datos, huella y adquisición del corte válido; las revisiones válidas de la misma fecha se recalculan.

Se conserva la consulta horaria y el cron diario existente. El cron fuerza la comprobación; las peticiones ordinarias reutilizan el resultado durante una hora y reintentan tras un minuto si falló. La caché regional es efímera, está aislada entre preview y producción y usa retención de 90 días; ante un arranque sin datos conservados se utiliza el respaldo incluido. Los originales oficiales y las columnas de NAV y participaciones no se publican.

Verificación del corte: 1D **1.975.912.235 USD**; 5D **643.374.633,60 USD**; 20D **9.675.588.715,80 USD**. El método de los otros activos y el diseño del dashboard permanecen iguales.
