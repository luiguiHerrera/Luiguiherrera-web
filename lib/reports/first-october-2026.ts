import type { MarketReport } from './market-reports';
import type { ReportQuantitativePanel } from './report-statistical-panels';
import { LEVELS_DISCLAIMER } from './report-statistical-panels.ts';
import closing from './snapshots/primer-informe-octubre-2026/market-close.json' with { type: 'json' };
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

const pct = (value: number, unit = "%") => `${value < 0 ? "−" : value > 0 ? "+" : ""}${number(Math.abs(value))} ${unit}`;
const relative = (ticker: "RSP" | "IWM" | "QQQ") => closing.returns[ticker].returnPct - closing.returns.SPY.returnPct;
const sectorNames = { XLK: "Tecnología", XLE: "Energía", XLU: "Servicios públicos", XLI: "Industria", XLY: "Consumo discrecional", XLRE: "Inmobiliario", XLP: "Consumo básico", XLB: "Materiales", XLC: "Comunicación", XLF: "Finanzas", XLV: "Salud" };
const sectorReturns = Object.entries(sectorNames).map(([ticker, name]) => ({ ticker, name, value: closing.returns[ticker as keyof typeof sectorNames].returnPct })).sort((a, b) => b.value - a.value);
const closingPanels: ReportQuantitativePanel[] = [
  {
    title: "Amplitud al corte",
    intro: "La divergencia sigue ahí. El índice aguanta mejor que el mercado equiponderado. Cierres ajustados del 25 de septiembre al 2 de octubre. [A1]",
    headers: ["Referencia", "Semana", "Ventaja frente a SPY"],
    rows: [
      ["SPY · índice", pct(closing.returns.SPY.returnPct), "—"],
      ["RSP · igual peso", pct(closing.returns.RSP.returnPct), pct(relative("RSP"), "pp")],
      ["IWM · small caps", pct(closing.returns.IWM.returnPct), pct(relative("IWM"), "pp")],
      ["QQQ · tecnología", pct(closing.returns.QQQ.returnPct), pct(relative("QQQ"), "pp")],
    ],
    notes: ["Diferencias de rentabilidades, no variaciones de los cocientes RSP/SPY, IWM/SPY o QQQ/SPY. IWM mejora apenas frente a SPY: falta continuidad para hablar de rotación. QQQ mantiene el liderazgo y la concentración.", "El deterioro desde Jackson Hole no tiene una lectura MA200 única comparable: las referencias del 30 %, 43 % y 48 % corresponden a cortes distintos. [A7]"],
  },
  {
    title: "Condiciones de mercado",
    intro: "SPY sigue por encima de su media larga. Eso sostiene la tendencia del índice; por sí solo no confirma la participación del resto del mercado.",
    headers: ["SPY · cierre del 2 de octubre", "Valor"],
    rows: [["Cierre", `${number(closing.completedDaily.close)} USD`], ["Media móvil de 200 sesiones", `${number(closing.completedDaily.ma200)} USD`], ["Distancia a MA200", pct(closing.completedDaily.distanceMa200Pct)]],
    notes: ["Serie diaria completada de niveles propios, congelada al 2 de octubre. Distancia = (cierre / MA200 − 1) × 100. Comparación entre precio y media de la misma serie y fecha."],
  },
  {
    title: "Rotación / sectores",
    intro: `${sectorReturns.filter(item => item.value > 0).length} de 11 sectores subieron. Tecnología, energía y servicios públicos lideran; salud, finanzas y comunicación quedan atrás.`,
    headers: ["Sector · ETF", "Semana"],
    rows: sectorReturns.map(item => [`${item.name} · ${item.ticker}`, pct(item.value)]),
    notes: ["Yahoo Finance, cierres ajustados del 25 de septiembre al 2 de octubre de 2026. Retorno = (cierre final / cierre inicial − 1) × 100. La participación mide estos 11 ETF, no el porcentaje de acciones del mercado. [A1]"],
  },
];

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
        "names": [
          "Yahoo Finance"
        ],
        "href": "https://finance.yahoo.com/quote/SPY/history/"
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
        "id": "A17",
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
    "openingLine": "El calendario ayuda; la amplitud debe confirmar.",
    "prospectivePeriod": "Hasta el siguiente informe.",
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
    ],
    "watchlistStyle": "three-fields"
  },
  "whatHappened": [
    {
      "title": "Apertura",
      "summary": "",
      "body": "Octubre arranca con una contradicción bastante clara: el calendario juega a favor, pero por debajo del índice el mercado todavía no termina de acompañar."
    },
    {
      "title": "Liderazgo",
      "summary": "",
      "body": "La tecnología mantiene el liderazgo y las expectativas de beneficios siguen fuertes. La inversión en IA tampoco da señales de frenarse. El problema es la concentración: la amplitud se deterioró desde Jackson Hole y todavía no veo una recuperación suficientemente amplia para darlo por resuelto."
    },
    {
      "title": "Financiación",
      "summary": "",
      "body": "La Fed tiene más margen para pausar en octubre, pero los rendimientos largos siguen altos. Menos riesgo de otra subida inmediata no significa que el coste del capital haya dejado de importar."
    },
    {
      "title": "Lectura",
      "summary": "",
      "body": "Mi lectura para Q4 sigue siendo constructiva: quiero ver que participen más acciones sin que se caigan los líderes. Si ocurre, el mercado gana calidad. Si no, seguimos dependiendo demasiado de unas pocas compañías."
    },
    {
      "title": "Amplitud, sentimiento y flujos",
      "summary": "",
      "body": "El 51 % del Russell 3000 experimentó un drawdown máximo superior al 20 % desde junio: no significa que siga hoy un 20 % abajo. Las lecturas sobre MA200 tienen cortes distintos; no hay un porcentaje único comparable. [A7–A8]",
      "showHeading": true
    },
    {
      "title": "Sentimiento",
      "summary": "",
      "body": "BofA Bull & Bear baja de 9,3 a 8,8 y sigue elevado; CNN Fear & Greed marca 31 (miedo); los bajistas de AAII pasan del 53,3 % al 46,5 % entre el 16 y el 30 de septiembre. Miden posicionamiento, mercado y opiniones diferentes. Michigan cierra septiembre en 48,1. J.P. Morgan registra un +24,1 % medio del S&P 500 a doce meses tras nueve valles históricos: identificados a posteriori, no señalan un suelo hoy. [A9–A10; B2]"
    },
    {
      "title": "Flujos",
      "summary": "",
      "body": "Los ETF reciben 3.276 millones de dólares diarios de media en septiembre frente a 7.036 millones en junio. Las compras minoristas quedan por debajo de su media de doce meses, sin implicar ventas netas. La mayor emisión neta de acciones añade oferta. [A11]"
    },
    {
      "title": "Fed y financiación",
      "summary": "",
      "body": "Octubre apunta a pausa en 3,75–4,00 %, no a recorte: FedWatch asigna 77,9 % a ese rango y 22,1 % a 4,00–4,25 %; este último es el rango modal de diciembre. El empleo suma 29.000 nóminas, con paro del 4,2 % y revisiones de −60.000 en julio y agosto. El Treasury a diez años rebotó intradía hacia 5,28 % tras el dato. Importan el nivel y la velocidad de los yields. [A6; A12; B1; B3]",
      "showHeading": true
    }
  ],
  "marketClose": {
    title: "Lecturas de mercado al cierre",
    subtitle: "Estado del mercado al cierre del 2 de octubre de 2026.",
    comparison: [
    {
      "title": "Qué cambió desde el segundo informe de septiembre",
      "summary": "",
      "body": "En el segundo informe de septiembre ya veíamos un índice resistente con deterioro interno. Ahora esa divergencia es más persistente. [C1]",
      "showHeading": true
    },
    {
      "title": "Amplitud",
      "summary": "",
      "body": "Amplitud. La divergencia es más persistente y puede seguirse desde Jackson Hole. Tecnología. QQQ conserva ventaja frente a SPY: sostiene al índice y mantiene la concentración."
    },
    {
      "title": "Small caps y financiación",
      "summary": "",
      "body": "Small caps. IWM mejoró ligeramente frente a SPY durante la última semana. Todavía no alcanza para hablar de rotación: falta continuidad. Bonos / Fed. El riesgo inmediato de otra subida se redujo, pero los yields largos siguen elevados. El problema cambió de forma; no desapareció."
    },
    {
      "title": "Sentimiento y activos",
      "summary": "",
      "body": "Sentimiento / flujos. El ánimo minorista está más deprimido que el posicionamiento institucional. Los flujos siguen positivos, pero pierden velocidad. Oro / cripto. Oro más vulnerable a corto plazo, constructivo a medio plazo; Bitcoin mejor alineado con liquidez global y acumulación selectiva; Ethereum necesita confirmar frente a BTC."
    },
    {
      "title": "Resolución",
      "summary": "",
      "body": "El mercado no está peor en todo; está más dividido. La divergencia puede resolverse con recuperación de rezagados, ajuste de líderes, lateralidad o una combinación."
    }
    ],
    signals: [
      { title: "Qué impulsa", body: "Liderazgo tecnológico; expectativas de beneficios; CapEx de IA; estacionalidad favorable de Q4." },
      { title: "Qué frena", body: "Amplitud débil; yields largos elevados; concentración; menor impulso de flujos." },
      { title: "Qué vigilo", body: "Recuperación de rezagados; RSP/SPY e IWM/SPY; continuidad del liderazgo; condiciones financieras." },
    ],
    quantitativePanels: closingPanels,
  },
  "assetReadings": [
    {
      "id": "sp500",
      "asset": "S&P 500 · SPY",
      "headline": "Un trimestre favorable no elimina el riesgo de octubre.",
      "badge": "Seguimiento condicional",
      "story": "SPY cerró la semana en −0,22 %; QQQ mantuvo ventaja. El índice sigue dependiendo del liderazgo tecnológico. [A1]",
      "changed": "Q4 tiene viento histórico favorable, pero octubre no equivale al trimestre completo. La amplitud sigue siendo la principal confirmación pendiente. [A2–A4]",
      "expected": "Quiero ver mejora persistente de RSP/SPY, IWM/SPY y participación sectorial sin perder a los líderes. Si solo avanzan las grandes compañías, seguimos dependiendo de pocas empresas.",
      "quantitativePanels": [
        {
          "title": "Rentabilidad semanal · 28 de septiembre–2 de octubre",
          "intro": "Cierres ajustados de Yahoo Finance: 25 de septiembre–2 de octubre de 2026. [A1]",
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
            "QQQ supera a SPY en 0,90 pp; IWM, en 0,06 pp. Diferencias de rentabilidades calculadas antes de redondear; no variaciones del cociente de precios."
          ]
        },
        ...levels('SPY'),
        {
          "title": "Estacionalidad de octubre y Q4",
          "intro": "Octubre y Q4 no son la misma apuesta.",
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
            "Midterm: años de elecciones legislativas de mitad de mandato. Muestras solapadas; las frecuencias históricas no son probabilidades para 2026. [A2–A3]",
            "Octubre con MA200 ascendente tuvo mayoría de meses positivos y retorno medio negativo: importa cuánto se pierde. Ocho observaciones no establecen una regla."
          ]
        },
        {
          "title": "S&P 500: referencias externas y sensibilidad",
          "intro": "Escenarios de Morgan Stanley y Goldman Sachs, junto con sensibilidad calculada por ZeroHedge. Referencia: 7.743 puntos del S&P 500, no dólares de SPY. [A17]",
          "headers": [
            "Referencia",
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
            "Los movimientos de ±12 % son sensibilidad, no dos pronósticos simétricos de Morgan Stanley. Recuperar amplitud no obliga a subir un 12 %; cerrar el gap tampoco garantiza una caída equivalente."
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
      "headline": "Riesgo táctico alto; tesis de medio plazo intacta.",
      "badge": "Seguimiento condicional",
      "story": "GLD perdió 3,37 % en la semana. El oro se complicó a corto plazo y una visita hacia 4.000 USD/oz entra en el escenario. No lo tomo como soporte garantizado ni señal automática de compra: es el metal, no GLD. [A1]",
      "changed": "Dólar, tasas reales y toma de ganancias pueden seguir presionando. A medio plazo sostienen la tesis las compras de bancos centrales y la diversificación de reservas: China compró 33 toneladas en Q2 mientras reducía Treasuries, sin que eso pruebe sustitución directa. [A13]\n\nBitcoin parece responder mejor a liquidez global; el oro parece cada vez más condicionado por China/PBoC. Es una relación en seguimiento, no causalidad demostrada. [A14]",
      "expected": "Quiero ver cómo responde la demanda si el metal vuelve a acercarse a 4.000. Una corrección con demanda firme es muy distinta de otra con salidas persistentes.",
      "quantitativePanels": [
        ...levels('GLD')
      ]
    },
    {
      "id": "china",
      "asset": "China · FXI",
      "headline": "La liquidez necesita llegar a los beneficios.",
      "badge": "Seguimiento condicional",
      "story": "China tiene liquidez, pero todavía quiero ver que llegue a actividad y beneficios. Sin esa transmisión, FXI sigue siendo una tesis incompleta.",
      "changed": "El PBoC aporta apoyo monetario; la confirmación debe venir del consumo y la estabilización inmobiliaria. La tesis del oro no se traslada automáticamente a la bolsa china. [A13–A14]",
      "expected": "Demanda interna, vivienda y resultados mejorando juntos reforzarían la lectura. Más liquidez sin transmisión real no basta.",
      "quantitativePanels": [
        ...levels('FXI')
      ]
    },
    {
      "id": "japon",
      "asset": "Japón · EWJ",
      "headline": "La prueba pasa por bolsa local, yen y bonos.",
      "badge": "Seguimiento condicional",
      "story": "El BOJ situó el tipo alrededor del 1,25 %, efectivo desde el 24 de septiembre. Ahora importa cómo se absorbe ese cambio. [B4]",
      "changed": "Hay cuatro lecturas: acciones japonesas, yen, bonos y retorno de EWJ en USD. La bolsa local puede avanzar sin que el inversor en dólares obtenga el mismo resultado.",
      "expected": "Un ajuste ordenado del yen y los bonos mantiene el escenario. Una dislocación conjunta complica financiación y retorno en dólares.",
      "quantitativePanels": [
        ...levels('EWJ')
      ]
    },
    {
      "id": "bitcoin",
      "asset": "Bitcoin · BTC",
      "headline": "Acumulación selectiva, con tecnología y liquidez como referencias.",
      "badge": "Seguimiento condicional",
      "story": "BTC muestra acumulación selectiva: algunos grandes tenedores siguen acumulando en esta zona de precios. No es un movimiento generalizado. Santiment observa esas cohortes hasta el 28 de septiembre. [A15]",
      "changed": "La liquidez global sigue como contexto: el GLI compara cambios de seis semanas con un desplazamiento de trece semanas. Ese lag histórico no fija una fecha objetivo. QQQ sirve como referencia cruzada de riesgo tecnológico; no calculamos una correlación actual para este corte. [A14; B5]",
      "expected": "Quiero ver que la acumulación se amplíe y venga acompañada por precio y flujos. Si las compras dejan de absorber oferta, la lectura pierde fuerza. Octubre fue positivo en cinco de seis años entre 2020 y 2025: contexto, no señal. [C1]",
      "quantitativePanels": [
        ...levels('BTCUSD')
      ]
    },
    {
      "id": "ethereum",
      "asset": "Ethereum · ETH",
      "headline": "La confirmación sigue estando en ETH/BTC.",
      "badge": "Seguimiento condicional",
      "story": "Subir en dólares no basta. ETH/BTC sigue siendo la confirmación de que el movimiento cripto se amplía.",
      "changed": "Ethereum no hereda automáticamente la acumulación ni las señales de Bitcoin.",
      "expected": "Fortaleza sostenida frente a BTC con flujos propios mejora la lectura. Si vuelve a perder frente a Bitcoin, mantengo cautela.",
      "quantitativePanels": [
        ...levels('ETHUSD')
      ]
    },
    {
      "id": "ia-tecnologia",
      "asset": "IA / Tecnología · Stock picking",
      "headline": "Distinguir empresas, no comprar una etiqueta.",
      "badge": "Seguimiento condicional",
      "story": "No compro la etiqueta IA. Quiero saber qué empresas convierten el gasto en pedidos, ingresos, márgenes y caja. La semana dejó dispersión: NVDA +3,95 %, AVGO +0,66 %, AMZN +0,74 %, MSFT +0,26 %, GOOGL −0,12 %, AAPL −2,16 %, META −3,14 %. [A1]",
      "changed": "Carson/FactSet estima crecimiento del EPS del S&P 500 del 31,9 % en 2026 y 15,2 % en 2027. Goldman Sachs/FactSet prevé CapEx de hyperscalers +116 % interanual en Q3. Son expectativas exigentes: gasto para un cliente no garantiza retorno, aunque sea ingreso para su proveedor. [A4–A5]",
      "expected": "Quiero resultados que validen expectativas. En software: uso convertido en ingresos y caja por acción, considerando valoración, concentración de clientes y dilución.",
      "quantitativePanels": [
        {
          "title": "Empresas y preguntas de seguimiento",
          "intro": "Empresas y preguntas de seguimiento; no recomendaciones de compra.",
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
            "Contrastar pedidos, ingresos, márgenes, caja, valoración, concentración y dilución por empresa."
          ]
        },
        {
          "title": "Small caps frente a large caps",
          "intro": "IWM mejoró apenas frente a SPY. Todavía falta continuidad para hablar de rotación hacia small caps. [A1]",
          "headers": [],
          "rows": [],
          "notes": [
            "En small caps quiero beneficios y financiación suficientes; en large caps, retorno sobre inversión y caja. Haber caído mucho no equivale a estar barato.",
            "TNA es un instrumento táctico/apalancado: busca el 300 % del retorno diario del Russell 2000, no tres veces el de varias semanas. No es una posición abierta ni una recomendación. [B6]"
          ]
        }
      ]
    },
    {
      "id": "energia",
      "asset": "Energía / petróleo",
      "headline": "El riesgo se transmite por costes e inflación.",
      "badge": "Seguimiento condicional",
      "story": "Brent CFD llegó intradía hacia 103 USD/barril a comienzos de octubre; no es el cierre spot del día 2. [A12]",
      "changed": "Energía cara y yields altos presionan costes y valoración al mismo tiempo.",
      "expected": "Menores costes de energía y transporte ayudan. Una nueva aceleración complica inflación y márgenes.",
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
        "body": "Los líderes cumplen, los yields siguen altos pero ordenados y la amplitud se estabiliza sin recuperarse del todo. Avances y correcciones con dispersión. Pierde respaldo si empeoran también los líderes."
      },
      {
        "title": "Ruta favorable · Se incorporan los rezagados",
        "body": "RSP e IWM ganan terreno frente a SPY y participan más sectores. Tecnología cumple; energía y financiación alivian presión. BTC amplía demanda y ETH confirma frente a BTC."
      },
      {
        "title": "Ruta adversa · La debilidad alcanza a los líderes",
        "body": "La financiación se endurece o decepcionan resultados sin recuperación interna. La debilidad alcanza a los líderes. La acumulación selectiva no absorbe ventas en BTC; el oro sigue expuesto a corrección."
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
      "whatLooksAt": "",
      "whyItMatters": "Que RSP/SPY e IWM/SPY dejen de deteriorarse y vuelva a ampliarse la participación sectorial.",
      "currentReading": "El índice resiste mejor que el mercado interno. La amplitud todavía no confirma la subida.",
      "whatWouldChange": "Recuperación persistente de rezagados mejora la lectura. Si caen también los líderes con amplitud débil, empeora.",
      "href": "/dashboard",
      "linkLabel": "Dashboard propio"
    },
    {
      "key": "control-1",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "QQQ como referencia",
      "whatLooksAt": "",
      "whyItMatters": "Tecnología manteniendo liderazgo mientras participa el resto del mercado.",
      "currentReading": "QQQ supera a SPY: sostiene al índice y refleja concentración.",
      "whatWouldChange": "Ampliación del liderazgo es positiva. Perder grandes tecnológicos sin recuperación del resto sería peor.",
      "href": "https://finance.yahoo.com/quote/QQQ/",
      "linkLabel": "Seguir QQQ"
    },
    {
      "key": "control-2",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "Bonos, dólar y energía",
      "whatLooksAt": "",
      "whyItMatters": "Que yields largos y energía dejen de subir al mismo tiempo.",
      "currentReading": "La Fed puede pausar, pero las condiciones financieras siguen restrictivas.",
      "whatWouldChange": "Caída ordenada de yields ayuda. Otra aceleración simultánea de tasas y energía empeora el escenario.",
      "href": "https://fred.stlouisfed.org/series/DGS10",
      "linkLabel": "Treasury a diez años · FRED"
    },
    {
      "key": "control-3",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "GLD",
      "whatLooksAt": "",
      "whyItMatters": "Cómo responde la demanda durante la corrección.",
      "currentReading": "Corto plazo frágil; medio plazo constructivo.",
      "whatWouldChange": "Demanda firme mantiene la tesis. Salidas persistentes con dólar y tasas reales al alza la debilitan.",
      "href": "/dashboard",
      "linkLabel": "Dashboard propio"
    },
    {
      "key": "control-4",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "FXI",
      "whatLooksAt": "",
      "whyItMatters": "Que liquidez se convierta en consumo, actividad y beneficios.",
      "currentReading": "Hay estímulo, pero falta transmisión.",
      "whatWouldChange": "Mejora simultánea de actividad y resultados refuerza la tesis. Más liquidez sin transmisión real no.",
      "href": "https://finance.yahoo.com/quote/FXI/",
      "linkLabel": "Seguir FXI"
    },
    {
      "key": "control-5",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "EWJ",
      "whatLooksAt": "",
      "whyItMatters": "Cómo conviven bolsa local, yen y bonos tras el cambio del BOJ.",
      "currentReading": "Japón sigue interesante; divisa y coste de financiación importan mucho.",
      "whatWouldChange": "Ajuste ordenado mantiene el escenario. Dislocación conjunta de yen y bonos lo complica.",
      "href": "https://finance.yahoo.com/quote/EWJ/",
      "linkLabel": "Seguir EWJ"
    },
    {
      "key": "control-6",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "BTC",
      "whatLooksAt": "",
      "whyItMatters": "Que la acumulación selectiva se amplíe y venga acompañada por precio y flujos.",
      "currentReading": "Algunos grandes tenedores siguen acumulando; no es una acumulación generalizada.",
      "whatWouldChange": "Más participación refuerza la tesis. Si esas compras dejan de absorber oferta, pierde fuerza.",
      "href": "/dashboard",
      "linkLabel": "Dashboard propio"
    },
    {
      "key": "control-7",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "ETH",
      "whatLooksAt": "",
      "whyItMatters": "Fortaleza sostenida frente a BTC.",
      "currentReading": "El rebote en dólares no confirma ampliación del movimiento cripto.",
      "whatWouldChange": "ETH/BTC mejorando con flujos propios confirma. Perder frente a BTC mantiene cautela.",
      "href": "https://finance.yahoo.com/quote/ETH-USD/",
      "linkLabel": "Seguir ETH"
    },
    {
      "key": "control-8",
      "status": "watch",
      "statusLabel": "Seguimiento condicional",
      "asOf": "2026-10-05",
      "source": "Lectura editorial; niveles estadísticos congelados al cierre del 2 de octubre de 2026.",
      "name": "Stock picking",
      "whatLooksAt": "",
      "whyItMatters": "Pedidos, márgenes, caja y retorno real sobre CapEx.",
      "currentReading": "La IA tiene combustible; no convierte a todas las empresas relacionadas en buenas inversiones.",
      "whatWouldChange": "Resultados que validen expectativas amplían oportunidades. Mucho gasto con poco retorno hace lo contrario.",
      "href": "/dashboard",
      "linkLabel": "Dashboard propio"
    }
  ],
  "sourceGroups": [
    {
      "title": "Datos e investigación",
      "entries": [
        {
          "label": "A1. Yahoo Finance: cierres ajustados del 25/09 al 02/10/2026; cálculo propio de rentabilidades semanales.",
          "href": "https://finance.yahoo.com/quote/SPY/history/"
        },
        {
          "label": "A2. Estacionalidad del S&P 500, 1950–2025: octubre, midterm y filtro MA200. Muestras de 76, 19 y 8 observaciones."
        },
        {
          "label": "A3. Carson/FactSet/YCharts: Q4 general, ciclo de cuatro años y Q4 después de Q2 >10 %. Nueve Q4 completados; se excluye 2026."
        },
        {
          "label": "A4. Carson/FactSet: previsiones de EPS, 25/09/2026."
        },
        {
          "label": "A5. Goldman Sachs/FactSet: CapEx de hyperscalers, Q3 de 2026."
        },
        {
          "label": "A6. CME FedWatch: distribución por reunión al 04/10/2026."
        },
        {
          "label": "A7. Morgan Stanley/Bloomberg: amplitud desde Jackson Hole. Las lecturas MA200 no comparten fecha."
        },
        {
          "label": "A8. Morgan Stanley/FactSet: drawdown máximo del Russell 3000 desde junio; no caída actual."
        },
        {
          "label": "A9. Bank of America, CNN Fear & Greed y AAII: posicionamiento y sentimiento; cortes hasta el 02/10 y 30/09."
        },
        {
          "label": "A10. J.P. Morgan Asset Management: sentimiento del consumidor y retornos tras valles históricos."
        },
        {
          "label": "A11. Baird Strategas/Bloomberg: flujos ETF. J.P. Morgan: compras minoristas. Carson/Fed: emisión neta."
        },
        {
          "label": "A12. Kobeissi: Treasury intradía tras empleo y Brent CFD del 01/10; no cierres semanales."
        },
        {
          "label": "A13. Société Générale: oro y Treasuries en reservas chinas, hasta Q2 de 2026."
        },
        {
          "label": "A14. GLI: liquidez global y BTC (cambios de seis semanas, lag de trece); liquidez PBoC y oro."
        },
        {
          "label": "A15. Santiment/Sanbase: acumulación selectiva por cohortes de direcciones hasta el 28/09/2026."
        },
        {
          "label": "A17. Morgan Stanley y Goldman Sachs: escenarios del S&P 500. ZeroHedge: sensibilidad del gap sobre 7.743 puntos."
        }
      ]
    },
    {
      "title": "Fuentes oficiales",
      "entries": [
        {
          "label": "B1. Federal Reserve: decisión del 16/09/2026.",
          "href": "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm"
        },
        {
          "label": "B2. University of Michigan: resultados finales de septiembre y calendario",
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
          "label": "B5. CME Economic Research: Why Is Bitcoin Moving in Tandem with Equities?, 14/05/2025",
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
          "label": "B8. BEA: calendario de publicaciones.",
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
      "title": "Metodología",
      "entries": [
        {
          "label": "Niveles propios congelados al 2 de octubre de 2026. No se actualizan métricas sin datos disponibles."
        },
        {
          "label": "Rentabilidad semanal = (cierre ajustado del 02/10 / cierre ajustado del 25/09 − 1) × 100. Misma serie Yahoo Finance y ventana para todos los instrumentos. Diferenciales calculados antes de redondear."
        },
        {
          "label": "Las frecuencias históricas no son probabilidades. Los escenarios son condicionales. QQQ es referencia frente a SPY y BTC, no un activo principal; no hay correlación actual calculada."
        },
        {
          "label": "C1. Segundo informe de septiembre: punto de partida de esta lectura.",
          "href": "https://www.luiguiherrera.com/informes/segundo-informe-septiembre-2026"
        }
      ]
    }
  ],
  "sourcesNote": "Calendario en ET y hora peninsular española, ajustado por fecha. El PCE del 29 de octubre llega después del FOMC del 28. Sin una serie completa no damos por activado el Zweig Breadth Thrust.",
  "disclaimer": "Este informe tiene finalidad informativa y educativa. No constituye asesoramiento personalizado ni una recomendación de compra o venta. Los patrones históricos, estimaciones, correlaciones y escenarios no garantizan resultados futuros. Los instrumentos apalancados añaden riesgo de trayectoria, costes y pérdida de capital."
};
