# Ledger de procedencia — Primer informe de septiembre de 2026

BASE_COMMIT=636cb73fb0fe4d2b28ad96cb7185f8c07d8f895b

EDITORIAL_CUT=2026-09-06

AUTOMATIC_DATA_CUT=2026-09-04

SCOPE=Reparación de atribución y procedencia; sin nueva investigación institucional ni cambios de mercado.

## Autoridad disponible y límites

La autoridad para las referencias institucionales es el material aportado por el editor en el encargo original, secciones 10–13, especialmente los ejes identificados por institución en §13. No se dispone aquí de una nueva copia íntegra autenticada de las notas privadas. A significa soporte en ese material editorial, **no verificación independiente de la publicación propietaria ni de sus cifras**. Títulos, autores y fechas se registran tal como los suministró el editor. El registro de Goldman Sachs conserva también la identificación U.S. Department of Commerce recibida; no se presenta como consulta independiente a un documento oficial.

INPUT_REFERENCE=/Users/quantlab/.codex/attachments/9bb27e69-e431-4798-953f-5e57e751e335/pasted-text.txt

INPUT_SHA256=03b492fec893a846508e3474b8fe079fa2d2f94836d54a139575bd495a13217b

No se archivan screenshots propietarios. Los campos PUBLIC_WORDING reproducen el texto público reparado; cuando abarcan un párrafo mixto, CLAIM_USED delimita qué parte se atribuye a cada fuente. Las repeticiones de una misma tesis se agrupan con sus ubicaciones.

## Cobertura de todo el informe

| Área revisada | Procedencia y tratamiento |
| --- | --- |
| Cabecera y 1. Contexto general | Marco editorial del encargo; atribuciones FMS, Flow Show, MS, Nomura y JPM, seguidas de inferencias identificadas. |
| 2. Lecturas de mercado al cierre, incluido Lo que impulsó y lo que frenó | Dataset, evidencia de proveedores y cálculos propios congelados al 04/09. No depende de las notas institucionales; íntegramente conservado. |
| 3. S&P 500, Oro, China, DXY | Tesis institucionales e inferencias registradas abajo. Niveles, estacionalidad, precios y flujos proceden de datos propios/públicos y no se cambian. |
| 3. Japón | BOJ público y mecánica bursátil/divisa del editor; ninguna afirmación atribuida a las cinco casas. Se conserva. |
| 3. Bitcoin y Ethereum | Farside y precios congelados; escenarios del editor. El vínculo fiscal de Bitcoin se registra como inferencia propia; no hay tesis institucional atribuida para ETH. |
| 3. Stockpicking | Resultados oficiales NVIDIA/FUTU; cierres regulares congelados; autoridad histórica de agosto separada abajo; tesis JPM/GS y filtros editoriales registrados. |
| 4. Calendario de eventos | Fuentes oficiales y motivaciones editoriales condicionales, sin nuevas conclusiones de las casas. La “debilidad de demanda descrita en agosto” en China remite al eje editorial §11, no a una estadística ni conclusión de BofA. Calendario y horas conservados exactamente. |
| 5. Rutas probables | Tres escenarios propios, ahora identificados expresamente como del editor; no pronósticos institucionales. |
| 6. Lista de control | Criterios propios identificados en cada fila como lectura editorial y seguimiento condicional. Los que extienden ejes institucionales figuran abajo. Yen/BOJ, flujos BTC y liquidez ETH no añaden opiniones institucionales. |
| 7. Fuentes y aviso educativo | Grupos separados: material institucional del editor; fuentes oficiales/públicas; datos propios/Dashboard. El aviso delimita las inferencias y no certifica notas privadas. |

## Cifras institucionales no certificadas (regla D)

No se publica como hecho independiente el efectivo aproximado del FMS (~3,5 %), la deuda federal cercana a US$40tn, ni la comparación aproximada de tres años de LLM frente a quince años de PC. El primero se parafrasea cualitativamente con atribución (FMS-CASH); las otras cifras no se incorporan. Tampoco se publican niveles de apalancamiento, triggers de opciones/autocallables o probabilidades institucionales antiguas. Esas omisiones ya existentes no incrementan el contador de reparaciones. Los números públicos conservados son del snapshot, proveedores públicos o emisores, no cifras privadas certificadas por este ledger.

## Registro de afirmaciones

### MS-EPS-FCF

SOURCE_ID=MS

INSTITUTION=Morgan Stanley / Nick Savone

TITLE=Global Reflections

DATE=2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=1. Contexto general / Coste de financiación; 3. S&P 500 / Qué ocurrió

CLAIM_USED=El material de Morgan Stanley se centra en beneficios, EPS y flujo de caja libre.

CLAIM_TYPE=institutional_view

PUBLIC_WORDING=Morgan Stanley centra Global Reflections de agosto en beneficios, EPS y flujo de caja libre. Nomura, en GET WONKY, vincula los rendimientos largos con la oferta de deuda y la financiación de IA. Nuestra lectura es que el coste de financiar el crecimiento merece tanta atención como el crecimiento mismo.

SPY cerró el 4 de septiembre en 770,19 USD. El índice conserva fortaleza, aunque el cierre de una semana no describe toda la rotación interna. Morgan Stanley destaca la combinación de EPS y flujo de caja libre en su lectura de agosto; aquí la usamos como criterio de seguimiento.

SUPPORT_STATUS=A_SUPPORTED_AS_EDITOR_PROVIDED; atribución explícita, sin verificación independiente de la nota completa

SUPPORT_BASIS=Material aportado §13, MS: earnings, EPS + FCF; uso como criterio de seguimiento, sin afirmar que el precio responde causalmente a esa combinación.

### NOMURA-FUNDING

SOURCE_ID=NOMURA

INSTITUTION=Nomura / Charlie McElligott

TITLE=GET WONKY — Spot Up, Vol Up

DATE=2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=1. Contexto general / Coste de financiación

CLAIM_USED=Nomura relaciona rendimientos largos, oferta de deuda y financiación de IA.

CLAIM_TYPE=institutional_view

PUBLIC_WORDING=Morgan Stanley centra Global Reflections de agosto en beneficios, EPS y flujo de caja libre. Nomura, en GET WONKY, vincula los rendimientos largos con la oferta de deuda y la financiación de IA. Nuestra lectura es que el coste de financiar el crecimiento merece tanta atención como el crecimiento mismo.

SUPPORT_STATUS=A_SUPPORTED_AS_EDITOR_PROVIDED; atribución explícita, sin verificación independiente de la nota completa

SUPPORT_BASIS=§13, Nomura: bear-steepening, oferta de deuda, AI/hyperscaler/data center financing y crowding-out. No se reutilizan triggers de agosto como datos de septiembre.

### FMS-CASH

SOURCE_ID=FMS

