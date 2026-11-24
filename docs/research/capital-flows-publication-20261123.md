# Publicación de Flujos — 23/11/2026

Autorización del usuario: «publica», después de revisar las tarjetas y la corrección del símbolo & y de las sesiones con flujo neto cero.

Se publica el corte validado del **20/11/2026**, sin activar una automatización no validada. La interfaz identifica «Corte importado» y explica en contexto que la actualización se realiza mediante importaciones de cortes validados; el refresco automático de estas nuevas series sigue pendiente. La autorización de publicación no se presenta como una nueva licencia otorgada por los proveedores.

Los datos servidos son flujos agregados/derivados y medias calculadas, con 400 sesiones suficientes para mantener exactamente las ventanas y calibraciones revisadas. No se incluyen en el contenido público las participaciones o NAV originales, los libros de las gestoras ni las contribuciones individuales de cada ETF. Los promedios de oro se calculan antes de retirar los datos de NAV/participaciones, preservando el método vigente del proxy. La construcción comprueba que los estados de 5/20/60 sesiones coinciden con el histórico completo.

La copia publicada se incluye en el despliegue; no depende de `/tmp`, del Mac encendido, de sesiones privadas ni de lecturas de archivos locales en producción. No se añaden dependencias, servicios, tareas programadas o costes recurrentes. No se alteran el cron de McClellan, el score de régimen ni los adaptadores operativos existentes. Se conserva la presentación inglesa previa; esta publicación aplica a las tarjetas españolas aprobadas.

La base es el commit de producción `2ee86b07ed5d4d66031ae9e8b132779481f59dc8`, árbol `84eb1ae5e52b5c5c6d2e43094cbc8ddd17be4c6e`. El candidato incorpora solo las tarjetas, sus cálculos auxiliares, el corte publicado, pruebas/documentación y la integración española en `/dashboard`. Los demás cambios locales acumulados quedan excluidos.

Reproducción del corte, desde las entradas privadas verificadas:

```sh
node scripts/research/build-capital-flows-publication.mjs
```

La comprobación de la actualización automática y del alcance de reutilización de cada proveedor queda como trabajo posterior explícito. Esta entrega no acredita un acceso automatizado autorizado a IVV ni configura un descargador para ese fin.
