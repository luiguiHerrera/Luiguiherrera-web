# Revisión de accesibilidad

**Veredicto: PASS para las comprobaciones locales descritas.** Evidencia reproducible: `accessibility-qa.mjs`, `accessibility-qa.json`, `accessibility-qa.log`, `visual-regression.json` y capturas de `screenshots/`. No se afirma una certificación WCAG completa ni una prueba con lector de pantalla o usuarios.

## Semántica y teclado

La superficie tiene un H1, grupos H2 y pilares/dimensiones H3, con medidas H4. Se verificó el orden de encabezados sin saltos, IDs únicos, nombres accesibles en enlaces/disclosures y destinos presentes para cada enlace de evidencia. Los iconos decorativos están ocultos a tecnología asistiva; toda la información crítica existe en texto visible. No hay contenido exclusivo de hover.

Los `details/summary` nativos están cerrados al entrar y admiten Enter/Espacio. La prueba de navegador usa Tab/Shift+Tab, Enter sobre «Ver evidencia», Espacio sobre un pilar y Enter sobre una fuente. Comprueba apertura de ancestros, foco en el destino y apertura/cierre de metodología. El contorno de foco visible mide 2 px, con separación de 5 px. Los enlaces primarios tienen altura mínima de 44 px y las fuentes 24 px. Los enlaces profundos iniciales también abren el pilar pertinente.

`RegimeV2Disclosure` añade solo la coordinación de foco y apertura; no sustituye las interacciones nativas ni introduce roles redundantes. Los enlaces a fuentes llevan a sus fichas de procedencia, con sesión, disponibilidad, captura, publicación conocida/desconocida, versión y huella.

## Contraste y color

La auditoría calcula luminancia relativa para nodos de texto visibles, compone fondos transparentes con sus ancestros y comprueba ambos extremos del gradiente del hero. Aplica 4,5:1 a texto normal y 3:1 a texto grande. El mínimo observado en los 28 casos es **5,678:1**; no hay fallos en el ámbito V2. Las flechas decorativas se excluyen del cálculo textual. El foco usa el acento institucional oscuro sobre fondo claro.

La clasificación y las dimensiones se nombran en palabras; las evidencias favorables/adversas tienen rótulos y contenido propios. La distinción no depende de hue. Las capturas `*-grayscale.png` se generan con un filtro CSS de navegador para revisión, sin editar los píxeles PNG posteriormente. Se simula ausencia de color, no una evaluación clínica de todas las variantes de daltonismo. El contraste y el significado textual constituyen la base de esta comprobación.

## Reflow y movimiento

Se prueban los doce fixtures en ES y EN a 390 px, abriendo todos los detalles para incluir fuentes, hashes, reglas y ventanas. Se añaden casos de evidencia/metodología/nombre de fuente largos a 320 px y escritorio a 1440 px en ambos idiomas. Los 28 casos no presentan desbordamiento horizontal ni elementos fuera del ancho disponible. La fuente larga se conserva completa y las huellas admiten saltos de línea.

El contexto de navegador solicita `prefers-reduced-motion: reduce`; no se detectan animaciones ni transiciones activas. La navegación interna desplaza de forma instantánea y mantiene foco. No se añade animación de estado ni actualización continua. La lectura principal precede a las medidas y las fuentes incluso cuando el viewport requiere scroll vertical.

## Alcance

La revisión automatizada cubre el nuevo subárbol V2; el sitio compartido conserva los archivos de entrada. La matriz visual adicional cubre 24 vistas principales en escritorio/móvil y ES/EN. Las pruebas de render y preservación cubren la UI V1 y la ausencia de cambios en navegación y otros módulos. Una validación posterior con personas y tecnologías asistivas reales podrá complementar esta evidencia antes del cutover, sin que Designer afirme haberla realizado.