INSTITUTION=Bank of America

TITLE=Global Fund Manager Survey — The Noes Have It - FMS

DATE=2026-08-19

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=1. Contexto general / Posicionamiento; 3. S&P 500 / Qué cambió

CLAIM_USED=BofA describe poco efectivo en el FMS de agosto.

CLAIM_TYPE=reported_data

PUBLIC_WORDING=En el FMS de agosto, BofA describe poco efectivo, alta exposición a acciones y concentración en semiconductores. J.P. Morgan plantea que parte del castigo al software podría exagerar la disrupción de IA. En nuestra lectura, ambas ideas piden distinguir entre compañías.

BofA describe exposición elevada a acciones y semiconductores concurridos en su FMS de agosto. En nuestra lectura, eso deja menos margen para una decepción: unos rendimientos largos elevados podrían agravarla incluso si la actividad sigue creciendo.

SUPPORT_STATUS=A_SUPPORTED_AS_EDITOR_PROVIDED; atribución explícita, sin verificación independiente de la nota completa

SUPPORT_BASIS=§13, FMS: cash ~3,5 %. Se conserva únicamente la descripción cualitativa atribuida.

### FMS-EQUITIES

SOURCE_ID=FMS

INSTITUTION=Bank of America

TITLE=Global Fund Manager Survey — The Noes Have It - FMS

DATE=2026-08-19

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=1. Contexto general / Posicionamiento; 3. S&P 500 / Qué cambió

CLAIM_USED=BofA describe exposición elevada a acciones.

CLAIM_TYPE=reported_data

PUBLIC_WORDING=En el FMS de agosto, BofA describe poco efectivo, alta exposición a acciones y concentración en semiconductores. J.P. Morgan plantea que parte del castigo al software podría exagerar la disrupción de IA. En nuestra lectura, ambas ideas piden distinguir entre compañías.

BofA describe exposición elevada a acciones y semiconductores concurridos en su FMS de agosto. En nuestra lectura, eso deja menos margen para una decepción: unos rendimientos largos elevados podrían agravarla incluso si la actividad sigue creciendo.

SUPPORT_STATUS=A_SUPPORTED_AS_EDITOR_PROVIDED; atribución explícita, sin verificación independiente de la nota completa

SUPPORT_BASIS=§13, FMS: exposición elevada a equities.

### FMS-SEMIS

SOURCE_ID=FMS

INSTITUTION=Bank of America

TITLE=Global Fund Manager Survey — The Noes Have It - FMS

DATE=2026-08-19

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=1. Contexto general / Posicionamiento; 3. S&P 500 / Qué cambió

CLAIM_USED=BofA describe concentración en semiconductores.

CLAIM_TYPE=reported_data

PUBLIC_WORDING=En el FMS de agosto, BofA describe poco efectivo, alta exposición a acciones y concentración en semiconductores. J.P. Morgan plantea que parte del castigo al software podría exagerar la disrupción de IA. En nuestra lectura, ambas ideas piden distinguir entre compañías.

BofA describe exposición elevada a acciones y semiconductores concurridos en su FMS de agosto. En nuestra lectura, eso deja menos margen para una decepción: unos rendimientos largos elevados podrían agravarla incluso si la actividad sigue creciendo.

SUPPORT_STATUS=A_SUPPORTED_AS_EDITOR_PROVIDED; atribución explícita, sin verificación independiente de la nota completa

SUPPORT_BASIS=§13, FMS: semiconductores trade crowded.

### JPM-SOFTWARE-DISRUPTION

SOURCE_ID=JPM

INSTITUTION=J.P. Morgan

TITLE=Software — Industry Thoughts and Rank Order / AI Disruption

DATE=2026-08-19

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=1. Contexto general / Posicionamiento; 3. Stockpicking / Tema en consideración

CLAIM_USED=J.P. Morgan plantea que el castigo al software puede exagerar la disrupción de IA.

CLAIM_TYPE=institutional_view

PUBLIC_WORDING=En el FMS de agosto, BofA describe poco efectivo, alta exposición a acciones y concentración en semiconductores. J.P. Morgan plantea que parte del castigo al software podría exagerar la disrupción de IA. En nuestra lectura, ambas ideas piden distinguir entre compañías.

J.P. Morgan plantea que parte del castigo al software puede exagerar el riesgo de disrupción y estudia modelos económicos y monetización por consumo. Goldman Sachs describe el abaratamiento de la inteligencia en su material de julio. Nuestra inferencia es que un menor coste podría ampliar adopción y márgenes en aplicaciones, datos y procesos empresariales. Eso no asegura menor CAPEX total: un uso mayor puede exigir más inversión.

SUPPORT_STATUS=A_SUPPORTED_AS_EDITOR_PROVIDED; atribución explícita, sin verificación independiente de la nota completa

SUPPORT_BASIS=§13, JPM: mercado posiblemente exagerando disrupción de IA en software. La pregunta del título no declara infravaloración.

### JPM-MODELS-CONSUMPTION

SOURCE_ID=JPM

INSTITUTION=J.P. Morgan

TITLE=Software — Industry Thoughts and Rank Order / AI Disruption

DATE=2026-08-19

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=3. Stockpicking / Tema en consideración

CLAIM_USED=J.P. Morgan estudia modelos económicos y monetización por consumo.

CLAIM_TYPE=institutional_view

PUBLIC_WORDING=J.P. Morgan plantea que parte del castigo al software puede exagerar el riesgo de disrupción y estudia modelos económicos y monetización por consumo. Goldman Sachs describe el abaratamiento de la inteligencia en su material de julio. Nuestra inferencia es que un menor coste podría ampliar adopción y márgenes en aplicaciones, datos y procesos empresariales. Eso no asegura menor CAPEX total: un uso mayor puede exigir más inversión.

SUPPORT_STATUS=A_SUPPORTED_AS_EDITOR_PROVIDED; atribución explícita, sin verificación independiente de la nota completa

SUPPORT_BASIS=§13, JPM: routing, modelos baratos, monetización por consumo. No se publican resultados empresariales derivados de esos ejes.

### GS-CHEAPER-INTELLIGENCE

SOURCE_ID=GS

INSTITUTION=Goldman Sachs Global Investment Research / U.S. Department of Commerce (identificación aportada por el editor)

TITLE=The Price of Intelligence Is Falling Quickly

DATE=2026-07-10

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=3. Stockpicking / Tema en consideración; 7. Fuentes

CLAIM_USED=Goldman Sachs describe el abaratamiento de la inteligencia en material de julio.

CLAIM_TYPE=institutional_view

