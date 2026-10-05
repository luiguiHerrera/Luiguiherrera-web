import type { MarketReport } from './market-reports';
import type { ReportQuantitativePanel } from './report-statistical-panels';
import { LEVELS_DISCLAIMER } from './report-statistical-panels.ts';
import statistics from './snapshots/primer-informe-octubre-2026/statistical.json' with { type: 'json' };

// Frozen report data only: no live Statistical Levels loaders or generation.
const number = (value: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
function levels(ticker: keyof typeof statistics.assets): ReportQuantitativePanel[] {
  const data = statistics.assets[ticker];
  const level = data.levels;
  const keys = ['WSLE', 'WALE', 'WAHE', 'WSHE'] as const;
  const marks = keys.map(label => ({ label, value: level.levels[label] }));
  const current = level.lastClose;
  return [{
    title: 'Niveles estadísticos',
    intro: `${ticker.replace('USD', '')} · Semanal · Apertura ${data.periodStart} · Precio al cierre del 2 de octubre de 2026: ${number(current)} USD. ${level.periods} periodos históricos completados.`,
    headers: ['Referencia', 'Precio (USD)', 'Distancia del precio al nivel'],
    rows: [['Apertura del periodo', number(level.currentOpen), '—'], ['Precio al cierre del 2 de octubre', number(current), '—'], ...keys.map(key => [key, number(level.levels[key]), `${level.distances[key] > 0 ? '+' : ''}${number(level.distances[key] * 100)} %`])],
    notes: [LEVELS_DISCLAIMER, `${data.provider}. ${data.closeConvention} Distancia = precio / nivel − 1. La semana al corte queda fuera de la muestra de estimación.`],
    range: { low: Math.min(current, ...marks.map(m => m.value)), high: Math.max(current, ...marks.map(m => m.value)), current, marks },
  }];
}

export const firstOctober2026Report: MarketReport = {
  "id": "primer-informe-octubre-2026",
  "monthKey": "2026-10",
  "monthLabel": "Octubre 2026",
  "label": "Primer informe de octubre de 2026",
  "title": "Primer informe de octubre de 2026",
  "subtitle": "El calendario ayuda; la amplitud debe confirmar",
  "publishedAt": "2026-10-05",
  "modifiedAt": "2026-10-05",
  "editorialCutoffAt": "2026-10-05",
  "automaticDataCutoffAt": "2026-10-02",
  "dateLabel": "Corte editorial: 5 de octubre de 2026 · Datos estadísticos: 2 de octubre de 2026",
  "publishedLabel": "5 de octubre de 2026",
  "status": "actual",
  "calendarHref": "/reports/primer-informe-octubre-2026-calendar.ics",
  "htmlHref": "/reports/primer-informe-octubre-2026.html",
  "markdownHref": "/reports/primer-informe-octubre-2026.md",
  "pdfHref": "/reports/primer-informe-octubre-2026.pdf",
  "summary": "Q4 aporta un contexto histórico favorable, pero octubre exige cautela táctica: la amplitud y los resultados deben confirmar el liderazgo del mercado.",
  "presentation": {
    "assetReadingsStartNewPage": true,
    "linksOpenNewTab": true,
    "sourceLinks": [
      {
        "id": "A1",
        "names": []
      },
      {
        "id": "A2",
        "names": []
      },
      {
        "id": "A3",
        "names": []
      },
      {
        "id": "A4",
        "names": []
      },
      {
        "id": "A5",
        "names": []
      },
      {
        "id": "A6",
        "names": []
      },
      {
        "id": "A7",
        "names": []
      },
      {
        "id": "A8",
        "names": []
      },
      {
        "id": "A9",
        "names": []
      },
      {
        "id": "A10",
        "names": []
      },
      {
        "id": "A11",
        "names": []
      },
      {
        "id": "A12",
        "names": []
      },
      {
        "id": "A13",
        "names": []
      },
      {
        "id": "A14",
        "names": []
      },
      {
        "id": "A15",
        "names": []
      },
      {
        "id": "A16",
        "names": []
      },
      {
        "id": "A17",
        "names": []
      },
      {
        "id": "A18",
        "names": []
      },
      {
        "id": "B1",
        "names": [
          "Federal Reserve: decisión del 16/09/2026"
        ],
        "href": "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm"
      },
      {
        "id": "B2",
        "names": [
          "University of Michigan: resultados finales de septiembre y calendario"
        ],
        "href": "https://www.sca.isr.umich.edu/"
      },
      {
        "id": "B3",
        "names": [
          "BLS: empleo de septiembre, publicación del 02/10/2026"
        ],
        "href": "https://www.bls.gov/news.release/archives/empsit_10022026.htm"
      },
      {
        "id": "B4",
        "names": [
          "Bank of Japan: decisión del 18/09/2026"
        ],
        "href": "https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918a.pdf"
      },
      {
        "id": "B5",
        "names": [
          "CME Economic Research: Why Is Bitcoin Moving in Tandem with Equities?"
        ],
        "href": "https://www.cmegroup.com/insights/economic-research/2025/why-is-bitcoin-moving-in-tandem-with-equities.html"
      },
      {
        "id": "B6",
        "names": [
          "Direxion: Small Cap Bull/Bear 3X ETFs"
        ],
        "href": "https://www.direxion.com/product/daily-small-cap-bull-bear-3x-etfs"
      },
      {
        "id": "B7",
        "names": [
          "ISM: informe de servicios de agosto y fecha anunciada de septiembre"
        ],
        "href": "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/services/august/"
      },
      {
        "id": "B8",
        "names": [
          "BEA: calendario de publicaciones"
        ],
        "href": "https://www.bea.gov/news/schedule"
      },
      {
        "id": "B9",
        "names": [
          "Federal Reserve: calendario de octubre de 2026"
        ],
        "href": "https://www.federalreserve.gov/newsevents/2026-october.htm"
      },
      {
        "id": "B10",
        "names": [
          "BLS: calendario de octubre de 2026"
        ],
        "href": "https://www.bls.gov/schedule/2026/10_sched.htm"
      },
      {
        "id": "C1",
        "names": [
          "Segundo informe de septiembre"
        ],
        "href": "https://www.luiguiherrera.com/informes/segundo-informe-septiembre-2026"
      }
    ],
    "contextTitle": "Contexto general",
    "contextStyle": "prose",
    "openingLine": "La lectura mantiene un sesgo constructivo para el trimestre, con cautela táctica: la confirmación exige que se recuperen más acciones sin perder a los líderes.",
    "prospectivePeriod": "Desde el corte editorial hasta la siguiente publicación. Los antecedentes de Q4 y los escenarios a doce meses se identifican por separado.",
    "calendarStyle": "monthly",
    "calendarView": "remaining",
    "calendarStartDate": "2026-10-05",
    "sectionTitles": {
      "assetReadings": "Lectura por activo",
      "calendar": "Calendario de eventos",
      "watchlist": "Lista de control",
      "sources": "Fuentes y metodología"
    },
    "year": 2026,
    "month": 10,
    "localizedTitle": "Octubre de 2026",
    "locale": "es-ES",
    "primaryTimeZone": "America/New_York",
    "displayTimeZones": [
      "America/New_York",
      "Europe/Madrid"
    ]
  },
  "whatHappened": [
    {
      "title": "Apertura",
      "summary": "",
      "body": "Octubre comienza con un respaldo histórico favorable, pero con una participación bursátil que todavía necesita recuperarse. La inversión en inteligencia artificial y las expectativas de beneficios sostienen el argumento constructivo; los rendimientos elevados, la concentración y el menor impulso comprador impiden dar por resuelto el riesgo de corrección."
    },
    {
      "title": "Contexto 1",
      "summary": "",
      "body": "En el segundo informe de septiembre, el problema era la distancia entre la resistencia del índice y el deterioro de su participación. Octubre no elimina esa diferencia: cambia el calendario y añade nuevas pruebas para contrastarla. [C1]"
    },
    {
      "title": "Contexto 2",
      "summary": "",
      "body": "El informe semanal del CDI registra una caída del 0,22 % en SPY, mientras QQQ avanza un 0,68 %. La ventaja tecnológica sigue siendo visible. IWM retrocede un 0,16 %, ligeramente menos que SPY: la última semana tampoco permite describir a las pequeñas compañías como un bloque que continúa perdiendo terreno relativo sin interrupción. [A1]"
    },
    {
      "title": "Contexto 3",
      "summary": "",
      "body": "El respaldo histórico mejora al entrar en Q4. Sin embargo, octubre y el trimestre completo no son la misma apuesta: las estadísticas cambian al introducir filtros de tendencia, y una corrección inicial puede coexistir con un trimestre posterior favorable. [A2–A3]"
    },
    {
      "title": "Contexto 4",
      "summary": "",
      "body": "El contrapeso fundamental procede de las expectativas de beneficios y de inversión en IA. Las láminas de Carson/FactSet sitúan el crecimiento estimado del beneficio por acción del S&P 500 en el 31,9 % para 2026; Goldman/FactSet presenta un crecimiento previsto del capex de hyperscalers del 116 % interanual en Q3. El mercado necesita que esas expectativas se conviertan en resultados y caja. [A4–A5]"
    },
    {
      "title": "Contexto 5",
      "summary": "",
      "body": "La política monetaria sigue siendo una restricción. La Fed elevó el tipo a 3,75–4,00 % en septiembre y la captura de FedWatch favorece una pausa en octubre, no un recorte. Sus distribuciones posteriores se desplazan hacia rangos superiores. Menor riesgo de una subida inmediata no equivale a financiación más barata durante todo el horizonte. [A6; B1]"
    },
    {
      "title": "Qué cambió desde el informe anterior0",
      "summary": "",
      "body": "Qué cambió desde el informe anterior. La tecnología conserva ventaja, el pesimismo declarado se ha moderado y aparece una mejora semanal muy pequeña de IWM frente a SPY. Ninguna de esas observaciones basta por separado para declarar reparada la amplitud. Los rendimientos de la tabla corresponden a la columna «Semana» del CDI; no son retornos entre informes ni una actualización del motor cuantitativo propio. [A1]"
    },
    {
      "title": "Qué cambió desde el informe anterior1",
      "summary": "",
      "body": "Sobre esos datos, QQQ supera a SPY en 0,90 puntos porcentuales e IWM en 0,06 puntos. Son diferencias de rentabilidades, no variaciones calculadas sobre el cociente de precios. Estas comparaciones describen participación y liderazgo; no son señales de compra independientes."
    },
    {
      "title": "Amplitud: el índice sigue necesitando más participación0",
      "summary": "",
      "body": "Amplitud: el índice sigue necesitando más participación. Morgan Stanley muestra un deterioro de la participación desde Jackson Hole mientras el índice mantiene mayor resistencia. Esa divergencia sigue siendo el eje de la lectura. Las referencias al porcentaje de componentes sobre MA200 no comparten un corte conciliado; por eso no fijamos el 30 %, el 43 % o el 48 % como cifra definitiva de esta edición. [A7]"
    },
    {
      "title": "Amplitud: el índice sigue necesitando más participación1",
      "summary": "",
      "body": "La tabla del Russell 3000 aporta otra perspectiva: 51 % de sus componentes experimentó un drawdown máximo superior al 20 % desde junio, según la lámina. Describe una caída sufrida durante una ventana, no cuántas acciones continúan hoy un 20 % abajo. Su fecha final no está identificada en la captura y no representa al Russell 2000 ni a QQQ. [A8]"
    },
    {
      "title": "Amplitud: el índice sigue necesitando más participación2",
      "summary": "",
      "body": "La pregunta no es únicamente si existe debilidad, sino cómo se resuelve: recuperación de los rezagados, ajuste del índice o una combinación de ambos. También puede reducirse la divergencia con el índice lateral."
    },
    {
      "title": "Sentimiento y flujos: miedo no significa ausencia de exposición0",
      "summary": "",
      "body": "Sentimiento y flujos: miedo no significa ausencia de exposición. BofA Bull & Bear desciende de 9,3 a 8,8, permaneciendo elevado. CNN Fear & Greed marca 31, dentro de miedo, no miedo extremo. En AAII, los bajistas pasan del 53,3 % al 46,5 % entre el 16 y el 30 de septiembre. Posicionamiento, indicadores de mercado y opiniones de encuestados son medidas diferentes; no se condensan en un único estado de sentimiento. [A9]"
    },
    {
      "title": "Sentimiento y flujos: miedo no significa ausencia de exposición1",
      "summary": "",
      "body": "Michigan confirma un sentimiento del consumidor de 48,1 en septiembre. La lámina de J.P. Morgan asocia nueve valles históricos con un retorno posterior medio del S&P 500 del 24,1 % a doce meses. Pero esos puntos de giro se identifican retrospectivamente: una lectura baja hoy no demuestra que el mínimo ya se haya producido. [A10; B2]"
    },
    {
      "title": "Sentimiento y flujos: miedo no significa ausencia de exposición2",
      "summary": "",
      "body": "Los flujos ETF siguen siendo positivos, aunque menos intensos: 3.276 millones de dólares diarios de media en septiembre, frente a 7.036 millones en junio, según el gráfico aportado. Las compras minoristas también aparecen por debajo de su media de doce meses; esa comparación no equivale necesariamente a ventas netas. El aumento de emisión neta de acciones añade oferta, sin constituir por sí mismo una señal de techo. [A11]"
    },
    {
      "title": "Política monetaria y financiación0",
      "summary": "",
      "body": "Política monetaria y financiación. El BLS registra 29.000 nuevas nóminas no agrícolas, un paro del 4,2 % y revisiones que restan 60.000 empleos a julio y agosto. La comparación con el consenso no procede del BLS. [B3]"
    },
    {
      "title": "Política monetaria y financiación1",
      "summary": "",
      "body": "FedWatch asigna a octubre un 77,9 % en el rango vigente y un 22,1 % al rango 4,00–4,25 %. En diciembre, el rango modal pasa a 4,00–4,25 %. Se trata de probabilidades implícitas de la captura, no de una decisión anunciada ni de datos en directo. [A6; B1]"
    },
    {
      "title": "Política monetaria y financiación2",
      "summary": "",
      "body": "El rebote intradía del Treasury a diez años hacia el 5,28 % tras el empleo muestra que el alivio del tramo largo no fue inmediato ni sostenido en esa sesión. No se utiliza ese gráfico para certificar el cierre semanal. Para los activos de riesgo importan tanto el nivel de los rendimientos como su velocidad de cambio. [A12]"
    },
    {
      "title": "Alcance cuantitativo de esta edición0",
      "summary": "",
      "body": "Alcance cuantitativo de esta edición. Esta edición actualiza la lectura editorial e incorpora las bandas estadísticas propias congeladas al cierre del 2 de octubre de 2026. No incorpora un nuevo snapshot del radar. No se reutilizan como actuales precios, VIX, scores, flujos o niveles del 18 de septiembre. Las nuevas cifras externas mantienen su fuente y su ventana; no sustituyen automáticamente los módulos cuantitativos del informe anterior. Los rendimientos semanales del CDI y el snapshot propio se identifican por separado y no se concilian como una misma serie."
    }
  ],
  "assetReadings": [
    {
      "id": "sp500",
      "asset": "S&P 500 · SPY",
      "headline": "Un trimestre favorable no elimina el riesgo de octubre.",
      "badge": "Seguimiento condicional",
      "story": "SPY terminó la semana ligeramente a la baja y QQQ mantuvo ventaja. Esa relación permite observar cuánto depende el índice del liderazgo tecnológico, sin convertir QQQ en una tesis independiente. [A1]",
      "changed": "El calendario mejora y las expectativas de beneficios ofrecen respaldo, pero la amplitud todavía no valida una recuperación general. La lectura de octubre necesita distinguir el mes del trimestre y conservar los resultados de los filtros menos favorables. [A2–A4]",
      "expected": "La continuación gana respaldo si mejoran RSP frente a SPY, IWM frente a SPY y la participación sectorial, mientras los líderes validan beneficios. Si solo avanzan las mayores compañías, la dependencia permanece. El escenario se deterioraría ante una pérdida simultánea de amplitud, liderazgo y estabilidad de financiación.",
      "quantitativePanels": [
        {
          "title": "Rentabilidad semanal · 28 de septiembre–2 de octubre",
          "intro": "La tecnología conserva ventaja, el pesimismo declarado se ha moderado y aparece una mejora semanal muy pequeña de IWM frente a SPY. Ninguna de esas observaciones basta por separado para declarar reparada la amplitud. Los rendimientos de la tabla corresponden a la columna «Semana» del CDI; no son retornos entre informes ni una actualización del motor cuantitativo propio. [A1]",
          "headers": [
            "Instrumento",
            "Rendimiento semanal",
            "Función en el análisis"
          ],
          "rows": [
            [
              "SPY",
              "−0,22 %",
              "Activo de referencia para el S&P 500"
            ],
            [
              "GLD",
              "−3,37 %",
              "Activo de referencia para el oro"
            ],
            [
              "QQQ",
              "+0,68 %",
              "Contraste tecnológico frente a SPY y referencia para Bitcoin"
            ],
            [
              "IWM",
              "−0,16 %",
              "Contraste entre pequeñas y grandes compañías"
            ]
          ],
          "notes": [
            "Sobre esos datos, QQQ supera a SPY en 0,90 puntos porcentuales e IWM en 0,06 puntos. Son diferencias de rentabilidades, no variaciones calculadas sobre el cociente de precios. Estas comparaciones describen participación y liderazgo; no son señales de compra independientes."
          ]
        },
        ...levels('SPY'),
        {
          "title": "Estacionalidad de octubre y Q4",
          "intro": "Octubre y el trimestre completo no son la misma apuesta.",
          "headers": [
            "Condición histórica",
            "Retorno promedio",
            "Periodos positivos",
            "Muestra"
          ],
          "rows": [
            [
              "Octubre, 1950–2025",
              "+0,89 %",
              "59,2 %",
              "76"
            ],
            [
              "Octubre en años midterm",
              "+2,99 %",
              "73,7 %",
              "19"
            ],
            [
              "Octubre, midterm + MA200 ascendente",
              "−0,54 %",
              "62,5 %",
              "8"
            ],
            [
              "Q4, 1950–2025",
              "+4,2 %",
              "80,3 %",
              "76"
            ],
            [
              "Q4 en años midterm",
              "+6,6 %",
              "84,2 %",
              "19"
            ],
            [
              "Q4 tras un Q2 superior al 10 %",
              "+6,1 %",
              "100 %",
              "9 Q4 completados"
            ]
          ],
          "notes": [
            "Fuentes: estudio de octubre aportado y láminas de Carson. Midterm identifica los años de elecciones legislativas de mitad de mandato. Las muestras se solapan; no se suman como confirmaciones independientes ni sus frecuencias se presentan como probabilidades para 2026. [A2–A3]",
            "La fila de octubre con MA200 ascendente contiene más meses positivos que negativos, pero un retorno medio negativo. La magnitud de las pérdidas también importa. Ocho observaciones, además, son insuficientes para tratar ese resultado como una regla estable."
          ]
        },
        {
          "title": "S&P 500: referencias externas y sensibilidad",
          "intro": "La lámina recibida combina previsiones atribuidas a Morgan Stanley y Goldman Sachs con cálculos de ZeroHedge. Usa 7.743 puntos del S&P 500 como referencia, no dólares de SPY ni un cierre certificado por este informe. [A17]",
          "headers": [
            "Referencia de la lámina",
            "Nivel del S&P 500",
            "Variación aproximada",
            "Naturaleza"
          ],
          "rows": [
            [
              "MS: escenario bajista",
              "5.900",
              "−24 %",
              "Doce meses"
            ],
            [
              "ZeroHedge: ajuste completo al gap",
              "6.814",
              "−12 %",
              "Ilustración"
            ],
            [
              "MS: riesgo cercano",
              "7.100",
              "−8 %",
              "Corto plazo"
            ],
            [
              "ZeroHedge: mitad del gap",
              "7.278",
              "−6 %",
              "Ilustración"
            ],
            [
              "MS: escenario base",
              "8.300",
              "+7 %",
              "Doce meses"
            ],
            [
              "Goldman Sachs: objetivo",
              "8.700",
              "+12 %",
              "Doce meses"
            ],
            [
              "MS: escenario alcista",
              "9.400",
              "+21 %",
              "Doce meses"
            ]
          ],
          "notes": [
            "Los movimientos alrededor de ±12 % se conservan como ejercicio de sensibilidad del análisis, no como dos pronósticos simétricos de Morgan Stanley ni como una distribución calibrada. La recuperación de amplitud no obliga al S&P a subir un 12 %, y el gap tampoco garantiza una caída equivalente."
          ]
        },
        {
          "title": "Lista de control",
          "intro": "Condiciones de confirmación y deterioro hasta la siguiente publicación.",
          "headers": [
            "Qué seguimos",
            "Qué daría confirmación",
            "Qué debilitaría la lectura"
          ],
          "rows": [
            [
              "SPY y amplitud",
              "Mejora persistente de RSP/SPY, IWM/SPY y sectores",
              "Deterioro conjunto de participación y líderes"
            ],
            [
              "QQQ como referencia",
              "Fortaleza tecnológica compatible con mayor participación",
              "Concentración creciente y pérdida de líderes"
            ],
            [
              "Bonos, dólar y energía",
              "Ajuste ordenado, sin nuevas presiones de financiación",
              "Aceleración simultánea de rendimientos y costes energéticos"
            ],
            [
              "GLD y oro",
              "Demanda resistente durante correcciones",
              "Salidas persistentes y deterioro de tenencias"
            ],
            [
              "FXI",
              "Liquidez que se traduzca en demanda y resultados",
              "Ausencia de transmisión al consumo y beneficios"
            ],
            [
              "EWJ",
              "Bolsa local, yen y bonos con ajuste ordenado",
              "Dislocación simultánea de divisa y financiación"
            ],
            [
              "BTC",
              "Continuidad y ampliación de acumulación, precio y flujos",
              "Compras selectivas insuficientes frente a ventas más amplias"
            ],
            [
              "ETH",
              "Fortaleza persistente en ETH/BTC y flujos propios",
              "Rebote en dólares sin mejora relativa"
            ],
            [
              "Stock picking",
              "Pedidos, márgenes y caja por acción que validen expectativas",
              "Inversión o crecimiento sin retornos suficientes"
            ]
          ],
          "notes": [
            "El posible Zweig Breadth Thrust permanece como observación condicional: el aviso de sobreventa no equivale a una señal confirmada. Sin la serie y el cómputo completo no se publica activación ni fecha límite. [A18]",
            "El calendario ofrece un contexto favorable. La confirmación llegará cuando mejore la participación y los resultados sostengan las expectativas, sin otro endurecimiento desordenado de la financiación."
          ]
        }
      ]
    },
    {
      "id": "oro",
      "asset": "Oro · GLD",
      "headline": "Riesgo táctico elevado; tesis de medio plazo todavía constructiva.",
      "badge": "Seguimiento condicional",
      "story": "GLD retrocedió un 3,37 % semanal. El deterioro obliga a separar la demanda de fondo de la trayectoria de corto plazo. [A1]",
      "changed": "Mantenemos como hipótesis una posible revisita del oro a 4.000 USD por onza troy. Es un escenario sobre el metal, no un precio de GLD, un objetivo garantizado ni una banda estadística calculada.\n\nLa lámina de Société Générale muestra una reducción de tenencias chinas de Treasuries y un aumento de reservas de oro desde 2020; incluye compras netas de 33 toneladas en Q2 de 2026. Apoya la discusión sobre diversificación de reservas, pero no demuestra una sustitución dólar por dólar. [A13]\n\nLa interpretación de Gustavo Martínez sobre una mayor relevancia de la liquidez del PBoC se conserva como hipótesis. La coincidencia visual entre liquidez china y oro no identifica por sí sola causalidad ni una dependencia exclusiva de China. [A14]",
      "expected": "Una corrección puede convivir con una tesis constructiva a medio plazo. La prueba será que la demanda resista: reservas, demanda física y participaciones en ETF, contrastadas con dólar y rendimientos reales. Una caída acompañada de salidas persistentes debilitaría esa tesis. Tocar 4.000, por sí solo, no acredita una oportunidad ni invalida el marco.",
      "quantitativePanels": [
        ...levels('GLD')
      ]
    },
    {
      "id": "china",
      "asset": "China · FXI",
      "headline": "La liquidez necesita llegar a los beneficios.",
      "badge": "Seguimiento condicional",
      "story": "La tesis heredada de septiembre continúa abierta: la valoración necesitaba confirmación en demanda interna y vivienda. El material nuevo no aporta un cierre de FXI ni una actualización suficiente de esas dos variables. No se atribuye al ETF un movimiento no documentado. [C1]",
      "changed": "La información añadida se concentra en liquidez del PBoC y composición de reservas. Es relevante para el entorno monetario, pero no demuestra por sí misma una mejora del consumo o de los beneficios de las empresas. El argumento sobre el oro no se traslada automáticamente a FXI. [A13–A14]",
      "expected": "Mantenemos como condiciones de confirmación la estabilización inmobiliaria, una demanda doméstica más firme y su traducción a resultados. La participación bursátil y la divisa permitirán contrastar esa transmisión. Un repunte aislado del ETF o un anuncio de liquidez no bastan para darla por conseguida.",
      "quantitativePanels": [
        ...levels('FXI')
      ]
    },
    {
      "id": "japon",
      "asset": "Japón · EWJ",
      "headline": "La prueba pasa por bolsa local, yen y bonos.",
      "badge": "Seguimiento condicional",
      "story": "El Banco de Japón decidió el 18 de septiembre situar el tipo del mercado monetario alrededor del 1,25 %, con efecto desde el 24 de septiembre. Este corte ya es posterior a la fecha de aplicación que seguíamos en el informe anterior. [B4]",
      "changed": "El foco pasa de la decisión a su transmisión. No se incorpora una nueva rentabilidad de EWJ ni se afirma una reacción concreta del yen o de los bonos japoneses: el material reunido no contiene una actualización homogénea de esas series.",
      "expected": "La lectura de trabajo sigue separando el comportamiento de las acciones japonesas de su conversión a dólares. Un ajuste ordenado de bonos y divisa sería más compatible con continuidad que una dislocación simultánea. La confirmación requiere observar ambos canales, no únicamente el precio del ETF.",
      "quantitativePanels": [
        ...levels('EWJ')
      ]
    },
    {
      "id": "bitcoin",
      "asset": "Bitcoin · BTC",
      "headline": "Acumulación selectiva, con tecnología y liquidez como referencias.",
      "badge": "Seguimiento condicional",
      "story": "BTC muestra señales de acumulación selectiva: algunos grandes tenedores continúan aumentando sus posiciones en la zona de precios observada, sin que ello implique una acumulación generalizada entre los grandes capitales. La evidencia de Santiment corresponde a la ventana de la captura, cuyo eje llega al 28 de septiembre; no acredita compras de todas las instituciones ni una observación en directo. [A15]",
      "changed": "La acumulación añade una pieza distinta al argumento de liquidez. El gráfico GLI compara cambios de seis semanas con la liquidez global desplazada trece semanas. Puede servir como hipótesis explicativa, pero el desfase no es una cuenta atrás fiable hacia el siguiente movimiento. [A14]\n\nQQQ queda como referencia cruzada por la vinculación de Bitcoin con el riesgo tecnológico y su relación con SPY. La investigación histórica de CME documenta una correlación positiva entre Bitcoin y los grandes índices desde 2020, variable según la ventana. No se publica una correlación alta calculada al nuevo corte ni se presupone que permanezca constante. Es contexto histórico, no una medición actual. [B5]",
      "expected": "La lectura se fortalecería con continuidad de la acumulación, entradas más amplias y precio que confirme, sin deterioro simultáneo del riesgo tecnológico. Una divergencia persistente entre BTC y QQQ merece análisis: no obliga a que uno alcance inmediatamente al otro.\n\nEl antecedente de octubre publicado en septiembre —cinco meses positivos de seis entre 2020 y 2025— se conserva únicamente como contexto histórico, no como una nueva señal ni un cálculo actualizado. [C1]",
      "quantitativePanels": [
        ...levels('BTCUSD')
      ]
    },
    {
      "id": "ethereum",
      "asset": "Ethereum · ETH",
      "headline": "La confirmación sigue estando en ETH/BTC.",
      "badge": "Seguimiento condicional",
      "story": "El informe anterior distinguía el rebote en dólares de una recuperación relativa todavía irregular. La información nueva no incluye una serie homogénea que permita afirmar que esa situación ha cambiado, ni flujos propios de ETH con el nuevo corte. [C1]",
      "changed": "La acumulación identificada en Bitcoin no demuestra acumulación en Ethereum. Del mismo modo, una hipótesis favorable de liquidez no basta para declarar que la recuperación cripto se ha ampliado.",
      "expected": "Mantener fortaleza relativa en ETH/BTC, acompañada de flujos y participación propios, daría más respaldo a una ampliación del movimiento. Si ETH sube en dólares, pero pierde frente a Bitcoin, sigue faltando esa confirmación. El seguimiento permanece abierto, sin trasladar los niveles de septiembre ni atribuir a ETH las señales de BTC.",
      "quantitativePanels": [
        ...levels('ETHUSD')
      ]
    },
    {
      "id": "ia-tecnologia",
      "asset": "IA / Tecnología · Stock picking",
      "headline": "Distinguir empresas, no comprar una etiqueta.",
      "badge": "Seguimiento condicional",
      "story": "El registro semanal del CDI muestra diferencias importantes: NVDA +3,95 %, AVGO +0,66 %, AMZN +0,74 % y MSFT +0,26 %, frente a GOOGL −0,12 %, AAPL −2,16 % y META −3,14 %. La selección importa incluso dentro del grupo de grandes compañías. [A1, página 6]",
      "changed": "Las expectativas de capex y beneficios sostienen la investigación de empresas, pero elevan la exigencia de ejecución. Un desembolso puede ser ingreso para un proveedor y salida de caja para su cliente. Además, una desaceleración del crecimiento del capex no equivale necesariamente a una reducción del gasto absoluto. [A4–A5]",
      "expected": "Una ampliación del liderazgo respaldada por resultados sería más sólida que la recuperación de unos pocos nombres. En software mantenemos la prueba del informe anterior: uso convertido en ingresos y flujo de caja por acción, no adopción aislada. [C1]",
      "quantitativePanels": [
        {
          "title": "Empresas y preguntas de seguimiento",
          "intro": "Los nombres proceden del material aportado. La tabla organiza preguntas de investigación; no es un ranking de compra ni una valoración actualizada.",
          "headers": [
            "Empresas en seguimiento",
            "Pregunta decisiva",
            "Qué reforzaría la tesis"
          ],
          "rows": [
            [
              "NVDA y AVGO",
              "¿La inversión de sus clientes se convierte en pedidos, ingresos y caja sostenibles?",
              "Resultados y márgenes que validen expectativas, sin deterioro material de la demanda"
            ],
            [
              "TSM, AMAT y ANET",
              "¿Se amplían las oportunidades más allá de unos pocos líderes?",
              "Mayor participación del grupo y confirmación en resultados individuales"
            ],
            [
              "MSFT, AMZN y GOOGL",
              "¿El gasto de capital genera retornos suficientes?",
              "Monetización y flujo de caja compatibles con el ritmo de inversión"
            ],
            [
              "DDOG, NET y PLTR",
              "¿El uso de la tecnología se convierte en valor por acción?",
              "Ingresos, retención y caja por acción, considerando dilución"
            ]
          ],
          "notes": [
            "Fuentes para presencia y comportamiento de los nombres: listado y cuadros del CDI. Los criterios de contraste son lectura editorial; no se afirma que cada empresa los cumpla. [A1]"
          ]
        },
        {
          "title": "Small caps frente a large caps",
          "intro": "La ventaja de IWM frente a SPY esta semana es demasiado pequeña para confirmar una rotación sostenida. El posible rebote de pequeñas compañías se mantiene como hipótesis. La tabla de drawdowns del Russell 3000 describe caídas históricas dentro de una ventana, no una lista de small caps baratas ni una señal de entrada. [A1; A8]",
          "headers": [],
          "rows": [],
          "notes": [
            "La selección buscará distinguir recuperación con beneficios y financiación suficientes de un rebote explicado únicamente por pérdidas previas. En grandes compañías, tampoco basta el tamaño: concentración de clientes, valoración, inversión y caja deben analizarse por empresa.",
            "La referencia a TNA es táctica y no equivale a una exposición sin apalancar a pequeñas compañías. Su objetivo es el 300 % del rendimiento diario del Russell 2000, no tres veces el resultado de varias semanas. No se define una operación ni un tamaño de posición. [B6]"
          ]
        }
      ]
    },
    {
      "id": "energia",
      "asset": "Energía / petróleo",
      "headline": "El riesgo se transmite por costes e inflación.",
      "badge": "Seguimiento condicional",
      "story": "El material incorpora un repunte intradía de Brent hacia 103 USD por barril a comienzos de octubre. La captura corresponde a un CFD: no sustituye una serie spot ni acredita el cierre del día 2. [A12]",
      "changed": "El contraste relevante es la coincidencia de mayor presión energética y rendimientos elevados con deterioro de amplitud en las láminas de Morgan Stanley. Esa coincidencia no identifica una causa única. [A7]",
      "expected": "Menores costes de energía y transporte aliviarían una restricción; una nueva aceleración dificultaría el ajuste de inflación y márgenes. Se vigilan decisiones y cambios observables de oferta, no una supuesta respuesta política automática ante la presión del mercado.",
      "quantitativePanels": []
    },
    {
      "id": "usd-cop",
      "asset": "USD/COP",
      "headline": "Separar el dólar global del componente local.",
      "badge": "Seguimiento condicional",
      "story": "La publicación recibida de Felipe Campos, fechada el 24 de septiembre, relaciona la subida del dólar con factores globales y una interpretación de expectativas fiscales locales. Es una lectura atribuida al autor; no se presenta como una explicación causal demostrada. [A16]",
      "changed": "No hay un cierre homogéneo nuevo para fijar un rango táctico. Se mantiene el recuadro regional, sin convertir niveles de esa captura en referencias actuales.",
      "expected": "El marco de trabajo contrasta dólar global, petróleo, financiación y evolución fiscal local. Solo cambios documentados en esos factores permitirían revisar la lectura. No se infieren resultados electorales ni se utiliza un mercado de predicción como sustituto de datos oficiales o de una tesis de inversión.",
      "quantitativePanels": []
    }
  ],
  "calendar": [
    {
      "id": "octubre-5",
      "dateLabel": "5 de octubre",
      "dateStart": "2026-10-05",
      "event": "ISM de servicios",
      "whyItMatters": "Actividad, empleo y precios [B7]",
      "category": "macro",
      "originalTimeZone": "ET",
      "timeStatus": "confirmed",
      "dateConfirmationStatus": "confirmed",
      "sourceLabel": "B7",
      "sourceHref": "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/services/august/",
      "trackingHref": "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/services/august/",
      "trackingLabel": "Consultar fuente oficial",
      "originalTime": "10:00",
      "displayTimeCest": "16:00 CEST",
      "startDateTimeUtc": "2026-10-05T14:00:00Z"
    },
    {
      "id": "octubre-6",
      "dateLabel": "6 de octubre",
      "dateStart": "2026-10-06",
      "event": "Comercio internacional",
      "whyItMatters": "Demanda y sector exterior [B8]",
      "category": "macro",
      "originalTimeZone": "ET",
      "timeStatus": "confirmed",
      "dateConfirmationStatus": "confirmed",
      "sourceLabel": "B8",
      "sourceHref": "https://www.bea.gov/news/schedule",
      "trackingHref": "https://www.bea.gov/news/schedule",
      "trackingLabel": "Consultar fuente oficial",
      "originalTime": "08:30",
      "displayTimeCest": "14:30 CEST",
      "startDateTimeUtc": "2026-10-06T12:30:00Z"
    },
    {
      "id": "octubre-7",
      "dateLabel": "7 de octubre",
      "dateStart": "2026-10-07",
      "event": "Actas del FOMC",
      "whyItMatters": "Argumentos de la decisión de septiembre [B9]",
      "category": "central-bank",
      "originalTimeZone": "ET",
      "timeStatus": "confirmed",
      "dateConfirmationStatus": "confirmed",
      "sourceLabel": "B9",
      "sourceHref": "https://www.federalreserve.gov/newsevents/2026-october.htm",
      "trackingHref": "https://www.federalreserve.gov/newsevents/2026-october.htm",
      "trackingLabel": "Consultar fuente oficial",
      "originalTime": "14:00",
      "displayTimeCest": "20:00 CEST",
      "startDateTimeUtc": "2026-10-07T18:00:00Z"
    },
    {
      "id": "octubre-8",
      "dateLabel": "8 de octubre",
      "dateStart": "2026-10-08",
      "event": "Solicitudes de desempleo",
      "whyItMatters": "Seguimiento laboral; agenda aportada [A9]",
      "category": "macro",
      "originalTimeZone": "ET",
      "timeStatus": "tba",
      "dateConfirmationStatus": "editorial-unconfirmed",
      "sourceLabel": "A9"
    },
    {
      "id": "octubre-9",
      "dateLabel": "9 de octubre",
      "dateStart": "2026-10-09",
      "event": "Michigan preliminar",
      "whyItMatters": "Sentimiento y expectativas de inflación [B2]",
      "category": "macro",
      "originalTimeZone": "ET",
      "timeStatus": "confirmed",
      "dateConfirmationStatus": "confirmed",
      "sourceLabel": "B2",
      "sourceHref": "https://www.sca.isr.umich.edu/",
      "trackingHref": "https://www.sca.isr.umich.edu/",
      "trackingLabel": "Consultar fuente oficial",
      "originalTime": "10:00",
      "displayTimeCest": "16:00 CEST",
      "startDateTimeUtc": "2026-10-09T14:00:00Z"
    },
    {
      "id": "octubre-14",
      "dateLabel": "14 de octubre",
      "dateStart": "2026-10-14",
      "event": "CPI",
      "whyItMatters": "Inflación antes del FOMC [B10]",
      "category": "macro",
      "originalTimeZone": "ET",
      "timeStatus": "confirmed",
      "dateConfirmationStatus": "confirmed",
      "sourceLabel": "B10",
      "sourceHref": "https://www.bls.gov/schedule/2026/10_sched.htm",
      "trackingHref": "https://www.bls.gov/schedule/2026/10_sched.htm",
      "trackingLabel": "Consultar fuente oficial",
      "originalTime": "08:30",
      "displayTimeCest": "14:30 CEST",
      "startDateTimeUtc": "2026-10-14T12:30:00Z"
    },
    {
      "id": "octubre-15",
      "dateLabel": "15 de octubre",
      "dateStart": "2026-10-15",
      "event": "PPI",
      "whyItMatters": "Presiones de precios en producción [B10]",
      "category": "macro",
      "originalTimeZone": "ET",
      "timeStatus": "confirmed",
      "dateConfirmationStatus": "confirmed",
      "sourceLabel": "B10",
      "sourceHref": "https://www.bls.gov/schedule/2026/10_sched.htm",
      "trackingHref": "https://www.bls.gov/schedule/2026/10_sched.htm",
      "trackingLabel": "Consultar fuente oficial",
      "originalTime": "08:30",
      "displayTimeCest": "14:30 CEST",
      "startDateTimeUtc": "2026-10-15T12:30:00Z"
    },
    {
      "id": "octubre-28",
      "dateLabel": "28 de octubre",
      "dateStart": "2026-10-28",
      "event": "Decisión del FOMC",
      "whyItMatters": "Pausa frente a nueva subida [B9]",
      "category": "central-bank",
      "originalTimeZone": "ET",
      "timeStatus": "confirmed",
      "dateConfirmationStatus": "confirmed",
      "sourceLabel": "B9",
      "sourceHref": "https://www.federalreserve.gov/newsevents/2026-october.htm",
      "trackingHref": "https://www.federalreserve.gov/newsevents/2026-october.htm",
      "trackingLabel": "Consultar fuente oficial",
      "originalTime": "14:00",
      "displayTimeCest": "19:00 CET",
      "startDateTimeUtc": "2026-10-28T18:00:00Z"
    },
    {
      "id": "octubre-29",
      "dateLabel": "29 de octubre",
      "dateStart": "2026-10-29",
      "event": "PIB de Q3 y PCE",
      "whyItMatters": "Crecimiento e inflación [B8]",
      "category": "macro",
      "originalTimeZone": "ET",
      "timeStatus": "confirmed",
      "dateConfirmationStatus": "confirmed",
      "sourceLabel": "B8",
      "sourceHref": "https://www.bea.gov/news/schedule",
      "trackingHref": "https://www.bea.gov/news/schedule",
      "trackingLabel": "Consultar fuente oficial",
      "originalTime": "08:30",
      "displayTimeCest": "13:30 CET",
      "startDateTimeUtc": "2026-10-29T12:30:00Z"
    }
  ],
  "probableRoutes": {
    "title": "Rutas probables",
    "note": "Tres rutas condicionales hasta la siguiente publicación, sin probabilidades asignadas.",
    "scenarios": [
      {
        "title": "Ruta base · Resistencia con recuperación incompleta",
        "body": "Los líderes validan expectativas y los rendimientos permanecen altos, pero ordenados. La amplitud se estabiliza sin una recuperación amplia inmediata. El índice alterna avances y correcciones con dispersión entre empresas. Pierde respaldo si empeoran simultáneamente participación y líderes."
      },
      {
        "title": "Ruta favorable · Se incorporan los rezagados",
        "body": "RSP e IWM mejoran de forma persistente frente a SPY y participan más sectores. Tecnología mantiene resultados, mientras energía y financiación dejan de añadir presión. Bitcoin acompaña con demanda más amplia; Ethereum confirma mediante ETH/BTC. La divergencia se reduce sin exigir una subida idéntica de todos los activos."
      },
      {
        "title": "Ruta adversa · La debilidad alcanza a los líderes",
        "body": "Un nuevo endurecimiento de financiación o decepciones de resultados coincide con falta de recuperación interna. El deterioro se transmite al índice. En cripto, la acumulación selectiva no basta para absorber ventas más amplias; en oro se mantiene abierto el escenario correctivo, sin confundirlo automáticamente con invalidación de medio plazo."
      }
    ]
  },
  "watchlist": [
    {
      "key": "control-0",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "SPY y amplitud",
      "whatLooksAt": "SPY y amplitud",
      "whyItMatters": "Mejora persistente de RSP/SPY, IWM/SPY y sectores",
      "currentReading": "Confirmación: Mejora persistente de RSP/SPY, IWM/SPY y sectores",
      "whatWouldChange": "Debilitaría la lectura: Deterioro conjunto de participación y líderes"
    },
    {
      "key": "control-1",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "QQQ como referencia",
      "whatLooksAt": "QQQ como referencia",
      "whyItMatters": "Fortaleza tecnológica compatible con mayor participación",
      "currentReading": "Confirmación: Fortaleza tecnológica compatible con mayor participación",
      "whatWouldChange": "Debilitaría la lectura: Concentración creciente y pérdida de líderes"
    },
    {
      "key": "control-2",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "Bonos, dólar y energía",
      "whatLooksAt": "Bonos, dólar y energía",
      "whyItMatters": "Ajuste ordenado, sin nuevas presiones de financiación",
      "currentReading": "Confirmación: Ajuste ordenado, sin nuevas presiones de financiación",
      "whatWouldChange": "Debilitaría la lectura: Aceleración simultánea de rendimientos y costes energéticos"
    },
    {
      "key": "control-3",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "GLD y oro",
      "whatLooksAt": "GLD y oro",
      "whyItMatters": "Demanda resistente durante correcciones",
      "currentReading": "Confirmación: Demanda resistente durante correcciones",
      "whatWouldChange": "Debilitaría la lectura: Salidas persistentes y deterioro de tenencias"
    },
    {
      "key": "control-4",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "FXI",
      "whatLooksAt": "FXI",
      "whyItMatters": "Liquidez que se traduzca en demanda y resultados",
      "currentReading": "Confirmación: Liquidez que se traduzca en demanda y resultados",
      "whatWouldChange": "Debilitaría la lectura: Ausencia de transmisión al consumo y beneficios"
    },
    {
      "key": "control-5",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "EWJ",
      "whatLooksAt": "EWJ",
      "whyItMatters": "Bolsa local, yen y bonos con ajuste ordenado",
      "currentReading": "Confirmación: Bolsa local, yen y bonos con ajuste ordenado",
      "whatWouldChange": "Debilitaría la lectura: Dislocación simultánea de divisa y financiación"
    },
    {
      "key": "control-6",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "BTC",
      "whatLooksAt": "BTC",
      "whyItMatters": "Continuidad y ampliación de acumulación, precio y flujos",
      "currentReading": "Confirmación: Continuidad y ampliación de acumulación, precio y flujos",
      "whatWouldChange": "Debilitaría la lectura: Compras selectivas insuficientes frente a ventas más amplias"
    },
    {
      "key": "control-7",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "ETH",
      "whatLooksAt": "ETH",
      "whyItMatters": "Fortaleza persistente en ETH/BTC y flujos propios",
      "currentReading": "Confirmación: Fortaleza persistente en ETH/BTC y flujos propios",
      "whatWouldChange": "Debilitaría la lectura: Rebote en dólares sin mejora relativa"
    },
    {
      "key": "control-8",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "Stock picking",
      "whatLooksAt": "Stock picking",
      "whyItMatters": "Pedidos, márgenes y caja por acción que validen expectativas",
      "currentReading": "Confirmación: Pedidos, márgenes y caja por acción que validen expectativas",
      "whatWouldChange": "Debilitaría la lectura: Inversión o crecimiento sin retornos suficientes"
    }
  ],
  "sourceGroups": [
    {
      "title": "A. Investigación institucional y material aportado",
      "entries": [
        {
          "label": "Las referencias siguientes identifican documentos o reproducciones recibidas. Se atribuyen sus cifras a esas piezas; no se afirma haber auditado sus bases originales. No se incluyen capturas privadas para publicación."
        },
        {
          "label": "A1. CDI: Informe de cierre semanal, 28 de septiembre–2 de octubre de 2026. Rendimientos: páginas 3–4 y 6; nombres en seguimiento: páginas 7–8 y 11. No se mezcla el panel sectorial de la página 5 con el de la 4."
        },
        {
          "label": "A2. Estudio de estacionalidad del S&P 500, 1950–2025: material del 3 de octubre de 2026. La tabla por contexto no viene acompañada de código o series para auditar sus filtros."
        },
        {
          "label": "A3. Carson/FactSet/YCharts: Q4 general, ciclo de cuatro años y Q4 después de Q2 >10 %. Se excluye 2026 de los Q4 completados. Muestras solapadas, no evidencia independiente acumulable."
        },
        {
          "label": "A4. Carson/FactSet: estimaciones de crecimiento de EPS, 25/09/2026. 31,9 % para 2026 y 15,2 % para 2027; no resultados anuales realizados."
        },
        {
          "label": "A5. Goldman Sachs/FactSet, reproducido por CDI: capex de hyperscalers, estimación del 116 % interanual en Q3 de 2026."
        },
        {
          "label": "A6. CME FedWatch, captura aportada del 04/10: probabilidades por rango y reunión. La hora interna de observación no está acreditada; no se trata como dato en directo."
        },
        {
          "label": "A7. Morgan Stanley/Bloomberg: láminas de amplitud y entorno desde Jackson Hole; contraste con el PDF CDI y la captura MA50. Porcentajes sin corte común conciliado."
        },
        {
          "label": "A8. Morgan Stanley/FactSet: máximos drawdowns del Russell 3000 desde junio. La captura no identifica fecha final completa; describe trayectoria, no caída actual."
        },
        {
          "label": "A9. BofA, CNN y AAII: BofA Bull & Bear 8,8; CNN 31 con etiqueta del 02/10; AAII hasta el 30/09. Agenda CDI del 5–9 de octubre. Universos y metodologías diferentes."
        },
        {
          "label": "A10. J.P. Morgan Asset Management: consumidor y retornos posteriores, reproducido por Héctor Chamizo. Los valles históricos se identifican retrospectivamente."
        },
        {
          "label": "A11. Flujos y oferta: Baird Strategas/Bloomberg según Kobeissi; compras minoristas de J.P. Morgan frente a media LTM; emisión neta de Carson/Fed. No son tres medidas idénticas de entradas de capital."
        },
        {
          "label": "A12. Kobeissi: reacción intradía del Treasury tras el empleo y gráfico de CFD de Brent del 01/10. No sustituyen cierres semanales ni precios físicos spot."
        },
        {
          "label": "A13. Société Générale: reservas chinas de oro y Treasuries, con compras de oro hasta Q2 de 2026. Toneladas y dólares no son magnitudes intercambiables."
        },
        {
          "label": "A14. GLI: GLI$(+13w) & BTC$ 6week Changes y PBoC Liquidity & Gold Bullion. Interpretación atribuida a Gustavo Martínez por el material recibido; relación causal no demostrada por las figuras."
        },
        {
          "label": "A15. Santiment/Sanbase: Key Bitcoin Whales Are Accumulating, Back to 6 Week High Holdings, eje hasta el 28/09/2026. Cohortes de saldos de direcciones, no identificación exhaustiva de inversores institucionales."
        },
        {
          "label": "A16. Felipe Campos: comentario y gráfico USD/COP del 24/09. Interpretación atribuida; no actualización del cierre del 02/10."
        },
        {
          "label": "A17. ZeroHedge: compilación de escenarios atribuidos a Morgan Stanley y Goldman Sachs, con ilustraciones propias sobre el gap. Base SPX 7.743; autores y horizontes separados."
        },
        {
          "label": "A18. Aviso de investigación ZBT: no se acredita señal sin serie, universo y fechas verificables."
        }
      ]
    },
    {
      "title": "B. Fuentes oficiales y públicas consultadas",
      "entries": [
        {
          "label": "B1. Federal Reserve: decisión del 16/09/2026.",
          "href": "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm"
        },
        {
          "label": "B2. University of Michigan: resultados finales de septiembre y calendario. Página dinámica consultada el 05/10/2026.",
          "href": "https://www.sca.isr.umich.edu/"
        },
        {
          "label": "B3. BLS: empleo de septiembre, publicación del 02/10/2026.",
          "href": "https://www.bls.gov/news.release/archives/empsit_10022026.htm"
        },
        {
          "label": "B4. Bank of Japan: decisión del 18/09/2026, con efecto desde el 24/09.",
          "href": "https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918a.pdf"
        },
        {
          "label": "B5. CME Economic Research: Why Is Bitcoin Moving in Tandem with Equities?, 14/05/2025. Contexto histórico, no coeficiente actualizado para octubre de 2026.",
          "href": "https://www.cmegroup.com/insights/economic-research/2025/why-is-bitcoin-moving-in-tandem-with-equities.html"
        },
        {
          "label": "B6. Direxion: Small Cap Bull/Bear 3X ETFs. Objetivo diario y riesgos del apalancamiento.",
          "href": "https://www.direxion.com/product/daily-small-cap-bull-bear-3x-etfs"
        },
        {
          "label": "B7. ISM: informe de servicios de agosto y fecha anunciada de septiembre.",
          "href": "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/services/august/"
        },
        {
          "label": "B8. BEA: calendario de publicaciones, consultado el 05/10/2026.",
          "href": "https://www.bea.gov/news/schedule"
        },
        {
          "label": "B9. Federal Reserve: calendario de octubre de 2026.",
          "href": "https://www.federalreserve.gov/newsevents/2026-october.htm"
        },
        {
          "label": "B10. BLS: calendario de octubre de 2026.",
          "href": "https://www.bls.gov/schedule/2026/10_sched.htm"
        }
      ]
    },
    {
      "title": "C. Continuidad y cálculos editoriales",
      "entries": [
        {
          "label": "C1. Segundo informe de septiembre: organización, universo de activos y continuidad de las tesis. No es fuente de cotizaciones actuales. La observación de octubre de BTC conserva la muestra histórica 2020–2025 de aquella edición.",
          "href": "https://www.luiguiherrera.com/informes/segundo-informe-septiembre-2026"
        },
        {
          "label": "Diferencias relativas: rentabilidad semanal del instrumento menos la de SPY, calculadas sobre cifras redondeadas del CDI. No se presenta una variación del cociente de precios."
        },
        {
          "label": "Correlación: el contexto histórico de CME no se convierte en una medición contemporánea. No se calcula un coeficiente nuevo BTC/QQQ."
        },
        {
          "label": "Horas: conversión por fecha entre America/New_York y Europe/Madrid. Los cortes de mercado, las fechas de captura y las fechas de publicación no son equivalentes."
        },
        {
          "label": "Escenarios, condiciones de confirmación y preguntas de stock picking: interpretación editorial. No son probabilidades estimadas ni recomendaciones de operaciones."
        },
        {
          "label": "Las bandas estadísticas propias y sus precios de referencia se congelan al cierre del 2 de octubre de 2026. No se actualizan radar ni flujos propios. China, Japón y Ethereum mantienen sus tesis narrativas, sin añadir rentabilidades nuevas no documentadas. El snapshot cuantitativo no convierte esas tesis en señales."
        }
      ]
    }
  ],
  "sourcesNote": "Horas de Nueva York (ET) y España peninsular. Se conservan los eventos principales del calendario aportado; las fechas y horas oficiales contrastadas se identifican en las fuentes. El 5 de octubre permanece en la agenda aunque su publicación pueda haber ocurrido al consultar el informe: aquí no se incorpora su resultado. El PCE se publica después de la decisión de la Fed, no antes. La diferencia horaria con España cambia en la última parte del mes; por eso no se aplica una conversión fija a todo octubre. El posible Zweig Breadth Thrust permanece como observación condicional: el aviso de sobreventa no equivale a una señal confirmada. Sin la serie y el cómputo completo no se publica activación ni fecha límite. [A18] El calendario ofrece un contexto favorable. La confirmación llegará cuando mejore la participación y los resultados sostengan las expectativas, sin otro endurecimiento desordenado de la financiación.",
  "disclaimer": "Este informe tiene finalidad informativa y educativa. No constituye asesoramiento personalizado ni una recomendación de compra o venta. Los patrones históricos, estimaciones, correlaciones y escenarios no garantizan resultados futuros. Los instrumentos apalancados añaden riesgo de trayectoria, costes y pérdida de capital."
};
