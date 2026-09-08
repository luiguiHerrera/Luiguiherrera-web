La reproducción de este checkpoint no exige acceso a DTCC/FINRA, red, Node, instalación de paquetes ni los worktrees temporales originales. Requiere Python 3.9 o posterior y su biblioteca estándar. Conserva todos los archivos del checkpoint juntos; `FILES.json` contiene sus hashes y la ruta relativa de la nota de entrada en docs.

Desde la carpeta de este documento:

```sh
python3 -B verify_checkpoint.py
python3 -B verify_checkpoint.py --replay
```

La primera orden verifica los miembros del archivo comprimido, hashes de entradas, corpus, target, piloto, certificados y lista de 16 títulos. Recuenta los resultados retenidos y comprueba la decisión pública. La segunda crea una carpeta temporal nueva, extrae únicamente miembros regulares con rutas seguras, reproduce el censo Wave 2C y compara los diez hashes registrados en `offline-replay.json`; además ejecuta sus 27 pruebas de contrato. Un audit hook Python rechaza operaciones socket/urllib antes de importar el código histórico. No ejecuta adquisición, expansión ni atestaciones, y no resuelve nuevos pares. La carpeta creada se conserva y se informa; el verificador no borra nada.

El archivo `reconstruction-core.tar.gz` incluye copias exactas de los módulos internos, corpus, resultados globales/piloto, certificados, decisiones manuales compactas, planes mínimos de reproducción, snapshot/config/universo y las entradas de Wave 2C. Los hashes de objetos de `CANDIDATES.json` usan JSON UTF-8 canónico sin newline: claves ordenadas, ensure_ascii=False y separadores coma/dos puntos. Los hashes de archivos del inventario siempre son de los bytes almacenados; los manifiestos de fuente conservan por separado el hash declarado del cuerpo original o del prefijo/bloc SGML. No confundir ambos dominios.

También se preservan los preflight, registros de eventos verificados y relojes de revisión originales. Esos relojes fijan la fecha/horizonte de los nodos y forman parte de fingerprints históricos: no son ruido ni deben regenerarse con la hora actual. Los preflight enlazan el código y las fuentes usados en cada fase, aunque los commits base de sus worktrees difieran.

La auditoría extensa es opcional y requiere que sigan disponibles las rutas originales:

```sh
python3 -B verify_checkpoint.py --verify-sources --verify-workspace
```

Relee cada archivo inventariado y comprueba los 553 hashes de archivos versionados del workspace original, incluido el `package-lock.json` que ya estaba modificado. Es una verificación de conservación, no un nuevo estudio de evidencia. `FILES.json` tiene hash nulo únicamente para sí mismo, evitando una referencia circular; los demás archivos se verifican.

Para encontrar originales sin abrir miles de archivos, leer `retained-manifest.jsonl.gz` como JSONL gzip. Cada fila identifica root, path, clasificación A–D, stored_sha256, bytes, procedencia cuando corresponda, inclusión en el core y copia idéntica de referencia cuando existe. Los prefijos limitados de prospectos mantienen su uso autorizado: prueba positiva de otra clase/producto, nunca documento completo ni cobertura negativa. Los cuerpos heredados de SEC/issuer archives conservan respuestas por URL y hashes dentro del contenedor original. Esos archivos primarios voluminosos no se incorporan al core ni a Git.

Reproducir las **decisiones de fuente** es un nivel distinto del replay numérico. Para hacerlo se necesita un archivo duradero de todos los originales A/B, las revisiones ligadas al fingerprint y sus dependencias generadas, además del código exacto. Restaurar esas rutas en un checkout aislado del commit base `ea9737a55742f318f417048a8cbf0c06a82f0545`, comprobar todos los hashes y bloquear la red antes de cualquier evaluación. No se debe ejecutar un generador que firme revisiones ni una adquisición automática para rellenar archivos ausentes. Si falta evidencia, declarar el replay primario incompleto. El core compacto no contiene por sí solo todos los originales. El archivo duradero enlazado en STATE.json sí conserva A/B y las excepciones de revisión necesarias; su verificador reconstruye y comprueba dependencias primarias desde sus blobs, sin los worktrees originales. No se han vuelto a certificar ni mejorado las conclusiones económicas.

La comprobación de comprensión del cierre debe responder estas siete preguntas usando README, MODELS, STATE y este documento:

| Pregunta | Respuesta preservada |
|---|---|
| ¿Qué se intentó? | Resolver cambios reportados mediante identidad/perímetro/cobertura probada; escalar evidencia; estudiar fuentes operativas; medir viabilidad por título. |
| ¿Qué se probó? | Piloto 501/487/14, 66 paquetes clasificados; total global 526 y 16 títulos con todos sus pares resueltos. No prueba de error poblacional cero. |
| ¿Por qué no publicar? | 0/8 filas públicas elegibles, una tendencia beneficiada, UNKNOWN no aleatorio, acceso de fuentes insuficiente y mantenimiento material. |
| ¿Qué modelos sirven? | Las once especificaciones en MODELS, con los límites de transformaciones, identidad y ausencia. |
| ¿Qué evidencia es autoritativa? | Originales SEC/emisor/clase y términos pertinentes, por alcance, con revisiones y procedencia; ninguna inferencia por ausencia de hits. |
| ¿Qué debe cambiar? | Al menos un trigger A–E de STATE; nueva evaluación y autorización para investigación masiva. No publicación automática. |
| ¿Cómo reproducir? | Verificador autónomo, diez hashes de replay y 27 pruebas; archivo primario A/B necesario para una nueva validación de fuentes. |

La verificación de custodia completa usa el archivo externo:

```sh
python3 -B /Users/quantlab/Developer/web/Luiguiherrera-evidence/trends-movements-v2.1-20260908/verify_archive.py
```

Comprueba los hashes del checkpoint conservado allí, los blobs, los originales/refs primarios, las dos listas SEC, el replay 10/10 y sus 27 pruebas. Una política de audit hook prohíbe red y lecturas de las raíces originales. `DELETE_TEMP_EVIDENCE=NO` sigue vigente después de PASS.