PUBLIC_WORDING=J.P. Morgan plantea que parte del castigo al software puede exagerar el riesgo de disrupción y estudia modelos económicos y monetización por consumo. Goldman Sachs describe el abaratamiento de la inteligencia en su material de julio. Nuestra inferencia es que un menor coste podría ampliar adopción y márgenes en aplicaciones, datos y procesos empresariales. Eso no asegura menor CAPEX total: un uso mayor puede exigir más inversión.

SUPPORT_STATUS=A_SUPPORTED_AS_EDITOR_PROVIDED; atribución explícita, sin verificación independiente de la nota completa

SUPPORT_BASIS=§13, GS: tendencia estructural del 10/07. No se publica la comparación cuantitativa aproximada LLM/PC ni se presenta como medición de septiembre.

### FLOW-GOLD-DEBT-USD

SOURCE_ID=FLOW

INSTITUTION=Bank of America

TITLE=The Flow Show — Strife Begins at Forty

DATE=2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=3. Oro / Qué cambió

CLAIM_USED=BofA relaciona oro, deuda y diversificación frente al dólar.

CLAIM_TYPE=institutional_view

PUBLIC_WORDING=BofA relaciona oro, deuda y diversificación frente al dólar en The Flow Show de agosto. Nuestra lectura combina ese marco con el aumento de participaciones de GLD, sin perder de vista el coste de oportunidad de unos rendimientos reales elevados.

SUPPORT_STATUS=A_SUPPORTED_AS_EDITOR_PROVIDED; atribución explícita, sin verificación independiente de la nota completa

SUPPORT_BASIS=§13, The Flow Show: deuda federal, intereses, oro y Anything but US Dollar. Las variaciones de participaciones GLD proceden del snapshot de State Street, no de BofA.

### FLOW-CHINA-INTEREST

SOURCE_ID=FLOW

INSTITUTION=Bank of America

TITLE=The Flow Show — Strife Begins at Forty

DATE=2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=3. China / Qué ocurrió

CLAIM_USED=BofA describe poco interés por China.

CLAIM_TYPE=institutional_view

PUBLIC_WORDING=FXI cerró en 35,88 USD. BofA describe poco interés por China en The Flow Show de agosto. El atractivo de valoración es una hipótesis del editor pendiente de revisión; el consumo doméstico sigue siendo una prueba necesaria.

SUPPORT_STATUS=A_SUPPORTED_AS_EDITOR_PROVIDED; atribución explícita, sin verificación independiente de la nota completa

SUPPORT_BASIS=§13, The Flow Show: Anything but China. Se reduce la antigua afirmación de flujos recientes débiles a la visión cualitativa disponible; no equivale a una serie de salidas de capital.

### FLOW-USD-DIVERSIFICATION

SOURCE_ID=FLOW

INSTITUTION=Bank of America

TITLE=The Flow Show — Strife Begins at Forty

DATE=2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=3. DXY / Qué cambió

CLAIM_USED=BofA plantea diversificación frente al dólar.

CLAIM_TYPE=institutional_view

PUBLIC_WORDING=BofA plantea diversificación frente al dólar en The Flow Show de agosto. Nuestra lectura distingue esa visión estructural del apoyo táctico que podrían aportar unos rendimientos estadounidenses elevados. Las dos fuerzas pueden coexistir.

SUPPORT_STATUS=A_SUPPORTED_AS_EDITOR_PROVIDED; atribución explícita, sin verificación independiente de la nota completa

SUPPORT_BASIS=§13, The Flow Show: Anything but US Dollar. La contraposición con apoyo táctico de tipos es interpretación propia.

### EDITOR-FRAMING

SOURCE_ID=FLOW + NOMURA + MS

INSTITUTION=Bank of America | Nomura / Charlie McElligott | Morgan Stanley / Nick Savone

TITLE=The Flow Show — Strife Begins at Forty | GET WONKY — Spot Up, Vol Up | Global Reflections

DATE=2026-08-17 | 2026-08-17 | 2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=Cabecera; 1. Contexto general / Acciones y bonos, Lectura inicial

CLAIM_USED=El coste de financiar el crecimiento y su conversión en caja organizan la lectura del editor; el equilibrio con los bonos es una tesis, no una causalidad medida ni una previsión institucional.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=Las acciones siguen subiendo, pero los bonos empiezan a poner el límite

La IA sigue creciendo, pero el mercado ya no mira solamente cuánto se invierte. Empieza a importar quién puede financiar ese crecimiento, quién lo convierte en caja y cuánto tiempo puede soportar la economía unos rendimientos largos tan altos.

Septiembre no empieza con un problema de crecimiento. Empieza con una pregunta sobre cuánto cuesta financiarlo.

El mercado entra en septiembre con una contradicción clara: las acciones siguen fuertes, pero los bonos largos están empezando a poner el límite.

La lectura de inicio sigue siendo constructiva, pero más exigente: el mercado puede seguir subiendo mientras beneficios y flujo de caja compensen unos rendimientos elevados. Si los bonos empiezan a presionar crédito y amplitud, la lectura cambia.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=§§10–11: titular y ejes propuestos por el editor; §13: divergencia acciones/bonos, oferta/financiación, EPS + FCF. “La lectura de inicio” identifica el juicio propio; los escenarios posteriores son condicionales.

### EDITOR-FUNDING-CASH

SOURCE_ID=MS + NOMURA + FMS

INSTITUTION=Morgan Stanley / Nick Savone | Nomura / Charlie McElligott | Bank of America

TITLE=Global Reflections | GET WONKY — Spot Up, Vol Up | Global Fund Manager Survey — The Noes Have It - FMS

DATE=2026-08-17 | 2026-08-17 | 2026-08-19

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=1. Contexto general / Coste de financiación, Inversión y caja

CLAIM_USED=El editor prioriza capacidad de financiar chips y centros de datos, y conversión de inversión en flujo de caja.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=Morgan Stanley centra Global Reflections de agosto en beneficios, EPS y flujo de caja libre. Nomura, en GET WONKY, vincula los rendimientos largos con la oferta de deuda y la financiación de IA. Nuestra lectura es que el coste de financiar el crecimiento merece tanta atención como el crecimiento mismo.

Nuestra lectura de la IA pone el foco en quién puede financiar la inversión en chips y centros de datos, y quién consigue convertirla en flujo de caja. El gasto por sí solo no resuelve esa pregunta.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=§13: MS monetización y EPS + FCF; Nomura financiación de IA; FMS riesgo crediticio de CAPEX. No se afirma que ya haya ocurrido un evento crediticio.

### EDITOR-SELECTIVITY

SOURCE_ID=FMS + JPM

INSTITUTION=Bank of America | J.P. Morgan

TITLE=Global Fund Manager Survey — The Noes Have It - FMS | Software — Industry Thoughts and Rank Order / AI Disruption

DATE=2026-08-19 | 2026-08-19

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=1. Contexto general / Posicionamiento; 3. S&P 500 / Qué cambió

CLAIM_USED=Posiciones concurridas y dispersión de software justifican distinguir compañías; yields elevados podrían agravar decepciones.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=En el FMS de agosto, BofA describe poco efectivo, alta exposición a acciones y concentración en semiconductores. J.P. Morgan plantea que parte del castigo al software podría exagerar la disrupción de IA. En nuestra lectura, ambas ideas piden distinguir entre compañías.

BofA describe exposición elevada a acciones y semiconductores concurridos en su FMS de agosto. En nuestra lectura, eso deja menos margen para una decepción: unos rendimientos largos elevados podrían agravarla incluso si la actividad sigue creciendo.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=“En nuestra lectura” separa la deducción del editor de los datos de encuesta y la tesis de JPM. No se certifica posicionamiento actual de septiembre.

### EDITOR-SPY-OUTLOOK

SOURCE_ID=MS + FMS + NOMURA

INSTITUTION=Morgan Stanley / Nick Savone | Bank of America | Nomura / Charlie McElligott

TITLE=Global Reflections | Global Fund Manager Survey — The Noes Have It - FMS | GET WONKY — Spot Up, Vol Up

DATE=2026-08-17 | 2026-08-19 | 2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=3. S&P 500 / Titular, Qué se espera

CLAIM_USED=Continuidad constructiva condicionada a beneficios/caja, amplitud y crédito; rotación frente a reducción de riesgo.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=El rally conserva fundamentos, pero los yields elevan el precio del error

Esperamos un mercado capaz de seguir rotando mientras beneficios y caja compensen el coste del capital. Una mejora del peso equiponderado y de las pequeñas compañías reforzaría esa lectura. Si se deterioran amplitud y crédito al mismo tiempo, aumentaría la probabilidad de una reducción general de riesgo.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=§11: distinguir rotación de liquidación; §13: EPS + FCF, yields y crowding. “Esperamos” y los condicionales son juicio del informe; no probabilidad numérica de una institución.

### EDITOR-GOLD-OUTLOOK

SOURCE_ID=FLOW

INSTITUTION=Bank of America

TITLE=The Flow Show — Strife Begins at Forty

DATE=2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=1. Contexto general / Fuera de tecnología; 3. Oro / Titular, Qué cambió, Qué se espera

CLAIM_USED=El editor combina demanda observada en GLD con narrativa fiscal/diversificación y coste de oportunidad de rendimientos reales.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=Nuestra lectura del oro combina los flujos con deuda y diversificación frente al dólar. En China, el atractivo de valoración es una hipótesis editorial pendiente de confirmación del consumo. En Japón, importa separar bolsa, yen y Banco de Japón.

La deuda y los flujos refuerzan una tesis que ya no depende solo de la Fed

BofA relaciona oro, deuda y diversificación frente al dólar en The Flow Show de agosto. Nuestra lectura combina ese marco con el aumento de participaciones de GLD, sin perder de vista el coste de oportunidad de unos rendimientos reales elevados.

El oro podría conservar apoyo si persisten la demanda y la preocupación fiscal. Una subida simultánea de dólar y rendimientos reales puede limitarlo a corto plazo. La tesis estructural no permite afirmar cuál será el siguiente movimiento del precio.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=§11, oro: deuda/deficit/yields y no convertir tesis estructural en predicción; §13, Flow Show: oro y USD. GLD no demuestra por sí solo la identidad institucional de los compradores.

### EDITOR-CHINA-HYPOTHESIS

SOURCE_ID=FLOW

INSTITUTION=Bank of America

TITLE=The Flow Show — Strife Begins at Forty

DATE=2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=1. Contexto general / Fuera de tecnología; 3. China / Titular y lectura; 6. China / consumo

CLAIM_USED=La valoración atractiva y una posible rotación hacia Asia son hipótesis del editor pendientes de revisión y confirmación del consumidor.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=Lo barato todavía necesita una confirmación del consumidor

FXI cerró en 35,88 USD. BofA describe poco interés por China en The Flow Show de agosto. El atractivo de valoración es una hipótesis del editor pendiente de revisión; el consumo doméstico sigue siendo una prueba necesaria.

En nuestra lectura, una posible rotación hacia Asia abre espacio para estudiar China, sin dar por confirmada una infravaloración ni un nuevo ciclo alcista. Importan la respuesta del gasto de los hogares, la transmisión del estímulo y el comportamiento del dólar.

Esperamos una lectura condicionada por consumo y política económica. Una mejora sostenida de ventas minoristas y un dólar menos fuerte aumentarían la probabilidad de una recuperación más amplia. Si esa confirmación no llega, la hipótesis de valoración seguirá sin confirmar.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=§§10–11 aportan titular, hipótesis de valoración y consumo; §13, Flow Show menciona China/Corea pero no entrega múltiplos ni una valoración verificable. “Lo barato” se conserva como formulación del titular del editor y queda delimitado inmediatamente como hipótesis, no diagnóstico certificado.

### EDITOR-BTC-FISCAL

SOURCE_ID=FLOW

INSTITUTION=Bank of America

TITLE=The Flow Show — Strife Begins at Forty

DATE=2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=3. Bitcoin / Titular, Qué cambió y Qué se espera

CLAIM_USED=El editor aplica la narrativa fiscal a oferta limitada de BTC, sin inferir que mayor deuda cause una subida; liquidez, dólar y flujos condicionan el escenario.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=La deuda favorece la narrativa; los yields todavía mandan en el corto plazo

En nuestra lectura, la discusión fiscal puede reforzar la narrativa de un activo de oferta limitada, sin crear una relación automática entre más deuda y un precio mayor. A corto plazo, rendimientos reales, liquidez y dólar pueden dominar esa narrativa.

Bitcoin podría sostenerse mejor si los flujos se mantienen positivos y el dólar pierde fuerza sin deterioro del crédito. Si los rendimientos reales aumentan y se reduce liquidez, crecería el riesgo de corrección. La confirmación necesita persistencia de los flujos, no solo una sesión positiva.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=§11 BTC contiene esta lectura editorial; §13 Flow Show da contexto fiscal, no una recomendación ni una tesis institucional sobre Bitcoin. Farside es fuente pública separada.

### EDITOR-DXY-HORIZONS

SOURCE_ID=FLOW + NOMURA

INSTITUTION=Bank of America | Nomura / Charlie McElligott

TITLE=The Flow Show — Strife Begins at Forty | GET WONKY — Spot Up, Vol Up

DATE=2026-08-17 | 2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=3. DXY / Titular, Qué cambió y Qué se espera

CLAIM_USED=El editor contrapone apoyo táctico de rendimientos y diversificación estructural; transmisión condicionada a oro, China y cripto.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=La tensión entre yields altos y una tesis estructural de dólar más débil

BofA plantea diversificación frente al dólar en The Flow Show de agosto. Nuestra lectura distingue esa visión estructural del apoyo táctico que podrían aportar unos rendimientos estadounidenses elevados. Las dos fuerzas pueden coexistir.

Si los rendimientos suben sin un deterioro de confianza, el dólar podría mantenerse firme y limitar oro, China, BTC y ETH. Si cae la presión de tipos y se amplía la diversificación, esa restricción podría disminuir.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=§11 DXY y §13 Flow Show/Nomura. No se publica un retorno ni nivel de UUP como DXY.

### EDITOR-SOFTWARE-ECONOMICS

SOURCE_ID=JPM + GS + MS

INSTITUTION=J.P. Morgan | Goldman Sachs Global Investment Research / U.S. Department of Commerce (identificación aportada por el editor) | Morgan Stanley / Nick Savone

TITLE=Software — Industry Thoughts and Rank Order / AI Disruption | The Price of Intelligence Is Falling Quickly | Global Reflections

DATE=2026-08-19 | 2026-07-10 | 2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=3. Stockpicking / Titular, Qué cambió, tema en consideración

CLAIM_USED=Menor coste de inteligencia podría ampliar adopción y márgenes; más uso podría exigir más CAPEX total.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=La segunda fase de la IA: de construir inteligencia a monetizarla

El cierre de estos eventos permite comparar expectativas y reacción sin sustituir el dato por after-hours. La siguiente pregunta es dónde puede aparecer caja recurrente cuando se abarata el uso de modelos: aplicaciones, datos, observabilidad y procesos empresariales.

J.P. Morgan plantea que parte del castigo al software puede exagerar el riesgo de disrupción y estudia modelos económicos y monetización por consumo. Goldman Sachs describe el abaratamiento de la inteligencia en su material de julio. Nuestra inferencia es que un menor coste podría ampliar adopción y márgenes en aplicaciones, datos y procesos empresariales. Eso no asegura menor CAPEX total: un uso mayor puede exigir más inversión.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=§12 ejes editoriales; §13 LECTURA CORRECTA: adopción/economics/consumo, y menor precio unitario no implica menor CAPEX total. “Nuestra inferencia” identifica la extensión editorial; no cuantifica efecto.

### EDITOR-SOFTWARE-FILTERS

SOURCE_ID=JPM + MS

INSTITUTION=J.P. Morgan | Morgan Stanley / Nick Savone

TITLE=Software — Industry Thoughts and Rank Order / AI Disruption | Global Reflections

DATE=2026-08-19 | 2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=3. Stockpicking / Qué se espera y filtros

CLAIM_USED=FCF, Rule of 40/X, crecimiento, márgenes, EV/revenue, S&M/adquisición, revenue per employee y monetización son filtros de este informe, pendientes de aplicación individual.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=El tema en consideración es software empresarial. Se estudiará cada compañía con resultados y valoración actualizados antes de formar una selección propia. Una posición favorable en un ranking institucional no basta para recomendarla.

Universo para investigar, no selección ni recomendación. Filtros de este informe, a partir de los ejes de J.P. Morgan: crecimiento, márgenes, FCF y FCF por acción; Rule of 40 y Rule of X con metodología explícita; EV/revenue; ventas y marketing (S&M) y coste de adquisición; revenue per employee; monetización real de IA y expectativas descontadas. Valoración, resultados, catalizadores y riesgos individuales siguen pendientes de revisión completa.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=§12 FILTROS y §13 JPM/MS. La selección de filtros es editorial; no se atribuye la lista completa ni una metodología ya aplicada a JPM.

### EDITOR-SOFTWARE-UNIVERSE

SOURCE_ID=JPM

INSTITUTION=J.P. Morgan

TITLE=Software — Industry Thoughts and Rank Order / AI Disruption

DATE=2026-08-19

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=3. Stockpicking / Universo para investigar

CLAIM_USED=MSFT, NOW, DDOG, SNOW, TWLO, ORCL y CRM forman un universo editorial de estudio, sin ranking ni recomendación propios.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=Microsoft (MSFT) · ServiceNow (NOW) · Datadog (DDOG) · Snowflake (SNOW) · Twilio (TWLO) · Oracle (ORCL) · Salesforce (CRM)

Universo para investigar, no selección ni recomendación. Filtros de este informe, a partir de los ejes de J.P. Morgan: crecimiento, márgenes, FCF y FCF por acción; Rule of 40 y Rule of X con metodología explícita; EV/revenue; ventas y marketing (S&M) y coste de adquisición; revenue per employee; monetización real de IA y expectativas descontadas. Valoración, resultados, catalizadores y riesgos individuales siguen pendientes de revisión completa.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=§12 NOMBRES INSTITUCIONALES A ESTUDIAR y no publicar una selección por el ranking. No se afirma que las siete compañías sean recomendaciones actuales de JPM.

### EDITOR-ROUTE-1

SOURCE_ID=FMS + FLOW + NOMURA + MS + JPM + GS

INSTITUTION=Bank of America | Bank of America | Nomura / Charlie McElligott | Morgan Stanley / Nick Savone | J.P. Morgan | Goldman Sachs Global Investment Research / U.S. Department of Commerce (identificación aportada por el editor)

TITLE=Global Fund Manager Survey — The Noes Have It - FMS | The Flow Show — Strife Begins at Forty | GET WONKY — Spot Up, Vol Up | Global Reflections | Software — Industry Thoughts and Rank Order / AI Disruption | The Price of Intelligence Is Falling Quickly

DATE=2026-08-19 | 2026-08-17 | 2026-08-17 | 2026-08-17 | 2026-08-19 | 2026-07-10

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=5. Rutas probables / Ruta base · El mercado absorbe yields altos y continúa rotando

CLAIM_USED=Combinación hipotética propia de beneficios/caja, financiación, inflación/tipos, amplitud, divisas, Asia y liquidez. No es un escenario ni pronóstico recibido de ninguna institución.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=Estas rutas son escenarios del editor, no pronósticos de las instituciones citadas. Sirven para reconocer qué combinación de señales está ganando peso a medida que avanza septiembre.

Ruta base · El mercado absorbe yields altos y continúa rotando

El S&P 500 conserva una estructura funcional mientras beneficios y caja compensan rendimientos elevados. El DXY se mantiene ordenado; el oro conserva demanda sin que eso impida pausas. China necesita confirmación del consumidor y Japón absorbe la relación entre yen y BOJ. BTC y ETH dependen de que no se cierre la liquidez. En IA gana importancia la capacidad de financiar inversión y monetizarla; la dispersión entre compañías continúa.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=Síntesis editorial de §§11–13. No probabilidades, triggers propietarios ni niveles de activación de agosto. Los condicionales sobre Japón y cripto son del editor, no de las notas institucionales.

### EDITOR-ROUTE-2

SOURCE_ID=FMS + FLOW + NOMURA + MS + JPM + GS

INSTITUTION=Bank of America | Bank of America | Nomura / Charlie McElligott | Morgan Stanley / Nick Savone | J.P. Morgan | Goldman Sachs Global Investment Research / U.S. Department of Commerce (identificación aportada por el editor)

TITLE=Global Fund Manager Survey — The Noes Have It - FMS | The Flow Show — Strife Begins at Forty | GET WONKY — Spot Up, Vol Up | Global Reflections | Software — Industry Thoughts and Rank Order / AI Disruption | The Price of Intelligence Is Falling Quickly

DATE=2026-08-19 | 2026-08-17 | 2026-08-17 | 2026-08-17 | 2026-08-19 | 2026-07-10

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=5. Rutas probables / Ruta favorable · La inflación cede, los bonos encuentran compradores y el rally se amplía

CLAIM_USED=Combinación hipotética propia de beneficios/caja, financiación, inflación/tipos, amplitud, divisas, Asia y liquidez. No es un escenario ni pronóstico recibido de ninguna institución.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=Estas rutas son escenarios del editor, no pronósticos de las instituciones citadas. Sirven para reconocer qué combinación de señales está ganando peso a medida que avanza septiembre.

Ruta favorable · La inflación cede, los bonos encuentran compradores y el rally se amplía

Una inflación más contenida reduce presión sobre rendimientos y DXY sin señalar una contracción del crecimiento. La amplitud del S&P 500 mejora y el oro conserva apoyo con menor coste de oportunidad. Un consumidor chino más firme y un ajuste ordenado de yen y BOJ ayudan a Asia. Flujos más completos y positivos favorecen BTC y una recuperación relativa de ETH. Software empieza a confirmar mejor conversión de uso en caja.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=Síntesis editorial de §§11–13. No probabilidades, triggers propietarios ni niveles de activación de agosto. Los condicionales sobre Japón y cripto son del editor, no de las notas institucionales.

### EDITOR-ROUTE-3

SOURCE_ID=FMS + FLOW + NOMURA + MS + JPM + GS

INSTITUTION=Bank of America | Bank of America | Nomura / Charlie McElligott | Morgan Stanley / Nick Savone | J.P. Morgan | Goldman Sachs Global Investment Research / U.S. Department of Commerce (identificación aportada por el editor)

TITLE=Global Fund Manager Survey — The Noes Have It - FMS | The Flow Show — Strife Begins at Forty | GET WONKY — Spot Up, Vol Up | Global Reflections | Software — Industry Thoughts and Rank Order / AI Disruption | The Price of Intelligence Is Falling Quickly

DATE=2026-08-19 | 2026-08-17 | 2026-08-17 | 2026-08-17 | 2026-08-19 | 2026-07-10

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=5. Rutas probables / Ruta adversa · Los yields rompen el equilibrio y el coste del capital llega finalmente a las acciones

CLAIM_USED=Combinación hipotética propia de beneficios/caja, financiación, inflación/tipos, amplitud, divisas, Asia y liquidez. No es un escenario ni pronóstico recibido de ninguna institución.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=Estas rutas son escenarios del editor, no pronósticos de las instituciones citadas. Sirven para reconocer qué combinación de señales está ganando peso a medida que avanza septiembre.

Ruta adversa · Los yields rompen el equilibrio y el coste del capital llega finalmente a las acciones

Los rendimientos largos suben y el crédito se encarece. El S&P 500 pierde amplitud y la rotación se convierte en reducción de exposición. Un DXY más fuerte puede presionar oro y China; el oro también podría recibir demanda defensiva, por lo que su reacción no es automática. Japón añade tensión si yen y BOJ sorprenden. BTC y ETH sufren si cae la liquidez. Las empresas de IA más dependientes de financiación externa y el software sin caja suficiente tendrían menos margen.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=Síntesis editorial de §§11–13. No probabilidades, triggers propietarios ni niveles de activación de agosto. Los condicionales sobre Japón y cripto son del editor, no de las notas institucionales.

### EDITOR-CONTROL-BREADTH

SOURCE_ID=MS + FMS

INSTITUTION=Morgan Stanley / Nick Savone | Bank of America

TITLE=Global Reflections | Global Fund Manager Survey — The Noes Have It - FMS

DATE=2026-08-17 | 2026-08-19

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=6. Lista de control / S&P 500 / amplitud

CLAIM_USED=Criterio condicional del editor: Una caída conjunta del índice y de la participación debilitaría la lectura constructiva.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=S&P 500 / amplitud

Participación sectorial, RSP/SPY e IWM/SPY.

Una caída conjunta del índice y de la participación debilitaría la lectura constructiva.

Seguimiento condicional

Lectura editorial; métricas automáticas congeladas en el bloque de cierre.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=Operacionaliza los ejes de §§11–13. La tabla indica “Seguimiento condicional” y “Lectura editorial”; no comunica una nueva observación ni un trigger institucional.

### EDITOR-CONTROL-UST10

SOURCE_ID=NOMURA + MS

INSTITUTION=Nomura / Charlie McElligott | Morgan Stanley / Nick Savone

TITLE=GET WONKY — Spot Up, Vol Up | Global Reflections

DATE=2026-08-17 | 2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=6. Lista de control / Treasury 10Y

CLAIM_USED=Criterio condicional del editor: Una subida persistente junto con crédito más caro elevaría la presión sobre valoración.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=Treasury 10Y

Velocidad de cambio del rendimiento a diez años.

Una subida persistente junto con crédito más caro elevaría la presión sobre valoración.

Seguimiento condicional

Lectura editorial; métricas automáticas congeladas en el bloque de cierre.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=Operacionaliza los ejes de §§11–13. La tabla indica “Seguimiento condicional” y “Lectura editorial”; no comunica una nueva observación ni un trigger institucional.

### EDITOR-CONTROL-UST30

SOURCE_ID=NOMURA + FLOW

INSTITUTION=Nomura / Charlie McElligott | Bank of America

TITLE=GET WONKY — Spot Up, Vol Up | The Flow Show — Strife Begins at Forty

DATE=2026-08-17 | 2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=6. Lista de control / Treasury 30Y

CLAIM_USED=Criterio condicional del editor: Subidas que persistan pese a datos más fríos apuntarían a presión de oferta y prima por plazo.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=Treasury 30Y

Financiación de largo plazo y demanda de duración.

Subidas que persistan pese a datos más fríos apuntarían a presión de oferta y prima por plazo.

Seguimiento condicional

Lectura editorial; métricas automáticas congeladas en el bloque de cierre.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=Operacionaliza los ejes de §§11–13. La tabla indica “Seguimiento condicional” y “Lectura editorial”; no comunica una nueva observación ni un trigger institucional.

### EDITOR-CONTROL-CREDIT

SOURCE_ID=NOMURA + FMS

INSTITUTION=Nomura / Charlie McElligott | Bank of America

TITLE=GET WONKY — Spot Up, Vol Up | Global Fund Manager Survey — The Noes Have It - FMS

DATE=2026-08-17 | 2026-08-19

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=6. Lista de control / Crédito corporativo

CLAIM_USED=Criterio condicional del editor: Una ampliación generalizada acercaría la tensión de bonos a las acciones.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=Crédito corporativo

Diferenciales y condiciones de nuevas emisiones.

Una ampliación generalizada acercaría la tensión de bonos a las acciones.

Seguimiento condicional

Lectura editorial; métricas automáticas congeladas en el bloque de cierre.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=Operacionaliza los ejes de §§11–13. La tabla indica “Seguimiento condicional” y “Lectura editorial”; no comunica una nueva observación ni un trigger institucional.

### EDITOR-CONTROL-DXY

SOURCE_ID=FLOW

INSTITUTION=Bank of America

TITLE=The Flow Show — Strife Begins at Forty

DATE=2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=6. Lista de control / DXY

CLAIM_USED=Criterio condicional del editor: Fortaleza sostenida endurecería el entorno para oro, China y cripto.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=DXY

Respuesta del dólar a inflación, Fed y rendimientos.

Fortaleza sostenida endurecería el entorno para oro, China y cripto.

Seguimiento condicional

Lectura editorial; métricas automáticas congeladas en el bloque de cierre.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=Operacionaliza los ejes de §§11–13. La tabla indica “Seguimiento condicional” y “Lectura editorial”; no comunica una nueva observación ni un trigger institucional.

### EDITOR-CONTROL-GOLD

SOURCE_ID=FLOW

INSTITUTION=Bank of America

TITLE=The Flow Show — Strife Begins at Forty

DATE=2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=6. Lista de control / Oro

CLAIM_USED=Criterio condicional del editor: Salidas sostenidas junto con tasas reales más altas debilitarían el apoyo de flujos.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=Oro

Participaciones de GLD y respuesta del precio.

Salidas sostenidas junto con tasas reales más altas debilitarían el apoyo de flujos.

Seguimiento condicional

Lectura editorial; métricas automáticas congeladas en el bloque de cierre.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=Operacionaliza los ejes de §§11–13. La tabla indica “Seguimiento condicional” y “Lectura editorial”; no comunica una nueva observación ni un trigger institucional.

### EDITOR-CONTROL-CHINA

SOURCE_ID=FLOW

INSTITUTION=Bank of America

TITLE=The Flow Show — Strife Begins at Forty

DATE=2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=6. Lista de control / China / consumo

CLAIM_USED=Criterio condicional del editor: Una mejora persistente del consumidor ayudaría a contrastar nuestra hipótesis de valoración atractiva.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=China / consumo

Ventas minoristas y efectividad del estímulo.

Una mejora persistente del consumidor ayudaría a contrastar nuestra hipótesis de valoración atractiva.

Seguimiento condicional

Lectura editorial; métricas automáticas congeladas en el bloque de cierre.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=Operacionaliza los ejes de §§11–13. La tabla indica “Seguimiento condicional” y “Lectura editorial”; no comunica una nueva observación ni un trigger institucional.

### EDITOR-CONTROL-CAPEX

SOURCE_ID=FMS + MS

INSTITUTION=Bank of America | Morgan Stanley / Nick Savone

TITLE=Global Fund Manager Survey — The Noes Have It - FMS | Global Reflections

DATE=2026-08-19 | 2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=6. Lista de control / CAPEX de IA

CLAIM_USED=Criterio condicional del editor: Un crecimiento del gasto muy superior al de caja exigiría revisar la calidad del crecimiento.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=CAPEX de IA

Inversión comprometida frente a flujo de caja operativo.

Un crecimiento del gasto muy superior al de caja exigiría revisar la calidad del crecimiento.

Seguimiento condicional

Lectura editorial; métricas automáticas congeladas en el bloque de cierre.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=Operacionaliza los ejes de §§11–13. La tabla indica “Seguimiento condicional” y “Lectura editorial”; no comunica una nueva observación ni un trigger institucional.

### EDITOR-CONTROL-FUNDING

SOURCE_ID=NOMURA + FMS

INSTITUTION=Nomura / Charlie McElligott | Bank of America

TITLE=GET WONKY — Spot Up, Vol Up | Global Fund Manager Survey — The Noes Have It - FMS

DATE=2026-08-17 | 2026-08-19

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=6. Lista de control / Financiación de IA

CLAIM_USED=Criterio condicional del editor: Financiar más capacidad a costes crecientes reduciría el margen para fallar.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=Financiación de IA

Nueva deuda, coste financiero y compromisos de centros de datos.

Financiar más capacidad a costes crecientes reduciría el margen para fallar.

Seguimiento condicional

Lectura editorial; métricas automáticas congeladas en el bloque de cierre.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=Operacionaliza los ejes de §§11–13. La tabla indica “Seguimiento condicional” y “Lectura editorial”; no comunica una nueva observación ni un trigger institucional.

### EDITOR-CONTROL-SOFTWARE

SOURCE_ID=JPM + MS

INSTITUTION=J.P. Morgan | Morgan Stanley / Nick Savone

TITLE=Software — Industry Thoughts and Rank Order / AI Disruption | Global Reflections

DATE=2026-08-19 | 2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=6. Lista de control / Software / monetización

CLAIM_USED=Criterio condicional del editor: Mejor adopción sin mejora de caja sería una confirmación incompleta.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=Software / monetización

Consumo, retención, márgenes y FCF por acción.

Mejor adopción sin mejora de caja sería una confirmación incompleta.

Seguimiento condicional

Lectura editorial; métricas automáticas congeladas en el bloque de cierre.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=Operacionaliza los ejes de §§11–13. La tabla indica “Seguimiento condicional” y “Lectura editorial”; no comunica una nueva observación ni un trigger institucional.

### EDITOR-CONTROL-CROWDING

SOURCE_ID=FMS

INSTITUTION=Bank of America

TITLE=Global Fund Manager Survey — The Noes Have It - FMS

DATE=2026-08-19

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=6. Lista de control / Posicionamiento / concentración

CLAIM_USED=Criterio condicional del editor: Deshacer posiciones concurridas con crédito débil elevaría el riesgo de liquidación.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=Posicionamiento / concentración

Liquidez de gestores y exposición a semiconductores.

Deshacer posiciones concurridas con crédito débil elevaría el riesgo de liquidación.

Seguimiento condicional

Lectura editorial; métricas automáticas congeladas en el bloque de cierre.

SUPPORT_STATUS=B_EDITOR_INFERENCE; hipótesis o condición del editor, no conclusión atribuida a la institución

SUPPORT_BASIS=Operacionaliza los ejes de §§11–13. La tabla indica “Seguimiento condicional” y “Lectura editorial”; no comunica una nueva observación ni un trigger institucional.

### REMOVED-CTA

SOURCE_ID=UNASSIGNED

INSTITUTION=No identificada en el material del editor

TITLE=Ejes editoriales por activo; sin nota institucional atribuible

DATE=No consta

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=3. Oro / Qué ocurrió

CLAIM_USED=El giro de CTAs descrito en agosto queda como antecedente, no como señal actual.

CLAIM_TYPE=reported_data

PUBLIC_WORDING=RETIRADO

SUPPORT_STATUS=C_REMOVED; no nota ni observación atribuible para sostener el cambio de posición

SUPPORT_BASIS=§11, oro, menciona CTAs corto a largo; §13 no identifica una fuente para ese giro. Se retira la afirmación, sin declararla falsa.

### REMOVED-COOLING

SOURCE_ID=NOMURA + MS

INSTITUTION=Nomura / Charlie McElligott | Morgan Stanley / Nick Savone

TITLE=GET WONKY — Spot Up, Vol Up | Global Reflections

DATE=2026-08-17 | 2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=1. Contexto general / Coste de financiación

CLAIM_USED=Los rendimientos permanecen elevados incluso cuando algunos datos de inflación y empleo se enfrían.

CLAIM_TYPE=reported_data

PUBLIC_WORDING=RETIRADO

SUPPORT_STATUS=C_REMOVED; el material institucional disponible no identifica los datos, fechas o comparaciones que sostendrían esa observación

SUPPORT_BASIS=La frase del commit base se reemplaza por los ejes atribuidos de MS y Nomura. Las menciones futuras de inflación en calendario/escenarios son condicionales y no afirman un enfriamiento ya observado.

### REDUCED-CHINA-FLOWS

SOURCE_ID=FLOW

INSTITUTION=Bank of America

TITLE=The Flow Show — Strife Begins at Forty

DATE=2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=3. China / Qué ocurrió

CLAIM_USED=Flujos recientes débiles hacia China.

CLAIM_TYPE=institutional_view

PUBLIC_WORDING=FXI cerró en 35,88 USD. BofA describe poco interés por China en The Flow Show de agosto. El atractivo de valoración es una hipótesis del editor pendiente de revisión; el consumo doméstico sigue siendo una prueba necesaria.

SUPPORT_STATUS=C_REDUCED; se conserva solo el desinterés cualitativo atribuido, sin afirmar flujos actuales medidos

SUPPORT_BASIS=§11 proporciona un eje de flujos negativos pero sin serie/fechas; §13 permite atribuir únicamente Anything but China a BofA.

### REDUCED-CHINA-VALUATION

SOURCE_ID=FLOW

INSTITUTION=Bank of America

TITLE=The Flow Show — Strife Begins at Forty

DATE=2026-08-17

SOURCE_CLASS=EDITOR_PROVIDED_INSTITUTIONAL_MATERIAL

REPORT_SECTION=1. Fuera de tecnología; 3. China; 6. China / consumo

CLAIM_USED=China conserva valoraciones atractivas / valoración baja / descuento de valoración.

CLAIM_TYPE=editor_inference

PUBLIC_WORDING=FXI cerró en 35,88 USD. BofA describe poco interés por China en The Flow Show de agosto. El atractivo de valoración es una hipótesis del editor pendiente de revisión; el consumo doméstico sigue siendo una prueba necesaria.

Una mejora persistente del consumidor ayudaría a contrastar nuestra hipótesis de valoración atractiva.

SUPPORT_STATUS=C_REDUCED_TO_B; hipótesis del editor pendiente de revisión, no diagnóstico institucional certificado

SUPPORT_BASIS=§11 lo propone como eje, pero §13 no aporta múltiplos ni comparación de valoración. Se cuentan como una sola afirmación las repeticiones en contexto, activo y control.

## Resultado de la reducción de afirmaciones

UNSUPPORTED_CLAIMS_REMOVED_OR_REDUCED=4

Se cuentan afirmaciones distintas, no ocurrencias: giro de CTAs retirado; enfriamiento observado de inflación/empleo retirado; flujos débiles de China reducidos a desinterés cualitativo atribuido; atractivo de valoración chino reducido a hipótesis del editor. No se afirma que las frases retiradas sean falsas: el soporte disponible no basta para publicarlas con esa precisión. Las nuevas atribuciones y etiquetas editoriales de otras tesis no se cuentan como eliminaciones.

## Autoridad histórica de NVDA/FUTU (separada del material institucional)

ORIGINAL_OBSERVATION=Unusual Whales — 2026-08-16, según publicación anterior; no consultada de nuevo en esta reparación.

HISTORICAL_AUTHORITY_USED_BY_SEPTEMBER=Segundo informe de agosto de 2026, snapshot publicado inalterado en public/reports/segundo-informe-agosto-2026.html y .md; objeto canónico en lib/reports/market-reports.ts, stockpicking.earnings.upcoming.

| Compañía | Movimiento implícito de agosto | Importe aproximado conservado en agosto | Observación original | Reacción regular realizada conservada |
| --- | --- | --- | --- | --- |
| FUTU | 7,04 % | ±7,42 USD | 16/08/2026 | +3,03 % |
| NVDA | 6,18 % | ±13,94 USD | 16/08/2026 | +8,74 % |

AUGUST_MARKDOWN_SHA256=5a267530dcb66c963c6a383a50d3635a1e94ce6037853cd2dde608c05feb56a6

AUGUST_HTML_SHA256=383edb037d4e697e7083754ad5f01f3275cdd896ea105a0de578d567ccd23886

El nuevo test compara porcentajes y fechas con el objeto canónico de agosto, fija ambos hashes publicados, comprueba importes aproximados en el Markdown y reproduce la reacción desde cierres regulares. El enlace público de septiembre apunta al HTML congelado de agosto. No se crea una captura histórica de opciones ni se utiliza la cotización live actual.

## Redacción pública de fuentes

A. Material institucional aportado por el editor

B. Fuentes oficiales y públicas

C. Datos propios / Dashboard

Las referencias de BofA, Morgan Stanley, J.P. Morgan, Nomura y Goldman Sachs se basan en material de investigación aportado por el editor. Sus conclusiones se atribuyen a cada institución; este informe no las presenta como hechos verificados independientemente. Las inferencias y los escenarios propios se identifican como lectura del editor. El abaratamiento de la inteligencia es una referencia estructural de julio. Las fuentes públicas y el calendario se consultaron para el corte editorial del 6 de septiembre; las horas no confirmadas permanecen pendientes. No se publican probabilidades antiguas de política monetaria.
